import { Link } from 'react-router-dom';
import { Plus, ShoppingBag, PackageCheck, Wallet, HandCoins, AlertTriangle } from 'lucide-react';
import { api } from '../../api/client.js';
import { useI18n } from '../../i18n/index.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { money, qtyLabel } from '../../lib/format.js';
import { photoBg } from '../../lib/images.js';
import { Spinner, useFetch } from '../../components/ui.jsx';

function SalesChart({ daily }) {
  const { lang } = useI18n();
  const max = Math.max(1, ...daily.map((d) => d.sales));
  return (
    <div className="flex h-44 items-end gap-1.5" role="img" aria-label="Sales per day">
      {daily.map((d) => {
        const h = (d.sales / max) * 100;
        const date = new Date(d.date);
        return (
          <div key={d.date} className="group flex h-full flex-1 flex-col items-center justify-end gap-1">
            <span className="text-[10px] font-semibold text-soil-500 opacity-0 group-hover:opacity-100">{d.sales ? money(d.sales) : ''}</span>
            <div className={`w-full rounded-t-md ${d.sales ? 'bg-leaf-600' : 'bg-leaf-100'}`} style={{ height: `${Math.max(h, 3)}%` }} title={`${d.date}: ${money(d.sales)}`} />
            <span className="text-[10px] text-soil-500">{Number(d.date.slice(8))}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function FarmerOverview() {
  const { t } = useI18n();
  const { user, farmerProfile } = useAuth();
  const { data, loading } = useFetch(() => api.get('/farmer/stats'), []);
  if (loading || !data) return <Spinner />;

  const tiles = [
    { label: t('f_new_orders'), value: data.counts.new, icon: ShoppingBag, to: '/farmer/orders?view=new', accent: data.counts.new > 0 },
    { label: t('f_active_orders'), value: data.counts.active, icon: PackageCheck, to: '/farmer/orders?view=active' },
    { label: t('f_received'), value: money(data.earnings.received), icon: Wallet, to: '/farmer/orders?view=done' },
    { label: t('f_to_collect'), value: money(data.earnings.toCollect), icon: HandCoins, to: '/farmer/orders?view=active' },
  ];

  return (
    <div className="space-y-8">
      <div
        className={`flex min-h-[180px] flex-wrap items-end justify-between gap-4 overflow-hidden rounded-[24px] p-5 text-white sm:p-7 ${farmerProfile?.coverPhoto?.url ? '' : 'kolam-bg bg-leaf-800'}`}
        style={farmerProfile?.coverPhoto?.url ? photoBg(farmerProfile.coverPhoto.url, 1400, 'linear-gradient(0deg, rgba(11,46,26,.9) 0%, rgba(11,46,26,.35) 70%, rgba(11,46,26,.15) 100%)') : undefined}
      >
        <div>
          <p className="text-leaf-50/90">{user.name}, {farmerProfile?.farmName}</p>
          <h1 className="text-3xl font-bold text-white">{t('f_today')}</h1>
        </div>
        <Link to="/farmer/products/new" className="btn-accent btn-lg">
          <Plus size={20} /> {t('f_add_product')}
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map(({ label, value, icon: Icon, to, accent }) => (
          <Link key={label} to={to} className={`rounded-tile p-4 sm:p-5 ${accent ? 'bg-turmeric-500 text-leaf-950' : 'border border-line bg-white hover:border-leaf-500'}`}>
            <Icon size={24} className={accent ? '' : 'text-leaf-700'} />
            <p className="mt-3 font-display text-2xl font-bold sm:text-3xl">{value}</p>
            <p className={`text-sm font-semibold ${accent ? '' : 'text-soil-500'}`}>{label}</p>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <section className="panel p-5">
          <h2 className="mb-4 font-sans text-lg font-bold">{t('f_sales_14')}</h2>
          <SalesChart daily={data.daily} />
        </section>
        <section className="panel p-5">
          <h2 className="mb-3 font-sans text-lg font-bold">{t('f_top_products')}</h2>
          {data.topProducts.length === 0 ? (
            <p className="text-soil-500">—</p>
          ) : (
            <ul className="divide-y divide-line">
              {data.topProducts.map((p) => (
                <li key={p.name} className="flex justify-between gap-3 py-2.5 text-[15px]">
                  <span>
                    {p.name}
                    <span className="block text-sm text-soil-500">{qtyLabel(p.qty, p.unit, t)}</span>
                  </span>
                  <span className="font-semibold">{money(p.revenue)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {data.lowStock.length > 0 && (
        <section className="rounded-tile border-2 border-turmeric-500 bg-turmeric-100 p-5">
          <h2 className="mb-3 flex items-center gap-2 font-sans text-lg font-bold">
            <AlertTriangle size={20} className="text-turmeric-600" /> {t('f_low_stock')}
          </h2>
          <ul className="flex flex-wrap gap-2">
            {data.lowStock.map((p) => (
              <li key={p.id}>
                <Link to="/farmer/products" className="chip bg-white px-3 py-1.5 text-sm text-soil-900">
                  {p.name}: {qtyLabel(p.stock, p.unit, t)}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
