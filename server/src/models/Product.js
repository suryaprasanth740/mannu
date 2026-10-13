import mongoose from 'mongoose';

export const UNITS = ['kg', 'g', 'litre', 'ml', 'unit', 'dozen', 'bunch'];

const productSchema = new mongoose.Schema(
  {
    farmer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    localNames: { kn: String, ta: String, te: String },
    description: { type: String, trim: true, maxlength: 1000, default: '' },
    images: [{ url: { type: String, required: true }, publicId: String }],
    icon: { type: String, default: '' },
    unit: { type: String, enum: UNITS, required: true },
    price: { type: Number, required: true, min: 0 },
    stock: { type: Number, required: true, min: 0 },
    minOrderQty: { type: Number, min: 0.001, default: 1 },
    bulkTiers: [
      {
        _id: false,
        minQty: { type: Number, required: true, min: 1 },
        price: { type: Number, required: true, min: 0 },
      },
    ],
    seasonal: { type: Boolean, default: false },
    seasonMonths: [{ type: Number, min: 1, max: 12 }],
    harvestedOn: Date,
    isOrganic: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    isBlocked: { type: Boolean, default: false },
    blockedReason: { type: String, default: '' },
    ratingAvg: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
    soldQty: { type: Number, default: 0 },
  },
  { timestamps: true }
);

/** Price per unit for a given quantity, applying the best bulk tier reached. */
productSchema.methods.unitPriceFor = function unitPriceFor(qty) {
  let price = this.price;
  for (const tier of this.bulkTiers || []) {
    if (qty >= tier.minQty && tier.price < price) price = tier.price;
  }
  return price;
};

export const Product = mongoose.model('Product', productSchema);
