import mongoose from 'mongoose';
import { FarmerProfile, Product, User, getSettings } from '../models/index.js';
import { round2 } from './http.js';

const WHOLE_UNITS = ['unit', 'dozen', 'bunch', 'g', 'ml'];

/** IDs of farmers whose products may be shown and sold. */
export async function sellableFarmerIds(extraFilter = {}) {
  const profiles = await FarmerProfile.find({ 'verification.status': 'approved', ...extraFilter })
    .select('user')
    .lean();
  const ids = profiles.map((p) => p.user);
  const active = await User.find({ _id: { $in: ids }, status: 'active' }).select('_id').lean();
  return active.map((u) => u._id);
}

export function serviceFeeFor(subtotal, settings) {
  const pct = Number(settings.serviceFeePercent) || 0;
  const cap = Number(settings.serviceFeeCap) || Infinity;
  return round2(Math.min(cap, (subtotal * pct) / 100));
}

/**
 * Price a cart on the server.
 * @param {{productId:string, qty:number}[]} items
 * @param {Record<string,'delivery'|'pickup'>} fulfillmentByFarmer
 * @returns quote with groups per farmer and a list of issues (empty when the cart can be ordered)
 */
export async function quoteCart(items, fulfillmentByFarmer = {}) {
  const settings = await getSettings();
  const issues = [];
  const merged = new Map();
  for (const it of items) {
    if (!mongoose.isValidObjectId(it.productId)) {
      issues.push({ productId: it.productId, message: 'This product no longer exists' });
      continue;
    }
    merged.set(it.productId, (merged.get(it.productId) || 0) + Number(it.qty));
  }

  const products = await Product.find({ _id: { $in: [...merged.keys()] } }).lean({ virtuals: false });
  const byId = new Map(products.map((p) => [String(p._id), p]));
  const farmerIds = [...new Set(products.map((p) => String(p.farmer)))];
  const profiles = await FarmerProfile.find({ user: { $in: farmerIds } }).lean();
  const users = await User.find({ _id: { $in: farmerIds } }).select('name status').lean();
  const profileBy = new Map(profiles.map((p) => [String(p.user), p]));
  const userBy = new Map(users.map((u) => [String(u._id), u]));

  const groups = new Map();
  for (const [productId, qtyRaw] of merged) {
    const p = byId.get(productId);
    if (!p) {
      issues.push({ productId, message: 'This product no longer exists' });
      continue;
    }
    const fid = String(p.farmer);
    const profile = profileBy.get(fid);
    const farmerUser = userBy.get(fid);
    const qty = round2(qtyRaw);
    const problem = (message) => issues.push({ productId, name: p.name, message });

    if (!p.isActive || p.isBlocked) problem(`${p.name} is not available right now`);
    else if (!profile || profile.verification.status !== 'approved' || farmerUser?.status !== 'active')
      problem(`${p.name}'s farmer is not taking orders right now`);
    else if (!(qty > 0)) problem(`Choose a quantity for ${p.name}`);
    else if (WHOLE_UNITS.includes(p.unit) && !Number.isInteger(qty)) problem(`${p.name} is sold in whole ${p.unit}s`);
    else if (qty < p.minOrderQty) problem(`Minimum order for ${p.name} is ${p.minOrderQty} ${p.unit}`);
    else if (qty > p.stock) problem(`Only ${p.stock} ${p.unit} of ${p.name} is in stock`);

    let unitPrice = p.price;
    for (const t of p.bulkTiers || []) if (qty >= t.minQty && t.price < unitPrice) unitPrice = t.price;

    if (!groups.has(fid)) {
      const f = profile?.fulfillment || {};
      groups.set(fid, {
        farmer: {
          id: fid,
          name: farmerUser?.name,
          farmName: profile?.farmName,
          location: profile?.location,
          offersDelivery: Boolean(f.offersDelivery),
          offersPickup: Boolean(f.offersPickup),
          deliveryFee: f.deliveryFee ?? 0,
          freeDeliveryAbove: f.freeDeliveryAbove ?? 0,
          deliveryArea: f.deliveryArea || '',
          pickupAddress: f.pickupAddress || '',
          prepHours: f.prepHours ?? 24,
        },
        items: [],
      });
    }
    groups.get(fid).items.push({
      productId,
      name: p.name,
      localNames: p.localNames,
      icon: p.icon,
      image: p.images?.[0]?.url || '',
      unit: p.unit,
      basePrice: p.price,
      price: unitPrice,
      bulkApplied: unitPrice < p.price,
      qty,
      stock: p.stock,
      minOrderQty: p.minOrderQty,
      lineTotal: round2(unitPrice * qty),
    });
  }

  const totals = { subtotal: 0, deliveryFee: 0, serviceFee: 0, total: 0 };
  const out = [];
  for (const g of groups.values()) {
    const f = g.farmer;
    let method = fulfillmentByFarmer[f.id];
    if (!method) method = f.offersDelivery ? 'delivery' : 'pickup';
    if (method === 'delivery' && !f.offersDelivery) {
      issues.push({ farmerId: f.id, message: `${f.farmName} offers pickup only` });
      method = 'pickup';
    }
    if (method === 'pickup' && !f.offersPickup) {
      issues.push({ farmerId: f.id, message: `${f.farmName} offers delivery only` });
      method = 'delivery';
    }
    const subtotal = round2(g.items.reduce((s, i) => s + i.lineTotal, 0));
    const freeDelivery = method === 'delivery' && f.freeDeliveryAbove > 0 && subtotal >= f.freeDeliveryAbove;
    const deliveryFee = method === 'delivery' && !freeDelivery ? round2(f.deliveryFee) : 0;
    const serviceFee = serviceFeeFor(subtotal, settings);
    const total = round2(subtotal + deliveryFee + serviceFee);
    out.push({ ...g, method, freeDelivery, subtotal, deliveryFee, serviceFee, total });
    totals.subtotal += subtotal;
    totals.deliveryFee += deliveryFee;
    totals.serviceFee += serviceFee;
    totals.total += total;
  }
  for (const k of Object.keys(totals)) totals[k] = round2(totals[k]);

  return {
    groups: out,
    totals,
    issues,
    fees: { serviceFeePercent: settings.serviceFeePercent, serviceFeeCap: settings.serviceFeeCap },
  };
}
