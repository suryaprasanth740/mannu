import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingBasket, Trash2, Truck, Store, MapPin, Info, Plus } from 'lucide-react';
import { api } from '../api/client.js';
import { useI18n } from '../i18n/index.jsx';
import { useCart } from '../context/CartContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { clampQty, money, qtyLabel, qtyStep, unitLabel } from '../lib/format.js';
import { Empty, Modal, Notice, ProductImage, Spinner, useToast } from '../components/ui.jsx';
import { QtyStepper } from '../components/ProductCard.jsx';
import AddressForm, { emptyAddress } from '../components/AddressForm.jsx';

/** Ask the server to price the cart whenever it changes. */
export function useQuote() {
  const { items, fulfillment } = useCart();
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const payload = useMemo(() => JSON.stringify({ items: items.map((i) => ({ productId: i.productId, qty: i.qty })), fulfillment }), [items, fulfillment]);

  useEffect(() => {
    if (!items.length) {
      setQuote(null);
      return undefined;
    }
    let alive = true;
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const q = await api.post('/cart/quote', JSON.parse(payload));
        if (alive) {
          setQuote(q);
          setError('');
        }
      } catch (e) {
        if (alive) setError(e.message);
      } finally {
        if (alive) setLoading(false);
      }
    }, 250);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payload]);

  return { quote, loading, error };
}

function ChargeRows({ charges, fees }) {
  const { t } = useI18n();
  return (
    <dl className="space-y-2 text-[15px]">
      <div className="flex justify-between">
        <dt className="text-soil-700">{t('subtotal')}</dt>
        <dd className="tabular-nums">{money(charges.subtotal)}</dd>
      </div>
      <div className="flex justify-between">
        <dt className="text-soil-700">{t('delivery_fee')}</dt>
        <dd className="tabular-nums">{charges.deliveryFee ? money(charges.deliveryFee) : t('free')}</dd>
      </div>
      <div className="flex justify-between">
        <dt className="text-soil-700">
          {t('service_fee')}
          {fees && <span className="block text-xs text-soil-500">{t('service_fee_note', { pct: fees.serviceFeePercent, cap: money(fees.serviceFeeCap) })}</span>}
        </dt>
        <dd className="tabular-nums">{money(charges.serviceFee)}</dd>
      </div>
      <div className="flex justify-between border-t border-line pt-3 text-lg font-bold">
        <dt>{t('grand_total')}</dt>
        <dd className="tabular-nums">{money(charges.total)}</dd>
      </div>
    </dl>
  );
}

