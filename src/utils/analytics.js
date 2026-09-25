import { firebaseNow, firestoreNow, loadFirestore } from './firebaseAccess'
import { canWriteSharedAnalytics } from './environment'
import { startTtvClock, takeTimeToValue } from './timeToValue'
import { EVENTS, sendEvent, sendOnce } from './productEvents'
// The Firestore SDK now arrives through the access broker rather than as a
// static import, so a deferred build can keep it out of the first request
// wave. Analytics is the easiest consumer to move: every shared write is
// already gated on `auth.currentUser` and already fire-and-forget, so a
// namespace that is not there yet is the case it was written for.
// See src/utils/firebaseAccess.js.

const ANALYTICS_KEY = 'vs-analytics'
const SESSIONS_KEY = 'vs-sessions'
const FEEDBACK_KEY = 'vs-feedback'

function load(key, fallback = []) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key))
    if (parsed === null || parsed === undefined) return fallback
    // A stored value of the WRONG SHAPE is more dangerous than a missing one.
    // `|| fallback` only catches null/undefined, so a valid-JSON object where an
    // array was expected passed straight through and then threw
    // "push is not a function" on the next trackPageView — i.e. a white screen
    // on EVERY page load until the user cleared their storage, with no way for
    // them to know why. Reachable by a stale schema, a synced value from an
    // older build, or someone hand-restoring their own data export.
    if (Array.isArray(fallback) !== Array.isArray(parsed)) return fallback
    if (typeof parsed !== typeof fallback) return fallback
    return parsed
  } catch { return fallback }
}

function save(key, data) {
  try { localStorage.setItem(key, JSON.stringify(data)) } catch { /* quota */ }
}

// ── Server-side aggregate analytics (Firestore) ─────────────
// ADDITIVE: clients increment per-day counters in `analytics-daily/{YYYY-MM-DD}`
// so the admin dashboard can reflect ALL signed-in users' usage, not just the
// admin's own browser. The localStorage tracking above remains the fallback and
// is never removed. Writes are auth-only (Firestore rules require auth) and are
// fully wrapped in try/catch so they never break the UI when offline or blocked.

const AGGREGATE_COLLECTION = 'analytics-daily'

// YYYY-MM-DD in the visitor's local time. Used as the per-day document id.
function todayStr() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// Turn an arbitrary path / id into a safe Firestore field-name fragment.
// Firestore field paths can't contain '/', '.', '~', '*', '[', or ']', so we
// collapse them to '_'. We also strip query strings / hashes (dynamic bits).
function sanitizeKey(raw) {
  if (!raw) return 'unknown'
  let s = String(raw).split('?')[0].split('#')[0]
  s = s.replace(/[/.~*[\]]+/g, '_') // illegal field-path chars → underscore
  s = s.replace(/_{2,}/g, '_').replace(/^_+|_+$/g, '') // tidy duplicates/edges
  return s || 'root'
}

// In-memory accumulator of pending increments, flushed on a debounce. Keyed by
// Firestore field name → integer count. We coalesce many rapid events into one
// write to stay well within Firestore's per-document write limits.
let pendingIncrements = {}
let flushTimer = null
let unloadHookAttached = false

function attachUnloadFlush() {
  if (unloadHookAttached || typeof window === 'undefined') return
  unloadHookAttached = true
  // Best-effort final flush when the tab closes / navigates away.
  window.addEventListener('beforeunload', () => { flushAggregate() })
}

function bumpAggregate(field, n = 1) {
  try {
    // Only attempt server writes for signed-in users — rules are auth-only.
    if (!firebaseNow()?.auth?.currentUser) return
    const key = sanitizeKey(field)
    pendingIncrements[key] = (pendingIncrements[key] || 0) + n
    attachUnloadFlush()
    if (flushTimer) return
    flushTimer = setTimeout(() => { flushTimer = null; flushAggregate() }, 5000)
  } catch { /* never let analytics break the app */ }
}

