import { useState } from 'react';
import { MapPin, Plus } from 'lucide-react';
import { api } from '../api/client.js';
import { useI18n, LANGUAGES } from '../i18n/index.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { Field, Modal, Notice, fieldErrors, useToast } from '../components/ui.jsx';
import AddressForm, { emptyAddress } from '../components/AddressForm.jsx';

export default function Account() {
  const { t, setLang } = useI18n();
  const { user, farmerProfile, apply } = useAuth();
  const toast = useToast();
  const [profile, setProfile] = useState({ name: user.name, phone: user.phone, language: user.language });
  const [pErr, setPErr] = useState({});
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '' });
  const [pwErr, setPwErr] = useState('');
  const [editing, setEditing] = useState(null);

  const setAddresses = (addresses) => apply({ user: { ...user, addresses }, farmerProfile });

  return (
    <div className="container-page max-w-3xl space-y-8 py-8">
      <h1 className="text-3xl font-bold sm:text-4xl">{t('nav_account')}</h1>

      <section className="panel p-5 sm:p-6">
        <h2 className="mb-4 font-sans text-lg font-bold">{t('profile')}</h2>
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              const d = await api.patch('/auth/me', profile);
              apply(d);
              setLang(profile.language);
              setPErr({});
              toast(t('saved'));
            } catch (err) {
              setPErr({ ...fieldErrors(err), _: err.message });
            }
          }}
        >
          {pErr._ && <Notice tone="error">{pErr._}</Notice>}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t('name')} error={pErr.name} htmlFor="p-name">
              <input id="p-name" className="input" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} />
            </Field>
            <Field label={t('phone')} error={pErr.phone} htmlFor="p-phone">
              <input id="p-phone" className="input" inputMode="numeric" maxLength={10} value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value.replace(/\D/g, '') })} />
            </Field>
            <Field label={t('email')}>
              <input className="input bg-leaf-50" value={user.email} disabled />
            </Field>
            <Field label={t('language')} htmlFor="p-lang">
              <select id="p-lang" className="input" value={profile.language} onChange={(e) => setProfile({ ...profile, language: e.target.value })}>
                {LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="flex justify-end">
            <button className="btn-primary">{t('save')}</button>
          </div>
        </form>
      </section>

      {user.role === 'customer' && (
        <section className="panel p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-sans text-lg font-bold">{t('addresses')}</h2>
            <button className="btn-outline btn-sm" onClick={() => setEditing('new')}>
              <Plus size={16} /> {t('add_address')}
            </button>
          </div>
          {user.addresses.length === 0 && <p className="text-soil-500">{t('add_address')}</p>}
          <ul className="space-y-3">
            {user.addresses.map((a) => (
              <li key={a._id} className="flex flex-wrap items-start gap-3 rounded-2xl border border-line p-4">
                <MapPin size={18} className="mt-0.5 text-leaf-700" />
                <div className="min-w-0 flex-1 text-[15px]">
                  <p className="font-semibold">
                    {a.label} {a.isDefault && <span className="chip ml-1 bg-leaf-100 text-leaf-800">{t('default')}</span>}
                  </p>
                  <p className="text-soil-700">
                    {a.fullName}, {a.phone}
                    <br />
                    {a.line1}
                    {a.line2 && `, ${a.line2}`}, {a.city}, {a.district}, {a.state} {a.pincode}
                  </p>
                </div>
                <div className="flex gap-1">
                  <button className="btn-ghost btn-sm" onClick={() => setEditing(a)}>{t('edit')}</button>
                  <button
                    className="btn-ghost btn-sm text-chilli-600"
                    onClick={async () => {
                      if (!window.confirm(`${t('delete')}?`)) return;
                      const d = await api.del(`/auth/me/addresses/${a._id}`);
                      setAddresses(d.addresses);
                    }}
                  >
                    {t('delete')}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="panel p-5 sm:p-6">
        <h2 className="mb-4 font-sans text-lg font-bold">{t('change_password')}</h2>
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              await api.patch('/auth/me/password', pw);
              setPw({ currentPassword: '', newPassword: '' });
              setPwErr('');
              toast(t('saved'));
            } catch (err) {
              setPwErr(err.message);
            }
          }}
        >
          {pwErr && <Notice tone="error">{pwErr}</Notice>}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t('current_password')} htmlFor="pw-c">
              <input id="pw-c" type="password" autoComplete="current-password" className="input" value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} />
            </Field>
            <Field label={t('new_password')} hint={t('password_hint')} htmlFor="pw-n">
              <input id="pw-n" type="password" autoComplete="new-password" className="input" value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} />
            </Field>
          </div>
          <div className="flex justify-end">
            <button className="btn-primary" disabled={!pw.currentPassword || !pw.newPassword}>{t('change_password')}</button>
          </div>
        </form>
      </section>

      <Modal open={Boolean(editing)} onClose={() => setEditing(null)} title={editing === 'new' ? t('add_address') : t('edit')} wide>
        {editing && (
          <AddressForm
            initial={editing === 'new' ? { ...emptyAddress(user), isDefault: !user.addresses.length } : editing}
            onCancel={() => setEditing(null)}
            onSubmit={async (body) => {
              const d = editing === 'new' ? await api.post('/auth/me/addresses', body) : await api.put(`/auth/me/addresses/${editing._id}`, body);
              setAddresses(d.addresses);
              setEditing(null);
              toast(t('saved'));
            }}
          />
        )}
      </Modal>
    </div>
  );
}
