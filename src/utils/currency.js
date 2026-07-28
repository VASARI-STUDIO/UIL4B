export const PRICE_SYMBOLS = {
  usd: '$',
  eur: '€',
  gbp: '£',
  aud: 'A$',
  nzd: 'NZ$',
  cad: 'C$',
  sgd: 'S$',
  chf: 'Fr',
}

export const REGION_CURRENCY = {
  AU: 'aud', NZ: 'nzd', GB: 'gbp', US: 'usd', CA: 'cad', SG: 'sgd', CH: 'chf',
  IE: 'eur', DE: 'eur', FR: 'eur', ES: 'eur', IT: 'eur', NL: 'eur', AT: 'eur',
  BE: 'eur', FI: 'eur', PT: 'eur', GR: 'eur', LU: 'eur', EE: 'eur', SK: 'eur',
  SI: 'eur', LV: 'eur', LT: 'eur', CY: 'eur', MT: 'eur',
}

export function detectCurrency(language = typeof navigator !== 'undefined' ? navigator.language : '') {
  const region = String(language || '').split('-')[1]?.toUpperCase()
  return REGION_CURRENCY[region] || 'aud'
}

export function formatCurrency(amount, currency = 'aud') {
  const symbol = PRICE_SYMBOLS[currency] || `${currency.toUpperCase()} `
  return `${symbol}${Number(amount).toFixed(2)}`
}
