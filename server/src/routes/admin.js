import { Router } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import {
  COMPLETED_STATUSES,
  Category,
  Complaint,
  DEFAULT_SETTINGS,
  FarmerProfile,
  Order,
  Product,
  Setting,
  User,
  getSettings,
  notify,
} from '../models/index.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { ah, badRequest, escapeRegex, notFound, paginate, round2 } from '../utils/http.js';

const router = Router();
router.use(requireAuth, requireRole('admin'));

const oid = (v) => mongoose.isValidObjectId(v);

/* ---------------- Statistics ---------------- */

router.get(
  '/stats',
  ah(async (_req, res) => {
    const [customers, farmers, pendingFarmers, products, blockedProducts, openComplaints, orders] = await Promise.all([
      User.countDocuments({ role: 'customer' }),
      User.countDocuments({ role: 'farmer' }),
      FarmerProfile.countDocuments({ 'verification.status': 'pending' }),
      Product.countDocuments({}),
      Product.countDocuments({ isBlocked: true }),
      Complaint.countDocuments({ status: { $in: ['open', 'in_review'] } }),
      Order.find({}).select('status charges payment createdAt items farmName').lean(),
    ]);
    const byStatus = {};
    for (const o of orders) byStatus[o.status] = (byStatus[o.status] || 0) + 1;
    const completed = orders.filter((o) => COMPLETED_STATUSES.includes(o.status));
    const paid = completed.filter((o) => o.payment.status === 'paid');

    const farms = new Map();
    for (const o of completed) farms.set(o.farmName, round2((farms.get(o.farmName) || 0) + o.charges.subtotal));

    res.json({
      users: { customers, farmers, pendingFarmers },
      products: { total: products, blocked: blockedProducts },
      complaints: { open: openComplaints },
      orders: { total: orders.length, byStatus },
      money: {
        completedGMV: round2(completed.reduce((s, o) => s + o.charges.total, 0)),
        paidGMV: round2(paid.reduce((s, o) => s + o.charges.total, 0)),
        serviceFeesEarned: round2(paid.reduce((s, o) => s + o.charges.serviceFee, 0)),
        awaitingPayment: round2(
          orders
            .filter((o) => !['rejected', 'cancelled', 'placed'].includes(o.status) && o.payment.status === 'unpaid')
            .reduce((s, o) => s + o.charges.total, 0)
        ),
      },
      topFarms: [...farms.entries()].map(([farmName, sales]) => ({ farmName, sales })).sort((a, b) => b.sales - a.sales).slice(0, 5),
    });
  })
);

/* ---------------- Farmers & verification ---------------- */

router.get(
  '/farmers',
  ah(async (req, res) => {
    const filter = {};
    if (['pending', 'approved', 'rejected'].includes(req.query.status)) filter['verification.status'] = req.query.status;
    const profiles = await FarmerProfile.find(filter).sort({ createdAt: -1 }).populate('user', 'name email phone status createdAt').lean();
    const counts = await Product.aggregate([{ $group: { _id: '$farmer', count: { $sum: 1 } } }]);
    const countBy = new Map(counts.map((c) => [String(c._id), c.count]));
    res.json({ farmers: profiles.map((p) => ({ ...p, productCount: countBy.get(String(p.user?._id)) || 0 })) });
  })
);

router.patch(
  '/farmers/:userId/verify',
  validate(z.object({ status: z.enum(['approved', 'rejected', 'pending']), note: z.string().trim().max(300).default('') })),
  ah(async (req, res) => {
    if (!oid(req.params.userId)) throw notFound('Farmer not found');
    if (req.body.status === 'rejected' && req.body.note.length < 3) throw badRequest('Add a reason so the farmer knows what to fix');
    const profile = await FarmerProfile.findOne({ user: req.params.userId });
    if (!profile) throw notFound('Farmer not found');
    profile.verification = { status: req.body.status, note: req.body.note, reviewedAt: new Date() };
    await profile.save();
    await notify(profile.user, 'farm_verification', { status: req.body.status, note: req.body.note }, '/farmer');
    res.json({ profile });
  })
);

/* ---------------- Accounts ---------------- */

