// RECENT EXPORTS — per person, synced to the account (
// "Build the mockup features for real: a 'Recent exports' list (per user,
// synced to the account)").
//
// The design's Spectrum file draws the list as rows of TYPE · NAME · SIZE ·
// WHEN ("CSS · cobalt-marketing-tokens.css · 4.1 KB · 2H AGO"). Each entry here
// carries exactly what those rows need plus the two facts the brief asked for:
// which tool made it and which project, when the page knows one.
//
// Stored under `vs-recent-exports`, which utils/accountSync.js lists as an
// account key: a recency list, capped, merged local-first on a first sign-in.
// DOM-free; the recording itself is done by utils/downloadObserver.js.

import { resolveTool, routeLabel } from '../data/toolTree.js'

export const RECENT_EXPORTS_KEY = 'vs-recent-exports'
export const RECENT_EXPORTS_CAP = 20
export const RECENT_EXPORTS_EVENT = 'vs-recent-exports-changed'

// Pages whose downloads are not tool exports: the person's own data export
// (Settings) and the admin CSVs. Recording "uil4b-export-2026-09-24.json" in a
// list of work would be noise at best.
const NOT_TOOL_EXPORTS = ['/settings', '/admin']

export function isToolExportPage(pathname = '') {
  const path = String(pathname || '/').toLowerCase()
  return !NOT_TOOL_EXPORTS.some((p) => path === p || path.startsWith(`${p}/`))
}

/** "palette.tokens.json" → "JSON". No extension → "FILE". */
export function formatOf(filename = '') {
  const m = /\.([a-z0-9]{1,8})$/i.exec(String(filename).trim())
  return m ? m[1].toUpperCase() : 'FILE'
}

/** The tool a pathname belongs to: { id, label }. */
export function toolForPath(pathname = '') {
  const path = String(pathname || '/').split(/[?#]/)[0]
  const resolved = resolveTool(path)
  if (resolved?.tool) return { id: resolved.tool.id, label: resolved.tool.label }
  const label = routeLabel(path)
  const last = path.replace(/\/+$/, '').split('/').filter(Boolean).pop() || 'home'
  if (label) return { id: last, label }
  const pretty = last.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  return { id: last, label: pretty }
}

/**
 * The project an export belongs to, when the page says. A project page is
 * `/projects/<id>`; a tool opened for a project carries `?project=<id>`.
 * Otherwise null — a Create tool works on the live working design, which is not
 * tied to a saved project (there is no "active project" in ProjectContext).
 */
export function projectIdFrom(pathname = '', search = '') {
  const m = /^\/projects\/([^/?#]+)/.exec(String(pathname || ''))
  if (m) return decodeURIComponent(m[1])
  try {
    const id = new URLSearchParams(search || '').get('project')
    return id || null
  } catch { return null }
}

export function exportEntry({ filename, bytes = null, pathname = '/', search = '', now = Date.now(), rand = Math.random }) {
  const tool = toolForPath(pathname)
  const name = String(filename || '').trim() || 'download'
  return {
    id: `${now.toString(36)}-${rand().toString(36).slice(2, 7)}`,
    tool: tool.id,
    toolLabel: tool.label,
    format: formatOf(name),
    filename: name,
    bytes: Number.isFinite(bytes) && bytes >= 0 ? bytes : null,
    at: now,
    projectId: projectIdFrom(pathname, search),
  }
}

export function addExport(list, entry, cap = RECENT_EXPORTS_CAP) {
  const prev = Array.isArray(list) ? list.filter((e) => e && e.id !== entry.id) : []
  return [entry, ...prev].slice(0, cap)
}

export function readRecentExports(storage) {
  try {
    const parsed = JSON.parse(storage?.getItem(RECENT_EXPORTS_KEY) || '[]')
    return Array.isArray(parsed) ? parsed.filter((e) => e && typeof e.filename === 'string') : []
  } catch { return [] }
}

export function recordExport(storage, entry) {
  const next = addExport(readRecentExports(storage), entry)
  try { storage?.setItem(RECENT_EXPORTS_KEY, JSON.stringify(next)) } catch { return readRecentExports(storage) }
  return next
}

// ── Display helpers, for the rows the design draws ───────────────────────────

/** 4200 → "4.1 KB", 186000 → "182 KB", 2_400_000 → "2.3 MB". Null stays null. */
export function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return null
  if (bytes < 1024) return `${bytes} B`
  const kb = bytes / 1024
  if (kb < 1024) return `${kb < 10 ? kb.toFixed(1) : Math.round(kb)} KB`
  const mb = kb / 1024
  return `${mb < 10 ? mb.toFixed(1) : Math.round(mb)} MB`
}

/** "JUST NOW", "5M AGO", "2H AGO", "YESTERDAY", "3 DAYS AGO", else a date. */
export function formatWhen(at, now = Date.now()) {
  if (!Number.isFinite(at)) return ''
  const s = Math.max(0, Math.round((now - at) / 1000))
  if (s < 60) return 'JUST NOW'
  const m = Math.round(s / 60)
  if (m < 60) return `${m}M AGO`
  const h = Math.round(m / 60)
  if (h < 24) return `${h}H AGO`
  const d = Math.floor(h / 24)
  if (d === 1) return 'YESTERDAY'
  if (d < 7) return `${d} DAYS AGO`
  try {
    return new Date(at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }).toUpperCase()
  } catch { return '' }
}
