import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { useI18n } from '../i18n/index.jsx';
import { currentMonth } from '../lib/format.js';
import { SITE_PHOTOS, photoBg } from '../lib/images.js';
import ProductCard from '../components/ProductCard.jsx';
import { Empty, ProductImage, Spinner, useFetch } from '../components/ui.jsx';

export default function Season() {
  const { t, ln } = useI18n();
  const months = t('months');
  const now = currentMonth();
  const [month, setMonth] = useState(now);
  const { data, loading } = useFetch(() => api.get('/products?seasonal=true&inStock=false&limit=100'), []);
  const products = useMemo(() => data?.products || [], [data]);
  const inMonth = products.filter((p) => p.seasonMonths?.includes(month));
  const rows = [...products].sort((a, b) => (a.seasonMonths?.[0] || 0) - (b.seasonMonths?.[0] || 0));

  return (
    <>
      <section className="text-white" style={photoBg(SITE_PHOTOS.calendar, 1800)}>
        <div className="container-page py-14 sm:py-20">
          <h1 className="text-4xl font-extrabold text-white sm:text-5xl">{t('calendar_title')}</h1>
          <p className="mt-3 max-w-xl text-lg text-leaf-50/90">{t('calendar_sub')}</p>
          <div className="mt-8 grid max-w-3xl grid-cols-6 gap-1.5 sm:grid-cols-12" role="tablist">
            {months.map((m, i) => {
              const n = i + 1;
              return (
                <button
                  key={m}
                  role="tab"
                  aria-selected={month === n}
                  onClick={() => setMonth(n)}
                  className={`rounded-xl py-2 text-sm font-semibold transition-colors ${
                    month === n ? 'bg-turmeric-500 text-leaf-950' : 'bg-white/10 text-white hover:bg-white/20'
                  } ${n === now && month !== n ? 'ring-2 ring-turmeric-500' : ''}`}
                >
                  {m}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <div className="container-page py-10">
        {loading ? (
          <Spinner />
        ) : (
          <>
            <h2 className="mb-6 text-2xl font-bold sm:text-3xl">
              {t('calendar_in_season', { month: months[month - 1] })}
              {month === now && <span className="chip ml-3 bg-turmeric-100 align-middle text-turmeric-600">{t('calendar_now')}</span>}
            </h2>
            {inMonth.length === 0 ? (
              <Empty title={t('calendar_none')} />
            ) : (
              <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4">
                {inMonth.map((p) => (
                  <ProductCard key={p._id} product={p} />
                ))}
              </div>
            )}

            <section className="mt-16">
              <h2 className="mb-4 text-2xl font-bold">{t('calendar_title')}</h2>
              <div className="panel overflow-x-auto">
                <table className="w-full min-w-[760px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-line">
                      <th className="px-4 py-3 text-left font-semibold text-soil-700" scope="col">
                        {t('products')}
                      </th>
                      {months.map((m, i) => (
                        <th
                          key={m}
                          scope="col"
                          className={`px-1 py-3 text-center text-xs font-semibold ${i + 1 === now ? 'text-leaf-800' : 'text-soil-500'}`}
                        >
                          {m}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((p) => (
                      <tr key={p._id} className="border-b border-line last:border-0">
                        <th scope="row" className="px-4 py-2 text-left font-normal">
                          <Link to={`/product/${p._id}`} className="flex items-center gap-3 hover:text-leaf-700">
                            <span className="h-10 w-10 shrink-0 overflow-hidden rounded-lg">
                              <ProductImage product={p} size="sm" />
                            </span>
                            <span>
                              <span className="block font-semibold">{ln(p)}</span>
                              <span className="block text-xs text-soil-500">{p.farmer.farmName}</span>
                            </span>
                          </Link>
                        </th>
                        {months.map((m, i) => {
                          const on = p.seasonMonths?.includes(i + 1);
                          return (
                            <td key={m} className={`px-0.5 py-2 ${i + 1 === now ? 'bg-leaf-50' : ''}`}>
                              <span
                                className={`block h-6 rounded-md ${on ? 'bg-turmeric-500' : 'bg-transparent'}`}
                                title={on ? `${ln(p)}: ${m}` : undefined}
                              />
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </div>
    </>
  );
}
