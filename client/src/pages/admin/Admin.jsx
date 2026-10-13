import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { LayoutDashboard, Tractor, Users, Tags, Package, Receipt, MessageSquareWarning, Settings, Check, X, Search } from 'lucide-react';
import { api, qs } from '../../api/client.js';
import { fmtDate, fmtDateTime, money } from '../../lib/format.js';
import DashboardShell from '../../components/DashboardShell.jsx';
import { Empty, Field, Modal, Notice, PaymentBadge, Spinner, StatusBadge, useFetch, useToast } from '../../components/ui.jsx';

/* The admin panel is an internal tool, so it is written in English only. */

export function AdminLayout() {
  const stats = useFetch(() => api.get('/admin/stats'), []);
  return (
    <DashboardShell
      title="Admin"
      links={[
        { to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true },
        { to: '/admin/farmers', label: 'Farmers', icon: Tractor, badge: stats.data?.users.pendingFarmers },
        { to: '/admin/orders', label: 'Orders', icon: Receipt },
        { to: '/admin/complaints', label: 'Complaints', icon: MessageSquareWarning, badge: stats.data?.complaints.open },
        { to: '/admin/users', label: 'Accounts', icon: Users },
        { to: '/admin/products', label: 'Products', icon: Package },
        { to: '/admin/categories', label: 'Categories', icon: Tags },
        { to: '/admin/settings', label: 'Fees', icon: Settings },
      ]}
    />
  );
}

function Stat({ label, value, to, tone }) {
  const body = (
    <>
      <p className="font-display text-3xl font-bold">{value}</p>
      <p className={`text-sm font-semibold ${tone ? '' : 'text-soil-500'}`}>{label}</p>
    </>
  );
  const cls = `block rounded-tile p-5 ${tone === 'warn' ? 'bg-turmeric-500 text-leaf-950' : 'border border-line bg-white hover:border-leaf-500'}`;
  return to ? <Link to={to} className={cls}>{body}</Link> : <div className={cls}>{body}</div>;
}

export function AdminOverview() {
  const { data, loading } = useFetch(() => api.get('/admin/stats'), []);
  if (loading || !data) return <Spinner />;
  const s = data;
  const statusOrder = ['placed', 'accepted', 'packed', 'out_for_delivery', 'ready_for_pickup', 'delivered', 'picked_up', 'rejected', 'cancelled'];
  const maxStatus = Math.max(1, ...Object.values(s.orders.byStatus));
  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Platform overview</h1>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Farmers waiting for verification" value={s.users.pendingFarmers} to="/admin/farmers?status=pending" tone={s.users.pendingFarmers ? 'warn' : undefined} />
        <Stat label="Open complaints" value={s.complaints.open} to="/admin/complaints?status=open" tone={s.complaints.open ? 'warn' : undefined} />
        <Stat label="Customers" value={s.users.customers} to="/admin/users?role=customer" />
        <Stat label="Farmers" value={s.users.farmers} to="/admin/farmers" />
        <Stat label="Completed order value" value={money(s.money.completedGMV)} to="/admin/orders" />
        <Stat label="Payments recorded by farmers" value={money(s.money.paidGMV)} to="/admin/orders?payment=paid" />
        <Stat label="Platform fees on paid orders" value={money(s.money.serviceFeesEarned)} />
        <Stat label="Awaiting payment (in progress)" value={money(s.money.awaitingPayment)} to="/admin/orders?payment=unpaid" />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="panel p-5">
          <h2 className="mb-4 font-sans text-lg font-bold">Orders by status ({s.orders.total})</h2>
          <ul className="space-y-2">
            {statusOrder.filter((k) => s.orders.byStatus[k]).map((k) => (
              <li key={k} className="grid grid-cols-[140px_1fr_40px] items-center gap-3 text-sm">
                <StatusBadge status={k} />
                <span className="h-2.5 rounded-full bg-leaf-100">
                  <span className="block h-full rounded-full bg-leaf-600" style={{ width: `${(s.orders.byStatus[k] / maxStatus) * 100}%` }} />
                </span>
                <span className="text-right font-semibold">{s.orders.byStatus[k]}</span>
              </li>
            ))}
          </ul>
        </section>
        <section className="panel p-5">
          <h2 className="mb-4 font-sans text-lg font-bold">Top farms by completed sales</h2>
          {s.topFarms.length === 0 ? (
            <p className="text-soil-500">No completed orders yet.</p>
          ) : (
            <ol className="divide-y divide-line">
              {s.topFarms.map((f) => (
                <li key={f.farmName} className="flex justify-between py-2.5">
                  <span>{f.farmName}</span>
                  <span className="font-semibold">{money(f.sales)}</span>
                </li>
              ))}
            </ol>
          )}
          <p className="mt-4 text-sm text-soil-500">
            {s.products.total} products listed · {s.products.blocked} blocked
          </p>
        </section>
      </div>
    </div>
  );
}

