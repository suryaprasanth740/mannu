import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { api } from '../api/client.js';
import { useI18n } from '../i18n/index.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { fmtDateTime, money } from '../lib/format.js';

/** Turn a stored notification (type + params) into a sentence in the reader's language. */
export function notificationText(n, t) {
  const p = n.params || {};
  switch (n.type) {
    case 'order_new':
      return t('notif_order_new', { orderNumber: p.orderNumber, customer: p.customer, total: money(p.total) });
    case 'order_status':
      return t('notif_order_status', { orderNumber: p.orderNumber, farmName: p.farmName, status: t(`status_${p.status}`) });
    case 'order_cancelled':
      return t('notif_order_cancelled', { orderNumber: p.orderNumber, customer: p.customer });
    case 'farm_verification':
      return t(`notif_farm_${p.status}`, { note: p.note || '' });
    case 'complaint_update':
      return t('notif_complaint_update', { subject: p.subject, status: t(`status_${p.status}`) });
    case 'stock_low':
      return t('notif_stock_low', { name: p.name, stock: `${p.stock} ${t(`unit_${p.unit}`)}` });
    default:
      return '';
  }
}

export default function NotificationBell() {
  const { user } = useAuth();
  const { t, lang } = useI18n();
  const [open, setOpen] = useState(false);
  const [data, setData] = useState({ notifications: [], unread: 0 });
  const ref = useRef(null);

  const load = useCallback(() => {
    if (!user) return;
    api.get('/notifications').then(setData).catch(() => {});
  }, [user]);

  useEffect(() => {
    load();
    if (!user) return undefined;
    const id = setInterval(load, 60000);
    const onFocus = () => load();
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(id);
      window.removeEventListener('focus', onFocus);
    };
  }, [load, user]);

  useEffect(() => {
    const h = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  if (!user || user.role === 'admin') return null;

  async function markAll() {
    await api.post('/notifications/read', {}).catch(() => {});
    setData((d) => ({ unread: 0, notifications: d.notifications.map((n) => ({ ...n, read: true })) }));
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => {
          setOpen((o) => !o);
          if (!open) load();
        }}
        className="relative rounded-full p-2 text-leaf-900 hover:bg-leaf-50"
        aria-label={`${t('notifications')}${data.unread ? ` (${data.unread})` : ''}`}
        aria-expanded={open}
      >
        <Bell size={20} />
        {data.unread > 0 && (
          <span className="absolute top-0.5 right-0.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-chilli-600 px-1 text-[10px] font-bold text-white">
            {data.unread > 9 ? '9+' : data.unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-40 mt-1 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-line bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="font-semibold">{t('notifications')}</p>
            {data.unread > 0 && (
              <button className="text-sm font-semibold text-leaf-700 hover:underline" onClick={markAll}>
                {t('mark_all_read')}
              </button>
            )}
          </div>
          {data.notifications.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-soil-500">{t('no_notifications')}</p>
          ) : (
            <ul className="max-h-96 divide-y divide-line overflow-y-auto">
              {data.notifications.map((n) => (
                <li key={n._id}>
                  <Link
                    to={n.link || '#'}
                    onClick={() => {
                      setOpen(false);
                      if (!n.read) api.post('/notifications/read', { ids: [n._id] }).then(load).catch(() => {});
                    }}
                    className={`flex gap-3 px-4 py-3 text-sm hover:bg-leaf-50 ${n.read ? 'text-soil-500' : 'text-soil-900'}`}
                  >
                    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.read ? 'bg-transparent' : 'bg-turmeric-500'}`} />
                    <span>
                      <span className={n.read ? '' : 'font-semibold'}>{notificationText(n, t)}</span>
                      <span className="mt-0.5 block text-xs text-soil-500">{fmtDateTime(n.createdAt, lang)}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
