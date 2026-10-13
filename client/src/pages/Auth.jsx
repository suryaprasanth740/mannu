import { useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { ShoppingBasket, Tractor } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useI18n } from '../i18n/index.jsx';
import { Field, Notice, fieldErrors } from '../components/ui.jsx';
import { LanguageSwitcher } from '../components/Layout.jsx';
import { SITE_PHOTOS, photoBg } from '../lib/images.js';

function homeFor(user) {
  if (user.role === 'farmer') return '/farmer';
  if (user.role === 'admin') return '/admin';
  return '/';
}

function AuthShell({ title, sub, children, photo = SITE_PHOTOS.auth }) {
  const { t } = useI18n();
  return (
    <div className="container-page grid gap-10 py-10 sm:py-14 lg:grid-cols-[1fr_minmax(0,0.9fr)] lg:items-stretch">
      <div
        className="hidden min-h-[560px] flex-col justify-end overflow-hidden rounded-[28px] p-10 lg:flex"
        style={photoBg(photo, 1200, 'linear-gradient(0deg, rgba(11,46,26,.9) 0%, rgba(11,46,26,.25) 55%, rgba(11,46,26,0) 100%)')}
      >
        <p className="max-w-md font-display text-3xl leading-tight font-bold text-white">{t('auth_panel')}</p>
      </div>
      <div className="mx-auto w-full max-w-lg lg:py-6">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">{title}</h1>
            {sub && <p className="mt-1 text-soil-500">{sub}</p>}
          </div>
          <LanguageSwitcher />
        </div>
        {children}
      </div>
    </div>
  );
}

const DEMO = [
  ['Customer', 'customer@mannu.in'],
  ['Farmer', 'lakshmi@mannu.in'],
  ['Admin', 'admin@mannu.in'],
];

