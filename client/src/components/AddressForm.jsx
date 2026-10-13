import { useState } from 'react';
import { useI18n } from '../i18n/index.jsx';
import { Field, Notice, fieldErrors } from './ui.jsx';

const STATES = ['Karnataka', 'Tamil Nadu', 'Andhra Pradesh', 'Telangana', 'Kerala', 'Puducherry', 'Goa', 'Maharashtra'];

export const emptyAddress = (user) => ({
  label: 'Home',
  fullName: user?.name || '',
  phone: user?.phone || '',
  line1: '',
  line2: '',
  city: '',
  district: '',
  state: 'Karnataka',
  pincode: '',
  isDefault: false,
});

export default function AddressForm({ initial, onSubmit, onCancel }) {
  const { t } = useI18n();
  const [a, setA] = useState(initial);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setA({ ...a, [k]: e.target.value });

  function validate() {
    const e = {};
    if (a.fullName.trim().length < 2) e.fullName = t('receiver_name');
    if (!/^[6-9]\d{9}$/.test(a.phone)) e.phone = '10-digit mobile number';
    if (a.line1.trim().length < 3) e.line1 = t('address_line1');
    if (a.city.trim().length < 2) e.city = t('city');
    if (a.district.trim().length < 2) e.district = t('district');
    if (!/^\d{6}$/.test(a.pincode)) e.pincode = '6-digit PIN code';
    setErrors(e);
    return !Object.keys(e).length;
  }

  async function submit(e) {
    e.preventDefault();
    if (!validate()) return;
    setBusy(true);
    setError('');
    try {
      const { _id, ...body } = a;
      await onSubmit(body);
    } catch (err) {
      setError(err.message);
      setErrors(fieldErrors(err));
    } finally {
      setBusy(false);
    }
  }

  const input = (k, props = {}) => <input id={`a-${k}`} className={`input ${errors[k] ? 'input-error' : ''}`} value={a[k]} onChange={set(k)} {...props} />;

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      {error && <Notice tone="error">{error}</Notice>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t('address_label')} htmlFor="a-label">{input('label')}</Field>
        <Field label={t('receiver_name')} error={errors.fullName} htmlFor="a-fullName">{input('fullName')}</Field>
        <Field label={t('phone')} error={errors.phone} htmlFor="a-phone">
          <input id="a-phone" inputMode="numeric" maxLength={10} className={`input ${errors.phone ? 'input-error' : ''}`} value={a.phone} onChange={(e) => setA({ ...a, phone: e.target.value.replace(/\D/g, '') })} />
        </Field>
        <Field label={t('pincode')} error={errors.pincode} htmlFor="a-pincode">
          <input id="a-pincode" inputMode="numeric" maxLength={6} className={`input ${errors.pincode ? 'input-error' : ''}`} value={a.pincode} onChange={(e) => setA({ ...a, pincode: e.target.value.replace(/\D/g, '') })} />
        </Field>
      </div>
      <Field label={t('address_line1')} error={errors.line1} htmlFor="a-line1">{input('line1')}</Field>
      <Field label={t('address_line2')} htmlFor="a-line2">{input('line2')}</Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label={t('city')} error={errors.city} htmlFor="a-city">{input('city')}</Field>
        <Field label={t('district')} error={errors.district} htmlFor="a-district">{input('district')}</Field>
        <Field label={t('state')} htmlFor="a-state">
          <select id="a-state" className="input" value={a.state} onChange={set('state')}>
            {STATES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </Field>
      </div>
      <label className="flex items-center gap-2 text-[15px]">
        <input type="checkbox" className="h-4 w-4 accent-leaf-700" checked={a.isDefault} onChange={(e) => setA({ ...a, isDefault: e.target.checked })} />
        {t('make_default')}
      </label>
      <div className="flex justify-end gap-3">
        {onCancel && (
          <button type="button" className="btn-ghost" onClick={onCancel}>
            {t('cancel')}
          </button>
        )}
        <button className="btn-primary" disabled={busy}>
          {busy ? t('saving') : t('save')}
        </button>
      </div>
    </form>
  );
}
