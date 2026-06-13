import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Building2, Users, Package, ShoppingCart,
  ScrollText, Settings, LogOut, ShieldCheck, CreditCard, Layers, Percent, Tag
} from 'lucide-react';
import { useAdminAuth } from '../context/AdminAuthContext';

import logo from '../assets/logo.png';

const MAIN_NAV = [
  { label: 'Overview', group: 'Core' },
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { label: 'Platform Management', group: 'Management' },
  { to: '/businesses', icon: Building2, label: 'Businesses' },
  { to: '/users', icon: Users, label: 'Users & Customers' },
  { to: '/products', icon: Package, label: 'Products' },
  { to: '/categories', icon: Layers, label: 'Categories' },
  { to: '/promotions', icon: Tag, label: 'Promotions' },
  { to: '/orders', icon: ShoppingCart, label: 'Orders' },
  { to: '/payments', icon: CreditCard, label: 'Payments' },
];

const SYSTEM_NAV = [
  { to: '/platform-settings', icon: Percent, label: 'Platform Fee' },
  { to: '/audit-logs', icon: ScrollText, label: 'Audit Logs' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

const Sidebar = ({ pendingKyc = 0 }) => {
  const { admin, logout } = useAdminAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-logo" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 24px' }}>
        <img src={logo} alt="Pochi" style={{ 
          height: 48, 
          width: 'auto', 
          objectFit: 'contain'
        }} />
        <div className="tag" style={{ marginTop: 12, textAlign: 'center' }}>Control Center</div>
      </div>

      <nav className="sidebar-nav">
        {/* Main Navigation */}
        {MAIN_NAV.map((item, i) =>
          item.group ? (
            <div key={i} className="nav-group-label">{item.label}</div>
          ) : (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <item.icon size={18} />
              {item.label}
              {item.to === '/businesses' && pendingKyc > 0 && (
                <span className="badge">{pendingKyc}</span>
              )}
            </NavLink>
          )
        )}

        {/* System Group pushed to bottom */}
        <div style={{ marginTop: 'auto', paddingTop: 20 }}>
          <div className="nav-group-label">System</div>
          {SYSTEM_NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <item.icon size={18} />
              {item.label}
            </NavLink>
          ))}
        </div>
      </nav>

      <div className="sidebar-footer">
        <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', marginBottom:8 }}>
          <div className="admin-avatar" style={{width:34,height:34,borderRadius:'50%',background:'var(--primary)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:800,color:'white',flexShrink:0}}>
            {admin?.full_name?.[0] || 'A'}
          </div>
          <div style={{ overflow: 'hidden' }}>
            <div style={{fontSize:13,fontWeight:700,color:'var(--text)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden'}}>{admin?.full_name || 'Admin'}</div>
            <div style={{fontSize:10,fontWeight:700,color:'var(--primary)',textTransform:'uppercase'}}>Super Admin</div>
          </div>
        </div>
        <button className="logout-btn" onClick={handleLogout}>
          <LogOut size={16} /> Sign Out
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
