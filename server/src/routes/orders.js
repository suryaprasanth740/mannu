import { Router } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { Order, PAYMENT_METHODS, notify } from '../models/index.js';
import { optionalAuth, requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { ah, badRequest, forbidden, notFound } from '../utils/http.js';
import { quoteCart } from '../utils/pricing.js';
import { newGroupId, newOrderNumber, pushStatus } from '../utils/orderFlow.js';

const router = Router();

const cartItems = z
  .array(
    z.object({
      productId: z.string().min(1),
      qty: z.coerce.number().positive('Quantity must be more than 0').max(10000),
    })
  )
  .min(1, 'Your cart is empty')
  .max(60, 'Too many items in one order');

const fulfillmentMap = z.record(z.enum(['delivery', 'pickup'])).default({});

/** Price the cart. Works without login so guests can see real totals. */
router.post(
  '/cart/quote',
  optionalAuth,
  validate(z.object({ items: cartItems, fulfillment: fulfillmentMap })),
  ah(async (req, res) => {
    res.json(await quoteCart(req.body.items, req.body.fulfillment));
  })
);

const checkoutSchema = z.object({
  items: cartItems,
  fulfillment: fulfillmentMap,
  addressId: z.string().optional(),
  paymentMethod: z.enum(['cash_on_delivery', 'upi_on_delivery']).default('cash_on_delivery'),
  note: z.string().trim().max(300).default(''),
});

router.post(
  '/orders',
  requireAuth,
  requireRole('customer'),
  validate(checkoutSchema),
  ah(async (req, res) => {
    const { items, fulfillment, addressId, paymentMethod, note } = req.body;
    const quote = await quoteCart(items, fulfillment);
    if (quote.issues.length) {
      throw badRequest(quote.issues[0].message, { issues: quote.issues });
    }

    const needsAddress = quote.groups.some((g) => g.method === 'delivery');
    let address;
    if (needsAddress) {
      address = addressId ? req.user.addresses.id(addressId) : null;
      if (!address) throw badRequest('Choose a delivery address');
    }

    const groupId = newGroupId();
    const now = Date.now();
    const docs = quote.groups.map((g) => {
      const method = g.method;
      const order = new Order({
        orderNumber: newOrderNumber(),
        groupId,
        customer: req.user._id,
        farmer: g.farmer.id,
        farmName: g.farmer.farmName,
        items: g.items.map((i) => ({
          product: i.productId,
          name: i.name,
          localNames: i.localNames,
          icon: i.icon,
          image: i.image,
          unit: i.unit,
          price: i.price,
          qty: i.qty,
          lineTotal: i.lineTotal,
        })),
        fulfillment:
          method === 'delivery'
            ? {
                method,
                address: {
                  fullName: address.fullName,
                  phone: address.phone,
                  line1: address.line1,
                  line2: address.line2,
                  city: address.city,
                  district: address.district,
                  state: address.state,
                  pincode: address.pincode,
                },
              }
            : { method, pickupAddress: g.farmer.pickupAddress || `${g.farmer.location?.village}, ${g.farmer.location?.district}` },
        charges: { subtotal: g.subtotal, deliveryFee: g.deliveryFee, serviceFee: g.serviceFee, total: g.total },
        payment: { method: method === 'pickup' ? 'pay_at_pickup' : paymentMethod, status: 'unpaid' },
        estimatedReadyAt: new Date(now + (g.farmer.prepHours || 24) * 3600 * 1000),
        customerNote: note,
        statusHistory: [],
      });
      pushStatus(order, 'placed');
      return order;
    });

    const saved = [];
    try {
      for (const d of docs) saved.push(await d.save());
    } catch (e) {
      await Order.deleteMany({ _id: { $in: saved.map((s) => s._id) } });
      throw e;
    }
    for (const o of saved) {
      await notify(o.farmer, 'order_new', { orderNumber: o.orderNumber, customer: req.user.name, total: o.charges.total }, '/farmer/orders?view=new');
    }
    res.status(201).json({ groupId, orders: saved, totals: quote.totals });
  })
);

router.get(
  '/orders/mine',
  requireAuth,
  ah(async (req, res) => {
    const orders = await Order.find({ customer: req.user._id }).sort({ createdAt: -1 }).limit(200).lean();
    res.json({ orders });
  })
);

/** A single checkout (receipt), possibly spanning several farmers. */
router.get(
  '/orders/group/:groupId',
  requireAuth,
  ah(async (req, res) => {
    const orders = await Order.find({ groupId: String(req.params.groupId) }).sort({ farmName: 1 }).lean();
    if (!orders.length) throw notFound('Order not found');
    const isOwner = String(orders[0].customer) === String(req.user._id);
    if (!isOwner && req.user.role !== 'admin') throw forbidden();
    const totals = orders.reduce(
      (t, o) => {
        if (!['rejected', 'cancelled'].includes(o.status)) {
          t.subtotal += o.charges.subtotal;
          t.deliveryFee += o.charges.deliveryFee;
          t.serviceFee += o.charges.serviceFee;
          t.total += o.charges.total;
        }
        return t;
      },
      { subtotal: 0, deliveryFee: 0, serviceFee: 0, total: 0 }
    );
    res.json({ groupId: req.params.groupId, orders, totals, customer: { name: req.user.name, email: req.user.email } });
  })
);

router.get(
  '/orders/:id',
  requireAuth,
  ah(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) throw notFound('Order not found');
    const order = await Order.findById(req.params.id).populate('customer', 'name phone email').lean();
    if (!order) throw notFound('Order not found');
    const uid = String(req.user._id);
    const allowed = String(order.customer._id) === uid || String(order.farmer) === uid || req.user.role === 'admin';
    if (!allowed) throw forbidden();
    res.json({ order });
  })
);

router.post(
  '/orders/:id/cancel',
  requireAuth,
  requireRole('customer'),
  validate(z.object({ reason: z.string().trim().max(200).default('') })),
  ah(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) throw notFound('Order not found');
    const order = await Order.findOne({ _id: req.params.id, customer: req.user._id });
    if (!order) throw notFound('Order not found');
    if (order.status !== 'placed')
      throw badRequest('This order was already accepted by the farmer. Raise a complaint if you need help.');
    pushStatus(order, 'cancelled', req.body.reason ? `Cancelled by customer: ${req.body.reason}` : 'Cancelled by customer');
    await order.save();
    await notify(order.farmer, 'order_cancelled', { orderNumber: order.orderNumber, customer: req.user.name }, '/farmer/orders?view=closed');
    res.json({ order });
  })
);

export { PAYMENT_METHODS };
export default router;
