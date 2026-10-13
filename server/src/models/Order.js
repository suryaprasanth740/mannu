import mongoose from 'mongoose';

export const ORDER_STATUSES = [
  'placed',
  'accepted',
  'rejected',
  'packed',
  'out_for_delivery',
  'ready_for_pickup',
  'delivered',
  'picked_up',
  'cancelled',
];

export const PAYMENT_METHODS = ['cash_on_delivery', 'upi_on_delivery', 'pay_at_pickup'];

/** Allowed next statuses for the farmer, by fulfillment method. */
export const FARMER_TRANSITIONS = {
  delivery: {
    placed: ['accepted', 'rejected'],
    accepted: ['packed', 'cancelled'],
    packed: ['out_for_delivery', 'cancelled'],
    out_for_delivery: ['delivered'],
  },
  pickup: {
    placed: ['accepted', 'rejected'],
    accepted: ['packed', 'cancelled'],
    packed: ['ready_for_pickup', 'cancelled'],
    ready_for_pickup: ['picked_up'],
  },
};

export const COMPLETED_STATUSES = ['delivered', 'picked_up'];
export const CLOSED_STATUSES = ['delivered', 'picked_up', 'rejected', 'cancelled'];

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, required: true, unique: true },
    groupId: { type: String, required: true, index: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    farmer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    farmName: { type: String, required: true },
    items: [
      {
        _id: false,
        product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
        name: String,
        localNames: { kn: String, ta: String, te: String },
        icon: String,
        image: String,
        unit: String,
        price: Number,
        qty: Number,
        lineTotal: Number,
      },
    ],
    fulfillment: {
      method: { type: String, enum: ['delivery', 'pickup'], required: true },
      address: {
        fullName: String,
        phone: String,
        line1: String,
        line2: String,
        city: String,
        district: String,
        state: String,
        pincode: String,
      },
      pickupAddress: String,
    },
    charges: {
      subtotal: { type: Number, required: true },
      deliveryFee: { type: Number, required: true },
      serviceFee: { type: Number, required: true },
      total: { type: Number, required: true },
    },
    payment: {
      method: { type: String, enum: PAYMENT_METHODS, required: true },
      status: { type: String, enum: ['unpaid', 'paid'], default: 'unpaid' },
      paidAt: Date,
    },
    status: { type: String, enum: ORDER_STATUSES, default: 'placed', index: true },
    statusHistory: [{ _id: false, status: String, at: { type: Date, default: Date.now }, note: String }],
    estimatedReadyAt: Date,
    customerNote: { type: String, maxlength: 300, default: '' },
    rejectionReason: { type: String, default: '' },
    stockDeducted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const Order = mongoose.model('Order', orderSchema);
