import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Camera, Search, RefreshCw, Eye, X, Send, Trash2, MessageSquare,
  MoreVertical, Pencil,
} from 'lucide-react';
import {
  useSnapAskCases,
  useSnapAskCase,
  useSnapAskMessages,
  useUpdateSnapAskCase,
  usePostSnapAskMessage,
  useDeleteSnapAskCase,
} from '../hooks/queries';
import { toast, alertError, confirmAction } from '../utils/swal';
import './SnapAsk.css';

const STATUS_OPTIONS = ['', 'SUBMITTED', 'IN_REVIEW', 'REPLIED', 'CLOSED'];
const PER_PAGE = 12;

const formatImage = (b64) => {
  if (!b64) return null;
  if (b64.startsWith('data:')) return b64;
  return `data:image/jpeg;base64,${b64}`;
};

const shortId = (id) => (id ? String(id).slice(0, 8) : '—');

const formatWhen = (value) => {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return String(value);
  }
};

const badgeClass = (status) => {
  const key = String(status || '').toLowerCase().replace(/_/g, '-');
  return `badge badge-${key}`;
};

const SnapAsk = () => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState('view'); // view | update
  const [menuOpenId, setMenuOpenId] = useState(null);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const [reply, setReply] = useState('');
  const [statusDraft, setStatusDraft] = useState('');
  const menuRef = useRef(null);
  const statusSectionRef = useRef(null);

  const { data: cases = [], isLoading, refetch } = useSnapAskCases({
    status: statusFilter,
    q: search.trim(),
  });

  const menuItem = useMemo(
    () => (menuOpenId ? cases.find((c) => c.id === menuOpenId) : null),
    [cases, menuOpenId],
  );

  const { data: caseDetail, isLoading: detailLoading } = useSnapAskCase(
    selectedId,
    drawerOpen && !!selectedId,
  );
  const {
    data: messages = [],
    isLoading: messagesLoading,
    refetch: refetchMessages,
  } = useSnapAskMessages(selectedId, drawerOpen && !!selectedId);

  const updateCase = useUpdateSnapAskCase();
  const postMessage = usePostSnapAskMessage();
  const deleteCase = useDeleteSnapAskCase();

  useEffect(() => {
    if (!menuOpenId) return undefined;
    const onDocClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpenId(null);
      }
    };
    const onScroll = () => setMenuOpenId(null);
    document.addEventListener('mousedown', onDocClick);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
    };
  }, [menuOpenId]);

  const openActionMenu = (e, item) => {
    e.stopPropagation();
    if (menuOpenId === item.id) {
      setMenuOpenId(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const menuWidth = 168;
    const menuHeight = 140;
    const left = Math.min(
      Math.max(8, rect.right - menuWidth),
      window.innerWidth - menuWidth - 8,
    );
    const top = rect.bottom + 6 + menuHeight > window.innerHeight
      ? Math.max(8, rect.top - menuHeight - 6)
      : rect.bottom + 6;
    setMenuPos({ top, left });
    setMenuOpenId(item.id);
  };

  useEffect(() => {
    if (drawerOpen && drawerMode === 'update' && statusSectionRef.current) {
      statusSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [drawerOpen, drawerMode, caseDetail]);

  const stats = useMemo(() => ({
    total: cases.length,
    submitted: cases.filter((c) => c.status === 'SUBMITTED').length,
    inReview: cases.filter((c) => c.status === 'IN_REVIEW').length,
    replied: cases.filter((c) => c.status === 'REPLIED').length,
  }), [cases]);

  const totalPages = Math.max(1, Math.ceil(cases.length / PER_PAGE));
  const paged = cases.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const activeCase = caseDetail || cases.find((c) => c.id === selectedId) || null;

  const openDrawer = (item, mode = 'view') => {
    setSelectedId(item.id);
    setStatusDraft(item.status || 'SUBMITTED');
    setReply('');
    setDrawerMode(mode);
    setDrawerOpen(true);
    setMenuOpenId(null);

    // Viewing a new snap marks it IN_REVIEW so the sidebar badge decreases
    if (item.status === 'SUBMITTED') {
      updateCase.mutate(
        { caseId: item.id, status: 'IN_REVIEW' },
        {
          onSuccess: () => {
            setStatusDraft('IN_REVIEW');
            refetch();
          },
        },
      );
    }
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setSelectedId(null);
    setReply('');
    setDrawerMode('view');
  };

  const handleStatusSave = async () => {
    if (!selectedId || !statusDraft) return;
    try {
      await updateCase.mutateAsync({ caseId: selectedId, status: statusDraft });
      toast('Case status updated');
      refetch();
    } catch (err) {
      alertError('Update failed', err.response?.data?.detail || 'Please try again.');
    }
  };

  const handleSendReply = async () => {
    const body = reply.trim();
    if (!selectedId || !body) return;
    try {
      await postMessage.mutateAsync({ caseId: selectedId, body });
      setReply('');
      toast('Reply sent');
      refetchMessages();
      refetch();
    } catch (err) {
      alertError('Reply failed', err.response?.data?.detail || 'Please try again.');
    }
  };

  const handleDelete = async (item) => {
    setMenuOpenId(null);
    const caseId = item?.id || selectedId;
    if (!caseId) return;
    const ok = await confirmAction({
      title: 'Delete this case?',
      text: 'The case and all messages will be permanently removed.',
      confirmButtonText: 'Delete',
    });
    if (!ok.isConfirmed) return;
    try {
      await deleteCase.mutateAsync(caseId);
      toast('Case deleted');
      if (selectedId === caseId) closeDrawer();
      refetch();
    } catch (err) {
      alertError('Delete failed', err.response?.data?.detail || 'Please try again.');
    }
  };

  return (
    <div className="animate-fade">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>Snap & Ask</h1>
          <p>Review customer product inquiries, update status, and reply in-thread.</p>
        </div>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => refetch()}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(79,70,229,0.1)', color: 'var(--primary)' }}>
            <Camera size={20} />
          </div>
          <div className="stat-info">
            <label>Total cases</label>
            <div className="stat-value">{stats.total}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(245,158,11,0.1)', color: 'var(--warning)' }}>
            <MessageSquare size={20} />
          </div>
          <div className="stat-info">
            <label>Submitted</label>
            <div className="stat-value">{stats.submitted}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6' }}>
            <Eye size={20} />
          </div>
          <div className="stat-info">
            <label>In review</label>
            <div className="stat-value">{stats.inReview}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(16,185,129,0.1)', color: 'var(--success)' }}>
            <Send size={20} />
          </div>
          <div className="stat-info">
            <label>Replied</label>
            <div className="stat-value">{stats.replied}</div>
          </div>
        </div>
      </div>

      <div className="controls-bar" style={{ flexWrap: 'wrap', gap: 12 }}>
        <div className="search-input-wrap" style={{ flex: '1 1 300px' }}>
          <Search size={16} />
          <input
            placeholder="Search reference or notes..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <select
          className="filter-select"
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s || 'all'} value={s}>{s || 'All Statuses'}</option>
          ))}
        </select>
      </div>

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Reference</th>
              <th>Customer</th>
              <th>Notes</th>
              <th>Tags</th>
              <th>Messages</th>
              <th>Submitted</th>
              <th>Status</th>
              <th style={{ width: 56 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={8}>
                  <div className="loader-wrap" style={{ padding: '40px 0' }}>
                    <div className="spinner" /> Loading...
                  </div>
                </td>
              </tr>
            ) : paged.length === 0 ? (
              <tr>
                <td colSpan={8}>
                  <div className="empty-state">
                    <Camera size={40} />
                    <p>No Snap & Ask cases found.</p>
                  </div>
                </td>
              </tr>
            ) : paged.map((item) => (
              <tr key={item.id}>
                <td className="td-name" style={{ fontFamily: 'monospace', fontSize: 12 }}>
                  {item.reference || shortId(item.id)}
                </td>
                <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{shortId(item.user_id)}</td>
                <td style={{ maxWidth: 220 }}>
                  <div className="snap-ask-notes-cell">{item.notes || '—'}</div>
                </td>
                <td>
                  {(item.preset_tags || []).length === 0 ? '—' : (
                    <div className="snap-ask-tags">
                      {(item.preset_tags || []).slice(0, 3).map((tag) => (
                        <span key={tag} className="snap-ask-tag">{tag}</span>
                      ))}
                    </div>
                  )}
                </td>
                <td>{item.message_count ?? 0}</td>
                <td style={{ fontSize: 12 }}>{formatWhen(item.created_at)}</td>
                <td><span className={badgeClass(item.status)}>{item.status}</span></td>
                <td>
                  <div className="snap-ask-actions">
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm btn-icon"
                      title="Actions"
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={(e) => openActionMenu(e, item)}
                    >
                      <MoreVertical size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          <button type="button" className="p-btn" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</button>
          <span>Page {page} / {totalPages}</span>
          <button type="button" className="p-btn" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</button>
        </div>
      )}

      {menuOpenId && menuItem && createPortal(
        <div
          ref={menuRef}
          className="snap-ask-action-menu"
          style={{ top: menuPos.top, left: menuPos.left }}
          onClick={(e) => e.stopPropagation()}
        >
          <button type="button" onClick={() => openDrawer(menuItem, 'view')}>
            <Eye size={15} /> View
          </button>
          <button type="button" onClick={() => openDrawer(menuItem, 'update')}>
            <Pencil size={15} /> Update
          </button>
          <button type="button" className="danger" onClick={() => handleDelete(menuItem)}>
            <Trash2 size={15} /> Delete
          </button>
        </div>,
        document.body,
      )}

      <div
        className={`drawer-overlay ${drawerOpen ? 'open' : ''}`}
        onClick={closeDrawer}
      >
        <div className="drawer" onClick={(e) => e.stopPropagation()}>
          <div className="drawer-head">
            <div className="drawer-head-left">
              <div className="drawer-head-icon"><Camera size={20} /></div>
              <div>
                <h2>{drawerMode === 'update' ? 'Update case' : 'Case details'}</h2>
                <p>{activeCase?.reference || shortId(selectedId)}</p>
              </div>
            </div>
            <button type="button" className="drawer-close" onClick={closeDrawer}>
              <X size={16} />
            </button>
          </div>

          <div className="drawer-body">
            {detailLoading && !activeCase ? (
              <div className="loader-wrap" style={{ padding: 24 }}>
                <div className="spinner" /> Loading case...
              </div>
            ) : activeCase ? (
              <>
                <div className="detail-section">
                  <div className="detail-section-title">Snap photo</div>
                  {formatImage(activeCase.image_base64) ? (
                    <img
                      className="snap-ask-photo"
                      src={formatImage(activeCase.image_base64)}
                      alt="Customer inquiry"
                    />
                  ) : (
                    <p style={{ color: 'var(--text-muted)' }}>No image attached</p>
                  )}
                </div>

                <div className="detail-section">
                  <div className="detail-section-title">Snap information</div>
                  <div className="detail-grid">
                    <div className="detail-item">
                      <label>Reference</label>
                      <span style={{ fontFamily: 'monospace' }}>{activeCase.reference}</span>
                    </div>
                    <div className="detail-item">
                      <label>Customer ID</label>
                      <span style={{ fontFamily: 'monospace' }}>{shortId(activeCase.user_id)}</span>
                    </div>
                    <div className="detail-item">
                      <label>Status</label>
                      <span className={badgeClass(activeCase.status)}>{activeCase.status}</span>
                    </div>
                    <div className="detail-item">
                      <label>Messages</label>
                      <span>{activeCase.message_count ?? messages.length}</span>
                    </div>
                    <div className="detail-item">
                      <label>Submitted</label>
                      <span>{formatWhen(activeCase.created_at)}</span>
                    </div>
                    <div className="detail-item">
                      <label>Updated</label>
                      <span>{formatWhen(activeCase.updated_at)}</span>
                    </div>
                    <div className="detail-item" style={{ gridColumn: '1 / -1' }}>
                      <label>Notes</label>
                      <span>{activeCase.notes || '—'}</span>
                    </div>
                    <div className="detail-item" style={{ gridColumn: '1 / -1' }}>
                      <label>Tags</label>
                      <span>
                        {(activeCase.preset_tags || []).length
                          ? (activeCase.preset_tags || []).join(', ')
                          : '—'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="detail-section" ref={statusSectionRef}>
                  <div className="detail-section-title">Admin status</div>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                    <select
                      className="filter-select"
                      value={statusDraft || activeCase.status}
                      onChange={(e) => setStatusDraft(e.target.value)}
                    >
                      {STATUS_OPTIONS.filter(Boolean).map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      disabled={updateCase.isPending}
                      onClick={handleStatusSave}
                    >
                      Save status
                    </button>
                  </div>
                </div>

                <div className="detail-section">
                  <div className="detail-section-title">Chats</div>
                  {messagesLoading ? (
                    <div className="loader-wrap"><div className="spinner" /> Loading messages...</div>
                  ) : messages.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)' }}>No messages yet.</p>
                  ) : (
                    <div className="snap-ask-thread">
                      {messages.map((msg) => (
                        <div
                          key={msg.id}
                          className={`snap-ask-bubble ${msg.sender_role === 'ADMIN' ? 'admin' : 'customer'}`}
                        >
                          <div className="snap-ask-bubble-meta">
                            {msg.sender_role} · {formatWhen(msg.created_at)}
                          </div>
                          <div>{msg.body}</div>
                          {formatImage(msg.image_base64) && (
                            <img
                              className="snap-ask-msg-image"
                              src={formatImage(msg.image_base64)}
                              alt="Attachment"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="snap-ask-reply">
                    <textarea
                      rows={3}
                      placeholder="Write a reply to the customer..."
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                      disabled={activeCase.status === 'CLOSED'}
                    />
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      disabled={!reply.trim() || postMessage.isPending || activeCase.status === 'CLOSED'}
                      onClick={handleSendReply}
                    >
                      <Send size={14} /> Send reply
                    </button>
                  </div>
                </div>
              </>
            ) : null}
          </div>

          <div className="drawer-footer" style={{ justifyContent: 'space-between' }}>
            <button
              type="button"
              className="btn btn-danger btn-sm"
              disabled={deleteCase.isPending}
              onClick={() => handleDelete(activeCase)}
            >
              <Trash2 size={14} /> Delete
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={closeDrawer}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SnapAsk;
