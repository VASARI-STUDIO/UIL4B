// Collector for Content-Security-Policy violation reports. Files in /api/_lib
// are not deployed as routes; api/support.js hands the request here when it is
// called as /api/support?report=csp, because /api is already at Vercel's
// twelve-function limit and a route of its own would be the thirteenth.
//
// Browsers send these without credentials and without a preflight, so there is
// no CORS handling. Two body shapes arrive:
//   report-uri  application/csp-report   { "csp-report": { "blocked-uri": ... } }
//   report-to   application/reports+json [ { "type": "csp-violation", "body": { "blockedURL": ... } } ]

import { adminDb } from './firebase-admin.js'
import { limitRequest } from './rateLimit.js'

export const CSP_REPORT_PATH = '/api/support?report=csp'

const ACCEPTED_TYPES = ['application/csp-report', 'application/reports+json', 'application/json']
const MAX_BODY_BYTES = 16 * 1024
const MAX_ENTRIES = 10
const MAX_FIELD_CHARS = 200

// A report is sent per blocked resource, and one page can block several, so the
// allowance is per address and per minute rather than per page.
export const CSP_REPORT_LIMIT = Object.freeze({ bucket: 'csp-report', limit: 30, windowMs: 60 * 1000 })

// URLs are logged without their query or fragment (share ids, tokens, search
// text), and everything is cut short: the sender is anonymous.
function clean(value) {
  if (typeof value !== 'string') return ''
  const noQuery = /^[a-z][a-z0-9+.-]*:/i.test(value) ? value.split(/[?#]/)[0] : value
  return noQuery.slice(0, MAX_FIELD_CHARS)
}

function entriesOf(payload) {
  const items = Array.isArray(payload) ? payload : [payload]
  const out = []
  for (const item of items.slice(0, MAX_ENTRIES)) {
    const legacy = item?.['csp-report']
    if (legacy && typeof legacy === 'object') {
      out.push({
        blocked: clean(legacy['blocked-uri']),
        directive: clean(legacy['effective-directive'] || legacy['violated-directive']),
        document: clean(legacy['document-uri']),
      })
    } else if (item?.type === 'csp-violation' && item.body && typeof item.body === 'object') {
      out.push({
        blocked: clean(item.body.blockedURL),
        directive: clean(item.body.effectiveDirective),
        document: clean(item.body.documentURL),
      })
    }
  }
  return out
}

function byteLength(body) {
  if (Buffer.isBuffer(body)) return body.length
  if (typeof body === 'string') return Buffer.byteLength(body)
  try { return Buffer.byteLength(JSON.stringify(body) || '') } catch { return Infinity }
}

function parse(body) {
  if (Buffer.isBuffer(body)) body = body.toString('utf8')
  if (typeof body !== 'string') return body
  try { return JSON.parse(body) } catch { return undefined }
}

export async function handleCspReport(req, res, { getDb = adminDb } = {}) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const type = String(req.headers?.['content-type'] || '').split(';')[0].trim().toLowerCase()
  if (!ACCEPTED_TYPES.includes(type)) return res.status(415).json({ error: 'Unsupported content type' })

  const declared = Number(req.headers?.['content-length'])
  if ((Number.isFinite(declared) && declared > MAX_BODY_BYTES) || byteLength(req.body) > MAX_BODY_BYTES) {
    return res.status(413).json({ error: 'Report too large' })
  }

  if (await limitRequest(req, res, getDb, CSP_REPORT_LIMIT)) return

  const payload = parse(req.body)
  if (payload == null || typeof payload !== 'object') return res.status(400).json({ error: 'Unreadable report' })

  for (const entry of entriesOf(payload)) console.warn('csp-report', entry)
  return res.status(204).end()
}
