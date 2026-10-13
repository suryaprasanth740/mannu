import mongoose from 'mongoose';

const farmerProfileSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    farmName: { type: String, required: true, trim: true, maxlength: 100 },
    bio: { type: String, trim: true, maxlength: 600, default: '' },
    farmingPractices: { type: String, trim: true, maxlength: 200, default: '' },
    location: {
      village: { type: String, trim: true, required: true },
      district: { type: String, trim: true, required: true, index: true },
      state: { type: String, trim: true, required: true },
      pincode: { type: String, trim: true, default: '' },
    },
    photo: { url: String, publicId: String },
    coverPhoto: { url: String, publicId: String },
    verification: {
      status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending', index: true },
      note: { type: String, default: '' },
      reviewedAt: Date,
    },
    fulfillment: {
      offersDelivery: { type: Boolean, default: true },
      deliveryFee: { type: Number, min: 0, default: 40 },
      freeDeliveryAbove: { type: Number, min: 0, default: 0 },
      deliveryArea: { type: String, trim: true, default: '' },
      offersPickup: { type: Boolean, default: true },
      pickupAddress: { type: String, trim: true, default: '' },
      prepHours: { type: Number, min: 1, max: 168, default: 24 },
    },
  },
  { timestamps: true }
);

export const FarmerProfile = mongoose.model('FarmerProfile', farmerProfileSchema);
