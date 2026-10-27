// The design, read the way every export document reads it.
//
// readBook() turns a saved design (many tool versions, a localStorage round trip,
// possibly half written) into the normalised object the documents draw from.
// It lives apart from the book generator on purpose: the UI kit and the token
// files in the browser read the design this way too, and they must not pull the
// Pro book generator into the client bundle to do it. The book itself is built on
// the server (api/_lib/exportDocument.js), so nothing in src/ outside the
// generators may import utils/designSystemBook.js or utils/brandGuidelines.js;
// tests/unit/export-document.test.js walks the import graph to hold that.
//
// Pure: no React, no DOM.

import { readDesign } from './styleGuideExport.js'

const isHex = (v) => typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v)

/**
 * Everything the book needs, normalised. Built ON TOP of readDesign() so the
 * palette/type reading is shared with the style guide, then extended with the
 * fields a book uses and the guide does not: the colour system that produced
 * the palette, the letter-spacing, and the gradient.
 *
 * Every field is treated as untrusted. A half-written design produces a shorter
 * book, never a broken one, and never a page of "undefined".
 */
export function readBook(design) {
  const base = readDesign(design)
  const harmony = typeof design?.palette?.harmony === 'string' ? design.palette.harmony : 'auto'
  const ts = design?.typeScale || {}

  // Gradient stops resolve against the palette exactly as GradientGenerator
  // does (a null stop colour means "the palette colour in this slot"). If they
  // cannot resolve to two distinct colours the book simply has no gradient
  // page — it does not invent one.
  const rawStops = Array.isArray(design?.gradient?.stops) ? design.gradient.stops : []
  const stops = rawStops
    .map((s, i) => ({
      color: isHex(s?.color) ? s.color.toUpperCase() : (base.palette[i] || null),
      position: Number.isFinite(Number(s?.position)) ? Math.round(Number(s.position)) : null,
    }))
    .filter(s => s.color && s.position !== null)
    .sort((a, b) => a.position - b.position)
  const hasGradient = stops.length >= 2 && new Set(stops.map(s => s.color)).size >= 2

  return {
    ...base,
    harmony,
    headingSpacing: Number(ts.headingSpacing) || 0,
    bodySpacing: Number(ts.bodySpacing) || 0,
    gradient: hasGradient
      ? {
        stops,
        angle: Number.isFinite(Number(design?.gradient?.angle)) ? Math.round(Number(design.gradient.angle)) : 135,
        type: typeof design?.gradient?.type === 'string' ? design.gradient.type : 'Linear',
      }
      : null,
  }
}
