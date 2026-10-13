import { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { CheckCircle2, Package, Printer, Truck, Store, Clock, Star, Flag, RotateCcw } from 'lucide-react';
import { useCart } from '../context/CartContext.jsx';
import { api } from '../api/client.js';
import { useI18n } from '../i18n/index.jsx';
import { clampQty, fmtDate, fmtDateTime, money, qtyLabel, unitLabel } from '../lib/format.js';
import { Empty, Modal, Notice, PaymentBadge, ProductImage, Spinner, StarInput, StatusBadge, useFetch, useToast } from '../components/ui.jsx';
import OrderTimeline from '../components/OrderTimeline.jsx';
import { ComplaintForm } from './Help.jsx';

const PAY_LABEL = { cash_on_delivery: 'pay_cod', upi_on_delivery: 'pay_upi', pay_at_pickup: 'pay_pickup' };

function ReviewModal({ item, existing, onClose, onSaved }) {
  const { t, ln } = useI18n();
  const toast = useToast();
  const [rating, setRating] = useState(existing?.rating || 0);
  const [comment, setComment] = useState(existing?.comment || '');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <Modal open onClose={onClose} title={`${t('rate')}: ${ln(item)}`}>
      <div className="space-y-4">
        <div>
          <p className="label">{t('your_rating')}</p>
          <StarInput value={rating} onChange={setRating} />
        </div>
        <div>
          <label className="label" htmlFor="rv">{t('write_review')}</label>
          <textarea id="rv" rows={3} maxLength={600} className="input" value={comment} onChange={(e) => setComment(e.target.value)} />
        </div>
        {error && <Notice tone="error">{error}</Notice>}
        <button
          className="btn-primary w-full"
          disabled={!rating || busy}
          onClick={async () => {
            setBusy(true);
            try {
              const r = await api.post('/reviews', { productId: item.product, rating, comment });
              onSaved(r.review);
              toast(t('saved'));
              onClose();
            } catch (e) {
              setError(e.message);
            } finally {
              setBusy(false);
            }
          }}
        >
          {t('submit_review')}
        </button>
      </div>
    </Modal>
  );
}

