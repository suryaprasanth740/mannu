// End-to-end API tests. Needs a running MongoDB; uses a separate "mannu_test" database.
//   MONGODB_URI=mongodb://127.0.0.1:27017/mannu_test npm test
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';

process.env.NODE_ENV = 'test';
process.env.SERVE_CLIENT = 'false';
process.env.MONGODB_URI ||= 'mongodb://127.0.0.1:27017/mannu_test';
if (!process.env.MONGODB_URI.includes('test')) throw new Error('Refusing to run tests against a non-test database');
process.argv.push('--reset');

const { connectDB } = await import('../src/config/db.js');
const { createApp } = await import('../src/app.js');
const { seed } = await import('../src/seed/seed.js');

let server;
let base;

/** Tiny client that keeps its own session cookie, like a browser tab. */
function client() {
  let cookie = '';
  async function call(method, path, body) {
    const res = await fetch(base + path, {
      method,
      headers: { ...(body ? { 'content-type': 'application/json' } : {}), ...(cookie ? { cookie } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    const set = res.headers.get('set-cookie');
    if (set) cookie = set.split(';')[0];
    const json = await res.json().catch(() => ({}));
    return { status: res.status, body: json };
  }
  return {
    get: (p) => call('GET', p),
    post: (p, b = {}) => call('POST', p, b),
    put: (p, b) => call('PUT', p, b),
    patch: (p, b) => call('PATCH', p, b),
    del: (p) => call('DELETE', p),
    login: (email) => call('POST', '/api/auth/login', { email, password: 'Mannu@2026' }),
  };
}

before(async () => {
  await connectDB();
  await seed();
  server = createApp().listen(0);
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  server?.close();
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

test('catalog hides products of unverified farmers', async () => {
  const c = client();
  const { body } = await c.get('/api/products?limit=100');
  assert.ok(body.total > 20);
  assert.ok(!body.products.some((p) => p.name.startsWith('Jaggery')), 'pending farmer product is hidden');
  assert.ok(body.products.every((p) => p.stock > 0), 'out-of-stock hidden by default');
  assert.ok(body.products.every((p) => p.farmer.farmName), 'every product shows its farmer');
});

test('search, filters and localized names', async () => {
  const c = client();
  const kn = await c.get('/api/products?q=' + encodeURIComponent('ಟೊಮೆಟೊ'));
  assert.ok(kn.body.products.some((p) => p.name.startsWith('Tomato')));
  const bulk = await c.get('/api/products?bulk=true&limit=100');
  assert.ok(bulk.body.products.length > 0 && bulk.body.products.every((p) => p.bulkTiers.length > 0));
  const district = await c.get('/api/products?district=Kolar&limit=100');
  assert.ok(district.body.products.every((p) => p.farmer.location.district === 'Kolar'));
  const price = await c.get('/api/products?maxPrice=50&limit=100');
  assert.ok(price.body.products.every((p) => p.price <= 50));
});

test('registration validates input and creates role-specific accounts', async () => {
  const c = client();
  const bad = await c.post('/api/auth/register', { role: 'customer', name: 'A', email: 'nope', phone: '123', password: 'short' });
  assert.equal(bad.status, 400);
  const farmer = await c.post('/api/auth/register', {
    role: 'farmer', name: 'New Farmer', email: 'newfarmer@example.com', phone: '9876543210', password: 'GoodPass1',
    farmName: 'Test Farm', village: 'Hosur', district: 'Krishnagiri', state: 'Tamil Nadu', pincode: '635109',
  });
  assert.equal(farmer.status, 201);
  assert.equal(farmer.body.farmerProfile.verification.status, 'pending');
  const dup = await client().post('/api/auth/register', { role: 'customer', name: 'Dup', email: 'newfarmer@example.com', phone: '9876543210', password: 'GoodPass1' });
  assert.equal(dup.status, 400);
});

test('role-based access is enforced', async () => {
  const anon = client();
  assert.equal((await anon.get('/api/farmer/products')).status, 401);
  const cust = client();
  await cust.login('customer@mannu.in');
  assert.equal((await cust.get('/api/farmer/products')).status, 403);
  assert.equal((await cust.get('/api/admin/stats')).status, 403);
  const farmer = client();
  await farmer.login('lakshmi@mannu.in');
  assert.equal((await farmer.get('/api/admin/users')).status, 403);
  assert.equal((await farmer.post('/api/orders', { items: [] })).status, 403);
});

test('full order flow: quote → checkout across two farmers → accept deducts stock → deliver → pay → review', async () => {
  const shop = client();
  const list = (await shop.get('/api/products?limit=100')).body.products;
  const tomato = list.find((p) => p.name === 'Tomato (Nati)');
  const ragi = list.find((p) => p.name.startsWith('Ragi'));

  const cust = client();
  const me = (await cust.login('customer@mannu.in')).body.user;
  const items = [
    { productId: tomato._id, qty: 16 },
    { productId: ragi._id, qty: 2 },
  ];
  const quote = (await cust.post('/api/cart/quote', { items })).body;
  assert.equal(quote.issues.length, 0);
  assert.equal(quote.groups.length, 2, 'split by farmer');
  const tGroup = quote.groups.find((g) => g.items.some((i) => i.productId === tomato._id));
  assert.equal(tGroup.items[0].price, 27, 'bulk tier applied at 10 kg+');
  assert.equal(tGroup.deliveryFee, 0, 'free delivery above ₹400');

  const noAddr = await cust.post('/api/orders', { items });
  assert.equal(noAddr.status, 400);

  const placed = await cust.post('/api/orders', { items, addressId: me.addresses[0]._id, paymentMethod: 'cash_on_delivery' });
  assert.equal(placed.status, 201);
  assert.equal(placed.body.orders.length, 2);
  assert.equal(placed.body.totals.total, quote.totals.total, 'checkout total matches the quote');
  const order = placed.body.orders.find((o) => o.farmName === 'Lakshmi Tota');
  assert.equal(order.payment.status, 'unpaid');

  const farmer = client();
  await farmer.login('lakshmi@mannu.in');
  const skip = await farmer.patch(`/api/farmer/orders/${order._id}/status`, { status: 'delivered' });
  assert.equal(skip.status, 400, 'cannot skip steps');
  const stockBefore = (await shop.get(`/api/products/${tomato._id}`)).body.product.stock;
  assert.equal((await farmer.patch(`/api/farmer/orders/${order._id}/status`, { status: 'accepted' })).status, 200);
  const stockAfter = (await shop.get(`/api/products/${tomato._id}`)).body.product.stock;
  assert.equal(stockAfter, stockBefore - 16, 'stock deducted on accept');

  assert.equal((await cust.post(`/api/orders/${order._id}/cancel`)).status, 400, 'customer cannot cancel after acceptance');
  const earlyReview = await cust.post('/api/reviews', { productId: tomato._id, rating: 5 });
  // customer already has a delivered tomato order from seed data, so this succeeds; check a fresh product instead
  assert.ok([200, 201].includes(earlyReview.status));

  for (const s of ['packed', 'out_for_delivery', 'delivered']) {
    assert.equal((await farmer.patch(`/api/farmer/orders/${order._id}/status`, { status: s })).status, 200, s);
  }
  const paid = await farmer.patch(`/api/farmer/orders/${order._id}/payment`, { status: 'paid' });
  assert.equal(paid.body.order.payment.status, 'paid');

  const receipt = await cust.get(`/api/orders/group/${placed.body.groupId}`);
  assert.equal(receipt.status, 200);
  assert.equal(receipt.body.orders.length, 2);

  const other = client();
  await other.login('arun@mannu.in');
  assert.equal((await other.get(`/api/orders/group/${placed.body.groupId}`)).status, 403, 'other customers cannot see the receipt');
});

test('rating requires a received order', async () => {
  const cust = client();
  await cust.login('customer@mannu.in');
  const list = (await client().get('/api/products?limit=100')).body.products;
  const pepperlessItem = list.find((p) => p.name.startsWith('Green cardamom'));
  const r = await cust.post('/api/reviews', { productId: pepperlessItem._id, rating: 4 });
  assert.equal(r.status, 403);
});

test('reject needs a reason; cancel restores stock; stock guard on accept', async () => {
  const shop = client();
  const list = (await shop.get('/api/products?limit=100')).body.products;
  const curd = list.find((p) => p.name.startsWith('Thick curd'));
  const cust = client();
  const me = (await cust.login('arun@mannu.in')).body.user;
  const farmer = client();
  await farmer.login('lakshmi@mannu.in');

  const o1 = (await cust.post('/api/orders', { items: [{ productId: curd._id, qty: 2 }], addressId: me.addresses[0]._id })).body.orders[0];
  assert.equal((await farmer.patch(`/api/farmer/orders/${o1._id}/status`, { status: 'rejected' })).status, 400);
  assert.equal((await farmer.patch(`/api/farmer/orders/${o1._id}/status`, { status: 'rejected', note: 'Sold out today' })).status, 200);

  const o2 = (await cust.post('/api/orders', { items: [{ productId: curd._id, qty: 3 }], addressId: me.addresses[0]._id })).body.orders[0];
  await farmer.patch(`/api/farmer/products/${curd._id}/stock`, { stock: 1 });
  const fail = await farmer.patch(`/api/farmer/orders/${o2._id}/status`, { status: 'accepted' });
  assert.equal(fail.status, 409, 'cannot accept more than stock');
  await farmer.patch(`/api/farmer/products/${curd._id}/stock`, { stock: 10 });
  await farmer.patch(`/api/farmer/orders/${o2._id}/status`, { status: 'accepted' });
  assert.equal((await shop.get(`/api/products/${curd._id}`)).body.product.stock, 7);
  await farmer.patch(`/api/farmer/orders/${o2._id}/status`, { status: 'cancelled', note: 'Cow fell ill, no curd this week' });
  assert.equal((await shop.get(`/api/products/${curd._id}`)).body.product.stock, 10, 'stock restored');
});

test('farmer product management with validation', async () => {
  const farmer = client();
  await farmer.login('lakshmi@mannu.in');
  const cats = (await client().get('/api/categories')).body.categories;
  const veg = cats.find((c) => c.slug === 'vegetables');
  const bad = await farmer.post('/api/farmer/products', { name: 'Okra', category: veg._id, unit: 'kg', price: 40, stock: 10, bulkTiers: [{ minQty: 5, price: 45 }] });
  assert.equal(bad.status, 400, 'bulk price must be lower');
  const ok = await farmer.post('/api/farmer/products', { name: 'Okra', category: veg._id, unit: 'kg', price: 40, stock: 10, minOrderQty: 0.5 });
  assert.equal(ok.status, 201);
  const other = client();
  await other.login('ramesh@mannu.in');
  assert.equal((await other.del(`/api/farmer/products/${ok.body.product._id}`)).status, 404, 'cannot touch another farmer’s product');
  assert.equal((await farmer.del(`/api/farmer/products/${ok.body.product._id}`)).status, 200);
});

test('admin verifies farmers, suspends accounts and sets fees', async () => {
  const admin = client();
  await admin.login('admin@mannu.in');
  const pending = (await admin.get('/api/admin/farmers?status=pending')).body.farmers;
  const anjali = pending.find((f) => f.farmName === 'Kaveri Bella Mane');
  assert.ok(anjali);
  await admin.patch(`/api/admin/farmers/${anjali.user._id}/verify`, { status: 'approved' });
  const after = (await client().get('/api/products?limit=100')).body.products;
  assert.ok(after.some((p) => p.name.startsWith('Jaggery')), 'approved farmer products become visible');

  const arun = (await admin.get('/api/admin/users?q=arun')).body.users[0];
  assert.equal((await admin.patch(`/api/admin/users/${arun._id}/status`, { status: 'suspended' })).status, 400, 'reason required');
  await admin.patch(`/api/admin/users/${arun._id}/status`, { status: 'suspended', reason: 'Repeated fake orders' });
  assert.equal((await client().login('arun@mannu.in')).status, 401);
  await admin.patch(`/api/admin/users/${arun._id}/status`, { status: 'active' });

  const s = await admin.put('/api/admin/settings', { serviceFeePercent: 3, serviceFeeCap: 30 });
  assert.equal(s.body.settings.serviceFeePercent, 3);
  const stats = await admin.get('/api/admin/stats');
  assert.ok(stats.body.orders.total > 5);
});

test('complaints can only reference your own orders', async () => {
  const cust = client();
  await cust.login('customer@mannu.in');
  const mine = (await cust.get('/api/orders/mine')).body.orders[0];
  const ok = await cust.post('/api/complaints', { type: 'order', subject: 'Late order', message: 'My order arrived very late.', orderId: mine._id });
  assert.equal(ok.status, 201);
  const other = client();
  await other.login('arun@mannu.in');
  const no = await other.post('/api/complaints', { type: 'order', subject: 'Not mine', message: 'Trying to report this order.', orderId: mine._id });
  assert.equal(no.status, 403);
});

test('cross-site POSTs are blocked', async () => {
  const res = await fetch(base + '/api/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: 'https://evil.example' },
    body: JSON.stringify({ email: 'customer@mannu.in', password: 'Mannu@2026' }),
  });
  assert.equal(res.status, 403);
});

test('notifications follow the order and can be marked read', async () => {
  const list = (await client().get('/api/products?limit=100')).body.products;
  const banana = list.find((p) => p.name === 'Yelakki banana');
  const cust = client();
  const me = (await cust.login('customer@mannu.in')).body.user;
  const farmer = client();
  await farmer.login('ramesh@mannu.in');
  const before = (await farmer.get('/api/notifications')).body.unread;

  const order = (await cust.post('/api/orders', { items: [{ productId: banana._id, qty: 2 }], addressId: me.addresses[0]._id })).body.orders[0];
  const fNotes = (await farmer.get('/api/notifications')).body;
  assert.equal(fNotes.unread, before + 1);
  assert.equal(fNotes.notifications[0].type, 'order_new');
  assert.equal(fNotes.notifications[0].params.orderNumber, order.orderNumber);

  await farmer.patch(`/api/farmer/orders/${order._id}/status`, { status: 'accepted' });
  const cNotes = (await cust.get('/api/notifications')).body;
  assert.equal(cNotes.notifications[0].type, 'order_status');
  assert.equal(cNotes.notifications[0].params.status, 'accepted');

  await cust.post('/api/notifications/read', {});
  assert.equal((await cust.get('/api/notifications')).body.unread, 0);
  assert.equal((await client().get('/api/notifications')).status, 401);
});

test('catalog: seasonal calendar and reorder lookups by id', async () => {
  const c = client();
  const seasonal = (await c.get('/api/products?seasonal=true&inStock=false&limit=100')).body.products;
  assert.ok(seasonal.length >= 5 && seasonal.every((p) => p.seasonal));
  assert.ok(seasonal.some((p) => p.name === 'Badami mango'), 'out-of-season, out-of-stock items still appear in the calendar');
  const ids = seasonal.slice(0, 3).map((p) => p._id);
  const byIds = (await c.get(`/api/products?ids=${ids.join(',')}&inStock=false`)).body.products;
  assert.deepEqual(byIds.map((p) => p._id).sort(), ids.sort());
  const withPhotos = (await c.get('/api/products?limit=100')).body.products;
  assert.ok(withPhotos.every((p) => p.images.length > 0), 'every demo product has a photo');
  const farmers = (await c.get('/api/farmers')).body.farmers;
  assert.ok(farmers.every((f) => f.coverPhoto), 'every farm has a cover photo');
});