function flushAggregate() {
  try {
    if (flushTimer) { clearTimeout(flushTimer); flushTimer = null }
    // P-001: dev, preview and CI traffic must never reach the shared counters.
    // Guarded HERE, at the one choke point every shared write passes through,
    // so a counter added later cannot forget to opt in. Pending increments are
    // dropped rather than queued — they are not production data, and holding
    // them would just write them the moment someone opened the real site.
    if (!canWriteSharedAnalytics()) { pendingIncrements = {}; return }
    if (!firebaseNow()?.auth?.currentUser) { pendingIncrements = {}; return }
    const fields = pendingIncrements
    pendingIncrements = {}
    const keys = Object.keys(fields)
    if (!keys.length) return
    const day = todayStr()
    // merge:true so concurrent writers from different users all accumulate.
    // Fire-and-forget; swallow rejection so an offline/denied write is silent.
    //
    // Synchronous when the SDK is already here, which is every call after the
    // first: the guard above has just proved someone is signed in, so auth has
    // resolved and the chunk has landed. The promise path only runs when this
    // is the first Firestore touch of the session.
    const write = (fs) => {
      if (!fs) return
      const payload = { day }
      for (const k of keys) payload[k] = fs.increment(fields[k])
      fs.setDoc(fs.doc(fs.db, AGGREGATE_COLLECTION, day), payload, { merge: true }).catch(() => {})
    }
    const ready = firestoreNow()
    if (ready) write(ready)
    else loadFirestore().then(write).catch(() => {})
  } catch { /* offline / rules / SDK error — fall back to localStorage only */ }
}

// Record a page view into the daily aggregate doc (total + per-path counter).
function recordAggregateView(path) {
  bumpAggregate('views', 1)
  bumpAggregate(`view__${sanitizeKey(path)}`, 1)
}

// Record a tool action into the daily aggregate doc (per-tool counter).
function recordAggregateTool(id) {
  bumpAggregate(`tool__${sanitizeKey(id)}`, 1)
}

// Read the last `days` daily docs and sum them into a dashboard-friendly shape.
// Returns a safe empty shape on any failure (offline, rules, no docs yet).
export async function getAggregateAnalytics(days = 30) {
  const empty = { totalViews: 0, byPath: [], byTool: [], byIcon: [], byPack: [], iconCopies: 0, days: [] }
  try {
    const fs = await loadFirestore()
    const q = fs.query(fs.collection(fs.db, AGGREGATE_COLLECTION), fs.orderBy('day', 'desc'), fs.limit(days))
    const snap = await fs.getDocs(q)
    let totalViews = 0
    let iconCopies = 0
    const pathCounts = {}
    const toolCounts = {}
    const iconCounts = {}
    const packCounts = {}
    const dayViews = []
    snap.docs.forEach(docSnap => {
      const data = docSnap.data() || {}
      const dayId = data.day || docSnap.id
      let viewsForDay = 0
      for (const [field, value] of Object.entries(data)) {
        if (field === 'day') continue
        const count = typeof value === 'number' ? value : 0
        if (field === 'views') { totalViews += count; viewsForDay = count }
        else if (field === 'icon-copies') iconCopies += count
        else if (field.startsWith('view__')) pathCounts[field.slice(6)] = (pathCounts[field.slice(6)] || 0) + count
        else if (field.startsWith('tool__')) toolCounts[field.slice(6)] = (toolCounts[field.slice(6)] || 0) + count
        else if (field.startsWith('icon__')) iconCounts[field.slice(6)] = (iconCounts[field.slice(6)] || 0) + count
        else if (field.startsWith('ipack__')) packCounts[field.slice(7)] = (packCounts[field.slice(7)] || 0) + count
      }
      dayViews.push({ day: dayId, views: viewsForDay })
    })
    const byPath = Object.entries(pathCounts).sort((a, b) => b[1] - a[1])
    const byTool = Object.entries(toolCounts).sort((a, b) => b[1] - a[1])
    const byIcon = Object.entries(iconCounts).sort((a, b) => b[1] - a[1])
    const byPack = Object.entries(packCounts).sort((a, b) => b[1] - a[1])
    // docs came back newest-first; present the timeline oldest→newest.
    const daysAsc = dayViews.reverse()
    return { totalViews, byPath, byTool, byIcon, byPack, iconCopies, days: daysAsc }
  } catch {
    return empty
  }
}

