// Which stock pages the stage and the gallery show for a file, and how a page's picture is addressed. The manifest
// (config/exportPreviews.js) is the one place that knows where a picture lives; this file only picks pages out of it
// and decides, for a viewer, which address may reach the page.

import { previewPages } from '../../config/exportPreviews'
import { themeStandinSrc } from '../../utils/lockedStandin'

// The pages of each document, in the order they are shown.
const KIND_PAGES = Object.freeze({
  kit: ['kitScreen', 'kitButtons'],
  guidelines: ['guideCover', 'guidePalette'],
  book: ['book'],
})

/** The stock pages of one document (kit | guidelines | book) in a theme, in order. [] when the theme has none. */
export function pagesOf(themeId, kind) {
  const all = previewPages(themeId) || []
  return (KIND_PAGES[kind] || []).map((id) => all.find((p) => p.id === id)).filter(Boolean)
}

/** The srcset of a page: its 1x and 2x pictures, or undefined when there is no 2x to offer. */
export const pageSrcSet = (page) => (page.src2x ? `${page.src1x} 1x, ${page.src2x} 2x` : undefined)

/**
 * The picture a page draws for a viewer: its own, or the tiny stand-in when the viewer cannot export it. A stand-in carries no
 * srcset, and a page with no stand-in has no picture at all (src ''), so the real address is never handed to a viewer who has not earned it.
 */
export function pageImage(page, standin) {
  if (standin) return { src: themeStandinSrc(page.src1x), srcSet: undefined }
  return { src: page.src1x, srcSet: pageSrcSet(page) }
}

/** The alt text of a page picture. */
export const pageAlt = (theme, page) => `${theme.name} theme, ${page.label} page, shown with the ${theme.brand} sample brand`
