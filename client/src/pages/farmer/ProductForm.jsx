import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ImagePlus, Trash2, X, Plus } from 'lucide-react';
import { api } from '../../api/client.js';
import { useI18n } from '../../i18n/index.jsx';
import { unitLabel } from '../../lib/format.js';
import { Field, Notice, Spinner, Toggle, fieldErrors, useToast } from '../../components/ui.jsx';
import { useCategories } from '../../components/Layout.jsx';

const UNITS = ['kg', 'g', 'litre', 'ml', 'unit', 'dozen', 'bunch'];
const blank = {
  name: '',
  localNames: { kn: '', ta: '', te: '' },
  category: '',
  description: '',
  unit: 'kg',
  price: '',
  stock: '',
  minOrderQty: '1',
  bulkTiers: [],
  seasonal: false,
  seasonMonths: [],
  harvestedOn: '',
  isOrganic: false,
  isActive: true,
};

export default function ProductForm() {
  const { id } = useParams();
  const isNew = !id;
  const { t, ln } = useI18n();
  const navigate = useNavigate();
  const toast = useToast();
  const cats = useCategories();
  const fileRef = useRef(null);
  const [form, setForm] = useState(blank);
  const [images, setImages] = useState([]); // saved images
  const [pending, setPending] = useState([]); // File objects not uploaded yet
  const [loading, setLoading] = useState(!isNew);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (isNew) return;
    api
      .get(`/farmer/products/${id}`)
      .then(({ product: p }) => {
        setForm({
          name: p.name,
          localNames: { kn: p.localNames?.kn || '', ta: p.localNames?.ta || '', te: p.localNames?.te || '' },
          category: p.category,
          description: p.description || '',
          unit: p.unit,
          price: String(p.price),
          stock: String(p.stock),
          minOrderQty: String(p.minOrderQty ?? 1),
          bulkTiers: (p.bulkTiers || []).map((b) => ({ minQty: String(b.minQty), price: String(b.price) })),
          seasonal: p.seasonal,
          seasonMonths: p.seasonMonths || [],
          harvestedOn: p.harvestedOn ? p.harvestedOn.slice(0, 10) : '',
          isOrganic: p.isOrganic,
          isActive: p.isActive,
        });
        setImages(p.images || []);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id, isNew]);

  useEffect(() => () => pending.forEach((f) => URL.revokeObjectURL(f.preview)), [pending]);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const num = (k) => (e) => setForm({ ...form, [k]: e.target.value.replace(/[^\d.]/g, '') });

  function validate() {
    const e = {};
    if (form.name.trim().length < 2) e.name = t('f_product_name');
    if (!form.category) e.category = t('category');
    if (!(Number(form.price) > 0)) e.price = t('f_price');
    if (form.stock === '' || Number(form.stock) < 0) e.stock = t('f_stock');
    if (!(Number(form.minOrderQty) > 0)) e.minOrderQty = t('f_min_order');
    form.bulkTiers.forEach((b, i) => {
      if (!(Number(b.minQty) > Number(form.minOrderQty))) e[`bulkTiers.${i}.minQty`] = t('f_buy_at_least');
      if (!(Number(b.price) > 0) || Number(b.price) >= Number(form.price)) e[`bulkTiers.${i}.price`] = t('f_price_each');
    });
    if (form.seasonal && !form.seasonMonths.length) e.seasonMonths = t('f_months');
    setErrors(e);
    return !Object.keys(e).length;
  }

  function addFiles(list) {
    const room = 4 - images.length - pending.length;
    const ok = [...list]
      .filter((f) => ['image/jpeg', 'image/png', 'image/webp'].includes(f.type) && f.size <= 3 * 1024 * 1024)
      .slice(0, room)
      .map((f) => Object.assign(f, { preview: URL.createObjectURL(f) }));
    if (ok.length < list.length) toast(t('f_photos_hint'), 'error');
    setPending((p) => [...p, ...ok]);
  }

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (!validate()) {
      setError(t('fix_cart'));
      return;
    }
    setBusy(true);
    const body = {
      ...form,
      price: Number(form.price),
      stock: Number(form.stock),
      minOrderQty: Number(form.minOrderQty),
      bulkTiers: form.bulkTiers.map((b) => ({ minQty: Number(b.minQty), price: Number(b.price) })),
      harvestedOn: form.harvestedOn || null,
      localNames: Object.fromEntries(Object.entries(form.localNames).filter(([, v]) => v.trim())),
    };
    let product;
    try {
      ({ product } = isNew ? await api.post('/farmer/products', body) : await api.put(`/farmer/products/${id}`, body));
    } catch (err) {
      setError(err.message);
      setErrors(fieldErrors(err));
      setBusy(false);
      return;
    }
    if (pending.length) {
      try {
        const fd = new FormData();
        pending.forEach((f) => fd.append('images', f));
        await api.upload(`/farmer/products/${product._id}/images`, fd);
      } catch (err) {
        // Product details are saved; only the photos failed. Stay on the edit page so they can retry.
        toast(err.message, 'error');
        setBusy(false);
        if (isNew) navigate(`/farmer/products/${product._id}`, { replace: true });
        return;
      }
    }
    toast(t('saved'));
    navigate('/farmer/products');
  }

  if (loading) return <Spinner />;
  const months = t('months');
  const unit = unitLabel(form.unit, t);

  return (
    <form onSubmit={submit} className="max-w-3xl space-y-6" noValidate>
      <h1 className="text-3xl font-bold">{isNew ? t('f_add_product') : t('f_edit_product')}</h1>
      {error && <Notice tone="error">{error}</Notice>}

      <section className="panel space-y-4 p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('f_product_name')} error={errors.name} htmlFor="pf-name">
            <input id="pf-name" className={`input ${errors.name ? 'input-error' : ''}`} value={form.name} onChange={set('name')} placeholder="Tomato" />
          </Field>
          <Field label={t('category')} error={errors.category} htmlFor="pf-cat">
            <select id="pf-cat" className={`input ${errors.category ? 'input-error' : ''}`} value={form.category} onChange={set('category')}>
              <option value="">—</option>
              {cats.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.icon} {ln(c)}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <details className="rounded-xl bg-leaf-50 p-3" open={Object.values(form.localNames).some(Boolean)}>
          <summary className="cursor-pointer text-sm font-semibold text-soil-700">{t('f_local_names')}</summary>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {[
              ['kn', 'ಕನ್ನಡ'],
              ['ta', 'தமிழ்'],
              ['te', 'తెలుగు'],
            ].map(([k, label]) => (
              <Field key={k} label={label} htmlFor={`pf-${k}`}>
                <input id={`pf-${k}`} className="input" value={form.localNames[k]} onChange={(e) => setForm({ ...form, localNames: { ...form.localNames, [k]: e.target.value } })} />
              </Field>
            ))}
          </div>
        </details>
        <Field label={t('f_description')} htmlFor="pf-desc">
          <textarea id="pf-desc" rows={3} maxLength={1000} className="input" value={form.description} onChange={set('description')} />
        </Field>
      </section>

      <section className="panel space-y-4 p-5">
        <div>
          <span className="label">{t('f_unit')}</span>
          <div className="flex flex-wrap gap-2">
            {UNITS.map((u) => (
              <button
                type="button"
                key={u}
                onClick={() => setForm({ ...form, unit: u })}
                className={`rounded-full border-2 px-4 py-2 text-[15px] font-semibold ${form.unit === u ? 'border-leaf-700 bg-leaf-700 text-white' : 'border-line'}`}
              >
                {unitLabel(u, t)}
              </button>
            ))}
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label={`${t('f_price')} — ${unit}`} error={errors.price} htmlFor="pf-price">
            <input id="pf-price" inputMode="decimal" className={`input text-lg font-semibold ${errors.price ? 'input-error' : ''}`} value={form.price} onChange={num('price')} />
          </Field>
          <Field label={`${t('f_stock')} (${unit})`} error={errors.stock} htmlFor="pf-stock">
            <input id="pf-stock" inputMode="decimal" className={`input text-lg font-semibold ${errors.stock ? 'input-error' : ''}`} value={form.stock} onChange={num('stock')} />
          </Field>
          <Field label={`${t('f_min_order')} (${unit})`} error={errors.minOrderQty} htmlFor="pf-min">
            <input id="pf-min" inputMode="decimal" className={`input text-lg font-semibold ${errors.minOrderQty ? 'input-error' : ''}`} value={form.minOrderQty} onChange={num('minOrderQty')} />
          </Field>
        </div>

        <div className="rounded-2xl bg-turmeric-100 p-4">
          <p className="font-semibold">{t('f_bulk_tiers')}</p>
          <p className="text-sm text-soil-700">{t('f_bulk_hint')}</p>
          <div className="mt-3 space-y-3">
            {form.bulkTiers.map((b, i) => (
              <div key={i} className="flex flex-wrap items-end gap-3">
                <Field label={`${t('f_buy_at_least')} (${unit})`} error={errors[`bulkTiers.${i}.minQty`]} className="flex-1" htmlFor={`bt-q-${i}`}>
                  <input
                    id={`bt-q-${i}`}
                    inputMode="decimal"
                    className="input"
                    value={b.minQty}
                    onChange={(e) => setForm({ ...form, bulkTiers: form.bulkTiers.map((x, j) => (j === i ? { ...x, minQty: e.target.value.replace(/[^\d.]/g, '') } : x)) })}
                  />
                </Field>
                <Field label={`${t('f_price_each')} (₹)`} error={errors[`bulkTiers.${i}.price`]} className="flex-1" htmlFor={`bt-p-${i}`}>
                  <input
                    id={`bt-p-${i}`}
                    inputMode="decimal"
                    className="input"
                    value={b.price}
                    onChange={(e) => setForm({ ...form, bulkTiers: form.bulkTiers.map((x, j) => (j === i ? { ...x, price: e.target.value.replace(/[^\d.]/g, '') } : x)) })}
                  />
                </Field>
                <button type="button" className="btn-ghost mb-0.5 px-3" onClick={() => setForm({ ...form, bulkTiers: form.bulkTiers.filter((_, j) => j !== i) })} aria-label={t('remove')}>
                  <X size={18} />
                </button>
              </div>
            ))}
            {form.bulkTiers.length < 4 && (
              <button type="button" className="btn-outline btn-sm bg-white" onClick={() => setForm({ ...form, bulkTiers: [...form.bulkTiers, { minQty: '', price: '' }] })}>
                <Plus size={15} /> {t('f_add_tier')}
              </button>
            )}
          </div>
        </div>
      </section>

      <section className="panel space-y-4 p-5">
        <Toggle checked={form.isOrganic} onChange={(v) => setForm({ ...form, isOrganic: v })} label={t('f_is_organic')} />
        <Toggle checked={form.seasonal} onChange={(v) => setForm({ ...form, seasonal: v })} label={t('f_is_seasonal')} />
        {form.seasonal && (
          <div>
            <span className="label">{t('f_months')}</span>
            <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-12">
              {months.map((m, i) => {
                const on = form.seasonMonths.includes(i + 1);
                return (
                  <button
                    type="button"
                    key={m}
                    aria-pressed={on}
                    onClick={() => setForm({ ...form, seasonMonths: on ? form.seasonMonths.filter((x) => x !== i + 1) : [...form.seasonMonths, i + 1].sort((a, b) => a - b) })}
                    className={`rounded-lg py-2 text-sm font-semibold ${on ? 'bg-turmeric-500 text-leaf-950' : 'bg-leaf-50 text-soil-700'}`}
                  >
                    {m}
                  </button>
                );
              })}
            </div>
            {errors.seasonMonths && <p className="mt-1 text-sm text-chilli-600">{errors.seasonMonths}</p>}
          </div>
        )}
        <Field label={t('f_harvest_date')} htmlFor="pf-harvest" className="max-w-xs">
          <input id="pf-harvest" type="date" className="input" value={form.harvestedOn} max={new Date().toISOString().slice(0, 10)} onChange={set('harvestedOn')} />
        </Field>
        <Toggle checked={form.isActive} onChange={(v) => setForm({ ...form, isActive: v })} label={t('f_visible')} />
      </section>

      <section className="panel p-5">
        <p className="font-semibold">{t('f_photos')}</p>
        <p className="text-sm text-soil-500">{t('f_photos_hint')}</p>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {images.map((img) => (
            <div key={img._id} className="relative aspect-square overflow-hidden rounded-xl">
              <img src={img.url} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                className="absolute top-1.5 right-1.5 rounded-full bg-white/90 p-1.5 text-chilli-600"
                aria-label={t('delete')}
                onClick={async () => {
                  const d = await api.del(`/farmer/products/${id}/images/${img._id}`);
                  setImages(d.product.images);
                }}
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          {pending.map((f, i) => (
            <div key={f.preview} className="relative aspect-square overflow-hidden rounded-xl ring-2 ring-turmeric-500">
              <img src={f.preview} alt="" className="h-full w-full object-cover" />
              <button type="button" className="absolute top-1.5 right-1.5 rounded-full bg-white/90 p-1.5" aria-label={t('remove')} onClick={() => setPending((p) => p.filter((_, j) => j !== i))}>
                <X size={16} />
              </button>
            </div>
          ))}
          {images.length + pending.length < 4 && (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                addFiles(e.dataTransfer.files);
              }}
              className="flex aspect-square flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-leaf-200 text-leaf-700 hover:border-leaf-600 hover:bg-leaf-50"
            >
              <ImagePlus size={28} />
              <span className="text-sm font-semibold">{t('f_add_photos')}</span>
            </button>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" multiple capture="environment" className="hidden" onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <button className="btn-primary btn-lg" disabled={busy}>
          {busy ? t('saving') : t('f_save_product')}
        </button>
        <button type="button" className="btn-ghost" onClick={() => navigate('/farmer/products')}>
          {t('cancel')}
        </button>
        {!isNew && (
          <button
            type="button"
            className="btn-danger ml-auto"
            onClick={async () => {
              if (!window.confirm(t('f_delete_confirm'))) return;
              try {
                await api.del(`/farmer/products/${id}`);
                toast(t('delete'));
                navigate('/farmer/products');
              } catch (err) {
                setError(err.message);
              }
            }}
          >
            <Trash2 size={16} /> {t('delete')}
          </button>
        )}
      </div>
    </form>
  );
}
