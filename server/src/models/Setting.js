import mongoose from 'mongoose';

const settingSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    value: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true }
);

export const Setting = mongoose.model('Setting', settingSchema);

export const DEFAULT_SETTINGS = {
  serviceFeePercent: 2,
  serviceFeeCap: 25,
};

export async function getSettings() {
  const docs = await Setting.find({ key: { $in: Object.keys(DEFAULT_SETTINGS) } }).lean();
  const out = { ...DEFAULT_SETTINGS };
  for (const d of docs) out[d.key] = d.value;
  return out;
}
