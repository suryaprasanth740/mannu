/* Seed demo data:  npm run seed            (only into an empty database)
 *                  npm run seed -- --reset (wipe Mannu collections first) */
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { Category, Complaint, DEFAULT_SETTINGS, FarmerProfile, Notification, Order, Product, Review, Setting, User } from '../models/index.js';
import { round2 } from '../utils/http.js';
import { serviceFeeFor } from '../utils/pricing.js';
import { newGroupId, newOrderNumber } from '../utils/orderFlow.js';
import * as data from './data.js';
import { categoryPhotos, farmCovers, photo, productPhotos } from './images.js';

const reset = process.argv.includes('--reset');

async function makeUser(info, role) {
  const user = new User({ name: info.name, email: info.email, phone: info.phone, role, language: info.language || 'en', addresses: info.addresses || [] });
  await user.setPassword(data.DEMO_PASSWORD);
  return user.save();
}

export async function seed() {
  if (reset) {
    for (const M of [User, FarmerProfile, Category, Product, Order, Review, Complaint, Setting, Notification]) await M.deleteMany({});
    console.log('Cleared existing data');
  } else if (await User.exists({})) {
    console.log('Database already has users. Run with --reset to replace it with demo data.');
    return;
  }

  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) await Setting.create({ key, value });
  const settings = { ...DEFAULT_SETTINGS };

  const cats = new Map();
  for (const c of data.categories) {
    const image = categoryPhotos[c.slug] ? photo(categoryPhotos[c.slug], 600) : '';
    cats.set(c.slug, await Category.create({ ...c, image }));
  }

  await makeUser(data.admin, 'admin');

  const farmerUsers = new Map();
  const profiles = new Map();
  for (const f of data.farmers) {
    const user = await makeUser(f, 'farmer');
    const profile = await FarmerProfile.create({
      user: user._id,
      ...f.profile,
      coverPhoto: farmCovers[f.key] ? { url: photo(farmCovers[f.key], 1600) } : undefined,
      verification: f.pending
        ? { status: 'pending' }
        : { status: 'approved', note: 'Farm visit and Aadhaar-linked bank account verified', reviewedAt: new Date(Date.now() - 20 * 86400000) },
    });
    farmerUsers.set(f.key, user);
    profiles.set(f.key, profile);
  }

  const products = new Map();
  for (const p of data.products) {
    const { farmer, cat, ...rest } = p;
    const images = productPhotos[p.name] ? [{ url: photo(productPhotos[p.name]) }] : [];
    const doc = await Product.create({ ...rest, images, farmer: farmerUsers.get(farmer)._id, category: cats.get(cat)._id });
    products.set(p.name, doc);
  }

  const customers = [];
  for (const c of data.customers) customers.push(await makeUser(c, 'customer'));
  const [priya, arun] = customers;

  /* ---- Order history so dashboards have something to show ---- */
  const ago = (days, hours = 0) => new Date(Date.now() - days * 86400000 - hours * 3600000);

  async function order({ customer, farmerKey, lines, method = 'delivery', payment = 'cash_on_delivery', flow, paid = false, placedAt, groupId = newGroupId() }) {
    const profile = profiles.get(farmerKey);
    const items = lines.map(([name, qty]) => {
      const p = products.get(name);
      const price = p.unitPriceFor(qty);
      return { product: p._id, name: p.name, localNames: p.localNames, icon: p.icon, image: p.images?.[0]?.url || '', unit: p.unit, price, qty, lineTotal: round2(price * qty) };
    });
    const subtotal = round2(items.reduce((s, i) => s + i.lineTotal, 0));
    const f = profile.fulfillment;
    const deliveryFee = method === 'delivery' && !(f.freeDeliveryAbove > 0 && subtotal >= f.freeDeliveryAbove) ? f.deliveryFee : 0;
    const serviceFee = serviceFeeFor(subtotal, settings);
    const history = flow.map((status, i) => ({ status, at: new Date(placedAt.getTime() + i * 5 * 3600000) }));
    if (paid) history.push({ status: 'payment_received', at: new Date(placedAt.getTime() + flow.length * 5 * 3600000), note: 'Payment received by farmer' });
    const status = flow[flow.length - 1];
    const addr = customer.addresses[0];
    const doc = await Order.create({
      orderNumber: newOrderNumber(),
      groupId,
      customer: customer._id,
      farmer: profile.user,
      farmName: profile.farmName,
      items,
      fulfillment:
        method === 'delivery'
          ? { method, address: { fullName: addr.fullName, phone: addr.phone, line1: addr.line1, line2: addr.line2, city: addr.city, district: addr.district, state: addr.state, pincode: addr.pincode } }
          : { method, pickupAddress: f.pickupAddress },
      charges: { subtotal, deliveryFee, serviceFee, total: round2(subtotal + deliveryFee + serviceFee) },
      payment: { method: method === 'pickup' ? 'pay_at_pickup' : payment, status: paid ? 'paid' : 'unpaid', paidAt: paid ? history[history.length - 1].at : undefined },
      status,
      statusHistory: history,
      estimatedReadyAt: new Date(placedAt.getTime() + f.prepHours * 3600000),
      stockDeducted: !['placed', 'rejected', 'cancelled'].includes(status),
    });
    // Write the historical dates with the raw driver: Mongoose treats createdAt as immutable.
    await Order.collection.updateOne({ _id: doc._id }, { $set: { createdAt: placedAt, updatedAt: history[history.length - 1].at } });
    if (doc.stockDeducted) {
      for (const it of items) await Product.updateOne({ _id: it.product }, { $inc: { soldQty: it.qty } });
    }
    return doc;
  }

  const d1 = await order({ customer: priya, farmerKey: 'lakshmi', lines: [['Tomato (Nati)', 2], ['Coriander', 2], ['Palak (Spinach)', 1], ['Beans (French)', 1]], flow: ['placed', 'accepted', 'packed', 'out_for_delivery', 'delivered'], paid: true, placedAt: ago(9) });
  const d2 = await order({ customer: priya, farmerKey: 'ramesh', lines: [['Guava (Allahabad Safeda)', 3], ['Yelakki banana', 1]], method: 'pickup', flow: ['placed', 'accepted', 'packed', 'ready_for_pickup', 'picked_up'], paid: true, placedAt: ago(5) });
  const d3 = await order({ customer: arun, farmerKey: 'murugan', lines: [['Ponni boiled rice', 25], ['Urad dal (whole, black)', 10]], flow: ['placed', 'accepted', 'packed', 'out_for_delivery', 'delivered'], paid: true, placedAt: ago(12) });
  await order({ customer: arun, farmerKey: 'venkata', lines: [['Groundnut oil (wood-pressed)', 5], ['Ragi (Finger millet)', 10]], payment: 'upi_on_delivery', flow: ['placed', 'accepted', 'packed', 'out_for_delivery', 'delivered'], paid: true, placedAt: ago(7) });
  await order({ customer: arun, farmerKey: 'ramesh', lines: [['Tomato (Hybrid, crate)', 25]], flow: ['placed', 'accepted'], placedAt: ago(1, 3) });
  const honey = await order({ customer: priya, farmerKey: 'savitha', lines: [['Forest honey (500 g jar)', 1], ['Black pepper (Malabar)', 0.25]], payment: 'upi_on_delivery', flow: ['placed', 'accepted', 'packed', 'out_for_delivery'], placedAt: ago(2) });
  await order({ customer: priya, farmerKey: 'lakshmi', lines: [['Thick curd (Mosaru)', 2]], flow: ['placed', 'rejected'], placedAt: ago(3) }).then((o) =>
    Order.updateOne({ _id: o._id }, { rejectionReason: 'Curd sold out for the day', 'statusHistory.1.note': 'Curd sold out for the day' })
  );
  const g = newGroupId();
  const newL = await order({ customer: priya, farmerKey: 'lakshmi', lines: [['Tomato (Nati)', 3], ['Dantu soppu (Amaranth)', 2], ['Cow milk (Nati)', 2]], flow: ['placed'], placedAt: ago(0, 2), groupId: g });
  const newV = await order({ customer: priya, farmerKey: 'venkata', lines: [['Fresh groundnut (in shell)', 2], ['Foxtail millet (Navane)', 2]], flow: ['placed'], placedAt: ago(0, 2), groupId: g });

  const reviews = [
    [priya, 'Tomato (Nati)', d1, 5, 'Proper nati tomatoes — the rasam tasted like my grandmother\'s.'],
    [priya, 'Palak (Spinach)', d1, 4, 'Very fresh, a little sand on the roots but fine after washing.'],
    [priya, 'Guava (Allahabad Safeda)', d2, 5, 'Crunchy and sweet. Ramesh anna packed them in newspaper so none were bruised.'],
    [arun, 'Ponni boiled rice', d3, 5, 'We use 25 kg a week at the mess. Cooks soft and stays fresh till evening.'],
    [arun, 'Urad dal (whole, black)', d3, 4, 'Good batter rise. Bag was slightly torn but nothing was lost.'],
  ];
  for (const [customer, name, ord, rating, comment] of reviews) {
    await Review.create({ product: products.get(name)._id, customer: customer._id, order: ord._id, rating, comment });
    await Product.updateOne({ _id: products.get(name)._id }, { ratingAvg: rating, ratingCount: 1 });
  }

  // A few notifications so the bell has something to show
  for (const o of [newL, newV]) {
    await Notification.create({ user: o.farmer, type: 'order_new', params: { orderNumber: o.orderNumber, customer: priya.name, total: o.charges.total }, link: '/farmer/orders?view=new' });
  }
  await Notification.create({ user: priya._id, type: 'order_status', params: { orderNumber: d1.orderNumber, farmName: d1.farmName, status: 'delivered' }, link: '/orders', read: true });
  await Notification.create({ user: priya._id, type: 'order_status', params: { orderNumber: honey.orderNumber, farmName: honey.farmName, status: 'out_for_delivery' }, link: '/orders' });

  await Complaint.create({
    raisedBy: arun._id,
    against: farmerUsers.get('murugan')._id,
    order: d3._id,
    type: 'order',
    subject: 'Rice delivered a day late',
    message: 'The 25 kg rice bag came a day after the estimated time and I had to buy from the shop for that day. Rice quality was good.',
    status: 'open',
  });

  console.log('\nDemo data ready. Every account uses the password:', data.DEMO_PASSWORD);
  console.log('  Admin    :', data.admin.email);
  console.log('  Customer :', data.customers.map((c) => c.email).join(', '));
  console.log('  Farmers  :', data.farmers.map((f) => `${f.email}${f.pending ? ' (awaiting verification)' : ''}`).join(', '));
}

if (process.argv[1] && process.argv[1].endsWith('seed.js')) {
  connectDB()
    .then(seed)
    .then(() => mongoose.disconnect())
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
