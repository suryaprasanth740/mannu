import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { MapPin, Truck, Store, Clock, ShieldCheck, Calendar, ShoppingBasket, Check } from 'lucide-react';
import { api } from '../api/client.js';
import { useI18n } from '../i18n/index.jsx';
import { useCart } from '../context/CartContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { clampQty, fmtDate, money, qtyLabel, unitLabel } from '../lib/format.js';
import { Empty, ProductImage, Spinner, Stars, useFetch, useToast } from '../components/ui.jsx';
import ProductCard, { ProductBadges, QtyStepper } from '../components/ProductCard.jsx';
import FarmerAvatar from '../components/FarmerAvatar.jsx';

export default function ProductPage() {
  const { id } = useParams();
  const { t, ln, lang } = useI18n();
  const { user } = useAuth();
  const { add, qtyOf } = useCart();
  const toast = useToast();
  const { data, loading, error } = useFetch(() => api.get(`/products/${id}`), [id]);
  const [qty, setQty] = useState(1);
  const [img, setImg] = useState(0);

  useEffect(() => {
    if (data?.product) {
      setQty(clampQty(data.product.minOrderQty || 1, data.product));
      setImg(0);
    }
  }, [data]);

  if (loading) return <Spinner />;
  if (error) return <Empty title={error.message} action={<Link to="/shop" className="btn-primary">{t('continue_shopping')}</Link>} />;

  const { product: p, fulfillment: f, farmerBio, farmingPractices, reviews, moreFromFarmer } = data;
  const canBuy = !user || user.role === 'customer';
  const out = p.stock <= 0;
  const months = t('months');
  const unitPrice = [...(p.bulkTiers || [])].reverse().find((tier) => qty >= tier.minQty)?.price ?? p.price;
  const inCart = qtyOf(p._id);

  return (
    <div className="container-page py-8">
      <nav className="mb-5 text-sm text-soil-500" aria-label="Breadcrumb">
        <Link to="/shop" className="hover:text-leaf-700">{t('all_products')}</Link>
        {p.category && (
          <>
            <span className="mx-2">/</span>
            <Link to={`/shop?category=${p.category.slug}`} className="hover:text-leaf-700">{ln(p.category)}</Link>
          </>
        )}
      </nav>

      <div className="grid gap-8 lg:grid-cols-2 lg:gap-14">
        {/* Gallery */}
        <div className="lg:sticky lg:top-36 lg:self-start">
          <div className="relative aspect-square overflow-hidden rounded-[28px] bg-leaf-50">
            <ProductImage product={{ ...p, images: p.images?.length ? [p.images[img]] : [] }} size="lg" />
            <ProductBadges product={p} className="absolute top-4 left-4" />
          </div>
          {p.images?.length > 1 && (
            <div className="mt-3 flex gap-2">
              {p.images.map((im, i) => (
                <button key={im._id || i} onClick={() => setImg(i)} className={`h-20 w-20 overflow-hidden rounded-xl border-2 ${i === img ? 'border-leaf-700' : 'border-transparent'}`}>
                  <img src={im.url} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div>
          <h1 className="text-3xl font-bold sm:text-4xl">{ln(p)}</h1>
          {lang !== 'en' && p.localNames?.[lang] && <p className="mt-1 text-soil-500">{p.name}</p>}
          {p.ratingCount > 0 && (
            <p className="mt-2 flex items-center gap-2 text-sm text-soil-700">
              <Stars value={p.ratingAvg} /> {p.ratingAvg} · {t('reviews_count', { n: p.ratingCount })}
            </p>
          )}

          <Link to={`/farmers/${p.farmer.id}`} className="mt-5 flex items-center gap-3 rounded-2xl border border-line p-3 hover:border-leaf-500">
            <FarmerAvatar farmer={p.farmer} size={48} />
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-semibold text-soil-500">{t('grown_by')}</span>
              <span className="block font-semibold">{p.farmer.name}, {p.farmer.farmName}</span>
              <span className="flex items-center gap-1 text-sm text-soil-500">
                <MapPin size={14} /> {p.farmer.location?.village}, {p.farmer.location?.district}, {p.farmer.location?.state}
              </span>
            </span>
            {p.farmer.verified && <ShieldCheck className="shrink-0 text-leaf-700" size={22} aria-label={t('verified_farm')} />}
          </Link>

          <div className="mt-6 flex items-baseline gap-2">
            <span className="font-display text-4xl font-bold text-leaf-950">{money(p.price)}</span>
            <span className="text-soil-500">/ {unitLabel(p.unit, t)}</span>
          </div>

          {p.bulkTiers?.length > 0 && (
            <div className="mt-4 rounded-2xl bg-turmeric-100 p-4">
              <p className="text-sm font-bold text-soil-900">{t('bulk_prices')}</p>
              <ul className="mt-1.5 space-y-1 text-[15px]">
                {p.bulkTiers.map((tier) => (
                  <li key={tier.minQty} className={qty >= tier.minQty ? 'font-semibold text-leaf-800' : 'text-soil-700'}>
                    {qty >= tier.minQty && <Check size={14} className="mr-1 inline" />}
                    {t('bulk_row', { qty: tier.minQty, unit: unitLabel(p.unit, t), price: money(tier.price) })}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm text-soil-700">
            <span className={out ? 'font-semibold text-chilli-600' : p.stock <= 5 ? 'font-semibold text-turmeric-600' : ''}>
              {out ? t('out_of_stock') : p.stock <= 5 ? t('only_left', { n: qtyLabel(p.stock, p.unit, t) }) : t('in_stock', { n: qtyLabel(p.stock, p.unit, t) })}
            </span>
            {p.minOrderQty > 0 && <span>{t('min_order', { n: qtyLabel(p.minOrderQty, p.unit, t) })}</span>}
            {p.harvestedOn && (
              <span className="flex items-center gap-1">
                <Calendar size={14} /> {t('harvested', { date: fmtDate(p.harvestedOn, lang, { day: 'numeric', month: 'short' }) })}
              </span>
            )}
          </div>

          {canBuy && !out && (
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <QtyStepper product={p} value={qty} size="lg" onChange={(q) => setQty(clampQty(q, p))} />
              <button
                className="btn-primary btn-lg flex-1 sm:flex-none"
                onClick={() => {
                  add(p, qty);
                  toast(`${ln(p)} — ${qtyLabel(qty, p.unit, t)} ✓`);
                }}
              >
                <ShoppingBasket size={19} /> {t('add_to_cart')} · {money(unitPrice * qty)}
              </button>
            </div>
          )}
          {inCart > 0 && (
            <p className="mt-3 text-sm text-leaf-700">
              {t('in_cart')}: {qtyLabel(inCart, p.unit, t)} — <Link to="/cart" className="link">{t('checkout')}</Link>
            </p>
          )}

          {p.description && <p className="mt-6 leading-relaxed text-soil-700">{p.description}</p>}

          {p.seasonal && p.seasonMonths?.length > 0 && (
            <div className="mt-6">
              <p className="text-sm font-semibold text-soil-700">{t('season_months')}</p>
              <div className="mt-2 grid grid-cols-12 gap-1">
                {months.map((m, i) => (
                  <span
                    key={m}
                    className={`rounded-md py-1 text-center text-[11px] font-semibold ${p.seasonMonths.includes(i + 1) ? 'bg-turmeric-500 text-leaf-950' : 'bg-leaf-50 text-soil-300'}`}
                    title={m}
                  >
                    {m}
                  </span>
                ))}
              </div>
            </div>
          )}

          {f && (
            <div className="mt-8 space-y-3 border-t border-line pt-6">
              <h2 className="font-sans text-base font-bold">{t('delivery_options')}</h2>
              {f.offersDelivery ? (
                <p className="flex gap-3 text-[15px]">
                  <Truck size={20} className="shrink-0 text-leaf-700" />
                  <span>
                    {t('delivery_fee')}: <strong>{money(f.deliveryFee)}</strong>
                    {f.freeDeliveryAbove > 0 && <> — {t('free_above', { amount: money(f.freeDeliveryAbove) })}</>}
                    {f.deliveryArea && <span className="block text-sm text-soil-500">{t('delivers_to')}: {f.deliveryArea}</span>}
                  </span>
                </p>
              ) : (
                <p className="text-sm text-soil-500">{t('no_delivery')}</p>
              )}
              {f.offersPickup && (
                <p className="flex gap-3 text-[15px]">
                  <Store size={20} className="shrink-0 text-leaf-700" />
                  <span>
                    {t('pickup_from')}: {f.pickupAddress}
                  </span>
                </p>
              )}
              <p className="flex gap-3 text-[15px]">
                <Clock size={20} className="shrink-0 text-leaf-700" /> {t('ready_in', { n: f.prepHours })}
              </p>
            </div>
          )}

          {(farmerBio || farmingPractices) && (
            <div className="mt-8 border-t border-line pt-6">
              <h2 className="font-sans text-base font-bold">{t('about_farm')}</h2>
              {farmingPractices && <p className="mt-2 text-sm font-semibold text-leaf-700">{farmingPractices}</p>}
              {farmerBio && <p className="mt-2 leading-relaxed text-soil-700">{farmerBio}</p>}
              <Link to={`/farmers/${p.farmer.id}`} className="link mt-3 inline-block text-sm">
                {t('visit_farm')}
              </Link>
            </div>
          )}
        </div>
      </div>

      <section className="mt-16 max-w-3xl">
        <h2 className="text-2xl font-bold">{t('reviews')}</h2>
        {reviews.length === 0 ? (
          <p className="mt-3 text-soil-500">{t('no_reviews')}</p>
        ) : (
          <ul className="mt-4 divide-y divide-line">
            {reviews.map((r) => (
              <li key={r.id} className="py-4">
                <div className="flex items-center gap-3">
                  <Stars value={r.rating} />
                  <span className="font-semibold">{r.name}</span>
                  <span className="text-sm text-soil-500">{fmtDate(r.createdAt, lang)}</span>
                </div>
                {r.comment && <p className="mt-1.5 text-soil-700">{r.comment}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>

      {moreFromFarmer?.length > 0 && (
        <section className="mt-16">
          <h2 className="mb-6 text-2xl font-bold">{t('more_from_farm')}</h2>
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-4">
            {moreFromFarmer.slice(0, 4).map((m) => (
              <ProductCard key={m._id} product={{ ...m, farmer: p.farmer }} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
