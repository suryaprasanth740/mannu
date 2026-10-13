import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Star, X, Loader2, CheckCircle2, AlertCircle, Sprout } from 'lucide-react';
import { useI18n } from '../i18n/index.jsx';
import { sized, srcSet } from '../lib/images.js';

/* ---------- Brand ---------- */

export function LogoMark({ size = 36, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" className={className}>
      <rect width="64" height="64" rx="18" fill="#1F6B3A" />
      <g fill="#fff">
        <circle cx="14" cy="14" r="3" />
        <circle cx="50" cy="14" r="3" />
        <circle cx="14" cy="50" r="3" />
        <circle cx="50" cy="50" r="3" />
      </g>
      <path d="M32 52V30" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
      <path d="M32 34c0-9 6-15 15-15 0 9-6 15-15 15Z" fill="#E8A317" />
      <path d="M32 38c0-8-5-13-13-13 0 8 5 13 13 13Z" fill="#fff" />
    </svg>
  );
}

export function Logo({ light = false }) {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark size={34} />
      <span className={`font-display text-[26px] leading-none font-extrabold tracking-tight ${light ? 'text-white' : 'text-leaf-900'}`}>mannu</span>
    </span>
  );
}

/* ---------- Product imagery ---------- */

const TINTS = {
  vegetables: ['#e9f3e2', '#d4e8c8'],
  'leafy-greens': ['#e2f1df', '#c5e2bf'],
  fruits: ['#fdf1d4', '#f8e0a8'],
  'rice-millets': ['#f6f0e2', '#eadfc4'],
  pulses: ['#f4ece4', '#e6d6c6'],
  spices: ['#fbe9e3', '#f3d0c3'],
  'cold-pressed-oils': ['#fbf3d9', '#f2e2a8'],
  'honey-jaggery': ['#fcefd6', '#f4d8a0'],
  'milk-dairy': ['#eef3f6', '#d9e4eb'],
};

export function ProductImage({ product, className = '', size = 'md' }) {
  const [broken, setBroken] = useState(false);
  const url = product?.images?.[0]?.url || product?.image;
  if (url && !broken) {
    const w = { sm: 160, md: 600, lg: 1100 }[size];
    return (
      <img
        src={sized(url, w)}
        srcSet={size === 'sm' ? undefined : srcSet(url, size === 'lg' ? [600, 900, 1200, 1600] : [320, 480, 720])}
        sizes={size === 'lg' ? '(min-width: 1024px) 50vw, 100vw' : '(min-width: 1024px) 25vw, 50vw'}
        alt={product?.name || ''}
        loading={size === 'lg' ? 'eager' : 'lazy'}
        decoding="async"
        onError={() => setBroken(true)}
        className={`h-full w-full bg-leaf-100 object-cover ${className}`}
      />
    );
  }
  const slug = product?.category?.slug;
  const [a, b] = TINTS[slug] || ['#eef5ea', '#d8e9cf'];
  const emoji = { sm: 'text-3xl', md: 'text-6xl', lg: 'text-8xl sm:text-9xl' }[size];
  return (
    <div
      className={`relative flex h-full w-full items-center justify-center overflow-hidden ${className}`}
      style={{ background: `radial-gradient(circle at 50% 42%, ${a} 0%, ${b} 100%)` }}
      aria-hidden="true"
    >
      <svg className="absolute inset-0 h-full w-full opacity-40" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice">
        {[20, 50, 80].map((x) => [20, 50, 80].map((y) => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.3" fill="#ffffff" />))}
        <circle cx="50" cy="50" r="30" fill="none" stroke="#ffffff" strokeWidth="0.8" />
      </svg>
      <span className={`relative drop-shadow-sm ${emoji}`}>{product?.icon || '🌱'}</span>
    </div>
  );
}

/* ---------- Status ---------- */

const STATUS_STYLE = {
  placed: 'bg-turmeric-100 text-turmeric-600',
  accepted: 'bg-leaf-100 text-leaf-800',
  packed: 'bg-leaf-100 text-leaf-800',
  out_for_delivery: 'bg-leaf-100 text-leaf-800',
  ready_for_pickup: 'bg-leaf-100 text-leaf-800',
  delivered: 'bg-leaf-700 text-white',
  picked_up: 'bg-leaf-700 text-white',
  rejected: 'bg-chilli-100 text-chilli-600',
  cancelled: 'bg-chilli-100 text-chilli-600',
  open: 'bg-turmeric-100 text-turmeric-600',
  in_review: 'bg-leaf-100 text-leaf-800',
  resolved: 'bg-leaf-700 text-white',
  dismissed: 'bg-soil-300/30 text-soil-700',
};

export function StatusBadge({ status }) {
  const { t } = useI18n();
  return <span className={`chip ${STATUS_STYLE[status] || 'bg-leaf-50 text-soil-700'}`}>{t(`status_${status}`)}</span>;
}

export function PaymentBadge({ status }) {
  const { t } = useI18n();
  return (
    <span className={`chip ${status === 'paid' ? 'bg-leaf-100 text-leaf-800' : 'bg-soil-300/20 text-soil-700'}`}>
      {status === 'paid' ? t('paid') : t('unpaid')}
    </span>
  );
}

/* ---------- Rating ---------- */

export function Stars({ value = 0, size = 14, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-0.5 ${className}`} aria-label={`${value} / 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={size} className={i <= Math.round(value) ? 'fill-turmeric-500 text-turmeric-500' : 'text-soil-300'} />
      ))}
    </span>
  );
}

