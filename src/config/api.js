/** Override with VITE_API_URL / VITE_WS_URL in .env.development or .env.production */
const DEFAULTS = import.meta.env.PROD
  ? {
      api: 'https://pakacha.com/api/v1',
      ws: 'wss://pakacha.com',
    }
  : {
      api: 'http://localhost:8000/api/v1',
      ws: 'ws://localhost:8000',
    };

export const API_BASE = import.meta.env.VITE_API_URL || DEFAULTS.api;
export const WS_BASE = import.meta.env.VITE_WS_URL || DEFAULTS.ws;
