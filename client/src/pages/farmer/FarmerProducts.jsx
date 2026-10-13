import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Pencil, Eye, EyeOff, Package, Ban } from 'lucide-react';
import { api } from '../../api/client.js';
import { useI18n } from '../../i18n/index.jsx';
import { money, qtyLabel, unitLabel } from '../../lib/format.js';
import { Empty, Modal, Notice, ProductImage, Spinner, useFetch, useToast } from '../../components/ui.jsx';

function StockModal({ product, onClose, onSaved }) {
  const { t, ln } = useI18n();
  const [stock, setStock] = useState(String(product.stock));
  const [price, setPrice] = useState(String(product.price));
  const [error, setError] = useState('');
  return (
    <Modal open onClose={onClose} title={`${t('f_update_stock')}: ${ln(product)}`}>
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          try {
            const d = await api.patch(`/farmer/products/${product._id}/stock`, { stock: Number(stock), price: Number(price) });
            onSaved(d.product);
          } catch (err) {
            setError(err.message);
          }
        }}
      >
        {error && <Notice tone="error">{error}</Notice>}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="s-stock">{t('f_stock')} ({unitLabel(product.unit, t)})</label>
            <input id="s-stock" className="input text-xl font-bold" inputMode="decimal" value={stock} onChange={(e) => setStock(e.target.value.replace(/[^\d.]/g, ''))} autoFocus />
          </div>
          <div>
            <label className="label" htmlFor="s-price">{t('price')} (₹)</label>
            <input id="s-price" className="input text-xl font-bold" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value.replace(/[^\d.]/g, ''))} />
          </div>
        </div>
        <div className="flex gap-2">
          {[0, 10, 25, 50].map((n) => (
            <button type="button" key={n} className="btn-outline btn-sm flex-1" onClick={() => setStock(String(n))}>
              {n}
            </button>
          ))}
        </div>
        <button className="btn-primary btn-lg w-full" disabled={stock === '' || !price}>{t('save')}</button>
      </form>
    </Modal>
  );
}

export default function FarmerProducts() {
  const { t, ln } = useI18n();
  const toast = useToast();
  const { data, loading, setData } = useFetch(() => api.get('/farmer/products'), []);
  const [editingStock, setEditingStock] = useState(null);
  const replace = (p) => setData((d) => ({ products: d.products.map((x) => (x._id === p._id ? { ...x, ...p, category: x.category } : x)) }));

  if (loading) return <Spinner />;
  const products = data?.products || [];

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">{t('f_products')}</h1>
        <Link to="/farmer/products/new" className="btn-primary">
          <Plus size={18} /> {t('f_add_product')}
        </Link>
      </div>
      {products.length === 0 ? (
        <Empty icon={Package} title={t('f_no_products')} hint={t('f_no_products_hint')} action={<Link to="/farmer/products/new" className="btn-primary btn-lg"><Plus size={18} /> {t('f_add_product')}</Link>} />
      ) : (
        <ul className="space-y-3">
          {products.map((p) => (
            <li key={p._id} className={`panel flex flex-wrap items-center gap-4 p-3 sm:p-4 ${!p.isActive || p.isBlocked ? 'bg-leaf-50/50' : ''}`}>
              <span className="h-16 w-16 shrink-0 overflow-hidden rounded-xl">
                <ProductImage product={p} size="sm" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{ln(p)}</p>
                <p className="text-sm text-soil-500">
                  {money(p.price)} / {unitLabel(p.unit, t)} · {ln(p.category)}
                </p>
                <p className="mt-1 flex flex-wrap gap-1.5">
                  {p.isBlocked ? (
                    <span className="chip bg-chilli-100 text-chilli-600"><Ban size={12} /> {t('f_blocked')}{p.blockedReason && `: ${p.blockedReason}`}</span>
                  ) : p.isActive ? (
                    <span className="chip bg-leaf-100 text-leaf-800">{t('f_visible')}</span>
                  ) : (
                    <span className="chip bg-soil-300/30 text-soil-700">{t('f_hidden')}</span>
                  )}
                </p>
              </div>
              <button
                onClick={() => setEditingStock(p)}
                className={`rounded-2xl px-4 py-2 text-center ${p.stock <= 0 ? 'bg-chilli-100 text-chilli-600' : p.stock <= 5 ? 'bg-turmeric-100' : 'bg-leaf-50'}`}
                aria-label={t('f_update_stock')}
              >
                <span className="block font-display text-xl font-bold">{qtyLabel(p.stock, p.unit, t)}</span>
                <span className="block text-xs font-semibold">{t('f_update_stock')}</span>
              </button>
              <div className="flex gap-1">
                <button
                  className="btn-ghost btn-sm"
                  disabled={p.isBlocked}
                  onClick={async () => {
                    const d = await api.patch(`/farmer/products/${p._id}/active`, { isActive: !p.isActive });
                    replace(d.product);
                    toast(d.product.isActive ? t('f_visible') : t('f_hidden'));
                  }}
                  title={p.isActive ? t('f_hide') : t('f_show')}
                >
                  {p.isActive ? <EyeOff size={17} /> : <Eye size={17} />} <span className="hidden sm:inline">{p.isActive ? t('f_hide') : t('f_show')}</span>
                </button>
                <Link to={`/farmer/products/${p._id}`} className="btn-outline btn-sm">
                  <Pencil size={15} /> {t('edit')}
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
      {editingStock && (
        <StockModal
          product={editingStock}
          onClose={() => setEditingStock(null)}
          onSaved={(p) => {
            replace(p);
            setEditingStock(null);
            toast(t('saved'));
          }}
        />
      )}
    </div>
  );
}
