import { useState } from 'react';
import { LifeBuoy } from 'lucide-react';
import { api } from '../api/client.js';
import { useI18n } from '../i18n/index.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { fmtDate } from '../lib/format.js';
import { Empty, Field, Modal, Notice, Spinner, StatusBadge, fieldErrors, useFetch, useToast } from '../components/ui.jsx';

export function ComplaintForm({ fixedOrder, onDone }) {
  const { t } = useI18n();
  const { user } = useAuth();
  const ordersPath = user?.role === 'farmer' ? '/farmer/orders' : '/orders/mine';
  const orders = useFetch(() => (fixedOrder ? Promise.resolve({ orders: [] }) : api.get(ordersPath)), [fixedOrder]);
  const [form, setForm] = useState({ type: 'order', orderId: fixedOrder?._id || '', subject: '', message: '' });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    const errs = {};
    if (form.subject.trim().length < 4) errs.subject = t('subject');
    if (form.message.trim().length < 10) errs.message = t('describe');
    if (form.type === 'order' && !form.orderId) errs.orderId = t('which_order');
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    setError('');
    try {
      const body = { type: form.type, subject: form.subject, message: form.message };
      if (form.type === 'order' && form.orderId) body.orderId = form.orderId;
      const r = await api.post('/complaints', body);
      onDone?.(r.complaint);
    } catch (err) {
      setError(err.message);
      setErrors(fieldErrors(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      {error && <Notice tone="error">{error}</Notice>}
      {!fixedOrder && (
        <Field label={t('complaint_type')} htmlFor="c-type">
          <select id="c-type" className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            {['order', 'product', 'account', 'other'].map((k) => (
              <option key={k} value={k}>
                {t(`type_${k}`)}
              </option>
            ))}
          </select>
        </Field>
      )}
      {form.type === 'order' && !fixedOrder && (
        <Field label={t('which_order')} error={errors.orderId} htmlFor="c-order">
          <select id="c-order" className={`input ${errors.orderId ? 'input-error' : ''}`} value={form.orderId} onChange={(e) => setForm({ ...form, orderId: e.target.value })}>
            <option value="">—</option>
            {orders.data?.orders.map((o) => (
              <option key={o._id} value={o._id}>
                {o.orderNumber} — {o.farmName} ({fmtDate(o.createdAt)})
              </option>
            ))}
          </select>
        </Field>
      )}
      {fixedOrder && <p className="text-sm text-soil-500">{t('order_no')} {fixedOrder.orderNumber} — {fixedOrder.farmName}</p>}
      <Field label={t('subject')} error={errors.subject} htmlFor="c-subject">
        <input id="c-subject" maxLength={120} className={`input ${errors.subject ? 'input-error' : ''}`} value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
      </Field>
      <Field label={t('describe')} error={errors.message} htmlFor="c-msg">
        <textarea id="c-msg" rows={4} maxLength={1500} className={`input ${errors.message ? 'input-error' : ''}`} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
      </Field>
      <button className="btn-primary w-full" disabled={busy}>
        {busy ? t('saving') : t('submit')}
      </button>
    </form>
  );
}

export default function Help() {
  const { t, lang } = useI18n();
  const toast = useToast();
  const { data, loading, reload } = useFetch(() => api.get('/complaints/mine'), []);
  const [open, setOpen] = useState(false);

  return (
    <div className="container-page max-w-3xl py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold sm:text-4xl">{t('complaints_title')}</h1>
          <p className="mt-1 text-soil-500">{t('complaints_sub')}</p>
        </div>
        <button className="btn-primary" onClick={() => setOpen(true)}>
          {t('new_complaint')}
        </button>
      </div>
      {loading ? (
        <Spinner />
      ) : !data?.complaints.length ? (
        <Empty icon={LifeBuoy} title={t('complaints_title')} hint={t('complaints_sub')} />
      ) : (
        <ul className="space-y-4">
          {data.complaints.map((c) => (
            <li key={c._id} className="panel p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{c.subject}</p>
                  <p className="text-sm text-soil-500">
                    {t(`type_${c.type}`)}
                    {c.order?.orderNumber && ` · ${c.order.orderNumber}`} · {fmtDate(c.createdAt, lang)}
                  </p>
                </div>
                <StatusBadge status={c.status} />
              </div>
              <p className="mt-3 text-soil-700">{c.message}</p>
              {c.adminNote && (
                <div className="mt-3 rounded-xl bg-leaf-50 p-3 text-sm">
                  <p className="font-semibold text-leaf-800">{t('team_reply')}</p>
                  <p className="mt-0.5">{c.adminNote}</p>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      <Modal open={open} onClose={() => setOpen(false)} title={t('new_complaint')} wide>
        <ComplaintForm
          onDone={() => {
            setOpen(false);
            toast(t('saved'));
            reload();
          }}
        />
      </Modal>
    </div>
  );
}
