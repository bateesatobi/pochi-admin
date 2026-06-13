import React, { useState, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCircle2, Clock, X, Loader2 } from 'lucide-react';
import './AdminNotifications.css';
import { api } from '../context/AdminAuthContext';
import { useAdminNotifications } from '../hooks/queries';
import { queryKeys } from '../lib/queryKeys';

const AdminNotifications = () => {
  const queryClient = useQueryClient();
  const { data: notifications = [], refetch } = useAdminNotifications({
    refetchInterval: 30_000,
  });
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const updateNotifications = (updater) => {
    queryClient.setQueryData(queryKeys.notifications, (current = []) => updater(current));
  };

  const markAsRead = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      await api.patch(`/admin/notifications/${id}/read`);
      updateNotifications((items) =>
        items.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    } catch (err) {
      console.error('Failed to mark read', err);
    }
  };

  const markAllAsRead = async () => {
    setLoading(true);
    try {
      await api.post('/admin/notifications/read-all');
      updateNotifications((items) => items.map((n) => ({ ...n, is_read: true })));
    } catch (err) {
      console.error('Failed to mark all read', err);
    } finally {
      setLoading(false);
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="admin-notif-container" ref={dropdownRef}>
      <button className="admin-notif-bell" onClick={() => setIsOpen(!isOpen)}>
        <Bell size={20} />
        {unreadCount > 0 && <span className="notif-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>}
      </button>

      {isOpen && (
        <div className="admin-notif-dropdown">
          <div className="notif-header">
            <h4>Notifications</h4>
            {unreadCount > 0 && (
              <button className="mark-all-btn" onClick={markAllAsRead} disabled={loading}>
                {loading ? <Loader2 size={14} className="spin" /> : 'Mark all read'}
              </button>
            )}
          </div>
          <div className="notif-list">
            {notifications.length === 0 ? (
              <p className="notif-empty">No notifications</p>
            ) : (
              notifications.slice(0, 20).map((n) => (
                <div
                  key={n.id}
                  className={`notif-item ${n.is_read ? 'read' : 'unread'}`}
                  onClick={() => !n.is_read && markAsRead(n.id)}
                >
                  <div className="notif-item-content">
                    <strong>{n.title}</strong>
                    <p>{n.message}</p>
                    <span className="notif-time">
                      <Clock size={12} />
                      {new Date(n.created_at).toLocaleString()}
                    </span>
                  </div>
                  {n.is_read && <CheckCircle2 size={14} className="read-icon" />}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminNotifications;
