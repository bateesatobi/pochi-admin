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
    '/audit-logs': 'Audit Logs',
    '/settings': 'System Settings',
  };
  const title = titles[location.pathname] || 'Pochi Admin';

  return (
    <div className="admin-layout">
      <Sidebar />
      <div className="admin-main">
        <header className="topbar">
          <div className="topbar-title">{title}</div>
          <div className="topbar-right">
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

function App() {
  return (
    <AdminAuthProvider>
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
            <Route path="/audit-logs" element={<AuditLogs />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AdminAuthProvider>
  );
}

export default App;
