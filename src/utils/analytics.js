const ANALYTICS_KEY = 'vs-analytics'
const SESSIONS_KEY = 'vs-sessions'
const FEEDBACK_KEY = 'vs-feedback'

function load(key, fallback = []) {
  try { return JSON.parse(localStorage.getItem(key)) || fallback } catch { return fallback }
}

function save(key, data) {
  try { localStorage.setItem(key, JSON.stringify(data)) } catch { /* quota */ }
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
}

// Session tracking (entry page, exit page, duration)
let sessionStart = Date.now()
let sessionPages = []

export function startSession() {
  sessionStart = Date.now()
  sessionPages = [window.location.hash.replace('#', '') || '/']
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

  // Users (from localStorage)
  let users = []
  try {
    const raw = JSON.parse(localStorage.getItem('vs-users') || '{}')
    users = Object.values(raw).map(u => ({
      email: u.email,
      displayName: u.displayName,
      tier: u.tier,
      provider: u.provider || 'email',
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
