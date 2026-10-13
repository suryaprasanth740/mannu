import { Router } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { Category, FARMER_TRANSITIONS, FarmerProfile, Order, Product, UNITS, notify } from '../models/index.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { deleteImage, imageUpload, storeImage } from '../middleware/upload.js';
import { ah, badRequest, notFound, round2 } from '../utils/http.js';
import { deductStock, pushStatus, restoreStock } from '../utils/orderFlow.js';

const router = Router();
router.use(requireAuth, requireRole('farmer'));

async function myProfile(req) {
  const profile = await FarmerProfile.findOne({ user: req.user._id });
  if (!profile) throw notFound('Farm profile not found');
  return profile;
}

/* ---------------- Profile ---------------- */

router.get(
  '/profile',
  ah(async (req, res) => res.json({ profile: await myProfile(req) }))
);

const profileSchema = z.object({
  farmName: z.string().trim().min(2, 'Enter your farm name').max(100),
  bio: z.string().trim().max(600).default(''),
  farmingPractices: z.string().trim().max(200).default(''),
  location: z.object({
    village: z.string().trim().min(2, 'Enter your village or town').max(80),
    district: z.string().trim().min(2, 'Enter your district').max(60),
    state: z.string().trim().min(2, 'Enter your state').max(60),
    pincode: z
      .string()
      .trim()
      .regex(/^\d{6}$/, 'Enter a 6-digit PIN code'),
  }),
  fulfillment: z
    .object({
      offersDelivery: z.boolean(),
      deliveryFee: z.coerce.number().min(0).max(1000),
      freeDeliveryAbove: z.coerce.number().min(0).max(100000),
      deliveryArea: z.string().trim().max(200).default(''),
      offersPickup: z.boolean(),
      pickupAddress: z.string().trim().max(200).default(''),
      prepHours: z.coerce.number().int().min(1).max(168),
    })
    .refine((f) => f.offersDelivery || f.offersPickup, 'Offer at least delivery or pickup')
    .refine((f) => !f.offersPickup || f.pickupAddress.length >= 5, 'Enter the pickup address'),
});

router.put(
  '/profile',
  validate(profileSchema),
  ah(async (req, res) => {
    const profile = await myProfile(req);
    profile.set(req.body);
    await profile.save();
    res.json({ profile });
  })
);

router.post(
  '/profile/photo',
  imageUpload.single('photo'),
  ah(async (req, res) => {
    if (!req.file) throw badRequest('Choose a photo to upload');
    const profile = await myProfile(req);
    const stored = await storeImage(req.file, 'farmers');
    await deleteImage(profile.photo?.publicId);
    profile.photo = stored;
    await profile.save();
    res.json({ profile });
  })
);

router.post(
  '/profile/cover',
  imageUpload.single('cover'),
  ah(async (req, res) => {
    if (!req.file) throw badRequest('Choose a photo to upload');
    const profile = await myProfile(req);
    const stored = await storeImage(req.file, 'farms');
    await deleteImage(profile.coverPhoto?.publicId);
    profile.coverPhoto = stored;
    await profile.save();
    res.json({ profile });
  })
);

/* ---------------- Products ---------------- */

const productSchema = z
  .object({
    name: z.string().trim().min(2, 'Enter the product name').max(80),
    localNames: z
      .object({ kn: z.string().trim().max(80).optional(), ta: z.string().trim().max(80).optional(), te: z.string().trim().max(80).optional() })
      .default({}),
    category: z.string().refine((v) => mongoose.isValidObjectId(v), 'Choose a category'),
    description: z.string().trim().max(1000).default(''),
    unit: z.enum(UNITS, { errorMap: () => ({ message: 'Choose a unit' }) }),
    price: z.coerce.number({ invalid_type_error: 'Enter a price' }).positive('Price must be more than ₹0').max(100000),
    stock: z.coerce.number({ invalid_type_error: 'Enter stock' }).min(0, 'Stock cannot be negative').max(1000000),
    minOrderQty: z.coerce.number().positive().max(10000).default(1),
    bulkTiers: z
      .array(z.object({ minQty: z.coerce.number().positive(), price: z.coerce.number().positive() }))
      .max(4)
      .default([]),
    seasonal: z.boolean().default(false),
    seasonMonths: z.array(z.coerce.number().int().min(1).max(12)).max(12).default([]),
    harvestedOn: z.coerce.date().optional().nullable(),
    isOrganic: z.boolean().default(false),
    isActive: z.boolean().default(true),
    icon: z.string().max(8).optional(),
  })
  .superRefine((p, ctx) => {
    const sorted = [...p.bulkTiers].sort((a, b) => a.minQty - b.minQty);
    sorted.forEach((t, i) => {
      if (t.price >= p.price)
        ctx.addIssue({ code: 'custom', path: ['bulkTiers', i, 'price'], message: 'Bulk price must be lower than the regular price' });
      if (t.minQty <= p.minOrderQty)
        ctx.addIssue({ code: 'custom', path: ['bulkTiers', i, 'minQty'], message: 'Bulk quantity must be more than the minimum order' });
    });
    if (p.seasonal && p.seasonMonths.length === 0)
      ctx.addIssue({ code: 'custom', path: ['seasonMonths'], message: 'Pick the months this product is in season' });
  });

