import React, { useState, useEffect } from 'react';
import { ScrollText, Search } from 'lucide-react';
import { api } from '../context/AdminAuthContext';

const ACTION_COLORS = {
  APPROVE: '#10B981', REJECT: '#EF4444', DELETE: '#EF4444',
  SUSPEND: '#F59E0B', ACTIVATE: '#10B981', DEACTIVATE: '#EF4444',
  CREATE: '#4F46E5', UPDATE: '#3B82F6',
};

const getColor = (action) => {
  const key = Object.keys(ACTION_COLORS).find(k => action?.includes(k));
  return key ? ACTION_COLORS[key] : '#64748B';
};

const AuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [page, setPage] = useState(1);
  const PER_PAGE = 20;

  useEffect(() => {
    api.get('/admin/audit-logs?limit=200').then(r => { setLogs(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const filtered = logs.filter(l =>
    l.action?.toLowerCase().includes(search.toLowerCase()) ||
    l.entity_id?.toLowerCase().includes(search.toLowerCase())
  ).filter(l => entityFilter ? l.entity_type === entityFilter : true);

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paged = filtered.slice((page-1)*PER_PAGE, page*PER_PAGE);
  const entities = [...new Set(logs.map(l => l.entity_type))];

  return (
    <div className="animate-fade">
      <div className="page-header">
        <h1>Audit Logs</h1>
        <p>Immutable record of every admin action on the platform.</p>
      </div>

      <div className="controls-bar">
        <div className="search-input-wrap">
          <Search size={16}/>
          <input placeholder="Search by action or entity ID..." value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}}/>
        </div>
        <select className="filter-select" value={entityFilter} onChange={e=>{setEntityFilter(e.target.value);setPage(1);}}>
          <option value="">All Entity Types</option>
          {entities.map(e => <option key={e} value={e}>{e}</option>)}
        </select>
      </div>

      <div className="table-wrapper">
        {loading ? (
          <div className="loader-wrap" style={{padding:'60px 0'}}><div className="spinner"/>Loading logs...</div>
        ) : paged.length === 0 ? (
          <div className="empty-state"><ScrollText size={40}/><p>No audit logs found.</p></div>
        ) : (
          <div className="audit-timeline" style={{padding:'8px 24px'}}>
            {paged.map(log => (
              <div key={log.id} className="audit-entry">
                <div className="audit-dot" style={{borderColor: getColor(log.action), background: `${getColor(log.action)}20`}}>
                  <div style={{width:8,height:8,borderRadius:'50%',background:getColor(log.action)}}/>
                </div>
                <div className="audit-content" style={{flex:1}}>
                  <div className="audit-action">{log.action?.replace(/_/g,' ')}</div>
                  <div className="audit-meta">
                    <span style={{color:'var(--text)'}}>{log.entity_type}</span>
                    {' · '}
                    <span style={{fontFamily:'monospace',fontSize:11}}>{log.entity_id?.slice(0,16)}…</span>
                    {log.detail && ' · ' + (() => { try { const d = JSON.parse(log.detail); return Object.entries(d).map(([k,v])=>`${k}: ${v}`).join(', '); } catch { return log.detail; } })()}
                  </div>
                  <div className="audit-time">{new Date(log.created_at).toLocaleString()}</div>
                </div>
              </div>
            ))}
          </div>
        )}
        {totalPages > 1 && (
          <div className="pagination">
            <div className="pagination-info">{(page-1)*PER_PAGE+1}–{Math.min(page*PER_PAGE,filtered.length)} of {filtered.length}</div>
            <div className="pagination-btns">
              <button className="p-btn" disabled={page===1} onClick={()=>setPage(p=>p-1)}>‹</button>
              {[...Array(Math.min(totalPages,7))].map((_,i)=><button key={i} className={`p-btn ${page===i+1?'active':''}`} onClick={()=>setPage(i+1)}>{i+1}</button>)}
              <button className="p-btn" disabled={page===totalPages} onClick={()=>setPage(p=>p+1)}>›</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditLogs;
