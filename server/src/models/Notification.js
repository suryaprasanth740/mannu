import mongoose from 'mongoose';

/**
 * In-app notifications. Text is not stored: the client renders `type` + `params`
 * in the reader's own language.
 */
const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: {
      type: String,
      required: true,
      enum: ['order_new', 'order_status', 'order_cancelled', 'farm_verification', 'complaint_update', 'stock_low'],
    },
    params: { type: mongoose.Schema.Types.Mixed, default: {} },
    link: { type: String, default: '' },
    read: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

export const Notification = mongoose.model('Notification', notificationSchema);

/** Create a notification; never let a notification failure break the main action. */
export async function notify(user, type, params = {}, link = '') {
  try {
    await Notification.create({ user, type, params, link });
  } catch (e) {
    console.error('notify failed', e.message);
  }
}