function OrderCard({ order, reviews, onChange, onReviewed }) {
  const { t, ln, lang } = useI18n();
  const toast = useToast();
  const [reviewing, setReviewing] = useState(null);
  const [reporting, setReporting] = useState(false);
  const { add } = useCart();
  const navigate = useNavigate();
  const completed = ['delivered', 'picked_up'].includes(order.status);
  const reviewBy = Object.fromEntries(reviews.map((r) => [String(r.product), r]));
  const a = order.fulfillment.address;

  return (
    <article className="panel overflow-hidden">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
        <div>
          <p className="font-semibold">{order.farmName}</p>
          <p className="text-sm text-soil-500">
            {t('order_no')} {order.orderNumber} · {fmtDateTime(order.createdAt, lang)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <PaymentBadge status={order.payment.status} />
          <StatusBadge status={order.status} />
        </div>
      </header>
      <div className="space-y-5 px-4 py-5 sm:px-5">
        <OrderTimeline order={order} />
        <ul className="divide-y divide-line">
          {order.items.map((i) => {
            const rv = reviewBy[String(i.product)];
            return (
              <li key={String(i.product)} className="flex items-center gap-3 py-2.5">
                <span className="h-12 w-12 shrink-0 overflow-hidden rounded-lg">
                  <ProductImage product={i} size="sm" />
                </span>
                <span className="min-w-0 flex-1">
                  <Link to={`/product/${i.product}`} className="font-semibold hover:text-leaf-700">{ln(i)}</Link>
                  <span className="block text-sm text-soil-500">
                    {qtyLabel(i.qty, i.unit, t)} × {money(i.price)} / {unitLabel(i.unit, t)}
                  </span>
                </span>
                <span className="text-right">
                  <span className="block font-semibold tabular-nums">{money(i.lineTotal)}</span>
                  {completed && (
                    <button onClick={() => setReviewing(i)} className="mt-0.5 flex items-center gap-1 text-sm font-semibold text-leaf-700 hover:underline">
                      <Star size={14} className={rv ? 'fill-turmeric-500 text-turmeric-500' : ''} /> {rv ? `${rv.rating}/5` : t('rate')}
                    </button>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
        <div className="grid gap-4 text-sm sm:grid-cols-2">
          <div className="flex gap-2.5 text-soil-700">
            {order.fulfillment.method === 'delivery' ? <Truck size={18} className="shrink-0 text-leaf-700" /> : <Store size={18} className="shrink-0 text-leaf-700" />}
            <span>
              {order.fulfillment.method === 'delivery' ? (
                <>
                  {a.fullName}, {a.line1}, {a.city} {a.pincode}
                </>
              ) : (
                t('pickup_only_note', { address: order.fulfillment.pickupAddress })
              )}
              <span className="mt-1 flex items-center gap-1 text-soil-500">
                <Clock size={13} /> {t('estimated_ready')}: {fmtDateTime(order.estimatedReadyAt, lang)}
              </span>
            </span>
          </div>
          <dl className="space-y-1">
            <div className="flex justify-between"><dt className="text-soil-500">{t('subtotal')}</dt><dd>{money(order.charges.subtotal)}</dd></div>
            <div className="flex justify-between"><dt className="text-soil-500">{t('delivery_fee')}</dt><dd>{order.charges.deliveryFee ? money(order.charges.deliveryFee) : t('free')}</dd></div>
            <div className="flex justify-between"><dt className="text-soil-500">{t('service_fee')}</dt><dd>{money(order.charges.serviceFee)}</dd></div>
            <div className="flex justify-between font-bold"><dt>{t('total')}</dt><dd>{money(order.charges.total)}</dd></div>
            <div className="flex justify-between text-soil-500"><dt>{t('payment_method')}</dt><dd>{t(PAY_LABEL[order.payment.method])}</dd></div>
          </dl>
        </div>
      </div>
      <footer className="flex flex-wrap gap-2 border-t border-line px-4 py-3 sm:px-5">
        <Link to={`/orders/receipt/${order.groupId}`} className="btn-ghost btn-sm">
          <Printer size={15} /> {t('receipt')}
        </Link>
        <button className="btn-ghost btn-sm" onClick={() => setReporting(true)}>
          <Flag size={15} /> {t('report_problem')}
        </button>
        {order.status !== 'placed' && (
          <button
            className="btn-outline btn-sm"
            onClick={async () => {
              try {
                const ids = order.items.map((i) => String(i.product)).join(',');
                const { products } = await api.get(`/products?ids=${ids}&limit=60`);
                let n = 0;
                for (const item of order.items) {
                  const p = products.find((x) => x._id === String(item.product));
                  if (!p || p.stock <= 0) continue;
                  add(p, clampQty(item.qty, p));
                  n++;
                }
                if (!n) {
                  toast(t('reorder_none'), 'error');
                  return;
                }
                toast(t('reorder_added', { n }));
                navigate('/cart');
              } catch (e) {
                toast(e.message, 'error');
              }
            }}
          >
            <RotateCcw size={15} /> {t('reorder')}
          </button>
        )}
        {order.status === 'placed' && (
          <button
            className="btn-danger btn-sm ml-auto"
            onClick={async () => {
              if (!window.confirm(t('cancel_confirm'))) return;
              try {
                const r = await api.post(`/orders/${order._id}/cancel`, {});
                onChange(r.order);
                toast(t('status_cancelled'));
              } catch (e) {
                toast(e.message, 'error');
              }
            }}
          >
            {t('cancel_order')}
          </button>
        )}
      </footer>
      {reviewing && <ReviewModal item={reviewing} existing={reviewBy[String(reviewing.product)]} onClose={() => setReviewing(null)} onSaved={onReviewed} />}
      <Modal open={reporting} onClose={() => setReporting(false)} title={t('report_problem')} wide>
        <ComplaintForm
          fixedOrder={order}
          onDone={() => {
            setReporting(false);
            toast(t('saved'));
          }}
        />
      </Modal>
    </article>
  );
}

export function MyOrders() {
  const { t } = useI18n();
  const orders = useFetch(() => api.get('/orders/mine'), []);
  const reviews = useFetch(() => api.get('/reviews/mine'), []);
  const [filter, setFilter] = useState('all');

  const list = useMemo(() => {
    const all = orders.data?.orders || [];
    if (filter === 'active') return all.filter((o) => !['delivered', 'picked_up', 'rejected', 'cancelled'].includes(o.status));
    if (filter === 'done') return all.filter((o) => ['delivered', 'picked_up', 'rejected', 'cancelled'].includes(o.status));
    return all;
  }, [orders.data, filter]);

  if (orders.loading) return <Spinner />;
  return (
    <div className="container-page max-w-4xl py-8">
      <h1 className="mb-5 text-3xl font-bold sm:text-4xl">{t('nav_orders')}</h1>
      <div className="mb-6 flex gap-2">
        {[
          ['all', t('f_view_all')],
          ['active', t('f_view_active')],
          ['done', t('f_view_done')],
        ].map(([k, label]) => (
          <button key={k} onClick={() => setFilter(k)} className={`rounded-full px-4 py-1.5 text-sm font-semibold ${filter === k ? 'bg-leaf-900 text-white' : 'bg-leaf-50 text-soil-700'}`}>
            {label}
          </button>
        ))}
      </div>
      {list.length === 0 ? (
        <Empty icon={Package} title={t('no_orders')} hint={t('no_orders_hint')} action={<Link to="/shop" className="btn-primary">{t('hero_cta')}</Link>} />
      ) : (
        <div className="space-y-5">
          {list.map((o) => (
            <OrderCard
              key={o._id}
              order={o}
              reviews={reviews.data?.reviews || []}
              onChange={(updated) => orders.setData((d) => ({ ...d, orders: d.orders.map((x) => (x._id === updated._id ? updated : x)) }))}
              onReviewed={(r) => reviews.setData((d) => ({ reviews: [...(d?.reviews || []).filter((x) => String(x.product) !== String(r.product)), r] }))}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function Receipt() {
  const { groupId } = useParams();
  const { state } = useLocation();
  const { t, ln, lang } = useI18n();
  const { data, loading, error } = useFetch(() => api.get(`/orders/group/${groupId}`), [groupId]);
  if (loading) return <Spinner />;
  if (error) return <Empty title={error.message} />;

  return (
    <div className="container-page max-w-3xl py-8">
      {state?.justPlaced && (
        <div className="mb-8 flex items-start gap-4 rounded-[28px] bg-leaf-700 p-6 text-white print:hidden">
          <CheckCircle2 size={36} className="shrink-0 text-turmeric-500" />
          <div>
            <h1 className="text-3xl font-bold text-white">{t('order_placed')}</h1>
            <p className="mt-1 text-leaf-100">{t('order_placed_sub')}</p>
            <Link to="/orders" className="btn-accent btn-sm mt-4">{t('view_orders')}</Link>
          </div>
        </div>
      )}
      <div className="panel p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line pb-5">
          <div>
            <h2 className="text-2xl font-bold">{t('receipt')}</h2>
            <p className="text-sm text-soil-500">
              {t('placed_on')} {fmtDate(data.orders[0].createdAt, lang)} · {data.customer.name}
            </p>
          </div>
          <button className="btn-outline btn-sm print:hidden" onClick={() => window.print()}>
            <Printer size={15} /> {t('print')}
          </button>
        </div>
        {data.orders.map((o) => (
          <section key={o._id} className="border-b border-line py-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-semibold">{o.farmName}</p>
                <p className="text-sm text-soil-500">
                  {t('order_no')} {o.orderNumber} · {t(o.fulfillment.method)} · {t(PAY_LABEL[o.payment.method])}
                </p>
              </div>
              <div className="flex gap-2">
                <PaymentBadge status={o.payment.status} />
                <StatusBadge status={o.status} />
              </div>
            </div>
            <table className="mt-3 w-full text-[15px]">
              <tbody>
                {o.items.map((i) => (
                  <tr key={String(i.product)}>
                    <td className="py-1">{ln(i)}</td>
                    <td className="py-1 text-soil-500">{qtyLabel(i.qty, i.unit, t)} × {money(i.price)}</td>
                    <td className="py-1 text-right tabular-nums">{money(i.lineTotal)}</td>
                  </tr>
                ))}
                <tr className="text-soil-500">
                  <td colSpan={2} className="pt-2">{t('delivery_fee')}</td>
                  <td className="pt-2 text-right">{o.charges.deliveryFee ? money(o.charges.deliveryFee) : t('free')}</td>
                </tr>
                <tr className="text-soil-500">
                  <td colSpan={2}>{t('service_fee')}</td>
                  <td className="text-right">{money(o.charges.serviceFee)}</td>
                </tr>
                <tr className={`font-semibold ${['rejected', 'cancelled'].includes(o.status) ? 'text-soil-300 line-through' : ''}`}>
                  <td colSpan={2} className="pt-1">{t('total')}</td>
                  <td className="pt-1 text-right">{money(o.charges.total)}</td>
                </tr>
              </tbody>
            </table>
          </section>
        ))}
        <div className="flex justify-between pt-5 text-xl font-bold">
          <span>{t('grand_total')}</span>
          <span>{money(data.totals.total)}</span>
        </div>
        <p className="mt-3 text-sm text-soil-500">{t('pay_note')}</p>
      </div>
    </div>
  );
}
