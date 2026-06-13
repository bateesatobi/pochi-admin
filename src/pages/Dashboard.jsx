import React from 'react';
import {
  DollarSign, Building2, Users, Package, ShoppingCart, AlertTriangle,
  TrendingUp, Activity, ArrowUpRight, ArrowDownRight, Clock, Box, ShieldCheck,
  Filter, Calendar, Download, MoreHorizontal, ChevronRight, Zap
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  CartesianGrid, AreaChart, Area, PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import { useAdminStats } from '../hooks/queries';

const StatCard = ({ icon: Icon, label, value, subValue, trend, color, sparkData }) => (
  <div className="card stat-card-premium">
    <div className="stat-card-header">
      <div className={`stat-icon-wrap ${color}`}>
        <Icon size={20} />
      </div>
      <div className="stat-spark">
        <ResponsiveContainer width="100%" height={30}>
          <LineChart data={sparkData}>
            <Line type="monotone" dataKey="v" stroke={trend === 'up' ? '#10B981' : '#EF4444'} strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
    <div className="stat-card-body">
      <div className="stat-label-modern">{label}</div>
      <div className="stat-value-modern">{value}</div>
      <div className="stat-footer-modern">
        <span className={`trend-tag ${trend}`}>
          {trend === 'up' ? <ArrowUpRight size={12}/> : <ArrowDownRight size={12}/>}
          {subValue}
        </span>
        <span className="stat-period">vs last month</span>
      </div>
    </div>
  </div>
);

const Dashboard = () => {
  const { data, isLoading } = useAdminStats();

  if (isLoading && !data) return (
    <div className="loader-wrap-modern">
      <div className="spinner-modern"/>
      <span>Synthesizing Platform Intelligence...</span>
    </div>
  );

  if (!data) return <div className="error-state">Platform data synchronization failed.</div>;

  const { kpis, top_businesses, top_products, recent_activity, revenue_history } = data;

  const sparkData = [
    {v: 400}, {v: 300}, {v: 500}, {v: 450}, {v: 600}, {v: 550}, {v: 700}
  ];

  const chartData = (revenue_history || []).map(h => ({
    name: h.month,
    revenue: h.revenue,
    orders: h.orders
  }));

  return (
    <div className="animate-fade dashboard-premium">
      <div className="page-header-premium">
        <div>
          <h1>Platform Command Center</h1>
          <p>Real-time marketplace intelligence and operational oversight.</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-ghost btn-sm"><Calendar size={14} /> Last 30 Days</button>
          <button className="btn btn-primary btn-sm"><Download size={14} /> Export Report</button>
        </div>
      </div>

      <div className="stat-grid-premium">
        <StatCard icon={DollarSign} label="Gross Revenue" value={`UGX ${(kpis?.total_revenue || 0).toLocaleString()}`} subValue="+12.5%" trend="up" color="emerald" sparkData={sparkData} />
        <StatCard icon={ShoppingCart} label="Total Orders" value={kpis?.total_orders || 0} subValue="+8.2%" trend="up" color="indigo" sparkData={sparkData} />
        <StatCard icon={Building2} label="Active Businesses" value={kpis?.active_businesses || 0} subValue="+3.1%" trend="up" color="blue" sparkData={sparkData} />
        <StatCard icon={Users} label="Registered Users" value={kpis?.total_users || 0} subValue="+15.4%" trend="up" color="violet" sparkData={sparkData} />
      </div>

      <div className="dashboard-grid">
        <div className="card chart-card">
          <div className="card-header">
            <h3>Revenue Trajectory</h3>
            <Activity size={18} className="text-muted" />
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#4F46E5" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="name" stroke="#64748B" fontSize={12} />
              <YAxis stroke="#64748B" fontSize={12} tickFormatter={(v) => `${(v/1000000).toFixed(1)}M`} />
              <Tooltip contentStyle={{ background: '#1E293B', border: 'none', borderRadius: 8 }} />
              <Area type="monotone" dataKey="revenue" stroke="#4F46E5" fillOpacity={1} fill="url(#colorRev)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="card activity-card">
          <div className="card-header">
            <h3>Recent Activity</h3>
            <Zap size={18} className="text-muted" />
          </div>
          <div className="activity-feed">
            {(recent_activity || []).slice(0, 8).map((act, i) => (
              <div key={i} className="activity-item">
                <div className="activity-dot" />
                <div className="activity-content">
                  <span className="activity-text">{act.description || act.action}</span>
                  <span className="activity-time">{act.timestamp ? new Date(act.timestamp).toLocaleString() : ''}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="card">
          <div className="card-header"><h3>Top Businesses</h3><Building2 size={18} /></div>
          <div className="rank-list">
            {(top_businesses || []).map((b, i) => (
              <div key={b.id || i} className="rank-item">
                <span className="rank-num">{i + 1}</span>
                <span className="rank-name">{b.name}</span>
                <span className="rank-value">UGX {(b.revenue || 0).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <div className="card-header"><h3>Top Products</h3><Package size={18} /></div>
          <div className="rank-list">
            {(top_products || []).map((p, i) => (
              <div key={p.sku || i} className="rank-item">
                <span className="rank-num">{i + 1}</span>
                <span className="rank-name">{p.name}</span>
                <span className="rank-value">{p.sales_count || 0} sold</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
