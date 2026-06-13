import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { WS_BASE } from '../config/api';

const WebSocketContext = createContext(null);
const INTENTIONAL_CLOSE = 4003;

export const WebSocketProvider = ({ children, token }) => {
  const wsRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const listenersRef = useRef({});
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const disposedRef = useRef(false);

  const subscribe = (event, callback) => {
    if (!listenersRef.current[event]) {
      listenersRef.current[event] = [];
    }
    listenersRef.current[event].push(callback);
    return () => {
      listenersRef.current[event] = listenersRef.current[event].filter((cb) => cb !== callback);
    };
  };

  const clearReconnectTimer = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  };

  const teardownSocket = () => {
    clearReconnectTimer();
    const ws = wsRef.current;
    if (!ws) return;

    ws.onmessage = null;
    ws.onerror = null;
    ws.onclose = null;

    if (ws.readyState === WebSocket.OPEN) {
      ws.onopen = null;
      ws.close(INTENTIONAL_CLOSE);
    } else if (ws.readyState === WebSocket.CONNECTING) {
      ws.onopen = () => ws.close(INTENTIONAL_CLOSE);
    } else {
      ws.onopen = null;
    }
    wsRef.current = null;
  };

  useEffect(() => {
    if (!token) {
      setConnected(false);
      return undefined;
    }

    disposedRef.current = false;

    const connect = () => {
      if (disposedRef.current || !token) return;

      const existing = wsRef.current;
      if (existing?.readyState === WebSocket.OPEN || existing?.readyState === WebSocket.CONNECTING) {
        return;
      }

      const wsUrl = `${WS_BASE}/ws?token=${token}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (disposedRef.current) return;
        setConnected(true);
        reconnectAttemptsRef.current = 0;
      };

      ws.onmessage = (event) => {
        if (disposedRef.current) return;
        try {
          const payload = JSON.parse(event.data);
          const { event: eventName, data } = payload;
          if (listenersRef.current[eventName]) {
            listenersRef.current[eventName].forEach((cb) => cb(data));
          }
        } catch (err) {
          console.error('WebSocket payload parse error:', err);
        }
      };

      ws.onclose = (event) => {
        if (disposedRef.current || event.code === INTENTIONAL_CLOSE) {
          setConnected(false);
          return;
        }

        setConnected(false);
        const delay = Math.min(1000 * 2 ** reconnectAttemptsRef.current, 30000);
        reconnectAttemptsRef.current += 1;

        reconnectTimeoutRef.current = setTimeout(() => {
          if (!disposedRef.current) connect();
        }, delay);
      };

      ws.onerror = () => {
        if (disposedRef.current) return;
      };
    };

    connect();

    return () => {
      disposedRef.current = true;
      teardownSocket();
      setConnected(false);
    };
  }, [token]);

  return (
    <WebSocketContext.Provider value={{ connected, subscribe }}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};