// Page view tracking
export function trackPageView(path) {
  const views = load(ANALYTICS_KEY, [])
  views.push({
    path,
    timestamp: Date.now(),
    referrer: document.referrer || null,
  })
  // Keep last 2000 events to avoid quota issues
  if (views.length > 2000) views.splice(0, views.length - 2000)
  save(ANALYTICS_KEY, views)
  // Additive: also feed the cross-user Firestore aggregate (auth-only, safe).
  recordAggregateView(path)
}

// Session tracking (entry page, exit page, duration)
let sessionStart = Date.now()
let sessionPages = []

export function startSession() {
  sessionStart = Date.now()
  sessionPages = [window.location.pathname || '/']
}

export function trackSessionPage(path) {
  sessionPages.push(path)
}

export function endSession() {
  const sessions = load(SESSIONS_KEY, [])
  sessions.push({
    start: sessionStart,
    duration: Date.now() - sessionStart,
    entryPage: sessionPages[0] || '/',
    exitPage: sessionPages[sessionPages.length - 1] || '/',
    pages: sessionPages.length,
    pageList: [...sessionPages],
    timestamp: Date.now(),
  })
  if (sessions.length > 500) sessions.splice(0, sessions.length - 500)
  save(SESSIONS_KEY, sessions)
}

export function initAnalytics() {
  startSession()
  window.addEventListener('beforeunload', endSession)
  return () => window.removeEventListener('beforeunload', endSession)
}

// Feedback storage
export function saveFeedback(entry) {
  const feedback = load(FEEDBACK_KEY, [])
  feedback.push({
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    ...entry,
    status: 'new',
    adminNotes: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })
  save(FEEDBACK_KEY, feedback)
}

export function getFeedback() {
  return load(FEEDBACK_KEY, [])
}

export function updateFeedbackStatus(id, status) {
  const feedback = load(FEEDBACK_KEY, [])
  const item = feedback.find(f => f.id === id)
  if (item) {
    item.status = status
    item.updatedAt = new Date().toISOString()
    save(FEEDBACK_KEY, feedback)
  }
  return feedback
}

export function updateFeedbackNotes(id, notes) {
  const feedback = load(FEEDBACK_KEY, [])
  const item = feedback.find(f => f.id === id)
  if (item) {
    item.adminNotes = notes
    item.updatedAt = new Date().toISOString()
    save(FEEDBACK_KEY, feedback)
  }
  return feedback
}

export function deleteFeedback(id) {
  let feedback = load(FEEDBACK_KEY, [])
  feedback = feedback.filter(f => f.id !== id)
  save(FEEDBACK_KEY, feedback)
  return feedback
}

// Design analytics tracking
const DESIGN_ANALYTICS_KEY = 'vs-design-analytics'

function loadDesignAnalytics() {
  const empty = () => ({ fontCopies: {}, colourPicks: {}, toolUsage: {} })
  try {
    const parsed = JSON.parse(localStorage.getItem(DESIGN_ANALYTICS_KEY))
    // Same shape guard as load(): an array or a primitive here would survive
    // `|| fallback` and then fail on the first property write.
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return empty()
    return { ...empty(), ...parsed }
  } catch { return empty() }
}

function saveDesignAnalytics(data) {
  try { localStorage.setItem(DESIGN_ANALYTICS_KEY, JSON.stringify(data)) } catch { /* quota */ }
}

