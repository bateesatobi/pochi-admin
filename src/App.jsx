import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { AdminAuthProvider, useAdminAuth } from './context/AdminAuthContext';
import Sidebar from './components/Sidebar';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import Businesses from './pages/Businesses';
import UsersPage from './pages/Users';
import Products from './pages/Products';
import Orders from './pages/Orders';
import AuditLogs from './pages/AuditLogs';
import Settings from './pages/Settings';
import PlatformSettings from './pages/PlatformSettings';
import Categories from './pages/Categories';
import Promotions from './pages/Promotions';
import AdminPayments from './pages/Payments';
import AdminNotifications from './components/AdminNotifications';
import CacheSync from './components/CacheSync';

import { toast } from './utils/swal';
import { WebSocketProvider, useWebSocket } from './context/WebSocketContext';
import { useEffect } from 'react';

const WebSocketListener = () => {
  const { subscribe } = useWebSocket();

  useEffect(() => {
    // 1. Listen for new orders
    const unsubNewOrder = subscribe('ORDER_NEW', (order) => {
      toast('New Order Placed', `Order #${order.order_id.slice(0, 8)} — UGX ${Number(order.total).toLocaleString()}`, { icon: 'info', timer: 5000 });
      window.dispatchEvent(new CustomEvent('poch-order-new', { detail: order }));
    });

    // 2. Listen for disbursements
    const unsubDisb = subscribe('DISBURSEMENT_COMPLETED', (disb) => {
      toast('Payout Processed', `UGX ${Number(disb.amount).toLocaleString()} to ${disb.business_name}`, { timer: 5000 });
      window.dispatchEvent(new CustomEvent('poch-disbursement-completed', { detail: disb }));
    });

    // 3. Listen for order status updates
    const unsubStatus = subscribe('ORDER_STATUS_CHANGED', (evt) => {
      window.dispatchEvent(new CustomEvent('poch-order-status-changed', { detail: evt }));
    });

    return () => {
      unsubNewOrder();
      unsubDisb();
      unsubStatus();
    };
  }, [subscribe]);

  return null;
};

const ProtectedLayout = () => {
  const { admin, loading } = useAdminAuth();
  const location = useLocation();

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background:'var(--bg)', color:'var(--text-muted)', gap:12 }}>
      <div className="spinner"/> Loading Admin Portal...
    </div>
  );

  if (!admin) return <Navigate to="/login" state={{ from: location }} replace />;

  const titles = {
    '/dashboard': 'Dashboard',
    '/businesses': 'Business Management',
    '/users': 'Users & Customers',
    '/products': 'Product Moderation',
    '/orders': 'Order Oversight',
    '/payments': 'Payments & Disbursements',
    '/categories': 'Categories',
    '/promotions': 'Promotions',
    '/platform-settings': 'Platform Fee & Tax',
    '/audit-logs': 'Audit Logs',
    '/settings': 'System Settings',
  };
  const title = titles[location.pathname] || 'Pochi Admin';

  return (
    <div className="admin-layout">
      <WebSocketListener />
      <CacheSync />
      <Sidebar />
      <div className="admin-main">
        <header className="topbar">
          <div className="topbar-title">{title}</div>
          <div className="topbar-right">
            <AdminNotifications />
            <div className="admin-badge">
              <div className="admin-avatar">{admin?.full_name?.[0] || 'A'}</div>
              <div className="admin-info">
                <span className="admin-name">{admin?.full_name || 'Admin'}</span>
                <span className="admin-role">Super Admin</span>
              </div>
            </div>
          </div>
        </header>
        <div className="admin-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

const WebSocketWrapper = ({ children }) => {
  const token = localStorage.getItem('admin_token');
  return (
    <WebSocketProvider token={token}>
      {children}
    </WebSocketProvider>
  );
};

function App() {
  return (
    <AdminAuthProvider>
      <WebSocketWrapper>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<ProtectedLayout />}>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/businesses" element={<Businesses />} />
              <Route path="/users" element={<UsersPage />} />
              <Route path="/products" element={<Products />} />
              <Route path="/orders" element={<Orders />} />
              <Route path="/payments" element={<AdminPayments />} />
              <Route path="/categories" element={<Categories />} />
              <Route path="/promotions" element={<Promotions />} />
              <Route path="/platform-settings" element={<PlatformSettings />} />
              <Route path="/audit-logs" element={<AuditLogs />} />
              <Route path="/settings" element={<Settings />} />
            </Route>
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </WebSocketWrapper>
    </AdminAuthProvider>
  );
}

export default App;
