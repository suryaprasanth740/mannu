import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Search, ShoppingBasket, User, ChevronDown, Languages, LogOut, Package, LifeBuoy, LayoutDashboard, ShieldCheck, Tractor } from 'lucide-react';
import { useI18n, LANGUAGES } from '../i18n/index.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import { api } from '../api/client.js';
import { Logo, LogoMark } from './ui.jsx';
import NotificationBell from './NotificationBell.jsx';

function useClickOutside(ref, onOut) {
  useEffect(() => {
    const h = (e) => ref.current && !ref.current.contains(e.target) && onOut();
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [ref, onOut]);
}

export function LanguageSwitcher({ compact = false }) {
  const { lang, setLang, t } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useClickOutside(ref, () => setOpen(false));
  const current = LANGUAGES.find((l) => l.code === lang);
  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold text-leaf-900 hover:bg-leaf-50"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t('language')}
      >
        <Languages size={18} />
        <span className={compact ? 'hidden sm:inline' : ''}>{current.label}</span>
      </button>
      {open && (
        <ul className="absolute right-0 z-40 mt-1 w-40 overflow-hidden rounded-2xl border border-line bg-white py-1 shadow-lg" role="listbox">
          {LANGUAGES.map((l) => (
            <li key={l.code}>
              <button
                role="option"
                aria-selected={l.code === lang}
                onClick={() => {
                  setLang(l.code);
                  setOpen(false);
                }}
                className={`w-full px-4 py-2 text-left text-[15px] hover:bg-leaf-50 ${l.code === lang ? 'font-bold text-leaf-700' : ''}`}
              >
                {l.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function AccountMenu() {
  const { user, logout } = useAuth();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();
  useClickOutside(ref, () => setOpen(false));

  if (!user) {
    return (
      <Link to="/login" className="btn-ghost btn-sm">
        <User size={18} /> <span className="hidden sm:inline">{t('nav_login')}</span>
      </Link>
    );
  }

  const links =
    user.role === 'farmer'
      ? [
          ['/farmer', t('nav_dashboard'), LayoutDashboard],
          ['/farmer/orders', t('f_orders'), Package],
          ['/account', t('nav_account'), User],
          ['/help', t('nav_help'), LifeBuoy],
        ]
      : user.role === 'admin'
        ? [['/admin', t('nav_admin'), ShieldCheck]]
        : [
            ['/orders', t('nav_orders'), Package],
            ['/account', t('nav_account'), User],
            ['/help', t('nav_help'), LifeBuoy],
          ];

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-full py-1.5 pr-2 pl-1.5 text-sm font-semibold text-leaf-900 hover:bg-leaf-50"
        aria-expanded={open}
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-leaf-100 text-sm font-bold text-leaf-800">
          {user.name?.[0]?.toUpperCase()}
        </span>
        <span className="hidden max-w-28 truncate md:inline">{user.name.split(' ')[0]}</span>
        <ChevronDown size={16} />
      </button>
      {open && (
        <div className="absolute right-0 z-40 mt-1 w-60 overflow-hidden rounded-2xl border border-line bg-white py-1.5 shadow-lg">
          <div className="border-b border-line px-4 pt-1 pb-2.5">
            <p className="truncate font-semibold">{user.name}</p>
            <p className="truncate text-sm text-soil-500">{user.email}</p>
          </div>
          {links.map(([to, label, Icon]) => (
            <Link key={to} to={to} onClick={() => setOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-[15px] hover:bg-leaf-50">
              <Icon size={18} className="text-leaf-700" /> {label}
            </Link>
          ))}
          <button
            onClick={async () => {
              setOpen(false);
              await logout();
              navigate('/');
            }}
            className="flex w-full items-center gap-3 border-t border-line px-4 py-2.5 text-left text-[15px] hover:bg-leaf-50"
          >
            <LogOut size={18} className="text-leaf-700" /> {t('nav_logout')}
          </button>
        </div>
      )}
    </div>
  );
}

function SearchBox({ className = '' }) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const location = useLocation();
  const [q, setQ] = useState(params.get('q') || '');
  useEffect(() => {
    if (location.pathname === '/shop') setQ(params.get('q') || '');
  }, [params, location.pathname]);
  return (
    <form
      role="search"
      className={`relative ${className}`}
      onSubmit={(e) => {
        e.preventDefault();
        navigate(`/shop${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ''}`);
      }}
    >
      <Search size={18} className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-soil-500" />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={t('search_placeholder')}
        aria-label={t('search')}
        className="w-full rounded-full border border-line bg-leaf-50 py-2.5 pr-4 pl-11 text-[15px] placeholder:text-soil-500 focus:border-leaf-600 focus:bg-white focus:outline-none"
      />
    </form>
  );
}

let categoryCache = null;
export function useCategories() {
  const [cats, setCats] = useState(categoryCache || []);
  useEffect(() => {
    if (categoryCache) return;
    api
      .get('/categories')
      .then((d) => {
        categoryCache = d.categories;
        setCats(d.categories);
      })
      .catch(() => {});
  }, []);
  return cats;
}

function Header() {
  const { t, ln } = useI18n();
  const { count } = useCart();
  const { user } = useAuth();
  const cats = useCategories();
  const [params] = useSearchParams();
  const location = useLocation();
  const activeCat = location.pathname === '/shop' ? params.get('category') : null;

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-white/95 backdrop-blur">
      <div className="container-page flex h-16 items-center gap-3 sm:gap-5">
        <Link to="/" aria-label="Mannu home" className="shrink-0">
          <span className="hidden sm:block">
            <Logo />
          </span>
          <span className="sm:hidden">
            <LogoMark size={34} />
          </span>
        </Link>
        <SearchBox className="hidden flex-1 md:block md:max-w-xl" />
        <nav className="ml-auto flex items-center gap-1">
          <NavLink to="/farmers" className="hidden rounded-full px-3 py-2 text-sm font-semibold text-leaf-900 hover:bg-leaf-50 lg:block">
            {t('nav_farmers')}
          </NavLink>
          {!user && (
            <NavLink to="/register?role=farmer" className="hidden items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold text-leaf-900 hover:bg-leaf-50 lg:flex">
              <Tractor size={17} /> {t('sell_on_mannu')}
            </NavLink>
          )}
          <LanguageSwitcher compact />
          <NotificationBell />
          <AccountMenu />
          {user?.role !== 'farmer' && user?.role !== 'admin' && (
            <Link to="/cart" className="relative flex items-center gap-2 rounded-full bg-leaf-700 py-2 pr-4 pl-3 text-sm font-semibold text-white hover:bg-leaf-800" aria-label={`${t('nav_cart')} (${count})`}>
              <ShoppingBasket size={19} />
              <span className="hidden sm:inline">{t('nav_cart')}</span>
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-turmeric-500 px-1 text-xs font-bold text-leaf-950">{count}</span>
            </Link>
          )}
        </nav>
      </div>
      <div className="container-page pb-2.5 md:hidden">
        <SearchBox />
      </div>
      <div className="border-t border-line/70">
        <nav className="container-page scrollbar-none flex gap-1 overflow-x-auto py-2" aria-label={t('shop_by_category')}>
          <Link to="/shop" className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-semibold ${location.pathname === '/shop' && !activeCat && !params.get('inSeason') && !params.get('bulk') ? 'bg-leaf-900 text-white' : 'text-soil-700 hover:bg-leaf-50'}`}>
            {t('all_products')}
          </Link>
          <Link to="/shop?inSeason=true" className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-semibold ${params.get('inSeason') && location.pathname === '/shop' ? 'bg-turmeric-500 text-leaf-950' : 'text-soil-700 hover:bg-turmeric-100'}`}>
            {t('nav_season')}
          </Link>
          {cats.map((c) => (
            <Link
              key={c._id}
              to={`/shop?category=${c.slug}`}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-semibold ${activeCat === c.slug ? 'bg-leaf-900 text-white' : 'text-soil-700 hover:bg-leaf-50'}`}
            >
              <span aria-hidden="true">{c.icon}</span> {ln(c)}
            </Link>
          ))}
          <Link to="/shop?bulk=true" className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-semibold ${params.get('bulk') && location.pathname === '/shop' ? 'bg-leaf-900 text-white' : 'text-soil-700 hover:bg-leaf-50'}`}>
            {t('nav_bulk')}
          </Link>
          <NavLink to="/season" className={({ isActive }) => `shrink-0 rounded-full px-3.5 py-1.5 text-sm font-semibold ${isActive ? 'bg-leaf-900 text-white' : 'text-soil-700 hover:bg-leaf-50'}`}>
            {t('nav_calendar')}
          </NavLink>
        </nav>
      </div>
    </header>
  );
}

function Footer() {
  const { t } = useI18n();
  return (
    <footer className="kolam-bg mt-20 bg-leaf-900 text-leaf-100">
      <div className="container-page grid gap-10 py-14 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <Logo light />
          <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-leaf-100/80">{t('footer_about')}</p>
        </div>
        <div>
          <h3 className="mb-3 font-sans text-sm font-bold text-white">{t('footer_buy')}</h3>
          <ul className="space-y-2 text-[15px]">
            <li><Link to="/shop" className="hover:text-white">{t('all_products')}</Link></li>
            <li><Link to="/shop?inSeason=true" className="hover:text-white">{t('nav_season')}</Link></li>
            <li><Link to="/shop?bulk=true" className="hover:text-white">{t('nav_bulk')}</Link></li>
            <li><Link to="/season" className="hover:text-white">{t('nav_calendar')}</Link></li>
            <li><Link to="/farmers" className="hover:text-white">{t('nav_farmers')}</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="mb-3 font-sans text-sm font-bold text-white">{t('footer_sell')}</h3>
          <ul className="space-y-2 text-[15px]">
            <li><Link to="/register?role=farmer" className="hover:text-white">{t('farmer_cta_btn')}</Link></li>
            <li><Link to="/farmer" className="hover:text-white">{t('nav_dashboard')}</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="mb-3 font-sans text-sm font-bold text-white">{t('footer_help')}</h3>
          <ul className="space-y-2 text-[15px]">
            <li><Link to="/orders" className="hover:text-white">{t('nav_orders')}</Link></li>
            <li><Link to="/help" className="hover:text-white">{t('nav_help')}</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <p className="container-page flex flex-wrap justify-between gap-2 py-5 text-sm text-leaf-100/60">
          <span>© {new Date().getFullYear()} Mannu</span>
          <a href="https://unsplash.com/license" target="_blank" rel="noreferrer" className="hover:text-white">
            {t('photo_credit')}
          </a>
        </p>
      </div>
    </footer>
  );
}

export default function Layout() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:m-2 focus:rounded-full focus:bg-white focus:px-4 focus:py-2">
        Skip to content
      </a>
      <Header />
      <main id="main" className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
