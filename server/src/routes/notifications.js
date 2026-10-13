import { Router } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { Notification } from '../models/index.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { ah } from '../utils/http.js';

const router = Router();
router.use(requireAuth);

router.get(
  '/',
  ah(async (req, res) => {
    const [notifications, unread] = await Promise.all([
      Notification.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(30).lean(),
      Notification.countDocuments({ user: req.user._id, read: false }),
    ]);
    res.json({ notifications, unread });
  })
);

router.post(
  '/read',
  validate(z.object({ ids: z.array(z.string()).max(100).optional() })),
  ah(async (req, res) => {
    const filter = { user: req.user._id, read: false };
    if (req.body.ids?.length) filter._id = { $in: req.body.ids.filter((id) => mongoose.isValidObjectId(id)) };
    await Notification.updateMany(filter, { $set: { read: true } });
    res.json({ ok: true });
  })
);

export default router;
