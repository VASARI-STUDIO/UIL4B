// RECORD EVERY TOOL EXPORT AT THE ONE PLACE THEY ALL PASS THROUGH.
//
// There is no shared download helper to hook. There are ten call
// sites across seven files — ExportPanel, the converter suite's shared.js, the
// 3D viewer, IconLibrary, PaletteBuilder, ColorStudio, AltTextGenerator, the
// FileConverter — each build an <a download>, click it, and revoke the blob. The
// export gate (hooks/useExportGate.js) runs before each one but is told only a
// reason string, never the file.
//
// What every one of them DOES share is the browser mechanism: an anchor with a
// `download` attribute being clicked, programmatically (`a.click()` on an
// element that is usually never attached, so a document listener never sees it)
// or by a person. So that is where the Recent exports list is fed, and a tool
// added next month is recorded without anyone remembering to add a call — the
// same rule utils/dataExport.js holds for storage keys: enumerate, never list.
//
// SIZE comes from the blob. Callers revoke the object URL straight after the
// click, so the size cannot be fetched afterwards; `URL.createObjectURL` is
// observed to remember each blob's size by its URL for that moment.
//
// Nothing here can break a download: every observation is inside a try, and
// the browser's own click and createObjectURL are always called, unchanged.

import { exportEntry, recordExport, isToolExportPage, RECENT_EXPORTS_EVENT } from './recentExports.js'

const INSTALLED = Symbol.for('uil4b.downloadObserver')
const MAX_SIZES = 50

export function installDownloadObserver(win = typeof window !== 'undefined' ? window : null) {
  if (!win || win[INSTALLED]) return false
  win[INSTALLED] = true

  const sizes = new Map()
  const URLCtor = win.URL
  const origCreate = URLCtor?.createObjectURL?.bind(URLCtor)
  const origRevoke = URLCtor?.revokeObjectURL?.bind(URLCtor)
  if (origCreate) {
    URLCtor.createObjectURL = function observedCreateObjectURL(obj) {
      const url = origCreate(obj)
      try {
        if (obj && Number.isFinite(obj.size)) {
          sizes.set(url, obj.size)
          if (sizes.size > MAX_SIZES) sizes.delete(sizes.keys().next().value)
        }
      } catch { /* sizes are a nicety */ }
      return url
    }
  }
  if (origRevoke) {
    // Keep the size a moment past the revoke: callers revoke right after click,
    // and a trusted click event is dispatched after the call that caused it.
    URLCtor.revokeObjectURL = function observedRevokeObjectURL(url) {
      try { win.setTimeout(() => sizes.delete(url), 5000) } catch { /* ignore */ }
      return origRevoke(url)
    }
  }

  const note = (anchor) => {
    try {
      if (!anchor || !anchor.hasAttribute || !anchor.hasAttribute('download')) return
      const loc = win.location || {}
      if (!isToolExportPage(loc.pathname)) return
      const href = anchor.href || anchor.getAttribute('href') || ''
      let bytes = sizes.has(href) ? sizes.get(href) : null
      if (bytes === null && href.startsWith('data:')) {
        const comma = href.indexOf(',')
        const body = comma >= 0 ? href.slice(comma + 1) : ''
        bytes = /;base64,/.test(href.slice(0, comma + 1)) ? Math.floor(body.length * 3 / 4) : decodeURIComponent(body).length
      }
      const filename = anchor.getAttribute('download') || href.split('/').pop() || 'download'
      const entry = exportEntry({ filename, bytes, pathname: loc.pathname, search: loc.search })
      const list = recordExport(win.localStorage, entry)
      win.dispatchEvent(new win.CustomEvent(RECENT_EXPORTS_EVENT, { detail: { list } }))
    } catch { /* never stand between a person and their file */ }
  }

  const Anchor = win.HTMLAnchorElement
  const origClick = Anchor?.prototype?.click
  if (origClick) {
    Anchor.prototype.click = function observedClick(...args) {
      note(this)
      return origClick.apply(this, args)
    }
  }
  // A person clicking a real <a download> in the page. Programmatic clicks are
  // untrusted events and were already noted above, so they are skipped here.
  win.document?.addEventListener?.('click', (event) => {
    if (!event.isTrusted) return
    const a = event.target?.closest?.('a[download]')
    if (a) note(a)
  }, true)
  return true
}
