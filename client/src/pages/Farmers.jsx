import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { MapPin, Truck, Store, ShieldCheck, Clock } from 'lucide-react';
import { api, qs } from '../api/client.js';
import { useI18n } from '../i18n/index.jsx';
import { money } from '../lib/format.js';
import { photoBg, sized } from '../lib/images.js';
import { Empty, Spinner, Stars, useFetch } from '../components/ui.jsx';
import ProductCard from '../components/ProductCard.jsx';
import FarmerAvatar from '../components/FarmerAvatar.jsx';

export function FarmersList() {
  const { t } = useI18n();
  const [district, setDistrict] = useState('');
  const districts = useFetch(() => api.get('/districts'), []);
  const { data, loading } = useFetch(() => api.get(`/farmers${qs({ district })}`), [district]);

  return (
    <div className="container-page py-8">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold sm:text-4xl">{t('meet_farmers')}</h1>
          <p className="mt-1 text-soil-500">{t('meet_farmers_sub')}</p>
        </div>
        <select className="input w-auto" value={district} onChange={(e) => setDistrict(e.target.value)} aria-label={t('farm_location')}>
          <option value="">{t('all_districts')}</option>
          {districts.data?.districts.map((d) => (
            <option key={d}>{d}</option>
          ))}
        </select>
      </div>
      {loading ? (
        <Spinner />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data?.farmers.map((f) => (
            <Link key={f.id} to={`/farmers/${f.id}`} className="group overflow-hidden rounded-tile border border-line bg-white hover:border-leaf-500">
              <div className="relative aspect-[16/9] bg-leaf-100">
                {f.coverPhoto && <img src={sized(f.coverPhoto, 720)} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />}
                <span className="absolute -bottom-7 left-5 rounded-full ring-4 ring-white">
                  <FarmerAvatar farmer={f} size={56} />
                </span>
              </div>
              <div className="min-w-0 px-5 pt-9 pb-5">
                <h2 className="font-sans text-lg font-semibold">{f.farmName}</h2>
                <p className="text-sm text-soil-500">{f.name}</p>
                <p className="mt-1.5 flex items-center gap-1 text-sm text-soil-700">
                  <MapPin size={14} /> {f.location.village}, {f.location.district}, {f.location.state}
                </p>
                {f.farmingPractices && <p className="mt-2 text-sm font-semibold text-leaf-700">{f.farmingPractices}</p>}
                <p className="mt-2 text-sm text-soil-500">
                  {f.productCount} {t('products')}
                  {f.offersDelivery && <> · {t('delivery')}</>}
                  {f.offersPickup && <> · {t('pickup')}</>}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export function FarmerStore() {
  const { id } = useParams();
  const { t, lang } = useI18n();
  const { data, loading, error } = useFetch(() => api.get(`/farmers/${id}`), [id]);
  if (loading) return <Spinner />;
  if (error) return <Empty title={error.message} />;
  const { farmer: f, products } = data;
  const fl = f.fulfillment || {};

  return (
    <>
      <section
        className={`text-white ${f.coverPhoto ? '' : 'kolam-bg bg-leaf-900'}`}
        style={f.coverPhoto ? photoBg(f.coverPhoto, 1800, 'linear-gradient(0deg, rgba(11,46,26,.92) 0%, rgba(11,46,26,.45) 60%, rgba(11,46,26,.2) 100%)') : undefined}
      >
        <div className="container-page flex min-h-[340px] flex-col justify-end gap-6 pt-24 pb-10 sm:flex-row sm:items-end sm:justify-start">
          <span className="shrink-0 self-start rounded-full ring-4 ring-white/80 sm:self-end">
            <FarmerAvatar farmer={f} size={96} />
          </span>
          <div className="flex-1">
            <h1 className="flex items-center gap-2 text-3xl font-bold text-white sm:text-4xl">
              {f.farmName} <ShieldCheck className="text-turmeric-500" size={26} aria-label={t('verified_farm')} />
            </h1>
            <p className="mt-1 text-leaf-100">{f.name}</p>
            <p className="mt-2 flex items-center gap-1.5 text-leaf-100">
              <MapPin size={16} /> {f.location.village}, {f.location.district}, {f.location.state} {f.location.pincode}
            </p>
            {f.ratingCount > 0 && (
              <p className="mt-2 flex items-center gap-2 text-sm text-leaf-100">
                <Stars value={f.ratingAvg} /> {f.ratingAvg} · {t('reviews_count', { n: f.ratingCount })}
              </p>
            )}
          </div>
        </div>
      </section>
      <div className="container-page grid gap-10 py-10 lg:grid-cols-[300px_1fr]">
        <aside className="space-y-6">
          {f.farmingPractices && <p className="rounded-2xl bg-leaf-50 p-4 font-semibold text-leaf-800">{f.farmingPractices}</p>}
          {f.bio && <p className="leading-relaxed text-soil-700">{f.bio}</p>}
          <div className="space-y-3 border-t border-line pt-5 text-[15px]">
            {fl.offersDelivery ? (
              <p className="flex gap-3">
                <Truck size={20} className="shrink-0 text-leaf-700" />
                <span>
                  {t('delivery_fee')}: <strong>{money(fl.deliveryFee)}</strong>
                  {fl.freeDeliveryAbove > 0 && <span className="block text-sm text-soil-500">{t('free_above', { amount: money(fl.freeDeliveryAbove) })}</span>}
                  {fl.deliveryArea && <span className="block text-sm text-soil-500">{t('delivers_to')}: {fl.deliveryArea}</span>}
                </span>
              </p>
            ) : (
              <p className="text-soil-500">{t('no_delivery')}</p>
            )}
            {fl.offersPickup && (
              <p className="flex gap-3">
                <Store size={20} className="shrink-0 text-leaf-700" /> {fl.pickupAddress}
              </p>
            )}
            <p className="flex gap-3">
              <Clock size={20} className="shrink-0 text-leaf-700" /> {t('ready_in', { n: fl.prepHours })}
            </p>
          </div>
          <p className="text-sm text-soil-500">
            Mannu · {new Date(f.memberSince).toLocaleDateString(lang === 'en' ? 'en-IN' : `${lang}-IN`, { month: 'long', year: 'numeric' })}
          </p>
        </aside>
        <div>
          <h2 className="mb-6 text-2xl font-bold">{t('results', { n: products.length })}</h2>
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3">
            {products.map((p) => (
              <ProductCard key={p._id} product={p} />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
