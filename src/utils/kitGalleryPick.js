// The export gallery's pick: which design, which file, and the hand-off that
// survives the trip to checkout and back.
//
// Only the files the export pipeline really builds are offered. The book and the
// brand guidelines come from the server as one HTML document (opened for PDF, or
// saved as HTML), and the book is also drawn in the browser as PNG pages; the UI kit is one HTML file. A file type with no builder is
// not listed, so nothing here promises a file the product cannot make.

export const GALLERY_DESIGNS = Object.freeze([
  Object.freeze({ id: 'book', name: 'Design system book', pro: true, shape: 'A4 portrait', formats: ['pdf', 'html', 'png'] }),
  Object.freeze({ id: 'guidelines', name: 'Brand guidelines', pro: true, shape: '16:9 deck', formats: ['pdf', 'html'] }),
  Object.freeze({ id: 'kit', name: 'UI kit', pro: false, shape: 'one HTML page', formats: ['html'] }),
])

export const GALLERY_FORMATS = Object.freeze({
  pdf: Object.freeze({ id: 'pdf', label: 'PDF', blurb: 'Print-ready. Text stays sharp at any size.' }),
  html: Object.freeze({ id: 'html', label: 'HTML', blurb: 'Opens offline in any browser.' }),
  png: Object.freeze({ id: 'png', label: 'PNG pages', blurb: '2K page images in one zip.' }),
})

export const DEFAULT_PICK = Object.freeze({ design: 'book', format: 'pdf' })

// The checkout address a Pro pick goes to. A named exception to "every upgrade
// goes through /plans": the person has just seen their own kit and chosen a Pro
// file, so the trial plan is opened directly.
export const GALLERY_CHECKOUT = '/checkout?plan=yearly&from=kit-gallery'
// The trial button's words; the day count is read from the plan ladder, never typed.
export const trialLabel = (days) => `Continue for ${days}-day free trial`

const designOf = (id) => GALLERY_DESIGNS.find((d) => d.id === id)

/** A pick made safe: an unknown design or a format the design lacks falls back. */
export function normalisePick(pick) {
  const design = designOf(pick?.design) || designOf(DEFAULT_PICK.design)
  const format = design.formats.includes(pick?.format) ? pick.format : design.formats[0]
  return { design: design.id, format }
}

/** Choosing a design keeps the file type when the design offers it. */
export function chooseDesign(pick, id) {
  return normalisePick({ design: id, format: pick?.format })
}

/** A pick is Pro when its design is. */
export const isProPick = (pick) => Boolean(designOf(normalisePick(pick).design)?.pro)

/** "Export HTML" / "Export PDF". */
export const exportLabel = (pick) => `Export ${GALLERY_FORMATS[normalisePick(pick).format].label}`

// ── The hand-off to checkout ────────────────────────────────────────────────
export const PICK_KEY = 'uil4b.kitGalleryPick'
// A pick older than this is not a purchase in progress.
export const PICK_MAX_AGE_MS = 6 * 60 * 60 * 1000

// `uid` is the signed-in account that made the pick: another account on the same browser must not be
// offered a way back into it.
export function storePick(projectId, pick, { storage = globalThis.sessionStorage, now = Date.now(), uid = '' } = {}) {
  try {
    storage.setItem(PICK_KEY, JSON.stringify({ projectId: String(projectId), ...normalisePick(pick), ...(uid ? { uid: String(uid) } : {}), at: now }))
    return true
  } catch { return false }
}

/** The stored pick, or null when absent, malformed or stale. Does not clear it. */
export function readPick({ storage = globalThis.sessionStorage, now = Date.now() } = {}) {
  try {
    const raw = storage.getItem(PICK_KEY)
    if (!raw) return null
    const v = JSON.parse(raw)
    if (!v || typeof v.projectId !== 'string' || !v.projectId) return null
    if (typeof v.at !== 'number' || now - v.at > PICK_MAX_AGE_MS || now < v.at) return null
    return { projectId: v.projectId, ...normalisePick(v), ...(typeof v.uid === 'string' && v.uid ? { uid: v.uid } : {}) }
  } catch { return null }
}

export function clearPick({ storage = globalThis.sessionStorage } = {}) {
  try { storage.removeItem(PICK_KEY) } catch { /* storage blocked */ }
}
