import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Phone, Truck, Store, Clock, Check, X, Wallet, MessageSquare } from 'lucide-react';
import { api } from '../../api/client.js';
import { useI18n } from '../../i18n/index.jsx';
import { fmtDateTime, money, qtyLabel } from '../../lib/format.js';
import { Empty, Modal, Notice, PaymentBadge, Spinner, StatusBadge, useFetch, useToast } from '../../components/ui.jsx';
import OrderTimeline from '../../components/OrderTimeline.jsx';

const NEXT = {
  delivery: { accepted: 'packed', packed: 'out_for_delivery', out_for_delivery: 'delivered' },
  pickup: { accepted: 'packed', packed: 'ready_for_pickup', ready_for_pickup: 'picked_up' },
};

function ReasonModal({ title, onClose, onConfirm }) {
  const { t } = useI18n();
  const [note, setNote] = useState('');
  const quick = ['Not enough stock today', 'Cannot deliver to this area', 'Crop damaged by rain'];
  return (
    <Modal open onClose={onClose} title={title}>
      <p className="mb-3 text-sm text-soil-700">{t('f_reject_reason')}</p>
      <div className="mb-3 flex flex-wrap gap-2">
        {quick.map((q) => (
          <button key={q} type="button" className="btn-outline btn-sm" onClick={() => setNote(q)}>
            {q}
          </button>
        ))}
      </div>
      <textarea rows={3} className="input" value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} aria-label={t('reason')} />
      <button className="btn-danger btn-lg mt-4 w-full" disabled={note.trim().length < 3} onClick={() => onConfirm(note.trim())}>
        {title}
      </button>
    </Modal>
  );
}

