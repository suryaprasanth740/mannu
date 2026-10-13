const inrWhole = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
const inrPaise = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** ₹1,250 for whole rupees, ₹6.40 when paise are involved. */
export const money = (n) => {
  const v = Math.round((Number(n) || 0) * 100) / 100;
  return Number.isInteger(v) ? inrWhole.format(v) : inrPaise.format(v);
};

export function qtyLabel(qty, unit, t) {
  const n = Number(qty);
  const num = Number.isInteger(n) ? String(n) : String(Math.round(n * 1000) / 1000);
  if (unit === 'kg' && n < 1) return `${Math.round(n * 1000)} ${t('unit_g')}`;
  if (unit === 'litre' && n < 1) return `${Math.round(n * 1000)} ${t('unit_ml')}`;
  return `${num} ${t(`unit_${unit}`)}`;
}

export const unitLabel = (unit, t) => t(`unit_${unit}`);

/** Step size for the quantity stepper. Loose produce can be bought in fractions. */
export function qtyStep(product) {
  const fractional = ['kg', 'litre'].includes(product.unit);
  if (!fractional) return 1;
  return product.minOrderQty && product.minOrderQty < 1 ? product.minOrderQty : 0.5;
}

export function clampQty(q, product) {
  const step = qtyStep(product);
  const min = product.minOrderQty || step;
  let v = Math.round(q / step) * step;
  v = Math.max(min, v);
  if (product.stock !== undefined) v = Math.min(v, product.stock);
  return Math.round(v * 1000) / 1000;
}

export function fmtDate(d, lang = 'en', opts = { day: 'numeric', month: 'short', year: 'numeric' }) {
  if (!d) return '';
  const locale = { en: 'en-IN', kn: 'kn-IN', ta: 'ta-IN', te: 'te-IN' }[lang] || 'en-IN';
  return new Date(d).toLocaleDateString(locale, opts);
}

export function fmtDateTime(d, lang = 'en') {
  if (!d) return '';
  const locale = { en: 'en-IN', kn: 'kn-IN', ta: 'ta-IN', te: 'te-IN' }[lang] || 'en-IN';
  return new Date(d).toLocaleString(locale, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
}

export const currentMonth = () => new Date().getMonth() + 1;

export function inSeason(p) {
  return p.seasonal && p.seasonMonths?.includes(currentMonth());
}

export function initials(name = '') {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

/** "Picked today / yesterday / N days ago" for produce harvested in the last week; null otherwise. */
export function freshness(harvestedOn, t) {
  if (!harvestedOn) return null;
  const start = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const days = Math.round((start(new Date()) - start(new Date(harvestedOn))) / 86400000);
  if (days < 0 || days > 7) return null;
  if (days === 0) return t('fresh_today');
  if (days === 1) return t('fresh_yesterday');
  return t('fresh_days', { n: days });
}
