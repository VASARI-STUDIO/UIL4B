// Region gate for the Gemini-backed AI tools. Pure: no imports, no I/O.
//
// Google's Gemini API terms don't let the free tier serve users in the EEA, the
// UK or Switzerland, so these tasks refuse those regions. The country comes from
// Vercel's x-vercel-ip-country header; a missing or malformed header means NOT
// blocked (local dev, a non-Vercel host, a proxy that strips it), so the gate
// fails open.

// EU 27 plus Iceland, Liechtenstein and Norway.
export const EEA_COUNTRIES = Object.freeze([
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE',
  'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE',
  'IS', 'LI', 'NO',
])

// Territories that sit inside the EU and report their own ISO code.
export const EU_TERRITORIES = Object.freeze(['AX', 'GF', 'GP', 'MQ', 'RE', 'YT', 'MF'])

export const GEMINI_BLOCKED_COUNTRIES = new Set([...EEA_COUNTRIES, 'GB', 'CH', ...EU_TERRITORIES])

// Common non-ISO spellings of a country code.
const ALIASES = { UK: 'GB', EL: 'GR' }

export function countryFromHeaders(headers) {
  const raw = headers?.['x-vercel-ip-country']
  const first = Array.isArray(raw) ? raw[0] : raw
  if (typeof first !== 'string') return null
  const code = first.split(',')[0].trim().toUpperCase()
  if (!/^[A-Z]{2}$/.test(code)) return null
  return ALIASES[code] || code
}

export function isGeminiBlockedCountry(code) {
  return typeof code === 'string' && GEMINI_BLOCKED_COUNTRIES.has(code)
}

export function geminiRegionBlocked(headers) {
  return isGeminiBlockedCountry(countryFromHeaders(headers))
}

export const REGION_BLOCKED_STATUS = 451
export const REGION_BLOCKED_CODE = 'region-unavailable'
export const REGION_BLOCKED_ERROR = "This tool isn't available in your region. It runs on Google Gemini, and Google's terms don't allow it in the UK, Switzerland or the European Economic Area. Nothing was taken from your allowance."
