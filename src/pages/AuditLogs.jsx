import React, { useState } from 'react';
import { 
  ScrollText, Search, Filter, Calendar, ShieldAlert, Activity, FileText,
  CheckCircle, AlertTriangle, Trash2, UserPlus, RefreshCw, X, Eye, 
  ChevronRight, SlidersHorizontal, Info, Clock, User
} from 'lucide-react';
import { useAuditLogs } from '../hooks/queries';

const ACTION_COLORS = {
  APPROVE: { bg: 'rgba(16, 185, 129, 0.08)', border: 'rgba(16, 185, 129, 0.3)', text: '#10B981', icon: CheckCircle },
  REJECT: { bg: 'rgba(239, 68, 68, 0.08)', border: 'rgba(239, 68, 68, 0.3)', text: '#EF4444', icon: AlertTriangle },
  DELETE: { bg: 'rgba(239, 68, 68, 0.08)', border: 'rgba(239, 68, 68, 0.3)', text: '#EF4444', icon: Trash2 },
  SUSPEND: { bg: 'rgba(245, 158, 11, 0.08)', border: 'rgba(245, 158, 11, 0.3)', text: '#F59E0B', icon: AlertTriangle },
  ACTIVATE: { bg: 'rgba(16, 185, 129, 0.08)', border: 'rgba(16, 185, 129, 0.3)', text: '#10B981', icon: CheckCircle },
  DEACTIVATE: { bg: 'rgba(239, 68, 68, 0.08)', border: 'rgba(239, 68, 68, 0.3)', text: '#EF4444', icon: AlertTriangle },
  CREATE: { bg: 'rgba(79, 70, 229, 0.08)', border: 'rgba(79, 70, 229, 0.3)', text: '#4F46E5', icon: UserPlus },
  UPDATE: { bg: 'rgba(59, 130, 246, 0.08)', border: 'rgba(59, 130, 246, 0.3)', text: '#3B82F6', icon: RefreshCw },
};

const getActionStyle = (action) => {
  const key = Object.keys(ACTION_COLORS).find(k => action?.toUpperCase().includes(k));
  return key ? ACTION_COLORS[key] : { bg: 'rgba(100, 116, 139, 0.08)', border: 'rgba(100, 116, 139, 0.3)', text: '#64748B', icon: Info };
};

