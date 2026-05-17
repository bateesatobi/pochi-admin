import React, { useState, useEffect, useRef } from 'react';
import { Bell, CheckCircle2, Clock, X, Loader2 } from 'lucide-react';
import axios from 'axios';
import './AdminNotifications.css';

const BASE = 'https://pakacha.com/api/v1/admin/notifications';

const AdminNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);
  
  const token = localStorage.getItem('adminToken');
  const headers = { Authorization: `Bearer ${token}` };

  const loadNotifications = async () => {
    try {
      const res = await axios.get(BASE, { headers });
      setNotifications(res.data || []);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    }
  };

  useEffect(() => {
    if (token) {
      loadNotifications();
      const interval = setInterval(loadNotifications, 30000); // Polling every 30s
      return () => clearInterval(interval);
    }
  }, [token]);

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

  const markAsRead = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      await axios.patch(`${BASE}/${id}/read`, {}, { headers });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (err) {
      console.error('Failed to mark read', err);
    }
  };

  const markAllAsRead = async () => {
    setLoading(true);
    try {
      await axios.post(`${BASE}/read-all`, {}, { headers });
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (err) {
      console.error('Failed to mark all read', err);
    } finally {
      setLoading(false);
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="admin-notif-container" ref={dropdownRef}>
      <button className="admin-notif-bell" onClick={() => setIsOpen(!isOpen)}>
        <Bell size={20} />
        {unreadCount > 0 && <span className="notif-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>}
      </button>

      {isOpen && (
        <div className="admin-notif-dropdown">
          <div className="notif-header">
            <h3>Notifications</h3>
            {unreadCount > 0 && (
              <button onClick={markAllAsRead} disabled={loading} className="btn-read-all">
                {loading ? <Loader2 size={12} className="spin" /> : <CheckCircle2 size={12} />}
                Mark all read
              </button>
            )}
          </div>
          
          <div className="notif-body">
            {notifications.length === 0 ? (
              <div className="notif-empty">
                <Bell size={32} opacity={0.2} />
                <p>No notifications yet</p>
              </div>
            ) : (
              notifications.map(n => (
                <div key={n.id} className={`notif-item ${!n.is_read ? 'unread' : ''}`}>
                  <div className="notif-content">
                    <div className="notif-title">{n.title}</div>
                    <div className="notif-message">{n.message}</div>
                    <div className="notif-time">
                      <Clock size={10} />
                      {new Date(n.created_at).toLocaleString('en-UG', { 
                        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
                      })}
                    </div>
                  </div>
                  {!n.is_read && (
                    <button className="btn-mark-read" onClick={(e) => markAsRead(n.id, e)} title="Mark as read">
                      <div className="unread-dot"></div>
                    </button>
                  )}
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