async function ensureCategory(id) {
  const cat = await Category.findOne({ _id: id, isActive: true }).select('_id icon').lean();
  if (!cat) throw badRequest('Choose a valid category');
  return cat;
}

async function myProduct(req) {
  if (!mongoose.isValidObjectId(req.params.id)) throw notFound('Product not found');
  const p = await Product.findOne({ _id: req.params.id, farmer: req.user._id });
  if (!p) throw notFound('Product not found');
  return p;
}

router.get(
  '/products',
  ah(async (req, res) => {
    const products = await Product.find({ farmer: req.user._id })
      .sort({ updatedAt: -1 })
      .populate('category', 'name slug icon localNames')
      .lean();
    res.json({ products });
  })
);

router.get(
  '/products/:id',
  ah(async (req, res) => res.json({ product: await myProduct(req) }))
);

router.post(
  '/products',
  validate(productSchema),
  ah(async (req, res) => {
    const cat = await ensureCategory(req.body.category);
    const count = await Product.countDocuments({ farmer: req.user._id });
    if (count >= 200) throw badRequest('You can list up to 200 products');
    const body = { ...req.body, bulkTiers: [...req.body.bulkTiers].sort((a, b) => a.minQty - b.minQty) };
    const product = await Product.create({ ...body, icon: body.icon || cat.icon, farmer: req.user._id });
    res.status(201).json({ product });
  })
);

router.put(
  '/products/:id',
  validate(productSchema),
  ah(async (req, res) => {
    const product = await myProduct(req);
    await ensureCategory(req.body.category);
    product.set({ ...req.body, bulkTiers: [...req.body.bulkTiers].sort((a, b) => a.minQty - b.minQty) });
    await product.save();
    res.json({ product });
  })
);

router.patch(
  '/products/:id/stock',
  validate(z.object({ stock: z.coerce.number().min(0, 'Stock cannot be negative').max(1000000), price: z.coerce.number().positive().optional() })),
  ah(async (req, res) => {
    const product = await myProduct(req);
    product.stock = round2(req.body.stock);
    if (req.body.price) {
      if ((product.bulkTiers || []).some((t) => t.price >= req.body.price))
        throw badRequest('Regular price must stay above your bulk prices. Edit the product to change both.');
      product.price = req.body.price;
    }
    await product.save();
    res.json({ product });
  })
);

router.patch(
  '/products/:id/active',
  validate(z.object({ isActive: z.boolean() })),
  ah(async (req, res) => {
    const product = await myProduct(req);
    product.isActive = req.body.isActive;
    await product.save();
    res.json({ product });
  })
);

router.delete(
  '/products/:id',
  ah(async (req, res) => {
    const product = await myProduct(req);
    const open = await Order.exists({
      farmer: req.user._id,
      'items.product': product._id,
      status: { $in: ['placed', 'accepted', 'packed', 'out_for_delivery', 'ready_for_pickup'] },
    });
    if (open) throw badRequest('This product is in orders you have not finished. Hide it instead, and delete it later.');
    await Promise.all(product.images.map((img) => deleteImage(img.publicId)));
    await product.deleteOne();
    res.json({ ok: true });
  })
);

router.post(
  '/products/:id/images',
  imageUpload.array('images', 4),
  ah(async (req, res) => {
    const product = await myProduct(req);
    const files = req.files || [];
    if (!files.length) throw badRequest('Choose at least one photo');
    if (product.images.length + files.length > 4) throw badRequest('A product can have up to 4 photos');
    for (const f of files) product.images.push(await storeImage(f, 'products'));
    await product.save();
    res.json({ product });
  })
);

router.delete(
  '/products/:id/images/:imageId',
  ah(async (req, res) => {
    const product = await myProduct(req);
    const img = product.images.id(req.params.imageId);
    if (!img) throw notFound('Photo not found');
    await deleteImage(img.publicId);
    img.deleteOne();
    await product.save();
    res.json({ product });
  })
);

/* ---------------- Orders ---------------- */

router.get(
  '/orders',
  ah(async (req, res) => {
    const filter = { farmer: req.user._id };
    const groups = {
      new: ['placed'],
      active: ['accepted', 'packed', 'out_for_delivery', 'ready_for_pickup'],
      done: ['delivered', 'picked_up'],
      closed: ['rejected', 'cancelled'],
    };
    if (groups[req.query.view]) filter.status = { $in: groups[req.query.view] };
    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .limit(300)
      .populate('customer', 'name phone')
      .lean();
    res.json({ orders });
  })
);

const statusSchema = z.object({
  status: z.enum(['accepted', 'rejected', 'packed', 'out_for_delivery', 'ready_for_pickup', 'delivered', 'picked_up', 'cancelled']),
  note: z.string().trim().max(200).default(''),
  estimatedReadyAt: z.coerce.date().optional(),
});

