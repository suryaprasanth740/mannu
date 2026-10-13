import { Router } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { COMPLETED_STATUSES, Complaint, Order, Product, Review, User } from '../models/index.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { ah, badRequest, forbidden, notFound } from '../utils/http.js';

const router = Router();

/* ---------------- Reviews ---------------- */

async function recomputeRating(productId) {
  const reviews = await Review.find({ product: productId }).select('rating').lean();
  const count = reviews.length;
  const avg = count ? reviews.reduce((s, r) => s + r.rating, 0) / count : 0;
  await Product.updateOne({ _id: productId }, { ratingAvg: Math.round(avg * 10) / 10, ratingCount: count });
}

router.get(
  '/reviews/mine',
  requireAuth,
  ah(async (req, res) => {
    const reviews = await Review.find({ customer: req.user._id }).select('product rating comment order').lean();
    res.json({ reviews });
  })
);

router.post(
  '/reviews',
  requireAuth,
  requireRole('customer'),
  validate(
    z.object({
      productId: z.string().refine((v) => mongoose.isValidObjectId(v), 'Invalid product'),
      rating: z.coerce.number().int().min(1, 'Choose 1 to 5 stars').max(5),
      comment: z.string().trim().max(600).default(''),
    })
  ),
  ah(async (req, res) => {
    const { productId, rating, comment } = req.body;
    const order = await Order.findOne({
      customer: req.user._id,
      'items.product': productId,
      status: { $in: COMPLETED_STATUSES },
    })
      .sort({ createdAt: -1 })
      .select('_id');
    if (!order) throw forbidden('You can rate a product after you receive it');
    const existing = await Review.findOne({ product: productId, customer: req.user._id });
    const review = existing || new Review({ product: productId, customer: req.user._id });
    review.set({ order: order._id, rating, comment });
    await review.save();
    await recomputeRating(productId);
    res.status(existing ? 200 : 201).json({ review });
  })
);

/* ---------------- Complaints & reports ---------------- */

router.post(
  '/complaints',
  requireAuth,
  validate(
    z.object({
      type: z.enum(['order', 'account', 'product', 'other']),
      subject: z.string().trim().min(4, 'Add a short subject').max(120),
      message: z.string().trim().min(10, 'Describe the problem in a few more words').max(1500),
      orderId: z.string().optional(),
      againstUserId: z.string().optional(),
    })
  ),
  ah(async (req, res) => {
    const { type, subject, message, orderId, againstUserId } = req.body;
    const doc = { raisedBy: req.user._id, type, subject, message };
    if (orderId) {
      if (!mongoose.isValidObjectId(orderId)) throw badRequest('Invalid order');
      const order = await Order.findById(orderId).select('customer farmer').lean();
      if (!order) throw notFound('Order not found');
      const uid = String(req.user._id);
      if (String(order.customer) !== uid && String(order.farmer) !== uid) throw forbidden();
      doc.order = order._id;
      doc.against = String(order.customer) === uid ? order.farmer : order.customer;
    } else if (againstUserId) {
      if (!mongoose.isValidObjectId(againstUserId) || !(await User.exists({ _id: againstUserId })))
        throw badRequest('That account was not found');
      if (String(againstUserId) === String(req.user._id)) throw badRequest('You cannot report your own account');
      doc.against = againstUserId;
    }
    const open = await Complaint.countDocuments({ raisedBy: req.user._id, status: { $in: ['open', 'in_review'] } });
    if (open >= 10) throw badRequest('You have 10 open complaints. Please wait for those to be reviewed.');
    const complaint = await Complaint.create(doc);
    res.status(201).json({ complaint });
  })
);

router.get(
  '/complaints/mine',
  requireAuth,
  ah(async (req, res) => {
    const complaints = await Complaint.find({ raisedBy: req.user._id })
      .sort({ createdAt: -1 })
      .populate('order', 'orderNumber')
      .lean();
    res.json({ complaints });
  })
);

export default router;
