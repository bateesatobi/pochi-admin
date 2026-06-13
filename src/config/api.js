const PROD_API = 'https://pakacha.com/api/v1';
const PROD_WS = 'wss://pakacha.com';
const DEV_API = 'http://localhost:8000/api/v1';
const DEV_WS = 'ws://localhost:8000';

const isBrowserLocalHost = () => {
  if (typeof window === 'undefined') return true;
  const host = window.location.hostname;
  return host === 'localhost' || host === '127.0.0.1' || host === '[::1]';
};

/** When the UI is served from Render/production, always hit pakacha.com — even if dev env vars were baked in. */
const resolveApiBase = () => {
  if (!isBrowserLocalHost()) return PROD_API;
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  return import.meta.env.PROD ? PROD_API : DEV_API;
};

const resolveWsBase = () => {
  if (!isBrowserLocalHost()) return PROD_WS;
  if (import.meta.env.VITE_WS_URL) return import.meta.env.VITE_WS_URL;
  return import.meta.env.PROD ? PROD_WS : DEV_WS;
};

export const API_BASE = resolveApiBase();
export const WS_BASE = resolveWsBase();
