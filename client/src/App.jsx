import { lazy, Suspense } from 'react';
import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import { Spinner } from './components/ui.jsx';
import { useAuth } from './context/AuthContext.jsx';
import { useI18n } from './i18n/index.jsx';
import Home from './pages/Home.jsx';
import Shop from './pages/Shop.jsx';
import ProductPage from './pages/ProductPage.jsx';
import { FarmersList, FarmerStore } from './pages/Farmers.jsx';
import { Login, Register } from './pages/Auth.jsx';
import { Cart, Checkout } from './pages/Cart.jsx';
import { MyOrders, Receipt } from './pages/Orders.jsx';
import Account from './pages/Account.jsx';
import Help from './pages/Help.jsx';
import Season from './pages/Season.jsx';

const FarmerLayout = lazy(() => import('./pages/farmer/FarmerLayout.jsx'));
const FarmerOverview = lazy(() => import('./pages/farmer/FarmerOverview.jsx'));
const FarmerProducts = lazy(() => import('./pages/farmer/FarmerProducts.jsx'));
const ProductForm = lazy(() => import('./pages/farmer/ProductForm.jsx'));
const FarmerOrders = lazy(() => import('./pages/farmer/FarmerOrders.jsx'));
const FarmProfile = lazy(() => import('./pages/farmer/FarmProfile.jsx'));
const adminPage = (name) => lazy(() => import('./pages/admin/Admin.jsx').then((m) => ({ default: m[name] })));
const AdminLayout = adminPage('AdminLayout');
const AdminOverview = adminPage('AdminOverview');
const AdminFarmers = adminPage('AdminFarmers');
const AdminUsers = adminPage('AdminUsers');
const AdminCategories = adminPage('AdminCategories');
const AdminProducts = adminPage('AdminProducts');
const AdminOrders = adminPage('AdminOrders');
const AdminComplaints = adminPage('AdminComplaints');
const AdminSettings = adminPage('AdminSettings');

/** Only render children for logged-in users with one of the given roles. */
function RequireRole({ roles, children }) {
  const { user, ready } = useAuth();
  const location = useLocation();
  if (!ready) return <Spinner />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  if (roles && !roles.includes(user.role)) return <Navigate to={user.role === 'farmer' ? '/farmer' : user.role === 'admin' ? '/admin' : '/'} replace />;
  return children;
}

function NotFound() {
  const { t } = useI18n();
  return (
    <div className="container-page py-24 text-center">
      <p className="font-display text-7xl font-extrabold text-leaf-200">404</p>
      <h1 className="mt-2 text-3xl font-bold">{t('not_found')}</h1>
      <Link to="/" className="btn-primary mt-6">{t('go_home')}</Link>
    </div>
  );
}

export default function App() {
  return (
    <Suspense fallback={<Spinner />}>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="shop" element={<Shop />} />
          <Route path="product/:id" element={<ProductPage />} />
          <Route path="farmers" element={<FarmersList />} />
          <Route path="season" element={<Season />} />
          <Route path="farmers/:id" element={<FarmerStore />} />
          <Route path="login" element={<Login />} />
          <Route path="register" element={<Register />} />
          <Route path="cart" element={<Cart />} />
          <Route path="checkout" element={<RequireRole roles={['customer']}><Checkout /></RequireRole>} />
          <Route path="orders" element={<RequireRole roles={['customer']}><MyOrders /></RequireRole>} />
          <Route path="orders/receipt/:groupId" element={<RequireRole roles={['customer', 'admin']}><Receipt /></RequireRole>} />
          <Route path="account" element={<RequireRole><Account /></RequireRole>} />
          <Route path="help" element={<RequireRole roles={['customer', 'farmer']}><Help /></RequireRole>} />

          <Route path="farmer" element={<RequireRole roles={['farmer']}><FarmerLayout /></RequireRole>}>
            <Route index element={<FarmerOverview />} />
            <Route path="products" element={<FarmerProducts />} />
            <Route path="products/new" element={<ProductForm />} />
            <Route path="products/:id" element={<ProductForm />} />
            <Route path="orders" element={<FarmerOrders />} />
            <Route path="farm" element={<FarmProfile />} />
          </Route>

          <Route path="admin" element={<RequireRole roles={['admin']}><AdminLayout /></RequireRole>}>
            <Route index element={<AdminOverview />} />
            <Route path="farmers" element={<AdminFarmers />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="categories" element={<AdminCategories />} />
            <Route path="products" element={<AdminProducts />} />
            <Route path="orders" element={<AdminOrders />} />
            <Route path="complaints" element={<AdminComplaints />} />
            <Route path="settings" element={<AdminSettings />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