function FilterTabs({ value, onChange, options }) {
  return (
    <div className="scrollbar-none -mx-4 mb-5 flex gap-2 overflow-x-auto px-4">
      {options.map(([k, label]) => (
        <button key={k} onClick={() => onChange(k)} className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold ${value === k ? 'bg-leaf-900 text-white' : 'bg-leaf-50 text-soil-700'}`}>
          {label}
        </button>
      ))}
    </div>
  );
}

/* ---------- Farmers ---------- */

export function AdminFarmers() {
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const status = params.get('status') || 'pending';
  const { data, loading, reload } = useFetch(() => api.get(`/admin/farmers${qs({ status: status === 'all' ? '' : status })}`), [status]);
  const [rejecting, setRejecting] = useState(null);
  const [note, setNote] = useState('');

  async function verify(userId, s, n = '') {
    try {
      await api.patch(`/admin/farmers/${userId}/verify`, { status: s, note: n });
      toast(s === 'approved' ? 'Farm approved — products are now in the shop' : 'Farm marked as not approved');
      setRejecting(null);
      setNote('');
      reload();
    } catch (e) {
      toast(e.message, 'error');
    }
  }

  return (
    <div>
      <h1 className="mb-5 text-3xl font-bold">Farmer verification</h1>
      <FilterTabs value={status} onChange={(v) => setParams({ status: v })} options={[['pending', 'Waiting'], ['approved', 'Approved'], ['rejected', 'Not approved'], ['all', 'All']]} />
      {loading ? (
        <Spinner />
      ) : !data.farmers.length ? (
        <Empty title="No farmers here" />
      ) : (
        <ul className="space-y-3">
          {data.farmers.map((f) => (
            <li key={f._id} className="panel p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold">{f.farmName}</p>
                  <p className="text-sm text-soil-700">
                    {f.user?.name} · {f.user?.email} · {f.user?.phone}
                  </p>
                  <p className="text-sm text-soil-500">
                    {f.location.village}, {f.location.district}, {f.location.state} {f.location.pincode} · registered {fmtDate(f.createdAt)} · {f.productCount} products
                  </p>
                  {f.bio && <p className="mt-2 max-w-2xl text-sm text-soil-700">{f.bio}</p>}
                  {f.verification.note && <p className="mt-2 text-sm text-soil-500">Note: {f.verification.note}</p>}
                </div>
                <span className={`chip ${f.verification.status === 'approved' ? 'bg-leaf-100 text-leaf-800' : f.verification.status === 'rejected' ? 'bg-chilli-100 text-chilli-600' : 'bg-turmeric-100 text-turmeric-600'}`}>
                  {f.verification.status}
                </span>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {f.verification.status !== 'approved' && (
                  <button className="btn-primary btn-sm" onClick={() => verify(f.user._id, 'approved', 'Verified by admin')}>
                    <Check size={15} /> Approve
                  </button>
                )}
                {f.verification.status !== 'rejected' && (
                  <button className="btn-danger btn-sm" onClick={() => setRejecting(f)}>
                    <X size={15} /> Reject
                  </button>
                )}
                {f.verification.status === 'approved' && (
                  <Link to={`/farmers/${f.user._id}`} className="btn-ghost btn-sm">View farm page</Link>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      <Modal open={Boolean(rejecting)} onClose={() => setRejecting(null)} title={`Reject ${rejecting?.farmName}`}>
        <Field label="What should the farmer fix? (they will see this)" htmlFor="rj">
          <textarea id="rj" rows={3} className="input" value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
        <button className="btn-danger mt-4 w-full" disabled={note.trim().length < 3} onClick={() => verify(rejecting.user._id, 'rejected', note.trim())}>
          Reject farm
        </button>
      </Modal>
    </div>
  );
}

/* ---------- Accounts ---------- */

export function AdminUsers() {
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const role = params.get('role') || '';
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  const { data, loading, reload } = useFetch(() => api.get(`/admin/users${qs({ role, q: query })}`), [role, query]);
  const [suspending, setSuspending] = useState(null);
  const [reason, setReason] = useState('');

  async function setStatus(u, status, r = '') {
    try {
      await api.patch(`/admin/users/${u._id}/status`, { status, reason: r });
      toast(status === 'suspended' ? `${u.name} suspended` : `${u.name} reactivated`);
      setSuspending(null);
      setReason('');
      reload();
    } catch (e) {
      toast(e.message, 'error');
    }
  }

  return (
    <div>
      <h1 className="mb-5 text-3xl font-bold">Accounts</h1>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <FilterTabs value={role} onChange={(v) => setParams(v ? { role: v } : {})} options={[['', 'All'], ['customer', 'Customers'], ['farmer', 'Farmers'], ['admin', 'Admins']]} />
        <form
          className="relative ml-auto"
          onSubmit={(e) => {
            e.preventDefault();
            setQuery(q);
          }}
        >
          <Search size={16} className="absolute top-1/2 left-3 -translate-y-1/2 text-soil-500" />
          <input className="input py-2 pl-9" placeholder="Name, email or phone" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search accounts" />
        </form>
      </div>
      {loading ? (
        <Spinner />
      ) : (
        <div className="panel overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-line bg-leaf-50 text-soil-700">
              <tr>
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Role</th>
                <th className="px-4 py-3 font-semibold">Joined</th>
                <th className="px-4 py-3 font-semibold">Reports</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data.users.map((u) => (
                <tr key={u._id}>
                  <td className="px-4 py-3">
                    <p className="font-semibold">{u.name}</p>
                    <p className="text-soil-500">{u.email} · {u.phone}</p>
                  </td>
                  <td className="px-4 py-3 capitalize">{u.role}</td>
                  <td className="px-4 py-3">{fmtDate(u.createdAt)}</td>
                  <td className="px-4 py-3">{u.reportCount > 0 ? <span className="chip bg-turmeric-100 text-turmeric-600">{u.reportCount}</span> : '—'}</td>
                  <td className="px-4 py-3">
                    {u.status === 'active' ? <span className="chip bg-leaf-100 text-leaf-800">Active</span> : <span className="chip bg-chilli-100 text-chilli-600" title={u.suspendedReason}>Suspended</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {u.role !== 'admin' &&
                      (u.status === 'active' ? (
                        <button className="btn-danger btn-sm" onClick={() => setSuspending(u)}>Suspend</button>
                      ) : (
                        <button className="btn-outline btn-sm" onClick={() => setStatus(u, 'active')}>Reactivate</button>
                      ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="border-t border-line px-4 py-3 text-sm text-soil-500">{data.total} accounts</p>
        </div>
      )}
      <Modal open={Boolean(suspending)} onClose={() => setSuspending(null)} title={`Suspend ${suspending?.name}`}>
        <p className="mb-3 text-sm text-soil-700">They will be logged out and cannot log in. Farmers' products disappear from the shop.</p>
        <Field label="Reason (shown when they try to log in)" htmlFor="sr">
          <textarea id="sr" rows={3} className="input" value={reason} onChange={(e) => setReason(e.target.value)} />
        </Field>
        <button className="btn-danger mt-4 w-full" disabled={reason.trim().length < 3} onClick={() => setStatus(suspending, 'suspended', reason.trim())}>
          Suspend account
        </button>
      </Modal>
    </div>
  );
}

/* ---------- Categories ---------- */

export function AdminCategories() {
  const toast = useToast();
  const { data, loading, reload } = useFetch(() => api.get('/admin/categories'), []);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');

  async function save(e) {
    e.preventDefault();
    setError('');
    const body = { name: editing.name, icon: editing.icon, image: (editing.image || '').trim(), sortOrder: Number(editing.sortOrder) || 0, isActive: editing.isActive, localNames: editing.localNames || {} };
    try {
      if (editing._id) await api.put(`/admin/categories/${editing._id}`, body);
      else await api.post('/admin/categories', body);
      toast('Category saved');
      setEditing(null);
      reload();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Categories</h1>
        <button className="btn-primary" onClick={() => setEditing({ name: '', icon: '🌱', sortOrder: data?.categories.length || 0, isActive: true, localNames: {} })}>
          Add category
        </button>
      </div>
      {loading ? (
        <Spinner />
      ) : (
        <ul className="panel divide-y divide-line">
          {data.categories.map((c) => (
            <li key={c._id} className="flex flex-wrap items-center gap-4 px-4 py-3">
              {c.image ? <img src={c.image} alt="" className="h-12 w-12 rounded-xl object-cover" /> : <span className="text-3xl">{c.icon}</span>}
              <div className="flex-1">
                <p className="font-semibold">
                  {c.name} {!c.isActive && <span className="chip ml-1 bg-soil-300/30 text-soil-700">Hidden</span>}
                </p>
                <p className="text-sm text-soil-500">
                  {[c.localNames?.kn, c.localNames?.ta, c.localNames?.te].filter(Boolean).join(' · ')} — {c.productCount} products
                </p>
              </div>
              <button className="btn-outline btn-sm" onClick={() => setEditing(c)}>Edit</button>
              <button
                className="btn-ghost btn-sm text-chilli-600"
                onClick={async () => {
                  if (!window.confirm(`Delete ${c.name}?`)) return;
                  try {
                    await api.del(`/admin/categories/${c._id}`);
                    reload();
                  } catch (e) {
                    toast(e.message, 'error');
                  }
                }}
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
      <Modal open={Boolean(editing)} onClose={() => setEditing(null)} title={editing?._id ? 'Edit category' : 'Add category'}>
        {editing && (
          <form onSubmit={save} className="space-y-4">
            {error && <Notice tone="error">{error}</Notice>}
            <div className="grid grid-cols-[80px_1fr] gap-3">
              <Field label="Icon" htmlFor="ci"><input id="ci" className="input text-center text-2xl" value={editing.icon} onChange={(e) => setEditing({ ...editing, icon: e.target.value })} /></Field>
              <Field label="Name (English)" htmlFor="cn"><input id="cn" className="input" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></Field>
            </div>
            <Field label="Photo link (https://…, optional)" htmlFor="cimg">
              <input id="cimg" className="input" value={editing.image || ''} onChange={(e) => setEditing({ ...editing, image: e.target.value })} />
            </Field>
            <div className="grid grid-cols-3 gap-3">
              {[['kn', 'ಕನ್ನಡ'], ['ta', 'தமிழ்'], ['te', 'తెలుగు']].map(([k, l]) => (
                <Field key={k} label={l} htmlFor={`cl-${k}`}>
                  <input id={`cl-${k}`} className="input" value={editing.localNames?.[k] || ''} onChange={(e) => setEditing({ ...editing, localNames: { ...editing.localNames, [k]: e.target.value } })} />
                </Field>
              ))}
            </div>
            <div className="grid grid-cols-2 items-end gap-3">
              <Field label="Order" htmlFor="co"><input id="co" inputMode="numeric" className="input" value={editing.sortOrder} onChange={(e) => setEditing({ ...editing, sortOrder: e.target.value })} /></Field>
              <label className="flex items-center gap-2 pb-3 text-[15px]">
                <input type="checkbox" className="h-4 w-4 accent-leaf-700" checked={editing.isActive} onChange={(e) => setEditing({ ...editing, isActive: e.target.checked })} /> Visible in shop
              </label>
            </div>
            <button className="btn-primary w-full">Save category</button>
          </form>
        )}
      </Modal>
    </div>
  );
}

/* ---------- Products ---------- */

export function AdminProducts() {
  const toast = useToast();
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  const [blockedOnly, setBlockedOnly] = useState(false);
  const { data, loading, reload } = useFetch(() => api.get(`/admin/products${qs({ q: query, blocked: blockedOnly ? 'true' : '' })}`), [query, blockedOnly]);
  const [blocking, setBlocking] = useState(null);
  const [reason, setReason] = useState('');

  async function setBlocked(p, blocked, r = '') {
    try {
      await api.patch(`/admin/products/${p._id}/block`, { blocked, reason: r });
      toast(blocked ? 'Product blocked' : 'Product unblocked');
      setBlocking(null);
      setReason('');
      reload();
    } catch (e) {
      toast(e.message, 'error');
    }
  }

  return (
    <div>
      <h1 className="mb-5 text-3xl font-bold">Products</h1>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <form className="relative" onSubmit={(e) => { e.preventDefault(); setQuery(q); }}>
          <Search size={16} className="absolute top-1/2 left-3 -translate-y-1/2 text-soil-500" />
          <input className="input py-2 pl-9" placeholder="Search products" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search products" />
        </form>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="accent-leaf-700" checked={blockedOnly} onChange={(e) => setBlockedOnly(e.target.checked)} /> Blocked only
        </label>
      </div>
      {loading ? (
        <Spinner />
      ) : (
        <div className="panel overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-line bg-leaf-50 text-soil-700">
              <tr>
                <th className="px-4 py-3 font-semibold">Product</th>
                <th className="px-4 py-3 font-semibold">Farm</th>
                <th className="px-4 py-3 font-semibold">Price</th>
                <th className="px-4 py-3 font-semibold">Stock</th>
                <th className="px-4 py-3 font-semibold">State</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data.products.map((p) => (
                <tr key={p._id}>
                  <td className="px-4 py-3"><span className="mr-2">{p.icon}</span><span className="font-semibold">{p.name}</span><span className="block text-soil-500">{p.category?.name}</span></td>
                  <td className="px-4 py-3">{p.farmName}<span className="block text-soil-500">{p.farmer?.name}</span></td>
                  <td className="px-4 py-3">{money(p.price)} / {p.unit}</td>
                  <td className="px-4 py-3">{p.stock}</td>
                  <td className="px-4 py-3">
                    {p.isBlocked ? <span className="chip bg-chilli-100 text-chilli-600" title={p.blockedReason}>Blocked</span> : p.isActive ? <span className="chip bg-leaf-100 text-leaf-800">Live</span> : <span className="chip bg-soil-300/30 text-soil-700">Hidden by farmer</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {p.isBlocked ? <button className="btn-outline btn-sm" onClick={() => setBlocked(p, false)}>Unblock</button> : <button className="btn-danger btn-sm" onClick={() => setBlocking(p)}>Block</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="border-t border-line px-4 py-3 text-sm text-soil-500">{data.total} products</p>
        </div>
      )}
      <Modal open={Boolean(blocking)} onClose={() => setBlocking(null)} title={`Block ${blocking?.name}`}>
        <Field label="Reason (the farmer will see this)" htmlFor="br">
          <textarea id="br" rows={3} className="input" value={reason} onChange={(e) => setReason(e.target.value)} />
        </Field>
        <button className="btn-danger mt-4 w-full" disabled={reason.trim().length < 3} onClick={() => setBlocked(blocking, true, reason.trim())}>Block product</button>
      </Modal>
    </div>
  );
}

/* ---------- Orders & transactions ---------- */

export function AdminOrders() {
  const [params, setParams] = useSearchParams();
  const status = params.get('status') || '';
  const payment = params.get('payment') || '';
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  const { data, loading } = useFetch(() => api.get(`/admin/orders${qs({ status, payment, q: query })}`), [status, payment, query]);
  const set = (k, v) => {
    const next = new URLSearchParams(params);
    if (v) next.set(k, v);
    else next.delete(k);
    setParams(next);
  };

  return (
    <div>
      <h1 className="mb-5 text-3xl font-bold">Orders & payments</h1>
      <div className="mb-5 flex flex-wrap gap-3">
        <select className="input w-auto py-2" value={status} onChange={(e) => set('status', e.target.value)} aria-label="Status">
          <option value="">All statuses</option>
          {['placed', 'accepted', 'packed', 'out_for_delivery', 'ready_for_pickup', 'delivered', 'picked_up', 'rejected', 'cancelled'].map((s) => (
            <option key={s} value={s}>{s.replaceAll('_', ' ')}</option>
          ))}
        </select>
        <select className="input w-auto py-2" value={payment} onChange={(e) => set('payment', e.target.value)} aria-label="Payment">
          <option value="">Paid and unpaid</option>
          <option value="paid">Paid</option>
          <option value="unpaid">Unpaid</option>
        </select>
        <form className="relative" onSubmit={(e) => { e.preventDefault(); setQuery(q); }}>
          <Search size={16} className="absolute top-1/2 left-3 -translate-y-1/2 text-soil-500" />
          <input className="input py-2 pl-9" placeholder="Order number" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Order number" />
        </form>
      </div>
      {loading ? (
        <Spinner />
      ) : !data.orders.length ? (
        <Empty title="No orders match" />
      ) : (
        <div className="panel overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="border-b border-line bg-leaf-50 text-soil-700">
              <tr>
                <th className="px-4 py-3 font-semibold">Order</th>
                <th className="px-4 py-3 font-semibold">Customer</th>
                <th className="px-4 py-3 font-semibold">Farm</th>
                <th className="px-4 py-3 text-right font-semibold">Items</th>
                <th className="px-4 py-3 text-right font-semibold">Delivery</th>
                <th className="px-4 py-3 text-right font-semibold">Fee</th>
                <th className="px-4 py-3 text-right font-semibold">Total</th>
                <th className="px-4 py-3 font-semibold">Payment</th>
                <th className="px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data.orders.map((o) => (
                <tr key={o._id}>
                  <td className="px-4 py-3"><p className="font-semibold">{o.orderNumber}</p><p className="text-soil-500">{fmtDateTime(o.createdAt)}</p></td>
                  <td className="px-4 py-3">{o.customer?.name}</td>
                  <td className="px-4 py-3">{o.farmName}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{money(o.charges.subtotal)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{money(o.charges.deliveryFee)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{money(o.charges.serviceFee)}</td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums">{money(o.charges.total)}</td>
                  <td className="px-4 py-3"><PaymentBadge status={o.payment.status} /><span className="block text-xs text-soil-500">{o.payment.method.replaceAll('_', ' ')}</span></td>
                  <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="border-t border-line px-4 py-3 text-sm text-soil-500">{data.total} orders. Payments are cash/UPI collected by farmers and recorded by them.</p>
        </div>
      )}
    </div>
  );
}

/* ---------- Complaints ---------- */

export function AdminComplaints() {
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const status = params.get('status') || 'open';
  const { data, loading, reload } = useFetch(() => api.get(`/admin/complaints${qs({ status: status === 'all' ? '' : status })}`), [status]);
  const [notes, setNotes] = useState({});

  async function update(c, s) {
    try {
      await api.patch(`/admin/complaints/${c._id}`, { status: s, adminNote: notes[c._id] ?? c.adminNote ?? '' });
      toast('Complaint updated');
      reload();
    } catch (e) {
      toast(e.message, 'error');
    }
  }

  return (
    <div>
      <h1 className="mb-5 text-3xl font-bold">Complaints & reports</h1>
      <FilterTabs value={status} onChange={(v) => setParams({ status: v })} options={[['open', 'Open'], ['in_review', 'In review'], ['resolved', 'Resolved'], ['dismissed', 'Closed'], ['all', 'All']]} />
      {loading ? (
        <Spinner />
      ) : !data.complaints.length ? (
        <Empty title="Nothing here" />
      ) : (
        <ul className="space-y-4">
          {data.complaints.map((c) => (
            <li key={c._id} className="panel p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold">{c.subject}</p>
                  <p className="text-sm text-soil-500">
                    From {c.raisedBy?.name} ({c.raisedBy?.role}) · {fmtDateTime(c.createdAt)} · about {c.type}
                    {c.order && ` · order ${c.order.orderNumber}`}
                  </p>
                  {c.against && (
                    <p className="mt-1 text-sm">
                      Against <strong>{c.against.name}</strong> ({c.against.role}, {c.against.status}) — <Link to={`/admin/users?role=${c.against.role}`} className="link">manage account</Link>
                    </p>
                  )}
                </div>
                <StatusBadge status={c.status} />
              </div>
              <p className="mt-3 text-soil-700">{c.message}</p>
              <div className="mt-4">
                <label className="label" htmlFor={`n-${c._id}`}>Reply to the person who raised this</label>
                <textarea id={`n-${c._id}`} rows={2} className="input" defaultValue={c.adminNote} onChange={(e) => setNotes({ ...notes, [c._id]: e.target.value })} />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {c.status !== 'in_review' && <button className="btn-outline btn-sm" onClick={() => update(c, 'in_review')}>Mark in review</button>}
                {c.status !== 'resolved' && <button className="btn-primary btn-sm" onClick={() => update(c, 'resolved')}>Resolve</button>}
                {c.status !== 'dismissed' && <button className="btn-ghost btn-sm" onClick={() => update(c, 'dismissed')}>Close without action</button>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ---------- Fees ---------- */

export function AdminSettings() {
  const toast = useToast();
  const [s, setS] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    api.get('/admin/settings').then((d) => setS(d.settings));
  }, []);
  if (!s) return <Spinner />;
  return (
    <form
      className="max-w-xl space-y-5"
      onSubmit={async (e) => {
        e.preventDefault();
        try {
          const d = await api.put('/admin/settings', { serviceFeePercent: Number(s.serviceFeePercent), serviceFeeCap: Number(s.serviceFeeCap) });
          setS(d.settings);
          setError('');
          toast('Fees saved — new orders use these values');
        } catch (err) {
          setError(err.message);
        }
      }}
    >
      <h1 className="text-3xl font-bold">Platform fee</h1>
      <p className="text-soil-700">Customers see this fee as a separate line in the cart, at checkout and on receipts. Existing orders keep the fee they were placed with.</p>
      {error && <Notice tone="error">{error}</Notice>}
      <div className="panel grid gap-4 p-5 sm:grid-cols-2">
        <Field label="Fee (% of item total)" htmlFor="sf"><input id="sf" inputMode="decimal" className="input" value={s.serviceFeePercent} onChange={(e) => setS({ ...s, serviceFeePercent: e.target.value })} /></Field>
        <Field label="Maximum per farm order (₹)" htmlFor="sc"><input id="sc" inputMode="decimal" className="input" value={s.serviceFeeCap} onChange={(e) => setS({ ...s, serviceFeeCap: e.target.value })} /></Field>
        <p className="text-sm text-soil-500 sm:col-span-2">Example: on a ₹500 order the fee is {money(Math.min(Number(s.serviceFeeCap) || 0, (500 * (Number(s.serviceFeePercent) || 0)) / 100))}.</p>
      </div>
      <button className="btn-primary">Save fees</button>
    </form>
  );
}
