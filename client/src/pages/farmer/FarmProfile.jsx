import { useEffect, useRef, useState } from 'react';
import { Camera, ImagePlus } from 'lucide-react';
import { sized } from '../../lib/images.js';
import { api } from '../../api/client.js';
import { useI18n } from '../../i18n/index.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { Field, Notice, Spinner, Toggle, fieldErrors, useToast } from '../../components/ui.jsx';
import FarmerAvatar from '../../components/FarmerAvatar.jsx';
import { STATES } from '../Auth.jsx';

export default function FarmProfile() {
  const { t } = useI18n();
  const { user, setFarmerProfile } = useAuth();
  const toast = useToast();
  const fileRef = useRef(null);
  const coverRef = useRef(null);
  const [p, setP] = useState(null);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get('/farmer/profile').then((d) => setP(d.profile));
  }, []);

  if (!p) return <Spinner />;
  const setLoc = (k) => (e) => setP({ ...p, location: { ...p.location, [k]: e.target.value } });
  const setF = (k, v) => setP({ ...p, fulfillment: { ...p.fulfillment, [k]: v } });

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const body = {
        farmName: p.farmName,
        bio: p.bio || '',
        farmingPractices: p.farmingPractices || '',
        location: { village: p.location.village, district: p.location.district, state: p.location.state, pincode: p.location.pincode || '' },
        fulfillment: {
          offersDelivery: p.fulfillment.offersDelivery,
          deliveryFee: Number(p.fulfillment.deliveryFee) || 0,
          freeDeliveryAbove: Number(p.fulfillment.freeDeliveryAbove) || 0,
          deliveryArea: p.fulfillment.deliveryArea || '',
          offersPickup: p.fulfillment.offersPickup,
          pickupAddress: p.fulfillment.pickupAddress || '',
          prepHours: Number(p.fulfillment.prepHours) || 24,
        },
      };
      const d = await api.put('/farmer/profile', body);
      setP(d.profile);
      setFarmerProfile(d.profile);
      setErrors({});
      toast(t('saved'));
    } catch (err) {
      setError(err.message);
      setErrors(fieldErrors(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} className="max-w-3xl space-y-6" noValidate>
      <h1 className="text-3xl font-bold">{t('f_farm')}</h1>
      {error && <Notice tone="error">{error}</Notice>}

      <section className="panel overflow-hidden">
        <div className="relative aspect-[16/6] bg-leaf-100">
          {p.coverPhoto?.url ? (
            <img src={sized(p.coverPhoto.url, 1200)} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="kolam-bg absolute inset-0 bg-leaf-700" />
          )}
          <button type="button" className="btn btn-sm absolute right-3 bottom-3 bg-white/95 text-leaf-900 shadow hover:bg-white" onClick={() => coverRef.current?.click()}>
            <ImagePlus size={16} /> {t('f_upload')}
          </button>
        </div>
        <div className="p-4">
          <p className="font-semibold">{t('f_cover')}</p>
          <p className="text-sm text-soil-500">{t('f_cover_hint')}</p>
        </div>
        <input
          ref={coverRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (!file) return;
            const fd = new FormData();
            fd.append('cover', file);
            try {
              const d = await api.upload('/farmer/profile/cover', fd);
              setP(d.profile);
              setFarmerProfile(d.profile);
              toast(t('saved'));
            } catch (err) {
              toast(err.message, 'error');
            }
          }}
        />
      </section>

      <section className="panel flex items-center gap-5 p-5">
        <FarmerAvatar farmer={{ name: user.name, photo: p.photo?.url }} size={80} />
        <div>
          <p className="font-semibold">{t('f_photo')}</p>
          <button type="button" className="btn-outline btn-sm mt-2" onClick={() => fileRef.current?.click()}>
            <Camera size={16} /> {t('f_upload')}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (!file) return;
              const fd = new FormData();
              fd.append('photo', file);
              try {
                const d = await api.upload('/farmer/profile/photo', fd);
                setP(d.profile);
                setFarmerProfile(d.profile);
                toast(t('saved'));
              } catch (err) {
                toast(err.message, 'error');
              }
            }}
          />
        </div>
      </section>

      <section className="panel space-y-4 p-5">
        <h2 className="font-sans text-lg font-bold">{t('f_farm_details')}</h2>
        <Field label={t('farm_name')} error={errors.farmName} htmlFor="fp-name">
          <input id="fp-name" className="input" value={p.farmName} onChange={(e) => setP({ ...p, farmName: e.target.value })} />
        </Field>
        <Field label={t('f_bio')} htmlFor="fp-bio">
          <textarea id="fp-bio" rows={3} maxLength={600} className="input" value={p.bio || ''} onChange={(e) => setP({ ...p, bio: e.target.value })} />
        </Field>
        <Field label={t('f_practices')} htmlFor="fp-pr">
          <input id="fp-pr" maxLength={200} className="input" value={p.farmingPractices || ''} onChange={(e) => setP({ ...p, farmingPractices: e.target.value })} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('village')} error={errors['location.village']} htmlFor="fp-v">
            <input id="fp-v" className="input" value={p.location.village} onChange={setLoc('village')} />
          </Field>
          <Field label={t('district')} error={errors['location.district']} htmlFor="fp-d">
            <input id="fp-d" className="input" value={p.location.district} onChange={setLoc('district')} />
          </Field>
          <Field label={t('state')} htmlFor="fp-s">
            <select id="fp-s" className="input" value={p.location.state} onChange={setLoc('state')}>
              {[...new Set([p.location.state, ...STATES])].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </Field>
          <Field label={t('pincode')} error={errors['location.pincode']} htmlFor="fp-p">
            <input id="fp-p" inputMode="numeric" maxLength={6} className="input" value={p.location.pincode || ''} onChange={(e) => setP({ ...p, location: { ...p.location, pincode: e.target.value.replace(/\D/g, '') } })} />
          </Field>
        </div>
      </section>

      <section className="panel space-y-5 p-5">
        <h2 className="font-sans text-lg font-bold">{t('f_fulfillment')}</h2>
        {errors.fulfillment && <Notice tone="error">{errors.fulfillment}</Notice>}
        <Toggle checked={p.fulfillment.offersDelivery} onChange={(v) => setF('offersDelivery', v)} label={t('f_offers_delivery')} />
        {p.fulfillment.offersDelivery && (
          <div className="grid gap-4 pl-14 sm:grid-cols-2">
            <Field label={t('f_delivery_fee')} htmlFor="fp-fee">
              <input id="fp-fee" inputMode="numeric" className="input" value={p.fulfillment.deliveryFee} onChange={(e) => setF('deliveryFee', e.target.value.replace(/\D/g, ''))} />
            </Field>
            <Field label={t('f_free_above')} htmlFor="fp-free">
              <input id="fp-free" inputMode="numeric" className="input" value={p.fulfillment.freeDeliveryAbove} onChange={(e) => setF('freeDeliveryAbove', e.target.value.replace(/\D/g, ''))} />
            </Field>
            <Field label={t('f_delivery_area')} className="sm:col-span-2" htmlFor="fp-area">
              <input id="fp-area" className="input" value={p.fulfillment.deliveryArea || ''} onChange={(e) => setF('deliveryArea', e.target.value)} />
            </Field>
          </div>
        )}
        <Toggle checked={p.fulfillment.offersPickup} onChange={(v) => setF('offersPickup', v)} label={t('f_offers_pickup')} />
        {p.fulfillment.offersPickup && (
          <div className="pl-14">
            <Field label={t('f_pickup_address')} htmlFor="fp-pa">
              <input id="fp-pa" className="input" value={p.fulfillment.pickupAddress || ''} onChange={(e) => setF('pickupAddress', e.target.value)} />
            </Field>
          </div>
        )}
        <Field label={t('f_prep_hours')} className="max-w-xs" htmlFor="fp-prep">
          <input id="fp-prep" inputMode="numeric" className="input" value={p.fulfillment.prepHours} onChange={(e) => setF('prepHours', e.target.value.replace(/\D/g, ''))} />
        </Field>
      </section>

      <button className="btn-primary btn-lg" disabled={busy}>
        {busy ? t('saving') : t('save')}
      </button>
    </form>
  );
}