function FarmerOrderCard({ order, onUpdate }) {
  const { t, ln, lang } = useI18n();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [asking, setAsking] = useState(null); // 'rejected' | 'cancelled'
  const method = order.fulfillment.method;
  const next = NEXT[method][order.status];
  const a = order.fulfillment.address;
  const earn = order.charges.subtotal + order.charges.deliveryFee;
  const canRecordPay = ['out_for_delivery', 'ready_for_pickup', 'delivered', 'picked_up'].includes(order.status) && order.payment.status === 'unpaid';

  async function change(status, note = '') {
    setBusy(true);
    try {
      const d = await api.patch(`/farmer/orders/${order._id}/status`, { status, note });
      onUpdate({ ...d.order, customer: order.customer });
      toast(t(`status_${status}`));
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setBusy(false);
      setAsking(null);
    }
  }

  return (
    <article className={`panel overflow-hidden ${order.status === 'placed' ? 'border-2 border-turmeric-500' : ''}`}>
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
        <div>
          <p className="font-semibold">
            {order.customer?.name}{' '}
            {order.customer?.phone && (
              <a href={`tel:${order.customer.phone}`} className="ml-1 inline-flex items-center gap-1 text-sm font-semibold text-leaf-700">
                <Phone size={14} /> {order.customer.phone}
              </a>
            )}
          </p>
          <p className="text-sm text-soil-500">
            {order.orderNumber} · {fmtDateTime(order.createdAt, lang)}
          </p>
        </div>
        <div className="flex gap-2">
          <PaymentBadge status={order.payment.status} />
          <StatusBadge status={order.status} />
        </div>
      </header>

      <div className="grid gap-5 px-4 py-4 sm:px-5 md:grid-cols-[1.2fr_1fr]">
        <div>
          <ul className="space-y-1.5">
            {order.items.map((i) => (
              <li key={String(i.product)} className="flex justify-between gap-3 text-[15px]">
                <span>
                  <span className="mr-1.5" aria-hidden="true">{i.icon}</span>
                  <strong>{qtyLabel(i.qty, i.unit, t)}</strong> {ln(i)}
                </span>
                <span className="tabular-nums text-soil-700">{money(i.lineTotal)}</span>
              </li>
            ))}
          </ul>
          {order.customerNote && (
            <p className="mt-3 flex gap-2 rounded-xl bg-leaf-50 p-3 text-sm">
              <MessageSquare size={16} className="shrink-0 text-leaf-700" /> {order.customerNote}
            </p>
          )}
        </div>
        <div className="space-y-2 text-sm">
          <p className="flex gap-2">
            {method === 'delivery' ? <Truck size={17} className="shrink-0 text-leaf-700" /> : <Store size={17} className="shrink-0 text-leaf-700" />}
            {method === 'delivery' ? (
              <span>
                <span className="font-semibold">{t('f_deliver_to')}:</span> {a.fullName}, {a.line1}
                {a.line2 && `, ${a.line2}`}, {a.city}, {a.district} {a.pincode} ({a.phone})
              </span>
            ) : (
              <span className="font-semibold">{t('f_customer_picks')}</span>
            )}
          </p>
          <p className="flex gap-2">
            <Clock size={17} className="shrink-0 text-leaf-700" /> {t('estimated_ready')}: {fmtDateTime(order.estimatedReadyAt, lang)}
          </p>
          <div className="rounded-xl bg-leaf-50 p-3">
            <p className="flex justify-between font-semibold">
              <span>{t('f_you_receive')}</span> <span>{money(earn)}</span>
            </p>
            <p className="mt-0.5 text-xs text-soil-500">
              {t('grand_total')} {money(order.charges.total)} — {t('f_service_fee_note', { fee: money(order.charges.serviceFee) })}
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 pb-4 sm:px-5">
        <OrderTimeline order={order} />
      </div>

      {(order.status === 'placed' || next || canRecordPay || ['accepted', 'packed'].includes(order.status)) && (
        <footer className="flex flex-wrap gap-2 border-t border-line bg-leaf-50/60 px-4 py-3 sm:px-5">
          {order.status === 'placed' && (
            <>
              <button className="btn-primary btn-lg flex-1 sm:flex-none" disabled={busy} onClick={() => change('accepted')}>
                <Check size={18} /> {t('f_accept')}
              </button>
              <button className="btn-danger btn-lg" disabled={busy} onClick={() => setAsking('rejected')}>
                <X size={18} /> {t('f_reject')}
              </button>
            </>
          )}
          {next && (
            <button className="btn-primary btn-lg flex-1 sm:flex-none" disabled={busy} onClick={() => change(next)}>
              <Check size={18} /> {t('f_mark', { status: t(`status_${next}`) })}
            </button>
          )}
          {canRecordPay && (
            <button
              className="btn-accent btn-lg"
              disabled={busy}
              onClick={async () => {
                try {
                  const d = await api.patch(`/farmer/orders/${order._id}/payment`, { status: 'paid' });
                  onUpdate({ ...d.order, customer: order.customer });
                  toast(t('status_payment_received'));
                } catch (e) {
                  toast(e.message, 'error');
                }
              }}
            >
              <Wallet size={18} /> {t('f_record_payment')} · {money(order.charges.total)}
            </button>
          )}
          {['accepted', 'packed'].includes(order.status) && (
            <button className="btn-ghost ml-auto text-chilli-600" disabled={busy} onClick={() => setAsking('cancelled')}>
              {t('f_cancel_order')}
            </button>
          )}
        </footer>
      )}
      {asking && <ReasonModal title={asking === 'rejected' ? t('f_reject') : t('f_cancel_order')} onClose={() => setAsking(null)} onConfirm={(note) => change(asking, note)} />}
    </article>
  );
}

export default function FarmerOrders() {
  const { t } = useI18n();
  const [params, setParams] = useSearchParams();
  const view = params.get('view') || 'new';
  const { data, loading, error, setData } = useFetch(() => api.get(`/farmer/orders?view=${view}`), [view]);

  const tabs = [
    ['new', t('f_view_new')],
    ['active', t('f_view_active')],
    ['done', t('f_view_done')],
    ['closed', t('f_view_closed')],
    ['all', t('f_view_all')],
  ];

  return (
    <div>
      <h1 className="mb-5 text-3xl font-bold">{t('f_orders')}</h1>
      <div className="scrollbar-none -mx-4 mb-6 flex gap-2 overflow-x-auto px-4">
        {tabs.map(([k, label]) => (
          <button key={k} onClick={() => setParams({ view: k })} className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold ${view === k ? 'bg-leaf-900 text-white' : 'bg-leaf-50 text-soil-700'}`}>
            {label}
          </button>
        ))}
      </div>
      {error && <Notice tone="error">{error.message}</Notice>}
      {loading ? (
        <Spinner />
      ) : !data?.orders.length ? (
        <Empty title={t('f_no_orders')} />
      ) : (
        <div className="space-y-4">
          {data.orders.map((o) => (
            <FarmerOrderCard key={o._id} order={o} onUpdate={(u) => setData((d) => ({ orders: d.orders.map((x) => (x._id === u._id ? u : x)) }))} />
          ))}
        </div>
      )}
    </div>
  );
}