router.get(
  '/users',
  ah(async (req, res) => {
    const filter = {};
    if (['customer', 'farmer', 'admin'].includes(req.query.role)) filter.role = req.query.role;
    if (['active', 'suspended'].includes(req.query.status)) filter.status = req.query.status;
    if (req.query.q) {
      const rx = new RegExp(escapeRegex(String(req.query.q).slice(0, 60)), 'i');
      filter.$or = [{ name: rx }, { email: rx }, { phone: rx }];
    }
    const { page, limit, skip } = paginate(req.query, { defaultLimit: 50 });
    const [users, total] = await Promise.all([
      User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      User.countDocuments(filter),
    ]);
    const ids = users.map((u) => u._id);
    const reports = await Complaint.aggregate([
      { $match: { against: { $in: ids } } },
      { $group: { _id: '$against', count: { $sum: 1 } } },
    ]);
    const reportBy = new Map(reports.map((r) => [String(r._id), r.count]));
    res.json({
      users: users.map(({ passwordHash, addresses, ...u }) => ({ ...u, reportCount: reportBy.get(String(u._id)) || 0 })),
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  })
);

router.patch(
  '/users/:id/status',
  validate(z.object({ status: z.enum(['active', 'suspended']), reason: z.string().trim().max(300).default('') })),
  ah(async (req, res) => {
    if (!oid(req.params.id)) throw notFound('User not found');
    const user = await User.findById(req.params.id);
    if (!user) throw notFound('User not found');
    if (user.role === 'admin') throw badRequest('Admin accounts cannot be suspended here');
    if (req.body.status === 'suspended' && req.body.reason.length < 3) throw badRequest('Add a reason for the suspension');
    user.status = req.body.status;
    user.suspendedReason = req.body.status === 'suspended' ? req.body.reason : '';
    await user.save();
    res.json({ user: user.toSafeJSON() });
  })
);

/* ---------------- Categories ---------------- */

const categorySchema = z.object({
  name: z.string().trim().min(2, 'Enter a category name').max(40),
  icon: z.string().trim().min(1).max(8).default('🌱'),
  image: z.union([z.literal(''), z.string().trim().url('Image must be a full https:// link').max(500)]).default(''),
  localNames: z
    .object({ kn: z.string().trim().max(40).optional(), ta: z.string().trim().max(40).optional(), te: z.string().trim().max(40).optional() })
    .default({}),
  sortOrder: z.coerce.number().int().min(0).max(999).default(0),
  isActive: z.boolean().default(true),
});

const slugify = (s) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

router.get(
  '/categories',
  ah(async (_req, res) => {
    const categories = await Category.find({}).sort({ sortOrder: 1, name: 1 }).lean();
    const counts = await Product.aggregate([{ $group: { _id: '$category', count: { $sum: 1 } } }]);
    const countBy = new Map(counts.map((c) => [String(c._id), c.count]));
    res.json({ categories: categories.map((c) => ({ ...c, productCount: countBy.get(String(c._id)) || 0 })) });
  })
);

router.post(
  '/categories',
  validate(categorySchema),
  ah(async (req, res) => {
    const slug = slugify(req.body.name);
    if (!slug) throw badRequest('Use letters or numbers in the category name');
    const category = await Category.create({ ...req.body, slug });
    res.status(201).json({ category });
  })
);

router.put(
  '/categories/:id',
  validate(categorySchema),
  ah(async (req, res) => {
    if (!oid(req.params.id)) throw notFound('Category not found');
    const category = await Category.findById(req.params.id);
    if (!category) throw notFound('Category not found');
    category.set({ ...req.body, slug: slugify(req.body.name) });
    await category.save();
    res.json({ category });
  })
);

router.delete(
  '/categories/:id',
  ah(async (req, res) => {
    if (!oid(req.params.id)) throw notFound('Category not found');
    if (await Product.exists({ category: req.params.id }))
      throw badRequest('Products still use this category. Hide it instead, or move those products first.');
    await Category.deleteOne({ _id: req.params.id });
    res.json({ ok: true });
  })
);

/* ---------------- Products ---------------- */

router.get(
  '/products',
  ah(async (req, res) => {
    const filter = {};
    if (req.query.q) filter.name = new RegExp(escapeRegex(String(req.query.q).slice(0, 60)), 'i');
    if (req.query.blocked === 'true') filter.isBlocked = true;
    const { page, limit, skip } = paginate(req.query, { defaultLimit: 50 });
    const [products, total] = await Promise.all([
      Product.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('category', 'name').populate('farmer', 'name').lean(),
      Product.countDocuments(filter),
    ]);
    const profiles = await FarmerProfile.find({ user: { $in: products.map((p) => p.farmer?._id) } }).select('user farmName').lean();
    const farmBy = new Map(profiles.map((p) => [String(p.user), p.farmName]));
    res.json({
      products: products.map((p) => ({ ...p, farmName: farmBy.get(String(p.farmer?._id)) })),
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  })
);

router.patch(
  '/products/:id/block',
  validate(z.object({ blocked: z.boolean(), reason: z.string().trim().max(300).default('') })),
  ah(async (req, res) => {
    if (!oid(req.params.id)) throw notFound('Product not found');
    if (req.body.blocked && req.body.reason.length < 3) throw badRequest('Add a reason for blocking this product');
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { isBlocked: req.body.blocked, blockedReason: req.body.blocked ? req.body.reason : '' },
      { new: true }
    );
    if (!product) throw notFound('Product not found');
    res.json({ product });
  })
);

/* ---------------- Orders & transactions ---------------- */

router.get(
  '/orders',
  ah(async (req, res) => {
    const filter = {};
    if (req.query.status) filter.status = String(req.query.status);
    if (['paid', 'unpaid'].includes(req.query.payment)) filter['payment.status'] = req.query.payment;
    if (req.query.q) filter.orderNumber = new RegExp(escapeRegex(String(req.query.q).slice(0, 30)), 'i');
    const { page, limit, skip } = paginate(req.query, { defaultLimit: 50 });
    const [orders, total] = await Promise.all([
      Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('customer', 'name email').lean(),
      Order.countDocuments(filter),
    ]);
    res.json({ orders, total, page, pages: Math.ceil(total / limit) });
  })
);

/* ---------------- Complaints ---------------- */

router.get(
  '/complaints',
  ah(async (req, res) => {
    const filter = {};
    if (['open', 'in_review', 'resolved', 'dismissed'].includes(req.query.status)) filter.status = req.query.status;
    const complaints = await Complaint.find(filter)
      .sort({ createdAt: -1 })
      .limit(200)
      .populate('raisedBy', 'name email role')
      .populate('against', 'name email role status')
      .populate('order', 'orderNumber status')
      .lean();
    res.json({ complaints });
  })
);

router.patch(
  '/complaints/:id',
  validate(z.object({ status: z.enum(['open', 'in_review', 'resolved', 'dismissed']), adminNote: z.string().trim().max(600).default('') })),
  ah(async (req, res) => {
    if (!oid(req.params.id)) throw notFound('Complaint not found');
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) throw notFound('Complaint not found');
    complaint.status = req.body.status;
    complaint.adminNote = req.body.adminNote;
    complaint.resolvedAt = ['resolved', 'dismissed'].includes(req.body.status) ? new Date() : undefined;
    await complaint.save();
    await notify(complaint.raisedBy, 'complaint_update', { subject: complaint.subject, status: complaint.status }, '/help');
    res.json({ complaint });
  })
);

/* ---------------- Platform settings ---------------- */

router.get(
  '/settings',
  ah(async (_req, res) => res.json({ settings: await getSettings() }))
);

router.put(
  '/settings',
  validate(
    z.object({
      serviceFeePercent: z.coerce.number().min(0, 'Fee cannot be negative').max(10, 'Keep the fee at 10% or less'),
      serviceFeeCap: z.coerce.number().min(0).max(500),
    })
  ),
  ah(async (req, res) => {
    for (const key of Object.keys(DEFAULT_SETTINGS)) {
      await Setting.updateOne({ key }, { $set: { value: req.body[key] } }, { upsert: true });
    }
    res.json({ settings: await getSettings() });
  })
);

export default router;
