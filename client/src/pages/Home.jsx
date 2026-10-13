import { Link } from 'react-router-dom';
import { ArrowRight, MapPin, Tractor, Scale, CalendarDays } from 'lucide-react';
import { api } from '../api/client.js';
import { useI18n } from '../i18n/index.jsx';
import { money, unitLabel } from '../lib/format.js';
import { SITE_PHOTOS, photoBg, sized } from '../lib/images.js';
import ProductCard from '../components/ProductCard.jsx';
import { ProductImage, useFetch } from '../components/ui.jsx';
import { useCategories } from '../components/Layout.jsx';
import FarmerAvatar from '../components/FarmerAvatar.jsx';

function SectionHead({ title, sub, to, label }) {
  const { t } = useI18n();
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div>
        <h2 className="text-2xl font-bold sm:text-3xl">{title}</h2>
        {sub && <p className="mt-1 max-w-2xl text-soil-500">{sub}</p>}
      </div>
      {to && (
        <Link to={to} className="link shrink-0 text-sm">
          {label || t('view_all')}
        </Link>
      )}
    </div>
  );
}

/** The latest harvest, as a market-stall board: photo, farmer, village, price. */
function HarvestBoard({ products }) {
  const { t, ln } = useI18n();
  return (
    <div className="rounded-[28px] bg-white/95 p-2 shadow-[0_30px_60px_-24px_rgba(0,0,0,0.55)] backdrop-blur">
      <ul className="divide-y divide-line">
        {products.map((p) => (
          <li key={p._id}>
            <Link to={`/product/${p._id}`} className="flex items-center gap-3.5 rounded-2xl p-2.5 hover:bg-leaf-50">
              <span className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl">
                <ProductImage product={p} size="sm" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold text-soil-900">{ln(p)}</span>
                <span className="flex items-center gap-1 truncate text-sm text-soil-500">
                  <MapPin size={13} className="shrink-0" /> {p.farmer.name}, {p.farmer.location?.village}
                </span>
              </span>
              <span className="text-right">
                <span className="block font-display text-lg font-bold text-leaf-900">{money(p.price)}</span>
                <span className="block text-xs text-soil-500">/ {unitLabel(p.unit, t)}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Home() {
  const { t, ln } = useI18n();
  const cats = useCategories();
  const season = useFetch(() => api.get('/products?inSeason=true&limit=8'), []);
  const popular = useFetch(() => api.get('/products?sort=popular&limit=8'), []);
  const farmers = useFetch(() => api.get('/farmers'), []);

  const board = [...(season.data?.products || []), ...(popular.data?.products || [])]
    .filter((p, i, arr) => arr.findIndex((x) => x._id === p._id) === i)
    .slice(0, 4);

  return (
    <>
      {/* Hero: farmers at work, with the week's harvest on the right */}
      <section className="relative overflow-hidden bg-leaf-950" style={photoBg(SITE_PHOTOS.hero, 2000)}>
        <span className="absolute inset-0 bg-leaf-950/45 lg:hidden" aria-hidden="true" />
        <div className="relative container-page grid min-h-[560px] items-center gap-10 py-14 sm:py-20 lg:min-h-[640px] lg:grid-cols-[1.15fr_1fr] lg:gap-16">
          <div className="harvest-rise">
            <h1 className="max-w-xl text-[2.6rem] leading-[1.04] font-extrabold text-white drop-shadow-sm sm:text-6xl lg:text-7xl">{t('hero_title')}</h1>
            <p className="mt-5 max-w-lg text-lg leading-relaxed text-leaf-50/90">{t('hero_sub')}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/shop" className="btn-accent btn-lg">
                {t('hero_cta')}
              </Link>
              <Link to="/register?role=farmer" className="btn btn-lg border border-white/40 bg-white/5 text-white backdrop-blur hover:bg-white/15">
                <Tractor size={18} /> {t('hero_cta_farmer')}
              </Link>
            </div>
          </div>
          {board.length > 0 && <HarvestBoard products={board} />}
        </div>
      </section>

      {/* Categories as photo tiles */}
      <section className="container-page pt-14">
        <SectionHead title={t('shop_by_category')} />
        <div className="grid grid-cols-3 gap-2.5 sm:gap-3 md:grid-cols-5 lg:grid-cols-9">
          {cats.map((c) => (
            <Link
              key={c._id}
              to={`/shop?category=${c.slug}`}
              className="group relative flex aspect-[3/4] items-end overflow-hidden rounded-2xl bg-leaf-100"
            >
              {c.image ? (
                <img src={sized(c.image, 360)} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
              ) : (
                <span className="absolute inset-0 flex items-center justify-center text-5xl">{c.icon}</span>
              )}
              <span className="absolute inset-0 bg-gradient-to-t from-leaf-950/85 via-leaf-950/10 to-transparent" />
              <span className="relative p-2.5 text-white">
                <span className="block text-sm leading-tight font-semibold">{ln(c)}</span>
                <span className="block text-xs text-leaf-100/80">
                  {c.productCount} {t('products')}
                </span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* In season */}
      {season.data?.products?.length > 0 && (
        <section className="container-page pt-16">
          <SectionHead title={t('in_season_now')} sub={t('in_season_sub')} to="/season" label={t('nav_calendar')} />
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4">
            {season.data.products.slice(0, 4).map((p) => (
              <ProductCard key={p._id} product={p} />
            ))}
          </div>
        </section>
      )}

      {/* Farms, each with a photo of the land */}
      {farmers.data?.farmers?.length > 0 && (
        <section className="container-page pt-20">
          <SectionHead title={t('meet_farmers')} sub={t('meet_farmers_sub')} to="/farmers" />
          <div className="scrollbar-none -mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-5">
            {farmers.data.farmers.slice(0, 5).map((f) => (
              <Link key={f.id} to={`/farmers/${f.id}`} className="group w-64 shrink-0 snap-start overflow-hidden rounded-tile border border-line bg-white hover:border-leaf-500 sm:w-auto">
                <div className="relative aspect-[16/10] bg-leaf-100">
                  {f.coverPhoto && <img src={sized(f.coverPhoto, 520)} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />}
                  <span className="absolute -bottom-6 left-4 rounded-full ring-4 ring-white">
                    <FarmerAvatar farmer={f} size={48} />
                  </span>
                </div>
                <div className="px-4 pt-8 pb-4">
                  <h3 className="font-sans text-[17px] leading-snug font-semibold">{f.farmName}</h3>
                  <p className="text-sm text-soil-500">{f.name}</p>
                  <p className="mt-2 flex items-center gap-1 text-sm text-soil-700">
                    <MapPin size={14} /> {f.location.village}, {f.location.district}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-leaf-700">
                    {f.productCount} {t('products')}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* How it works */}
      <section className="container-page pt-20">
        <div className="rounded-[28px] bg-leaf-50 px-6 py-10 sm:px-10">
          <h2 className="text-2xl font-bold sm:text-3xl">{t('how_title')}</h2>
          <ol className="mt-8 grid gap-8 md:grid-cols-3">
            {[1, 2, 3].map((n) => (
              <li key={n} className="flex gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-leaf-700 font-display text-lg font-bold text-white">{n}</span>
                <div>
                  <h3 className="font-sans text-lg font-semibold">{t(`how_${n}_t`)}</h3>
                  <p className="mt-1 text-soil-700">{t(`how_${n}_d`)}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Bulk buying, beside a market photo */}
      <section className="container-page pt-20">
        <div className="grid overflow-hidden rounded-[28px] border-2 border-turmeric-500 bg-turmeric-100 md:grid-cols-[1fr_1.3fr]">
          <img src={sized(SITE_PHOTOS.market, 900)} alt="" loading="lazy" className="h-56 w-full object-cover md:h-full" />
          <div className="flex flex-col justify-center gap-4 px-6 py-8 sm:px-10">
            <Scale size={36} className="text-turmeric-600" />
            <h2 className="text-2xl font-bold sm:text-3xl">{t('bulk_title')}</h2>
            <p className="max-w-xl text-soil-700">{t('bulk_sub')}</p>
            <div className="flex flex-wrap gap-3">
              <Link to="/shop?bulk=true" className="btn-primary btn-lg">
                {t('bulk_cta')} <ArrowRight size={18} />
              </Link>
              <Link to="/season" className="btn-outline btn-lg bg-white">
                <CalendarDays size={18} /> {t('nav_calendar')}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Popular */}
      {popular.data?.products?.length > 0 && (
        <section className="container-page pt-20">
          <SectionHead title={t('popular_now')} to="/shop" />
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4">
            {popular.data.products.map((p) => (
              <ProductCard key={p._id} product={p} />
            ))}
          </div>
        </section>
      )}

      {/* Farmer call to action over a field photo */}
      <section className="container-page pt-20">
        <div
          className="flex min-h-[320px] flex-col items-start justify-end gap-6 overflow-hidden rounded-[28px] px-6 py-10 text-white sm:px-10 md:flex-row md:items-end md:justify-between"
          style={photoBg(SITE_PHOTOS.farmerCta, 1600, 'linear-gradient(0deg, rgba(11,46,26,.92) 0%, rgba(11,46,26,.55) 55%, rgba(11,46,26,.15) 100%)')}
        >
          <div>
            <h2 className="text-3xl font-bold text-white sm:text-4xl">{t('farmer_cta_title')}</h2>
            <p className="mt-2 max-w-xl text-leaf-50/90">{t('farmer_cta_sub')}</p>
          </div>
          <Link to="/register?role=farmer" className="btn-accent btn-lg shrink-0">
            <Tractor size={18} /> {t('farmer_cta_btn')}
          </Link>
        </div>
      </section>
    </>
  );
}
