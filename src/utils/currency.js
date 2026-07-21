/** Currency formatting helpers for admin — mirrors backend RoundingRules. */

const HUNDRED_ROUND_CURRENCIES = new Set(['UGX', 'JPY', 'RWF', 'TZS']);

export const normalizeCurrency = (code) => {
  if (!code) return 'UGX';
  const upper = String(code).toUpperCase();
  return upper === 'KSH' ? 'KES' : upper;
};

export const roundForCurrency = (amount, currency = 'UGX') => {
  const value = Number(amount) || 0;
  const code = normalizeCurrency(currency);
  if (HUNDRED_ROUND_CURRENCIES.has(code)) {
    return Math.round(value / 100) * 100;
  }
  return Math.round(value * 100) / 100;
};

export const formatMoney = (amount, currency = 'UGX') => {
  const code = normalizeCurrency(currency);
  const value = roundForCurrency(amount, code);
  if (HUNDRED_ROUND_CURRENCIES.has(code)) {
    return `${code} ${value.toLocaleString()}`;
  }
  return `${code} ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const formatUsd = (amount) => {
  const value = roundForCurrency(amount, 'USD');
  return `US$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};