router.patch(
  '/orders/:id/status',
  validate(statusSchema),
  ah(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) throw notFound('Order not found');
    const order = await Order.findOne({ _id: req.params.id, farmer: req.user._id });
    if (!order) throw notFound('Order not found');
    const { status, note } = req.body;
    const allowed = FARMER_TRANSITIONS[order.fulfillment.method][order.status] || [];
    if (!allowed.includes(status)) throw badRequest(`An order that is "${order.status.replaceAll('_', ' ')}" cannot be marked "${status.replaceAll('_', ' ')}"`);

    if ((status === 'rejected' || status === 'cancelled') && note.length < 3)
      throw badRequest('Tell the customer why (for example: "Not enough stock today")');

    if (status === 'accepted') await deductStock(order);
    if (status === 'cancelled') await restoreStock(order);
    if (status === 'rejected') order.rejectionReason = note;
    if (req.body.estimatedReadyAt) order.estimatedReadyAt = req.body.estimatedReadyAt;
    pushStatus(order, status, note);
    await order.save();
    await notify(order.customer, 'order_status', { orderNumber: order.orderNumber, farmName: order.farmName, status, note }, '/orders');
    if (status === 'accepted') {
      const low = await Product.find({ _id: { $in: order.items.map((i) => i.product) }, stock: { $lte: 5 } }).select('name stock unit').lean();
      for (const p of low) await notify(req.user._id, 'stock_low', { name: p.name, stock: p.stock, unit: p.unit }, '/farmer/products');
    }
    res.json({ order });
  })
);

router.patch(
  '/orders/:id/payment',
  validate(z.object({ status: z.literal('paid') })),
  ah(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) throw notFound('Order not found');
    const order = await Order.findOne({ _id: req.params.id, farmer: req.user._id });
    if (!order) throw notFound('Order not found');
    if (!['out_for_delivery', 'ready_for_pickup', 'delivered', 'picked_up'].includes(order.status))
      throw badRequest('Record payment when the order is handed over');
    if (order.payment.status === 'paid') throw badRequest('Payment is already recorded');
    order.payment.status = 'paid';
    order.payment.paidAt = new Date();
    order.statusHistory.push({ status: 'payment_received', at: new Date(), note: 'Payment received by farmer' });
    await order.save();
    res.json({ order });
  })
);

/* ---------------- Sales & earnings ---------------- */

router.get(
  '/stats',
  ah(async (req, res) => {
    const orders = await Order.find({ farmer: req.user._id }).select('status charges payment items createdAt').lean();
    const products = await Product.find({ farmer: req.user._id }).select('name stock unit isActive soldQty').lean();
    const count = (s) => orders.filter((o) => s.includes(o.status)).length;
    const completed = orders.filter((o) => ['delivered', 'picked_up'].includes(o.status));
    const earn = (o) => o.charges.subtotal + o.charges.deliveryFee;

    // Days are counted in India time so "today" matches what the farmer sees.
    const dayKey = (d) => new Date(d).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    const daily = [];
    for (let i = 13; i >= 0; i--) daily.push({ date: dayKey(Date.now() - i * 86400000), sales: 0, orders: 0 });
    const dayIndex = new Map(daily.map((d, i) => [d.date, i]));
    for (const o of orders) {
      if (['rejected', 'cancelled', 'placed'].includes(o.status)) continue;
      const idx = dayIndex.get(dayKey(o.createdAt));
      if (idx !== undefined) {
        daily[idx].sales = round2(daily[idx].sales + o.charges.subtotal);
        daily[idx].orders += 1;
      }
    }

    const productSales = new Map();
    for (const o of completed) {
      for (const it of o.items) {
        const cur = productSales.get(it.name) || { name: it.name, unit: it.unit, qty: 0, revenue: 0 };
        cur.qty = round2(cur.qty + it.qty);
        cur.revenue = round2(cur.revenue + it.lineTotal);
        productSales.set(it.name, cur);
      }
    }

    res.json({
      counts: {
        new: count(['placed']),
        active: count(['accepted', 'packed', 'out_for_delivery', 'ready_for_pickup']),
        completed: completed.length,
        rejectedOrCancelled: count(['rejected', 'cancelled']),
      },
      earnings: {
        received: round2(completed.filter((o) => o.payment.status === 'paid').reduce((s, o) => s + earn(o), 0)),
        toCollect: round2(
          orders
            .filter((o) => ['accepted', 'packed', 'out_for_delivery', 'ready_for_pickup', 'delivered', 'picked_up'].includes(o.status) && o.payment.status === 'unpaid')
            .reduce((s, o) => s + earn(o), 0)
        ),
        completedSales: round2(completed.reduce((s, o) => s + o.charges.subtotal, 0)),
      },
      daily,
      topProducts: [...productSales.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 5),
      lowStock: products.filter((p) => p.isActive && p.stock <= 5).map((p) => ({ id: p._id, name: p.name, stock: p.stock, unit: p.unit })),
      productCount: products.length,
    });
  })
);

export default router;