export function StarInput({ value, onChange }) {
  return (
    <div className="flex gap-1" role="radiogroup">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          type="button"
          key={i}
          role="radio"
          aria-checked={value === i}
          aria-label={`${i}`}
          onClick={() => onChange(i)}
          className="rounded p-0.5"
        >
          <Star size={28} className={i <= value ? 'fill-turmeric-500 text-turmeric-500' : 'text-soil-300'} />
        </button>
      ))}
    </div>
  );
}

/* ---------- Feedback ---------- */

export function Spinner({ label }) {
  const { t } = useI18n();
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-soil-500" role="status">
      <Loader2 className="animate-spin" size={20} />
      <span>{label || t('loading')}</span>
    </div>
  );
}

export function Empty({ icon: Icon = Sprout, title, hint, action }) {
  return (
    <div className="flex flex-col items-center px-6 py-16 text-center">
      <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-leaf-50 text-leaf-700">
        <Icon size={30} />
      </span>
      <h3 className="text-xl font-bold">{title}</h3>
      {hint && <p className="mt-1.5 max-w-md text-soil-500">{hint}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Notice({ tone = 'info', title, children, className = '' }) {
  const tones = {
    info: 'border-leaf-200 bg-leaf-50 text-leaf-900',
    warn: 'border-turmeric-500/40 bg-turmeric-100 text-soil-900',
    error: 'border-chilli-600/30 bg-chilli-100 text-chilli-600',
  };
  return (
    <div className={`rounded-2xl border px-4 py-3 text-sm ${tones[tone]} ${className}`} role={tone === 'error' ? 'alert' : undefined}>
      {title && <p className="font-semibold">{title}</p>}
      {children && <div className={title ? 'mt-0.5' : ''}>{children}</div>}
    </div>
  );
}

export function ErrorText({ children }) {
  if (!children) return null;
  return (
    <p className="mt-1 flex items-center gap-1 text-sm text-chilli-600">
      <AlertCircle size={14} /> {children}
    </p>
  );
}

/* ---------- Forms ---------- */

export function Field({ label, error, hint, children, className = '', htmlFor }) {
  return (
    <div className={className}>
      {label && (
        <label className="label" htmlFor={htmlFor}>
          {label}
        </label>
      )}
      {children}
      {hint && !error && <p className="mt-1 text-xs text-soil-500">{hint}</p>}
      <ErrorText>{error}</ErrorText>
    </div>
  );
}

export function Toggle({ checked, onChange, label, description }) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <span className="relative mt-0.5 inline-flex shrink-0">
        <input type="checkbox" className="peer sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span className="h-6 w-11 rounded-full bg-soil-300/60 transition-colors peer-checked:bg-leaf-700 peer-focus-visible:ring-2 peer-focus-visible:ring-turmeric-500" />
        <span className="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
      </span>
      <span>
        <span className="block text-[15px] font-semibold text-soil-900">{label}</span>
        {description && <span className="block text-sm text-soil-500">{description}</span>}
      </span>
    </label>
  );
}

/** Map server error details ({ "location.district": "msg" }) to a flat object for forms. */
export function fieldErrors(err) {
  return err?.details && typeof err.details === 'object' && !err.details.issues ? err.details : {};
}

/* ---------- Modal ---------- */

export function Modal({ open, onClose, title, children, wide = false }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    ref.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-leaf-950/40 p-0 sm:items-center sm:p-4" onMouseDown={onClose}>
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(e) => e.stopPropagation()}
        className={`max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 shadow-xl outline-none sm:rounded-3xl sm:p-6 ${wide ? 'sm:max-w-2xl' : 'sm:max-w-md'}`}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="text-xl font-bold">{title}</h2>
          <button onClick={onClose} className="rounded-full p-1.5 text-soil-500 hover:bg-leaf-50" aria-label="Close">
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ---------- Toasts ---------- */

const ToastContext = createContext(() => {});

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const push = useCallback((message, tone = 'success') => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, message, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  }, []);
  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4" aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold shadow-lg ${
              t.tone === 'error' ? 'bg-chilli-600 text-white' : 'bg-leaf-900 text-white'
            }`}
          >
            {t.tone === 'error' ? <AlertCircle size={16} /> : <CheckCircle2 size={16} className="text-turmeric-500" />}
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);

/* ---------- Data hook ---------- */

export function useFetch(fn, deps = []) {
  const [state, setState] = useState({ data: null, error: null, loading: true });
  const run = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await fn();
      setState({ data, error: null, loading: false });
      return data;
    } catch (error) {
      setState({ data: null, error, loading: false });
      return null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(() => {
    run();
  }, [run]);
  return { ...state, reload: run, setData: (data) => setState((s) => ({ ...s, data: typeof data === 'function' ? data(s.data) : data })) };
}
