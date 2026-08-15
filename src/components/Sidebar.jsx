import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Building2, Users, Package, ShoppingCart,
  ScrollText, Settings, LogOut, ShieldCheck, CreditCard, Layers, Percent, Tag, Camera
} from 'lucide-react';
import { useAdminAuth } from '../context/AdminAuthContext';
import { useAdminStats } from '../hooks/queries';

const MAIN_NAV = [
  { label: 'Overview', group: 'Core' },
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { label: 'Platform Management', group: 'Management' },
  { to: '/businesses', icon: Building2, label: 'Businesses', badgeKey: 'unverified_businesses' },
  { to: '/users', icon: Users, label: 'Users & Customers', badgeKey: 'unverified_users' },
  { to: '/products', icon: Package, label: 'Products' },
  { to: '/categories', icon: Layers, label: 'Categories' },
  { to: '/promotions', icon: Tag, label: 'Promotions' },
  { to: '/orders', icon: ShoppingCart, label: 'Orders' },
  { to: '/snap-ask', icon: Camera, label: 'Snap & Ask', badgeKey: 'pending_snap_ask' },
  { to: '/payments', icon: CreditCard, label: 'Payments' },
];

const SYSTEM_NAV = [
  { to: '/platform-settings', icon: Percent, label: 'Platform Fee & Tax' },
  { to: '/audit-logs', icon: ScrollText, label: 'Audit Logs' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

const Sidebar = () => {
  const { admin, logout } = useAdminAuth();
  const navigate = useNavigate();
  const { data: statsData } = useAdminStats();
  const kpis = statsData?.kpis || {};

  const badgeCounts = {
    unverified_businesses: Number(kpis.unverified_businesses ?? kpis.pending_kyc ?? 0),
    unverified_users: Number(kpis.unverified_users ?? 0),
    pending_snap_ask: Number(kpis.pending_snap_ask ?? 0),
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-logo" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '28px 24px' }}>
        <div className="sidebar-brand-mark">
          <ShieldCheck size={26} />
        </div>
        <div className="brand-name-sidebar">Pochi <span>Admin</span></div>
        <div className="tag" style={{ marginTop: 8, textAlign: 'center' }}>Control Center</div>
      </div>

      <nav className="sidebar-nav">
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
              {item.badgeKey && badgeCounts[item.badgeKey] > 0 && (
                <span className="badge" title={`${badgeCounts[item.badgeKey]} pending`}>
                  {badgeCounts[item.badgeKey] > 99 ? '99+' : badgeCounts[item.badgeKey]}
                </span>
              )}
            </NavLink>
          )
        )}

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
