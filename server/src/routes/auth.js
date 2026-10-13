import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { FarmerProfile, LANGUAGES, User } from '../models/index.js';
import { clearSession, issueSession, optionalAuth, requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { ah, badRequest, notFound, unauthorized } from '../utils/http.js';

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please wait 15 minutes and try again.' },
});

const phone = z
  .string()
  .trim()
  .regex(/^[6-9]\d{9}$/, 'Enter a 10-digit Indian mobile number');
const pincode = z
  .string()
  .trim()
  .regex(/^\d{6}$/, 'Enter a 6-digit PIN code');
const password = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password is too long')
  .regex(/[A-Za-z]/, 'Password needs at least one letter')
  .regex(/\d/, 'Password needs at least one number');

const registerSchema = z.discriminatedUnion('role', [
  z.object({
    role: z.literal('customer'),
    name: z.string().trim().min(2, 'Enter your name').max(80),
    email: z.string().trim().toLowerCase().email('Enter a valid email'),
    phone,
    password,
    language: z.enum(LANGUAGES).default('en'),
  }),
  z.object({
    role: z.literal('farmer'),
    name: z.string().trim().min(2, 'Enter your name').max(80),
    email: z.string().trim().toLowerCase().email('Enter a valid email'),
    phone,
    password,
    language: z.enum(LANGUAGES).default('en'),
    farmName: z.string().trim().min(2, 'Enter your farm name').max(100),
    village: z.string().trim().min(2, 'Enter your village or town').max(80),
    district: z.string().trim().min(2, 'Enter your district').max(60),
    state: z.string().trim().min(2, 'Enter your state').max(60),
    pincode,
  }),
]);

export async function sessionPayload(user) {
  const out = { user: user.toSafeJSON() };
  if (user.role === 'farmer') {
    out.farmerProfile = await FarmerProfile.findOne({ user: user._id }).lean();
  }
  return out;
}

router.post(
  '/register',
  authLimiter,
  validate(registerSchema),
  ah(async (req, res) => {
    const data = req.body;
    if (await User.exists({ email: data.email })) throw badRequest('An account with this email already exists');
    const user = new User({ name: data.name, email: data.email, phone: data.phone, role: data.role, language: data.language });
    await user.setPassword(data.password);
    await user.save();
    if (data.role === 'farmer') {
      try {
        await FarmerProfile.create({
          user: user._id,
          farmName: data.farmName,
          location: { village: data.village, district: data.district, state: data.state, pincode: data.pincode },
          fulfillment: { pickupAddress: `${data.village}, ${data.district}` },
        });
      } catch (e) {
        await User.deleteOne({ _id: user._id });
        throw e;
      }
    }
    issueSession(res, user);
    res.status(201).json(await sessionPayload(user));
  })
);

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email'),
  password: z.string().min(1, 'Enter your password'),
});

router.post(
  '/login',
  authLimiter,
  validate(loginSchema),
  ah(async (req, res) => {
    const user = await User.findOne({ email: req.body.email }).select('+passwordHash');
    if (!user || !(await user.checkPassword(req.body.password))) throw unauthorized('Email or password is incorrect');
    if (user.status !== 'active')
      throw unauthorized(
        `This account is suspended${user.suspendedReason ? `: ${user.suspendedReason}` : ''}. Contact support.`
      );
    user.lastLoginAt = new Date();
    await user.save();
    issueSession(res, user);
    res.json(await sessionPayload(user));
  })
);

router.post('/logout', (_req, res) => {
  clearSession(res);
  res.json({ ok: true });
});

// Returns { user: null } for guests (instead of 401) so the app can check the session quietly.
router.get(
  '/me',
  optionalAuth,
  ah(async (req, res) => res.json(req.user ? await sessionPayload(req.user) : { user: null }))
);

const updateMeSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  phone: phone.optional(),
  language: z.enum(LANGUAGES).optional(),
});

router.patch(
  '/me',
  requireAuth,
  validate(updateMeSchema),
  ah(async (req, res) => {
    Object.assign(req.user, req.body);
    await req.user.save();
    res.json(await sessionPayload(req.user));
  })
);

router.patch(
  '/me/password',
  requireAuth,
  validate(z.object({ currentPassword: z.string().min(1, 'Enter your current password'), newPassword: password })),
  ah(async (req, res) => {
    const user = await User.findById(req.user._id).select('+passwordHash');
    if (!(await user.checkPassword(req.body.currentPassword))) throw badRequest('Current password is incorrect');
    await user.setPassword(req.body.newPassword);
    await user.save();
    res.json({ ok: true });
  })
);

/* ---------- Saved delivery addresses ---------- */

const addressSchema = z.object({
  label: z.string().trim().max(30).default('Home'),
  fullName: z.string().trim().min(2, 'Enter the receiver name').max(80),
  phone,
  line1: z.string().trim().min(3, 'Enter house / street').max(120),
  line2: z.string().trim().max(120).default(''),
  city: z.string().trim().min(2, 'Enter city or town').max(60),
  district: z.string().trim().min(2, 'Enter district').max(60),
  state: z.string().trim().min(2, 'Enter state').max(60),
  pincode,
  isDefault: z.boolean().default(false),
});

function setDefault(user, id) {
  user.addresses.forEach((a) => {
    a.isDefault = String(a._id) === String(id);
  });
}

router.post(
  '/me/addresses',
  requireAuth,
  validate(addressSchema),
  ah(async (req, res) => {
    if (req.user.addresses.length >= 10) throw badRequest('You can save up to 10 addresses');
    req.user.addresses.push(req.body);
    const added = req.user.addresses[req.user.addresses.length - 1];
    if (req.body.isDefault || req.user.addresses.length === 1) setDefault(req.user, added._id);
    await req.user.save();
    res.status(201).json({ addresses: req.user.addresses, address: added });
  })
);

router.put(
  '/me/addresses/:id',
  requireAuth,
  validate(addressSchema),
  ah(async (req, res) => {
    const addr = req.user.addresses.id(req.params.id);
    if (!addr) throw notFound('Address not found');
    addr.set(req.body);
    if (req.body.isDefault) setDefault(req.user, addr._id);
    await req.user.save();
    res.json({ addresses: req.user.addresses });
  })
);

router.delete(
  '/me/addresses/:id',
  requireAuth,
  ah(async (req, res) => {
    const addr = req.user.addresses.id(req.params.id);
    if (!addr) throw notFound('Address not found');
    const wasDefault = addr.isDefault;
    addr.deleteOne();
    if (wasDefault && req.user.addresses[0]) req.user.addresses[0].isDefault = true;
    await req.user.save();
    res.json({ addresses: req.user.addresses });
  })
);

export default router;
