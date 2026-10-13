import { useEffect, useState } from 'react';
import { Home, Package, ShoppingBag, Sprout, LifeBuoy } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { api } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useI18n } from '../../i18n/index.jsx';
import DashboardShell from '../../components/DashboardShell.jsx';
import { Notice } from '../../components/ui.jsx';

export default function FarmerLayout() {
  const { t } = useI18n();
  const { farmerProfile, refresh } = useAuth();
  const [newCount, setNewCount] = useState(0);
  const location = useLocation();

  useEffect(() => {
    api.get('/farmer/orders?view=new').then((d) => setNewCount(d.orders.length)).catch(() => {});
  }, [location.pathname]);

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const v = farmerProfile?.verification;
  const banner =
    v?.status === 'pending' ? (
      <Notice tone="warn" title={t('f_pending_title')} className="mb-6">
        {t('f_pending_sub')}
      </Notice>
    ) : v?.status === 'rejected' ? (
      <Notice tone="error" title={t('f_rejected_title')} className="mb-6">
        {v.note}
      </Notice>
    ) : null;

  return (
    <DashboardShell
      title={farmerProfile?.farmName || t('nav_dashboard')}
      banner={banner}
      links={[
        { to: '/farmer', label: t('f_overview'), icon: Home, end: true },
        { to: '/farmer/orders', label: t('f_orders'), icon: ShoppingBag, badge: newCount },
        { to: '/farmer/products', label: t('f_products'), icon: Package },
        { to: '/farmer/farm', label: t('f_farm'), icon: Sprout },
        { to: '/help', label: t('footer_help'), icon: LifeBuoy },
      ]}
    />
  );
}