export function Login() {
  const { t } = useI18n();
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const user = await login(form.email, form.password);
      const from = location.state?.from;
      navigate(from && user.role === 'customer' ? from : homeFor(user), { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell title={t('login_title')} sub={t('login_sub')}>
      <form onSubmit={submit} className="panel space-y-4 p-6" noValidate>
        {error && <Notice tone="error">{error}</Notice>}
        <Field label={t('email')} htmlFor="email">
          <input id="email" type="email" autoComplete="email" required className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </Field>
        <Field label={t('password')} htmlFor="password">
          <input id="password" type="password" autoComplete="current-password" required className="input" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </Field>
        <button className="btn-primary w-full" disabled={busy || !form.email || !form.password}>
          {busy ? t('loading') : t('nav_login')}
        </button>
        <p className="text-center text-sm text-soil-500">
          {t('no_account')} <Link to="/register" className="link">{t('nav_register')}</Link>
        </p>
      </form>
      <div className="mt-6 rounded-2xl border border-dashed border-leaf-200 p-4 text-sm">
        <p className="font-semibold text-soil-700">{t('demo_accounts')}</p>
        <p className="mt-0.5 text-soil-500">Password: Mannu@2026</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {DEMO.map(([label, email]) => (
            <button key={email} type="button" className="btn-outline btn-sm" onClick={() => setForm({ email, password: 'Mannu@2026' })}>
              {label}
            </button>
          ))}
        </div>
      </div>
    </AuthShell>
  );
}

const STATES = ['Karnataka', 'Tamil Nadu', 'Andhra Pradesh', 'Telangana', 'Kerala', 'Puducherry', 'Goa', 'Maharashtra'];

export function Register() {
  const { t, lang } = useI18n();
  const { register } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [role, setRole] = useState(params.get('role') === 'farmer' ? 'farmer' : 'customer');
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', farmName: '', village: '', district: '', state: 'Karnataka', pincode: '' });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  function validate() {
    const e = {};
    if (form.name.trim().length < 2) e.name = t('name');
    if (!/^\S+@\S+\.\S+$/.test(form.email)) e.email = t('email');
    if (!/^[6-9]\d{9}$/.test(form.phone)) e.phone = '10-digit mobile number';
    if (form.password.length < 8 || !/[A-Za-z]/.test(form.password) || !/\d/.test(form.password)) e.password = t('password_hint');
    if (role === 'farmer') {
      if (form.farmName.trim().length < 2) e.farmName = t('farm_name');
      if (form.village.trim().length < 2) e.village = t('village');
      if (form.district.trim().length < 2) e.district = t('district');
      if (!/^\d{6}$/.test(form.pincode)) e.pincode = '6-digit PIN code';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (!validate()) return;
    setBusy(true);
    try {
      const payload = role === 'farmer' ? { role, ...form, language: lang } : { role, name: form.name, email: form.email, phone: form.phone, password: form.password, language: lang };
      const user = await register(payload);
      navigate(homeFor(user), { replace: true });
    } catch (err) {
      setError(err.message);
      setErrors(fieldErrors(err));
    } finally {
      setBusy(false);
    }
  }

  const roleBtn = (value, Icon, title, desc) => (
    <button
      type="button"
      onClick={() => setRole(value)}
      aria-pressed={role === value}
      className={`flex flex-1 flex-col items-start gap-1 rounded-2xl border-2 p-4 text-left ${role === value ? 'border-leaf-700 bg-leaf-50' : 'border-line hover:border-leaf-200'}`}
    >
      <Icon size={24} className="text-leaf-700" />
      <span className="font-semibold">{title}</span>
      <span className="text-sm text-soil-500">{desc}</span>
    </button>
  );

  return (
    <AuthShell title={t('register_title')} photo={role === 'farmer' ? SITE_PHOTOS.farmerCta : SITE_PHOTOS.auth}>
      <form onSubmit={submit} className="panel space-y-4 p-6" noValidate>
        <div>
          <p className="label">{t('i_want_to')}</p>
          <div className="flex gap-3">
            {roleBtn('customer', ShoppingBasket, t('role_customer'), t('role_customer_d'))}
            {roleBtn('farmer', Tractor, t('role_farmer'), t('role_farmer_d'))}
          </div>
        </div>
        {error && <Notice tone="error">{error}</Notice>}
        <Field label={t('name')} error={errors.name} htmlFor="r-name">
          <input id="r-name" autoComplete="name" className={`input ${errors.name ? 'input-error' : ''}`} value={form.name} onChange={set('name')} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('email')} error={errors.email} htmlFor="r-email">
            <input id="r-email" type="email" autoComplete="email" className={`input ${errors.email ? 'input-error' : ''}`} value={form.email} onChange={set('email')} />
          </Field>
          <Field label={t('phone')} error={errors.phone} htmlFor="r-phone">
            <input id="r-phone" inputMode="numeric" autoComplete="tel-national" maxLength={10} className={`input ${errors.phone ? 'input-error' : ''}`} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, '') })} />
          </Field>
        </div>
        <Field label={t('password')} error={errors.password} hint={t('password_hint')} htmlFor="r-pass">
          <input id="r-pass" type="password" autoComplete="new-password" className={`input ${errors.password ? 'input-error' : ''}`} value={form.password} onChange={set('password')} />
        </Field>
        {role === 'farmer' && (
          <div className="space-y-4 border-t border-line pt-4">
            <Field label={t('farm_name')} error={errors.farmName} htmlFor="r-farm">
              <input id="r-farm" className={`input ${errors.farmName ? 'input-error' : ''}`} value={form.farmName} onChange={set('farmName')} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t('village')} error={errors.village} htmlFor="r-village">
                <input id="r-village" className={`input ${errors.village ? 'input-error' : ''}`} value={form.village} onChange={set('village')} />
              </Field>
              <Field label={t('district')} error={errors.district} htmlFor="r-district">
                <input id="r-district" className={`input ${errors.district ? 'input-error' : ''}`} value={form.district} onChange={set('district')} />
              </Field>
              <Field label={t('state')} htmlFor="r-state">
                <select id="r-state" className="input" value={form.state} onChange={set('state')}>
                  {STATES.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </Field>
              <Field label={t('pincode')} error={errors.pincode} htmlFor="r-pin">
                <input id="r-pin" inputMode="numeric" maxLength={6} className={`input ${errors.pincode ? 'input-error' : ''}`} value={form.pincode} onChange={(e) => setForm({ ...form, pincode: e.target.value.replace(/\D/g, '') })} />
              </Field>
            </div>
            <Notice>{t('farmer_verify_note')}</Notice>
          </div>
        )}
        <button className="btn-primary w-full" disabled={busy}>
          {busy ? t('loading') : t('create_account')}
        </button>
        <p className="text-center text-sm text-soil-500">
          {t('have_account')} <Link to="/login" className="link">{t('nav_login')}</Link>
        </p>
      </form>
    </AuthShell>
  );
}

export { STATES };
