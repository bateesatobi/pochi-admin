import React, { createContext, useContext, useEffect, useRef, useState } from 'react';

const WebSocketContext = createContext(null);

export const WebSocketProvider = ({ children, token }) => {
  const wsRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const listenersRef = useRef({});

  // Reconnection backoff ref
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);

  const subscribe = (event, callback) => {
    if (!listenersRef.current[event]) {
      listenersRef.current[event] = [];
    }
    listenersRef.current[event].push(callback);
    return () => {
      listenersRef.current[event] = listenersRef.current[event].filter(cb => cb !== callback);
    };
  };

  const connect = () => {
    if (!token) return;
    if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const protocol = 'wss';
    const host = 'pakacha.com';
    const wsUrl = `${protocol}://${host}/ws?token=${token}`;

    console.log(`📡 Connecting WebSocket to: ${wsUrl}`);
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('📡 WebSocket connected.');
      setConnected(true);
      reconnectAttemptsRef.current = 0;
    };

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        const { event: eventName, data } = payload;
        console.log(`📡 WebSocket message received: ${eventName}`, data);
        
        if (listenersRef.current[eventName]) {
          listenersRef.current[eventName].forEach(cb => cb(data));
        }
      } catch (err) {
        console.error('📡 Error parsing WebSocket payload:', err);
      }
    };

    ws.onclose = (event) => {
      setConnected(false);
      console.log(`📡 WebSocket disconnected. Code: ${event.code}`);
      
      if (event.code === 4003) return; // Normal connection termination

      const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
      reconnectAttemptsRef.current += 1;
      console.log(`📡 Reconnecting WebSocket in ${delay}ms...`);
      
      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, delay);
    };

    ws.onerror = (err) => {
      console.error('📡 WebSocket error:', err);
    };
  };

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) {
        wsRef.current.close(4003); // Close normal code
      }
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
