// The size a live page is drawn at, and the one reset it is drawn with.
//
// The stock picture of a page has the size the gallery was made at (config/exportPreviewData.js: 840x472 for the slides, whatever
// the theme's shape), but the document the server returns is the theme's own page: a Label guideline is 1000x800, a Standards one
// 1123x794, a Swiss Field one 1920x1080. The frame used to take the picture's size, so the document showed its top-left corner
// behind a pair of scrollbars, and a cover whose colour block fills the corner read as a flat block of teal. The document says its
// own size (`@page{size:Wpx Hpx}`, which every themed page carries so it prints at that size), so the frame reads it from there.
//
// A book is not a page: it is one long scrolling HTML document, and its cover is a fixed height from the top. The 606px the stock
// picture is cut at is shorter than some covers' headlines (the descenders of "bv twelve." sit at 622px in Presentation), so the live
// frame is a taller window onto the same top of the book. The document is never scrolled, so what fits is what shows.

export const BOOK_LIVE = Object.freeze({ w: 1424, h: 800 })

const SIZE = /@page\s*\{[^}]*?size:\s*(\d+(?:\.\d+)?)px\s+(\d+(?:\.\d+)?)px/
const sane = (n) => Number.isFinite(n) && n >= 100 && n <= 8000

/** The size to draw a live page at: the document's own, else the stock page's. `page` is a manifest page ({ kind, w, h }). */
export function liveSize(html, page) {
  if (page?.kind === 'book') return BOOK_LIVE
  const m = SIZE.exec(String(html || ''))
  if (m) {
    const w = Math.round(Number(m[1]))
    const h = Math.round(Number(m[2]))
    if (sane(w) && sane(h)) return { w, h }
  }
  return { w: page.w, h: page.h }
}

// What the frame needs undone. A page document is a screen document too: on screen it is a column with a sunken background, 24px of
// padding above and below and 24px under each page (`body.stack`), and it scrolls. In the stage the whole page is the picture, so
// the padding and the gap go and nothing scrolls. Added last in the head so it wins over the document's own rules.
const RESET = '<style>html,body{overflow:hidden!important}body.stack{padding:0!important;background:none!important}body.stack .pg{margin:0!important}</style>'

/** The document with the stage's reset added to its head (at the front of the body when it has none). */
export function liveHtml(html) {
  const s = String(html || '')
  if (/<\/head>/i.test(s)) return s.replace(/<\/head>/i, `${RESET}</head>`)
  return RESET + s
}
