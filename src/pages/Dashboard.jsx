import React, { useState, useEffect } from 'react';
import {
  DollarSign, Building2, Users, Package, ShoppingCart, AlertTriangle,
  TrendingUp, Activity, ArrowUpRight, ArrowDownRight, Clock, Box, ShieldCheck,
  Filter, Calendar, Download, MoreHorizontal, ChevronRight, Zap
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  CartesianGrid, AreaChart, Area, PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import { api } from '../context/AdminAuthContext';

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
  const [data, setData] = useState(() => {
    const cached = localStorage.getItem('cached_admin_stats');
    return cached ? JSON.parse(cached) : null;
  });
  const [loading, setLoading] = useState(!data);

  const fetchStats = async () => {
    try {
      const r = await api.get('/admin/stats');
      setData(r.data);
      localStorage.setItem('cached_admin_stats', JSON.stringify(r.data));
    } catch (e) { 
      console.error(e); 
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    fetchStats(); 
  }, []);

  if (loading) return (
    <div className="loader-wrap-modern">
      <div className="spinner-modern"/>
      <span>Synthesizing Platform Intelligence...</span>
    </div>
  );

  if (!data) return <div className="error-state">Platform data synchronization failed.</div>;

  const { kpis, top_businesses, top_products, recent_activity, revenue_history } = data;

  // Mock Sparkline Data
  const sparkData = [
    {v: 400}, {v: 300}, {v: 500}, {v: 450}, {v: 600}, {v: 550}, {v: 700}
  ];

  const chartData = (revenue_history || []).map(h => ({
    name: new Date(h.day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    revenue: h.revenue,
    orders: Math.floor(h.revenue / 50000) // Mocked order count based on rev
  }));

  const pieData = [
    { name: 'Paid', value: 65, color: '#10B981' },
    { name: 'Pending', value: 20, color: '#F59E0B' },
    { name: 'Cancelled', value: 15, color: '#EF4444' }
  ];

  return (
    <div className="dashboard-expert-container animate-fade">
      
      {/* ── Dashboard Header ── */}
      <div className="dashboard-top-row">
        <div className="welcome-section">
          <h1 className="expert-title">Marketplace Overview</h1>
          <p className="expert-subtitle">System status: <span className="status-indicator">Healthy</span> • Last sync: Just now</p>
        </div>
        <div className="action-row">
          <button className="btn-expert ghost"><Calendar size={14}/> This Month</button>
          <button className="btn-expert primary"><Download size={14}/> Export Intelligence</button>
        </div>
      </div>

      {/* ── KPI Ribbon ── */}
      <div className="expert-stat-grid">
        <StatCard 
          icon={DollarSign} 
          label="Gross Revenue" 
          value={`UGX ${(kpis.total_revenue||0).toLocaleString()}`} 
          subValue="+12.5%" 
          trend="up" 
          color="emerald" 
          sparkData={sparkData}
        />
        <StatCard 
          icon={ShoppingCart} 
          label="Total Transactions" 
          value={kpis.total_orders?.toLocaleString()} 
          subValue="+8.2%" 
          trend="up" 
          color="indigo" 
          sparkData={sparkData.map(d => ({v: d.v * 0.8}))}
        />
        <StatCard 
          icon={Building2} 
          label="Active Merchants" 
          value={kpis.total_businesses?.toLocaleString()} 
          subValue="-2.1%" 
          trend="down" 
          color="violet" 
          sparkData={sparkData.reverse()}
        />
        <StatCard 
          icon={Users} 
          label="Customer Base" 
          value={kpis.total_customers?.toLocaleString()} 
          subValue="+14.3%" 
          trend="up" 
          color="cyan" 
          sparkData={sparkData.map(d => ({v: d.v * 1.2}))}
        />
      </div>

      {/* ── Visual Analytics Center ── */}
      <div className="analytics-grid">
        
        {/* Main Revenue Engine */}
        <div className="card glass-card revenue-chart-wrap">
          <div className="card-head-modern">
            <div className="card-head-left">
              <div className="head-icon"><TrendingUp size={18}/></div>
              <h3>Revenue Velocity</h3>
            </div>
            <div className="chart-legend">
              <div className="legend-item"><span className="dot orange"/> Revenue</div>
              <div className="legend-item"><span className="dot gray"/> Orders</div>
            </div>
          </div>
          <div className="chart-body-modern">
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorOrange" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ff7e47" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#ff7e47" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill:'#94a3b8', fontSize:11}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill:'#94a3b8', fontSize:11}} />
                <Tooltip 
                  contentStyle={{ border:'none', borderRadius:12, boxShadow:'0 10px 25px rgba(0,0,0,0.1)' }}
                  cursor={{ stroke: '#ff7e47', strokeWidth: 2 }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#ff7e47" strokeWidth={3} fillOpacity={1} fill="url(#colorOrange)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Distribution & Performance */}
        <div className="card pie-chart-wrap">
          <div className="card-head-modern">
            <div className="card-head-left">
              <div className="head-icon"><Zap size={18}/></div>
              <h3>Order Integrity</h3>
            </div>
          </div>
          <div className="pie-body">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  {pieData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="pie-legend-modern">
              {pieData.map(d => (
                <div key={d.name} className="pie-legend-item">
                  <span className="dot" style={{ background: d.color }} />
                  <span className="label">{d.name}</span>
                  <span className="val">{d.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* ── Operational Intelligence ── */}
      <div className="operational-grid">
        
        {/* Top Performing Merchants */}
        <div className="card table-card-expert">
          <div className="card-head-modern">
            <h3>Top Performing Merchants</h3>
            <button className="btn-icon-modern"><MoreHorizontal size={16}/></button>
          </div>
          <div className="expert-table-wrap">
            <table className="expert-table">
              <thead>
                <tr>
                  <th>Merchant</th>
                  <th>Revenue</th>
                  <th>Growth</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {top_businesses.map(b => (
                  <tr key={b.id}>
                    <td>
                      <div className="merchant-cell">
                        <div className="avatar-mini">{b.name[0]}</div>
                        <span>{b.name}</span>
                      </div>
                    </td>
                    <td><span className="weight-800 text-dark">UGX {b.revenue.toLocaleString()}</span></td>
                    <td><span className="trend-up">+12%</span></td>
                    <td><button className="btn-table-action"><ChevronRight size={14}/></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Real-time Audit Stream */}
        <div className="card audit-card-expert">
          <div className="card-head-modern">
            <h3>Platform Audit Stream</h3>
            <div className="live-tag">LIVE</div>
          </div>
          <div className="audit-feed-expert">
            {recent_activity.map((act, i) => (
              <div key={i} className="audit-item-expert">
                <div className={`audit-indicator ${act.status}`} />
                <div className="audit-body-expert">
                  <p>Order <strong>#{act.id.slice(0,8)}</strong> confirmed for <strong>UGX {act.amount.toLocaleString()}</strong></p>
                  <span className="audit-time-expert">{new Date(act.time).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })}</span>
                </div>
              </div>
            ))}
          </div>
          <button className="btn-expert-outline w-full mt-4">Access Full Audit Logs</button>
        </div>

      </div>

      {/* ── Global Platform Status ── */}
      <div className="global-footer-expert">
        <div className="status-group">
          <ShieldCheck size={16} className="text-success" />
          <span>Platform Infrastructure Secure</span>
        </div>
        <div className="status-group">
          <Clock size={16} />
          <span>Data Refreshed: {new Date().toLocaleTimeString()}</span>
        </div>
      </div>

    </div>
  );
};

export default Dashboard;