function FarmGroup({ group, issues, editable }) {
  const { t, ln } = useI18n();
  const { setQty, remove, setFulfillment } = useCart();
  const f = group.farmer;

  return (
    <section className="panel overflow-hidden">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-leaf-50 px-4 py-3 sm:px-5">
        <div>
          <Link to={`/farmers/${f.id}`} className="font-semibold hover:text-leaf-700">{f.farmName}</Link>
          <p className="flex items-center gap-1 text-sm text-soil-500">
            <MapPin size={13} /> {f.location?.village}, {f.location?.district}
          </p>
        </div>
        <div className="flex rounded-full border border-leaf-200 bg-white p-0.5" role="radiogroup">
          {[
            ['delivery', Truck, f.offersDelivery],
            ['pickup', Store, f.offersPickup],
          ].map(([m, Icon, ok]) => (
            <button
              key={m}
              role="radio"
              aria-checked={group.method === m}
              disabled={!ok || !editable}
              onClick={() => setFulfillment(f.id, m)}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold ${group.method === m ? 'bg-leaf-700 text-white' : 'text-soil-700'} disabled:opacity-40`}
            >
              <Icon size={15} /> {t(m)}
            </button>
          ))}
        </div>
      </header>
      <ul className="divide-y divide-line">
        {group.items.map((i) => {
          const issue = issues.find((x) => x.productId === i.productId);
          return (
            <li key={i.productId} className="flex gap-3 px-4 py-4 sm:gap-4 sm:px-5">
              <Link to={`/product/${i.productId}`} className="h-20 w-20 shrink-0 overflow-hidden rounded-xl">
                <ProductImage product={i} size="sm" />
              </Link>
              <div className="min-w-0 flex-1">
                <div className="flex justify-between gap-3">
                  <Link to={`/product/${i.productId}`} className="font-semibold hover:text-leaf-700">{ln(i)}</Link>
                  <span className="font-semibold tabular-nums">{money(i.lineTotal)}</span>
                </div>
                <p className="text-sm text-soil-500">
                  {money(i.price)} / {unitLabel(i.unit, t)}
                  {i.bulkApplied && <span className="ml-2 font-semibold text-turmeric-600">{t('bulk_applied')}</span>}
                </p>
                {editable ? (
                  <div className="mt-2 flex items-center gap-3">
                    <QtyStepper
                      product={i}
                      value={i.qty}
                      onChange={(q) => (q < (i.minOrderQty || qtyStep(i)) ? remove(i.productId) : setQty(i.productId, clampQty(q, i)))}
                    />
                    <button onClick={() => remove(i.productId)} className="flex items-center gap-1 text-sm text-soil-500 hover:text-chilli-600">
                      <Trash2 size={15} /> {t('remove')}
                    </button>
                  </div>
                ) : (
                  <p className="mt-1 text-sm">{qtyLabel(i.qty, i.unit, t)}</p>
                )}
                {issue && <p className="mt-1.5 text-sm font-semibold text-chilli-600">{issue.message}</p>}
              </div>
            </li>
          );
        })}
      </ul>
      <footer className="flex flex-wrap justify-between gap-2 border-t border-line px-4 py-3 text-sm text-soil-700 sm:px-5">
        <span>
          {group.method === 'delivery'
            ? group.deliveryFee
              ? `${t('delivery_fee')} ${money(group.deliveryFee)}${f.freeDeliveryAbove > 0 ? ` — ${t('free_above', { amount: money(f.freeDeliveryAbove) })}` : ''}`
              : `${t('delivery_fee')}: ${t('free')}`
            : t('pickup_only_note', { address: f.pickupAddress })}
        </span>
        <span>{t('ready_in', { n: f.prepHours })}</span>
      </footer>
    </section>
  );
}

export function Cart() {
  const { t } = useI18n();
  const { items, count } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { quote, error } = useQuote();

  if (!count) {
    return (
      <div className="container-page py-10">
        <Empty icon={ShoppingBasket} title={t('cart_empty')} hint={t('cart_empty_hint')} action={<Link to="/shop" className="btn-primary">{t('continue_shopping')}</Link>} />
      </div>
    );
  }

  const issues = quote?.issues || [];
  return (
    <div className="container-page py-8">
      <h1 className="mb-6 text-3xl font-bold sm:text-4xl">{t('cart_title')}</h1>
      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          {quote?.groups.length > 1 && (
            <Notice>
              <span className="flex gap-2">
                <Info size={18} className="shrink-0" /> {t('orders_split_note', { n: quote.groups.length })}
              </span>
            </Notice>
          )}
          {error && <Notice tone="error">{error}</Notice>}
          {!quote ? <Spinner /> : quote.groups.map((g) => <FarmGroup key={g.farmer.id} group={g} issues={issues} editable />)}
          {issues.filter((i) => !quote?.groups.some((g) => g.items.some((it) => it.productId === i.productId))).map((i) => (
            <Notice key={i.productId || i.farmerId} tone="warn">
              {i.message}{' '}
              {i.productId && items.some((x) => x.productId === i.productId) && <RemoveLink id={i.productId} />}
            </Notice>
          ))}
        </div>
        <aside>
          <div className="panel sticky top-36 p-5">
            {quote && <ChargeRows charges={quote.totals} fees={quote.fees} />}
            {issues.length > 0 && <Notice tone="warn" className="mt-4">{t('fix_cart')}</Notice>}
            <button
              className="btn-primary btn-lg mt-5 w-full"
              disabled={!quote || issues.length > 0}
              onClick={() => navigate(user ? '/checkout' : '/login', { state: { from: '/checkout' } })}
            >
              {user ? t('checkout') : t('login_to_checkout')}
            </button>
            <Link to="/shop" className="btn-ghost mt-2 w-full">{t('continue_shopping')}</Link>
          </div>
        </aside>
      </div>
    </div>
  );
}

function RemoveLink({ id }) {
  const { remove } = useCart();
  const { t } = useI18n();
  return (
    <button className="link" onClick={() => remove(id)}>
      {t('remove')}
    </button>
  );
}

export function Checkout() {
  const { t } = useI18n();
  const { user, apply } = useAuth();
  const { items, fulfillment, clear, count } = useCart();
  const navigate = useNavigate();
  const toast = useToast();
  const { quote } = useQuote();
  const [addressId, setAddressId] = useState(() => (user?.addresses?.find((a) => a.isDefault) || user?.addresses?.[0])?._id || '');
  const [payment, setPayment] = useState('cash_on_delivery');
  const [note, setNote] = useState('');
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!count) navigate('/cart', { replace: true });
  }, [count, navigate]);

  if (!quote) return <Spinner />;
  const needsAddress = quote.groups.some((g) => g.method === 'delivery');
  const issues = quote.issues;

  async function place() {
    setError('');
    if (needsAddress && !addressId) {
      setError(t('delivery_address'));
      return;
    }
    setBusy(true);
    try {
      const res = await api.post('/orders', {
        items: items.map((i) => ({ productId: i.productId, qty: i.qty })),
        fulfillment,
        addressId: needsAddress ? addressId : undefined,
        paymentMethod: payment,
        note,
      });
      clear();
      navigate(`/orders/receipt/${res.groupId}`, { replace: true, state: { justPlaced: true } });
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container-page py-8">
      <h1 className="mb-6 text-3xl font-bold sm:text-4xl">{t('checkout')}</h1>
      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          {needsAddress && (
            <section className="panel p-5">
              <h2 className="mb-4 font-sans text-lg font-bold">{t('delivery_address')}</h2>
              <div className="space-y-3">
                {user.addresses.map((a) => (
                  <label key={a._id} className={`flex cursor-pointer gap-3 rounded-2xl border-2 p-4 ${addressId === a._id ? 'border-leaf-700 bg-leaf-50' : 'border-line'}`}>
                    <input type="radio" name="address" className="mt-1 accent-leaf-700" checked={addressId === a._id} onChange={() => setAddressId(a._id)} />
                    <span className="text-[15px]">
                      <span className="font-semibold">{a.label}</span> — {a.fullName}, {a.phone}
                      <span className="block text-soil-700">
                        {a.line1}
                        {a.line2 && `, ${a.line2}`}, {a.city}, {a.district}, {a.state} {a.pincode}
                      </span>
                    </span>
                  </label>
                ))}
                <button className="btn-outline btn-sm" onClick={() => setAdding(true)}>
                  <Plus size={16} /> {t('add_address')}
                </button>
              </div>
            </section>
          )}

          <section className="panel p-5">
            <h2 className="mb-4 font-sans text-lg font-bold">{t('payment_method')}</h2>
            {needsAddress ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  ['cash_on_delivery', t('pay_cod')],
                  ['upi_on_delivery', t('pay_upi')],
                ].map(([v, label]) => (
                  <label key={v} className={`flex cursor-pointer items-center gap-3 rounded-2xl border-2 p-4 font-semibold ${payment === v ? 'border-leaf-700 bg-leaf-50' : 'border-line'}`}>
                    <input type="radio" name="pay" className="accent-leaf-700" checked={payment === v} onChange={() => setPayment(v)} />
                    {label}
                  </label>
                ))}
              </div>
            ) : (
              <p className="font-semibold">{t('pay_pickup')}</p>
            )}
            <p className="mt-3 text-sm text-soil-500">{t('pay_note')}</p>
          </section>

          <section className="panel p-5">
            <label htmlFor="note" className="label">{t('note_for_farmer')}</label>
            <textarea id="note" rows={2} maxLength={300} className="input" value={note} onChange={(e) => setNote(e.target.value)} />
          </section>

          {quote.groups.map((g) => (
            <FarmGroup key={g.farmer.id} group={g} issues={issues} editable={false} />
          ))}
        </div>

        <aside>
          <div className="panel sticky top-36 p-5">
            <ChargeRows charges={quote.totals} fees={quote.fees} />
            {quote.groups.length > 1 && <p className="mt-3 text-sm text-soil-500">{t('orders_split_note', { n: quote.groups.length })}</p>}
            {issues.length > 0 && <Notice tone="warn" className="mt-4">{issues[0].message}</Notice>}
            {error && <Notice tone="error" className="mt-4">{error}</Notice>}
            <button className="btn-primary btn-lg mt-5 w-full" disabled={busy || issues.length > 0 || (needsAddress && !addressId)} onClick={place}>
              {busy ? t('placing') : `${t('place_order')} · ${money(quote.totals.total)}`}
            </button>
          </div>
        </aside>
      </div>

      <Modal open={adding} onClose={() => setAdding(false)} title={t('add_address')} wide>
        <AddressForm
          initial={{ ...emptyAddress(user), isDefault: !user.addresses.length }}
          onCancel={() => setAdding(false)}
          onSubmit={async (body) => {
            const res = await api.post('/auth/me/addresses', body);
            apply({ user: { ...user, addresses: res.addresses } });
            setAddressId(res.address._id);
            setAdding(false);
            toast(t('saved'));
          }}
        />
      </Modal>
    </div>
  );
}

export { ChargeRows };
