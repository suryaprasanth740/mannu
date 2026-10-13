import { Link } from 'react-router-dom';
import { MapPin, Minus, Plus, ShoppingBasket, Sprout } from 'lucide-react';
import { useI18n } from '../i18n/index.jsx';
import { useCart } from '../context/CartContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { clampQty, freshness, inSeason, money, qtyLabel, qtyStep, unitLabel } from '../lib/format.js';
import { ProductImage, Stars } from './ui.jsx';

export function QtyStepper({ product, value, onChange, size = 'md' }) {
  const { t } = useI18n();
  const step = qtyStep(product);
  const big = size === 'lg';
  return (
    <div className={`flex items-center rounded-full border border-leaf-200 bg-white ${big ? 'h-12' : 'h-10'}`}>
      <button
        type="button"
        onClick={() => onChange(Math.round((value - step) * 1000) / 1000)}
        className={`flex h-full items-center justify-center rounded-l-full text-leaf-800 hover:bg-leaf-50 ${big ? 'w-12' : 'w-10'}`}
        aria-label="Decrease"
      >
        <Minus size={16} />
      </button>
      <span className={`min-w-16 text-center font-semibold tabular-nums ${big ? 'text-base' : 'text-sm'}`} aria-live="polite">
        {qtyLabel(value, product.unit, t)}
      </span>
      <button
        type="button"
        onClick={() => onChange(clampQty(value + step, product))}
        disabled={product.stock !== undefined && value + step > product.stock}
        className={`flex h-full items-center justify-center rounded-r-full text-leaf-800 hover:bg-leaf-50 disabled:opacity-30 ${big ? 'w-12' : 'w-10'}`}
        aria-label="Increase"
      >
        <Plus size={16} />
      </button>
    </div>
  );
}

export function ProductBadges({ product, className = '' }) {
  const { t } = useI18n();
  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      {inSeason(product) && <span className="chip bg-turmeric-500 text-leaf-950">{t('seasonal')}</span>}
      {product.isOrganic && <span className="chip bg-white/95 text-leaf-800 ring-1 ring-leaf-200">{t('organic')}</span>}
      {product.bulkTiers?.length > 0 && <span className="chip bg-leaf-900 text-white">{t('bulk_deal')}</span>}
    </div>
  );
}

export default function ProductCard({ product }) {
  const { t, ln } = useI18n();
  const { add, qtyOf, setQty, remove } = useCart();
  const { user } = useAuth();
  const inCart = qtyOf(product._id);
  const canBuy = !user || user.role === 'customer';
  const best = product.bulkTiers?.length ? product.bulkTiers[product.bulkTiers.length - 1] : null;
  const firstTier = product.bulkTiers?.[0];
  const out = product.stock <= 0;
  const fresh = freshness(product.harvestedOn, t);

  return (
    <article className="group flex flex-col">
      <Link to={`/product/${product._id}`} className="relative block aspect-[4/3] overflow-hidden rounded-tile bg-leaf-50">
        <ProductImage product={product} className="transition-transform duration-500 group-hover:scale-[1.03]" />
        <ProductBadges product={product} className="absolute top-2.5 left-2.5" />
        {out && (
          <span className="absolute inset-0 flex items-center justify-center bg-white/70 font-semibold text-soil-700">{t('out_of_stock')}</span>
        )}
      </Link>
      <div className="flex flex-1 flex-col pt-3">
        <Link to={`/product/${product._id}`} className="text-[17px] leading-snug font-semibold text-soil-900 hover:text-leaf-700">
          {ln(product)}
        </Link>
        {product.farmer?.farmName && (
          <Link to={`/farmers/${product.farmer.id}`} className="mt-1 flex items-start gap-1 text-sm text-soil-500 hover:text-leaf-700">
            <MapPin size={14} className="mt-0.5 shrink-0" />
            <span className="line-clamp-1">
              {product.farmer.farmName}, {product.farmer.location?.district}
            </span>
          </Link>
        )}
        {fresh && (
          <span className="mt-1 flex items-center gap-1 text-xs font-semibold text-leaf-700">
            <Sprout size={13} /> {fresh}
          </span>
        )}
        {product.ratingCount > 0 && (
          <span className="mt-1 flex items-center gap-1.5 text-xs text-soil-500">
            <Stars value={product.ratingAvg} size={12} /> {product.ratingAvg}
          </span>
        )}
        <div className="mt-auto flex items-end justify-between gap-2 pt-3">
          <div>
            <p className="font-display text-xl font-bold text-leaf-950">
              {money(product.price)}
              <span className="ml-1 font-sans text-sm font-normal text-soil-500">/ {unitLabel(product.unit, t)}</span>
            </p>
            {firstTier && (
              <p className="text-xs font-semibold text-turmeric-600">
                {money(best.price)} @ {best.minQty}+ {unitLabel(product.unit, t)}
              </p>
            )}
          </div>
          {canBuy && !out && (
            inCart ? (
              <QtyStepper
                product={product}
                value={inCart}
                onChange={(q) => (q < (product.minOrderQty || qtyStep(product)) ? remove(product._id) : setQty(product._id, clampQty(q, product)))}
              />
            ) : (
              <button
                onClick={() => add(product, clampQty(product.minOrderQty || 1, product))}
                className="flex h-10 items-center gap-1.5 rounded-full bg-leaf-700 px-4 text-sm font-semibold text-white hover:bg-leaf-800"
                aria-label={`${t('add_to_cart')}: ${ln(product)}`}
              >
                <ShoppingBasket size={16} /> {t('add_to_cart')}
              </button>
            )
          )}
        </div>
      </div>
    </article>
  );
}