const AuditLogs = () => {
  const { data: logs = [], isLoading: loading, refetch } = useAuditLogs();
  const [search, setSearch] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [actionTypeFilter, setActionTypeFilter] = useState('');
  const [page, setPage] = useState(1);
  const [selectedLog, setSelectedLog] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const PER_PAGE = 15;

  const filtered = logs.filter(l =>
    l.action?.toLowerCase().includes(search.toLowerCase()) ||
    l.entity_id?.toLowerCase().includes(search.toLowerCase()) ||
    l.admin_id?.toLowerCase().includes(search.toLowerCase())
  )
  .filter(l => entityFilter ? l.entity_type === entityFilter : true)
  .filter(l => {
    if (!actionTypeFilter) return true;
    return l.action?.toUpperCase().includes(actionTypeFilter.toUpperCase());
  });

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paged = filtered.slice((page-1)*PER_PAGE, page*PER_PAGE);
  const entities = [...new Set(logs.map(l => l.entity_type))].filter(Boolean);

  // Statistics counters
  const totalCount = logs.length;
  const criticalCount = logs.filter(l => l.action?.includes('DELETE') || l.action?.includes('REJECT') || l.action?.includes('SUSPEND')).length;
  const approvalsCount = logs.filter(l => l.action?.includes('APPROVE') || l.action?.includes('ACTIVATE')).length;

  const openDetails = (log) => {
    setSelectedLog(log);
    setDrawerOpen(true);
  };

  return (
    <div className="animate-fade" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Page Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ScrollText size={28} style={{ color: 'var(--primary)' }} /> Audit Logs Cockpit
          </h1>
          <p>Read-only ledger tracking admin operations, configuration modifications, and system-moderated actions.</p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => refetch()}>
          <RefreshCw size={14} /> Refresh Logs
        </button>
      </div>

      {/* Sleek Cockpit Metric Cards */}
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(79, 70, 229, 0.1)', color: '#4F46E5' }}>
            <Activity size={20} />
          </div>
          <div className="stat-info">
            <label>Total Ledger Events</label>
            <div className="stat-value">{totalCount}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10B981' }}>
            <CheckCircle size={20} />
          </div>
          <div className="stat-info">
            <label>Approvals & Activations</label>
            <div className="stat-value">{approvalsCount}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#EF4444' }}>
            <ShieldAlert size={20} />
          </div>
          <div className="stat-info">
            <label>Critical Security Actions</label>
            <div className="stat-value" style={{ color: '#EF4444' }}>{criticalCount}</div>
          </div>
        </div>
      </div>

      {/* Advanced Filtering Control Panel */}
      <div className="controls-bar" style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center', justifyContent: 'space-between', padding: 18, background: 'var(--card)', borderRadius: 16, border: '1px solid var(--border)' }}>
        <div className="search-input-wrap" style={{ flex: 1, minWidth: 280 }}>
          <Search size={16} />
          <input 
            placeholder="Search by action, Entity ID, or Admin UUID..." 
            value={search} 
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            style={{ width: '100%', background: 'transparent', border: 'none', color: 'var(--text)' }}
          />
        </div>
        
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {/* Action Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--bg)', padding: '6px 12px', borderRadius: 10, border: '1px solid var(--border)' }}>
            <SlidersHorizontal size={14} style={{ opacity: 0.6 }} />
            <select 
              value={actionTypeFilter} 
              onChange={e => { setActionTypeFilter(e.target.value); setPage(1); }}
              style={{ background: 'transparent', border: 'none', color: 'var(--text)', outline: 'none', cursor: 'pointer', fontSize: 13 }}
            >
              <option value="">All Actions</option>
              <option value="CREATE">Create</option>
              <option value="UPDATE">Update</option>
              <option value="DELETE">Delete</option>
              <option value="APPROVE">Approve</option>
              <option value="REJECT">Reject</option>
              <option value="SUSPEND">Suspend</option>
            </select>
          </div>

          {/* Entity Type Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--bg)', padding: '6px 12px', borderRadius: 10, border: '1px solid var(--border)' }}>
            <FileText size={14} style={{ opacity: 0.6 }} />
            <select 
              value={entityFilter} 
              onChange={e => { setEntityFilter(e.target.value); setPage(1); }}
              style={{ background: 'transparent', border: 'none', color: 'var(--text)', outline: 'none', cursor: 'pointer', fontSize: 13 }}
            >
              <option value="">All Entity Types</option>
              {entities.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Redesigned Cockpit Log Rows */}
      <div style={{ background: 'var(--card)', borderRadius: 16, border: '1px solid var(--border)', overflow: 'hidden' }}>
        {loading ? (
          <div className="loader-wrap" style={{ padding: '80px 0', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <div className="spinner" />
            <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>Loading secure audit ledger...</span>
          </div>
        ) : paged.length === 0 ? (
          <div style={{ padding: '80px 0', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            <ScrollText size={48} style={{ opacity: 0.2 }} />
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 4px' }}>No Audit Records Found</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: 0 }}>Try clearing filters or adjusting your search term.</p>
            </div>
          </div>
        ) : (
          <div style={{ padding: '12px 24px' }}>
            {paged.map(log => {
              const style = getActionStyle(log.action);
              const ActionIcon = style.icon;
              let parsedDetail = {};
              try {
                if (log.detail) {
                  parsedDetail = typeof log.detail === 'string' ? JSON.parse(log.detail) : log.detail;
                }
              } catch (e) {}

              return (
                <div 
                  key={log.id} 
                  onClick={() => openDetails(log)}
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 16, 
                    padding: '16px 20px', 
                    borderRadius: 12, 
                    margin: '8px 0', 
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    border: '1px solid transparent',
                    background: 'rgba(255,255,255,0.01)'
                  }}
                  className="audit-row"
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'var(--bg)';
                    e.currentTarget.style.borderColor = 'var(--border)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.01)';
                    e.currentTarget.style.borderColor = 'transparent';
                  }}
                >
                  {/* Styled Event Icon Badge */}
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    width: 38, 
                    height: 38, 
                    borderRadius: 10, 
                    background: style.bg, 
                    border: `1px solid ${style.border}`,
                    color: style.text,
                    flexShrink: 0
                  }}>
                    <ActionIcon size={18} />
                  </div>

                  {/* Main Log Info */}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontWeight: 700, color: 'var(--text)', fontSize: 14 }}>
                        {log.action?.replace(/_/g, ' ')}
                      </span>
                      <span style={{ fontSize: 11, background: 'rgba(79, 70, 229, 0.1)', color: 'var(--primary)', padding: '2px 8px', borderRadius: 20, fontWeight: 700 }}>
                        {log.entity_type}
                      </span>
                    </div>

                    <div style={{ fontSize: 13, color: 'var(--text-muted)', display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                      <span style={{ color: 'var(--text)' }}>ID: {log.entity_id?.slice(0, 8)}...</span>
                      {Object.keys(parsedDetail).length > 0 && (
                        <>
                          <span style={{ opacity: 0.5 }}>·</span>
                          <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                            {Object.entries(parsedDetail).slice(0, 3).map(([k, v]) => `${k}: ${v}`).join(', ')}
                            {Object.keys(parsedDetail).length > 3 && '...'}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Log Time and Action Trigger */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Clock size={12} /> {new Date(log.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </div>
                      <span style={{ fontSize: 11, opacity: 0.6 }}>
                        {new Date(log.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <ChevronRight size={16} style={{ opacity: 0.3 }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Premium Pagination Bar */}
        {totalPages > 1 && (
          <div className="pagination" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderTop: '1px solid var(--border)', background: 'rgba(255,255,255,0.01)' }}>
            <div className="pagination-info" style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              Showing {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, filtered.length)} of {filtered.length} entries
            </div>
            <div className="pagination-btns" style={{ display: 'flex', gap: 6 }}>
              <button 
                className="p-btn" 
                disabled={page === 1} 
                onClick={() => setPage(p => p - 1)}
                style={{ cursor: page === 1 ? 'not-allowed' : 'pointer' }}
              >
                ‹
              </button>
              {[...Array(Math.min(totalPages, 5))].map((_, i) => (
                <button 
                  key={i} 
                  className={`p-btn ${page === i + 1 ? 'active' : ''}`} 
                  onClick={() => setPage(i + 1)}
                >
                  {i + 1}
                </button>
              ))}
              <button 
                className="p-btn" 
                disabled={page === totalPages} 
                onClick={() => setPage(p => p + 1)}
                style={{ cursor: page === totalPages ? 'not-allowed' : 'pointer' }}
              >
                ›
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Redesigned Premium Side Drawer Details Inspector */}
      <div 
        className={`expert-drawer-overlay ${drawerOpen ? 'open' : ''}`} 
        onClick={() => setDrawerOpen(false)}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(11,24,42,0.6)',
          backdropFilter: 'blur(4px)',
          opacity: drawerOpen ? 1 : 0,
          pointerEvents: drawerOpen ? 'all' : 'none',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          zIndex: 9999
        }}
      >
        <div 
          className="expert-drawer" 
          onClick={e => e.stopPropagation()}
          style={{
            position: 'fixed',
            top: 0,
            right: 0,
            width: '100%',
            maxWidth: 580,
            height: '100vh',
            background: 'var(--bg)',
            borderLeft: '1px solid var(--border)',
            boxShadow: '-10px 0 30px rgba(0,0,0,0.3)',
            transform: drawerOpen ? 'translateX(0)' : 'translateX(100%)',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}
        >
          {/* Drawer Navigation */}
          <div 
            className="drawer-nav"
            style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              padding: '24px 32px', 
              borderBottom: '1px solid var(--border)',
              background: 'var(--card)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                width: 44, 
                height: 44, 
                borderRadius: 12, 
                background: selectedLog ? getActionStyle(selectedLog.action).bg : 'rgba(255,255,255,0.05)',
                color: selectedLog ? getActionStyle(selectedLog.action).text : 'var(--text)',
                border: selectedLog ? `1px solid ${getActionStyle(selectedLog.action).border}` : '1px solid var(--border)'
              }}>
                {selectedLog && React.createElement(getActionStyle(selectedLog.action).icon, { size: 22 })}
              </div>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 2px', color: 'var(--text)' }}>Log Inspector</h2>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>Immutable Ledger Audit Record</p>
              </div>
            </div>
            <button 
              onClick={() => setDrawerOpen(false)}
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text)' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
            >
              <X size={16} />
            </button>
          </div>

          {/* Drawer Main Info */}
          <div className="drawer-main" style={{ flex: 1, overflowY: 'auto', padding: '32px', display: 'flex', flexDirection: 'column', gap: 24 }}>
            {selectedLog && (
              <>
                {/* Event Summary Box */}
                <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em', uppercase: 'true' }}>ACTION TYPE</span>
                    <span style={{ 
                      fontSize: 12, 
                      fontWeight: 800, 
                      color: getActionStyle(selectedLog.action).text, 
                      background: getActionStyle(selectedLog.action).bg, 
                      border: `1px solid ${getActionStyle(selectedLog.action).border}`,
                      padding: '3px 10px', 
                      borderRadius: 6 
                    }}>
                      {selectedLog.action?.toUpperCase()}
                    </span>
                  </div>
                  <div style={{ borderTop: '1px solid var(--border)', opacity: 0.5 }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 700 }}>ENTITY TARGET</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{selectedLog.entity_type}</span>
                  </div>
                  <div style={{ borderTop: '1px solid var(--border)', opacity: 0.5 }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 700 }}>TIMESTAMP</span>
                    <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{new Date(selectedLog.created_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'medium' })}</span>
                  </div>
                </div>

                {/* Audit Context Details */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <h4 style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', margin: '0 0 4px', letterSpacing: '0.05em' }}>Administrative Context</h4>
                  
                  {/* Responsible Admin */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12 }}>
                    <User size={16} style={{ color: 'var(--primary)' }} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>RESPONSIBLE ADMINISTRATOR ID</span>
                      <code style={{ fontSize: 12, color: 'var(--text)', fontFamily: 'monospace' }}>{selectedLog.admin_id}</code>
                    </div>
                  </div>

                  {/* Target Entity ID */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12 }}>
                    <FileText size={16} style={{ color: 'var(--primary)' }} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>AFFECTED ENTITY UUID</span>
                      <code style={{ fontSize: 12, color: 'var(--text)', fontFamily: 'monospace' }}>{selectedLog.entity_id}</code>
                    </div>
                  </div>
                </div>

                {/* Event Metadata JSON Payload */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <h4 style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', margin: '0 0 4px', letterSpacing: '0.05em' }}>Event Metadata Payload</h4>
                  <div style={{ 
                    background: '#040b14', 
                    border: '1px solid var(--border)', 
                    borderRadius: 16, 
                    padding: '20px 24px', 
                    fontFamily: 'monospace', 
                    fontSize: 12, 
                    lineHeight: '1.6', 
                    overflowX: 'auto',
                    color: '#c9d1d9',
                    boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.8)'
                  }}>
                    {selectedLog.detail ? (
                      (() => {
                        try {
                          const obj = typeof selectedLog.detail === 'string' ? JSON.parse(selectedLog.detail) : selectedLog.detail;
                          return <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{JSON.stringify(obj, null, 2)}</pre>;
                        } catch {
                          return <span style={{ color: '#ff7b72' }}>{selectedLog.detail}</span>;
                        }
                      })()
                    ) : (
                      <span style={{ opacity: 0.5, fontStyle: 'italic' }}>No additional metadata payload attached to this record.</span>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuditLogs;
