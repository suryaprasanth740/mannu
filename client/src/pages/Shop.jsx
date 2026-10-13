import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SlidersHorizontal, SearchX } from 'lucide-react';
import { api, qs } from '../api/client.js';
import { useI18n } from '../i18n/index.jsx';
import ProductCard from '../components/ProductCard.jsx';
import { Empty, Modal, Spinner, Notice } from '../components/ui.jsx';
import { useCategories } from '../components/Layout.jsx';

const FILTER_KEYS = ['q', 'category', 'district', 'minPrice', 'maxPrice', 'organic', 'inSeason', 'bulk', 'sort'];

function Filters({ params, set, districts }) {
  const { t, ln } = useI18n();
  const cats = useCategories();
  const [minP, setMinP] = useState(params.get('minPrice') || '');
  const [maxP, setMaxP] = useState(params.get('maxPrice') || '');
  useEffect(() => {
    setMinP(params.get('minPrice') || '');
    setMaxP(params.get('maxPrice') || '');
  }, [params]);

  const check = (key, label) => (
    <label className="flex cursor-pointer items-center gap-2.5 py-1 text-[15px]">
      <input
        type="checkbox"
        className="h-4.5 w-4.5 accent-leaf-700"
        checked={params.get(key) === 'true'}
        onChange={(e) => set({ [key]: e.target.checked ? 'true' : '' })}
      />
      {label}
    </label>
  );

  return (
    <div className="space-y-6">
      <div>
        <label className="label" htmlFor="f-cat">{t('category')}</label>
        <select id="f-cat" className="input" value={params.get('category') || ''} onChange={(e) => set({ category: e.target.value })}>
          <option value="">{t('all_categories')}</option>
          {cats.map((c) => (
            <option key={c._id} value={c.slug}>
              {ln(c)}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="f-dist">{t('farm_location')}</label>
        <select id="f-dist" className="input" value={params.get('district') || ''} onChange={(e) => set({ district: e.target.value })}>
          <option value="">{t('all_districts')}</option>
          {districts.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          set({ minPrice: minP, maxPrice: maxP });
        }}
      >
        <span className="label">{t('price')} (₹)</span>
        <div className="flex items-center gap-2">
          <input className="input" inputMode="numeric" placeholder={t('min')} aria-label={t('min')} value={minP} onChange={(e) => setMinP(e.target.value.replace(/\D/g, ''))} onBlur={() => set({ minPrice: minP })} />
          <span className="text-soil-300">–</span>
          <input className="input" inputMode="numeric" placeholder={t('max')} aria-label={t('max')} value={maxP} onChange={(e) => setMaxP(e.target.value.replace(/\D/g, ''))} onBlur={() => set({ maxPrice: maxP })} />
        </div>
      </form>
      <div>
        {check('inSeason', t('only_season'))}
        {check('organic', t('only_organic'))}
        {check('bulk', t('only_bulk'))}
      </div>
    </div>
  );
}

export default function Shop() {
  const { t, ln } = useI18n();
  const [params, setParams] = useSearchParams();
  const cats = useCategories();
  const [districts, setDistricts] = useState([]);
  const [products, setProducts] = useState([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [drawer, setDrawer] = useState(false);

  const key = FILTER_KEYS.map((k) => params.get(k) || '').join('|');

  useEffect(() => {
    api.get('/districts').then((d) => setDistricts(d.districts)).catch(() => {});
  }, []);

  async function load(page = 1) {
    setLoading(true);
    setError(null);
    try {
      const query = Object.fromEntries(FILTER_KEYS.map((k) => [k, params.get(k) || '']));
      const d = await api.get(`/products${qs({ ...query, page, limit: 24 })}`);
      setProducts((prev) => (page === 1 ? d.products : [...prev, ...d.products]));
      setMeta({ total: d.total, page: d.page, pages: d.pages });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const set = (patch) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    setParams(next, { replace: true });
  };

  const activeCat = cats.find((c) => c.slug === params.get('category'));
  const title = params.get('q')
    ? `“${params.get('q')}”`
    : activeCat
      ? ln(activeCat)
      : params.get('inSeason')
        ? t('in_season_now')
        : params.get('bulk')
          ? t('nav_bulk')
          : t('all_products');
  const hasFilters = FILTER_KEYS.some((k) => k !== 'sort' && params.get(k));

  return (
    <div className="container-page py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold sm:text-4xl">{title}</h1>
          <p className="mt-1 text-soil-500">{t('results', { n: meta.total })}</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-outline btn-sm lg:hidden" onClick={() => setDrawer(true)}>
            <SlidersHorizontal size={16} /> {t('filters')}
          </button>
          <label className="sr-only" htmlFor="sort">{t('sort_by')}</label>
          <select id="sort" className="input w-auto py-2 text-sm" value={params.get('sort') || 'popular'} onChange={(e) => set({ sort: e.target.value })}>
            <option value="popular">{t('sort_popular')}</option>
            <option value="new">{t('sort_new')}</option>
            <option value="price_asc">{t('sort_price_asc')}</option>
            <option value="price_desc">{t('sort_price_desc')}</option>
            <option value="rating">{t('sort_rating')}</option>
          </select>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
        <aside className="hidden lg:block">
          <div className="sticky top-36">
            <Filters params={params} set={set} districts={districts} />
            {hasFilters && (
              <button className="link mt-6 text-sm" onClick={() => setParams({}, { replace: true })}>
                {t('clear_filters')}
              </button>
            )}
          </div>
        </aside>
        <div>
          {error && <Notice tone="error">{error}</Notice>}
          {loading && products.length === 0 ? (
            <Spinner />
          ) : products.length === 0 ? (
            <Empty
              icon={SearchX}
              title={t('no_results')}
              hint={t('no_results_hint')}
              action={hasFilters && <button className="btn-outline" onClick={() => setParams({}, { replace: true })}>{t('clear_filters')}</button>}
            />
          ) : (
            <>
              <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3">
                {products.map((p) => (
                  <ProductCard key={p._id} product={p} />
                ))}
              </div>
              {meta.page < meta.pages && (
                <div className="mt-10 text-center">
                  <button className="btn-outline" disabled={loading} onClick={() => load(meta.page + 1)}>
                    {loading ? t('loading') : t('load_more')}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <Modal open={drawer} onClose={() => setDrawer(false)} title={t('filters')}>
        <Filters params={params} set={set} districts={districts} />
        <div className="mt-6 flex gap-3">
          {hasFilters && (
            <button className="btn-outline flex-1" onClick={() => setParams({}, { replace: true })}>
              {t('clear_filters')}
            </button>
          )}
          <button className="btn-primary flex-1" onClick={() => setDrawer(false)}>
            {t('results', { n: meta.total })}
          </button>
        </div>
      </Modal>
    </div>
  );
}