export function trackFontCopy(fontFamily) {
  if (!fontFamily) return
  const data = loadDesignAnalytics()
  data.fontCopies[fontFamily] = (data.fontCopies[fontFamily] || 0) + 1
  saveDesignAnalytics(data)
  // Additive: also feed the cross-user Firestore aggregate as a tool action.
  recordAggregateTool('font-copy')
}

export function trackColourPick(hex) {
  if (!hex) return
  const normalised = hex.toUpperCase().replace(/[^#0-9A-F]/g, '')
  if (!normalised) return
  const data = loadDesignAnalytics()
  data.colourPicks[normalised] = (data.colourPicks[normalised] || 0) + 1
  saveDesignAnalytics(data)
  // Additive: also feed the cross-user Firestore aggregate as a tool action.
  recordAggregateTool('colour-pick')
}

// ── P-001: the two events that make the funnel answerable ───────────────────
// Both are APPROVED in docs/PROPOSALS.md - local-only since 2026-09-16 and not
// in this repository, per .gitignore. Until they existed there was no way
// to answer "did this user build something?", "what did they do before
// upgrading?" or "where do people stop?" — which is why nearly every other
// proposal in that file is 'inferred' rather than 'measured'.

/**
 * The canonical upgrade gate. ONE event with a gate id, not sixteen.
 *
 * openProModal has 16 call sites; instrumenting each would guarantee the next
 * gate is added without one, and the count would quietly under-report forever.
 * This is called once, inside ProModalContext, so a new gate is measured by
 * existing.
 */
export function trackUpgradeGate(gateId) {
  const id = String(gateId || 'unknown').slice(0, 48)
  const data = loadDesignAnalytics()
  data.toolUsage[`gate:${id}`] = (data.toolUsage[`gate:${id}`] || 0) + 1
  saveDesignAnalytics(data)
  recordAggregateTool(`gate__${id}`)
  // The Firestore counter above only runs for a signed-in account; this one
  // counts every visitor who meets a gate (utils/productEvents.js).
  sendEvent(EVENTS.upgradeGateShown, { gate: id })
}

/**
 * ACTIVATION — "completed a real piece of work", which the proposal defines as
 * saving or exporting a palette, gradient or type scale.
 *
 * Deliberately NOT "opened a tool" or "moved a slider". Those measure traffic
 * and fidgeting; this measures the first moment the product was actually
 * useful to someone, which is the only number that says whether any of this
 * works. Kept separate from trackToolAction so ordinary usage can never
 * inflate it.
 */
export function trackActivation(toolId, kind = 'save') {
  const id = String(toolId || 'unknown').slice(0, 48)
  const k = kind === 'export' ? 'export' : 'save'
  const data = loadDesignAnalytics()
  data.toolUsage[`activation:${id}:${k}`] = (data.toolUsage[`activation:${id}:${k}`] || 0) + 1

  // TIME TO FIRST VALUE, folded into the SAME load/save as the activation it
  // belongs to. Two loadDesignAnalytics()/saveDesignAnalytics() pairs around
  // one event would make the second read stale data and drop the first write.
  //
  // takeTimeToValue is one-shot: it clears the clock, so this block does
  // nothing on the second and every later activation. That is the point — the
  // number is "how long until this person first got somewhere", not "how often
  // do already-activated people save things".
  let ttv = null
  try { ttv = takeTimeToValue(Date.now()) } catch { /* never break an activation */ }
  if (ttv) {
    data.toolUsage[`ttv:${ttv.bucket}`] = (data.toolUsage[`ttv:${ttv.bucket}`] || 0) + 1
    data.toolUsage[`ttv:${ttv.bucket}:${id}`] = (data.toolUsage[`ttv:${ttv.bucket}:${id}`] || 0) + 1
  }

  saveDesignAnalytics(data)
  recordAggregateTool(`activation__${id}__${k}`)
  // First copy or export of a result, once per browser and for signed-out
  // visitors too. A project save is not an export, so it is not counted here.
  if (k === 'export') sendOnce(EVENTS.firstCopyExport, { tool: id })
  if (ttv) {
    // Two counters, not one. The bare bucket is the headline distribution; the
    // per-tool bucket says WHICH first win the time was spent reaching, which
    // is the only way to tell a slow starting point from a slow product.
    recordAggregateTool(`ttv__${ttv.bucket}`)
    recordAggregateTool(`ttv__${ttv.bucket}__${id}`)
  }
}

/**
 * Start the time-to-value clock. Called once, when the first-win screen is
 * answered — see utils/timeToValue.js for why it is a clock rather than an
 * event, and why the reading is bucketed.
 */
export function startTimeToValue() {
  try { startTtvClock(Date.now()) } catch { /* metrics never block onboarding */ }
}

/**
 * WHICH starting point a new account chose on the first-win screen, including
 * 'skipped'.
 *
 * Paired with the ttv__ and activation__ counters this makes the one question
 * the onboarding flow exists to answer answerable: of the people who chose a
 * palette, how many saved one, and how long did it take? Before this there was
 * no way to tell a starting point nobody picks from one everybody picks and
 * nobody finishes.
 *
 * Separate from trackActivation on purpose. Choosing a card is a statement of
 * intent, not a piece of completed work, and folding it into the activation
 * number would make the metric say the flow worked because someone clicked.
 */
export function trackFirstWinChoice(winId) {
  const id = String(winId || 'unknown').slice(0, 48)
  const data = loadDesignAnalytics()
  data.toolUsage[`firstwin:${id}`] = (data.toolUsage[`firstwin:${id}`] || 0) + 1
  saveDesignAnalytics(data)
  recordAggregateTool(`firstwin__${id}`)
}

export function trackToolAction(toolId) {
  if (!toolId) return
  const data = loadDesignAnalytics()
  data.toolUsage[toolId] = (data.toolUsage[toolId] || 0) + 1
  saveDesignAnalytics(data)
  // Additive: also feed the cross-user Firestore aggregate.
  recordAggregateTool(toolId)
}

// Icon copies — most-copied icons and packs. Locally in the design-analytics
// blob; cross-user via per-icon / per-pack fields on the daily aggregate doc.
export function trackIconCopy(pack, name) {
  if (!name) return
  const data = loadDesignAnalytics()
  if (!data.iconCopies) data.iconCopies = {}
  if (!data.packCopies) data.packCopies = {}
  const iconKey = pack ? `${pack}:${name}` : name
  data.iconCopies[iconKey] = (data.iconCopies[iconKey] || 0) + 1
  if (pack) data.packCopies[pack] = (data.packCopies[pack] || 0) + 1
  saveDesignAnalytics(data)
  bumpAggregate('icon-copies', 1)
  bumpAggregate(`icon__${sanitizeKey(iconKey)}`, 1)
  if (pack) bumpAggregate(`ipack__${sanitizeKey(pack)}`, 1)
}

export function getDesignAnalytics() {
  return loadDesignAnalytics()
}

// ── Admin resets ─────────────────────────────────────────────
// Founder-invoked from the Admin dashboard. Clearing this browser's blobs is
// instant; the Firestore aggregate is scrubbed field-by-field (merge writes
// with deleteField) so tool counters survive a page-analytics reset.

export function resetColourPicks() {
  const data = loadDesignAnalytics()
  data.colourPicks = {}
  saveDesignAnalytics(data)
}

export async function resetPageAnalytics() {
  // Local layer: drop raw views + sessions (this browser).
  try { localStorage.removeItem(ANALYTICS_KEY) } catch { /* ignore */ }
  try { localStorage.removeItem(SESSIONS_KEY) } catch { /* ignore */ }
  // Aggregate layer: remove `views` + every `view__<path>` field from each
  // daily doc — retired routes vanish from the dashboard for every admin.
  try {
    const fs = await loadFirestore()
    const q = fs.query(fs.collection(fs.db, AGGREGATE_COLLECTION), fs.orderBy('day', 'desc'), fs.limit(400))
    const snap = await fs.getDocs(q)
    await Promise.all(snap.docs.map(docSnap => {
      const data = docSnap.data() || {}
      const payload = {}
      for (const field of Object.keys(data)) {
        if (field === 'views' || field.startsWith('view__')) payload[field] = fs.deleteField()
      }
      if (!Object.keys(payload).length) return null
      return fs.setDoc(fs.doc(fs.db, AGGREGATE_COLLECTION, docSnap.id), payload, { merge: true }).catch(() => {})
    }))
    return true
  } catch {
    return false
  }
}

// Analytics data retrieval
export function getPageViews() {
  return load(ANALYTICS_KEY, [])
}

export function getSessions() {
  return load(SESSIONS_KEY, [])
}

export function getAnalyticsSummary() {
  const views = getPageViews()
  const sessions = getSessions()
  const now = Date.now()
  const day = 24 * 60 * 60 * 1000
  const week = 7 * day

  const viewsToday = views.filter(v => now - v.timestamp < day)
  const viewsWeek = views.filter(v => now - v.timestamp < week)
  const sessionsToday = sessions.filter(s => now - s.timestamp < day)
  const sessionsWeek = sessions.filter(s => now - s.timestamp < week)

  // Page popularity
  const pageCounts = {}
  views.forEach(v => { pageCounts[v.path] = (pageCounts[v.path] || 0) + 1 })
  const topPages = Object.entries(pageCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)

  // Bounce rate: sessions with only 1 page viewed
  const bounceCount = sessions.filter(s => s.pages <= 1).length
  const bounceRate = sessions.length > 0 ? Math.round((bounceCount / sessions.length) * 100) : 0

  // Average session duration
  const avgDuration = sessions.length > 0
    ? Math.round(sessions.reduce((sum, s) => sum + s.duration, 0) / sessions.length / 1000)
    : 0

  // Exit pages (last page before leaving)
  const exitCounts = {}
  sessions.forEach(s => { exitCounts[s.exitPage] = (exitCounts[s.exitPage] || 0) + 1 })
  const topExitPages = Object.entries(exitCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)

  // Entry pages
  const entryCounts = {}
  sessions.forEach(s => { entryCounts[s.entryPage] = (entryCounts[s.entryPage] || 0) + 1 })
  const topEntryPages = Object.entries(entryCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)

  // Bounce rate per page
  const pageBounce = {}
  const pageEntries = {}
  sessions.forEach(s => {
    pageEntries[s.entryPage] = (pageEntries[s.entryPage] || 0) + 1
    if (s.pages <= 1) pageBounce[s.entryPage] = (pageBounce[s.entryPage] || 0) + 1
  })
  const bounceByPage = Object.entries(pageEntries)
    .map(([page, total]) => ({
      page,
      total,
      bounces: pageBounce[page] || 0,
      rate: Math.round(((pageBounce[page] || 0) / total) * 100),
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10)

  // Users (from local profile cache — Firebase Auth manages actual accounts)
  let users = []
  try {
    const raw = JSON.parse(localStorage.getItem('vs-profile-cache') || '{}')
    users = Object.entries(raw).map(([uid, u]) => ({
      uid,
      email: u.email,
      displayName: u.displayName,
      provider: u.photoURL ? 'google' : 'email',
      createdAt: u.createdAt,
    }))
  } catch { /* ignore */ }

  return {
    totalViews: views.length,
    viewsToday: viewsToday.length,
    viewsWeek: viewsWeek.length,
    totalSessions: sessions.length,
    sessionsToday: sessionsToday.length,
    sessionsWeek: sessionsWeek.length,
    bounceRate,
    avgDuration,
    topPages,
    topExitPages,
    topEntryPages,
    bounceByPage,
    users,
  }
}
