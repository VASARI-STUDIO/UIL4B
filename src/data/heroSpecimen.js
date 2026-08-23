// The two facts the hero's specimen band computes about a palette.
//
// This module exists for the same reason `homeGallery.js` does: the band's
// load-bearing guarantees are DATA guarantees, and they should be provable
// without booting a browser. Three of them:
//
//   1. the grade is `styleGuideExport.js`'s own `grade()`, so the hero can
//      never disagree with a style-guide export a customer downloads;
//   2. the "n of 6 pairs clear AA" count genuinely VARIES across the shipped
//      library — if it ever collapsed to one value the fact would have stopped
//      being evidence and the band would have become decoration;
//   3. the CSS shown is a contiguous slice of `paletteCss()`'s own output, so
//      copying the same palette from the Discover gallery yields text
//      containing exactly those bytes.
//
// Explicit .js extension: imported directly by the Node test runner, which does
// not do extensionless resolution. Vite resolves either form.
import { contrastRatio, hexToRgb, luminance } from '../utils/colors.js'
import { grade } from '../utils/styleGuideExport.js'

const relLuminance = (hex) => {
  const [r, g, b] = hexToRgb(hex)
  return luminance(r, g, b)
}

// The four colours of a palette make six unordered pairs. Both facts come from
// that one list, and nothing else — no random source, no clock, no storage, so
// the prerendered shell and the first client paint agree byte for byte.
export function measurePalette(colors) {
  const pairs = []
  for (let i = 0; i < colors.length; i += 1) {
    for (let j = i + 1; j < colors.length; j += 1) {
      pairs.push({ a: colors[i], b: colors[j], ratio: contrastRatio(colors[i], colors[j]) })
    }
  }
  const best = pairs.reduce((top, p) => (p.ratio > top.ratio ? p : top), pairs[0])
  // Named ink-on-ground: the darker of the best pair is the ink, the lighter is
  // the ground. Ordered by luminance rather than by array position so the line
  // reads the same way round on every entry in the library.
  const dark = relLuminance(best.a) <= relLuminance(best.b)
  return {
    ink: (dark ? best.a : best.b).toUpperCase(),
    ground: (dark ? best.b : best.a).toUpperCase(),
    // Always two decimals. A bare "21:1" is narrower than "12.78:1" and the
    // cell would resize on it, which is how a fixed-height band leaks CLS.
    ratio: best.ratio.toFixed(2),
    // The exporter's own thresholds. NOT a local table — that is the whole
    // point, and tests/unit/hero-specimen.test.js pins it.
    grade: grade(best.ratio),
    // THE LOAD-BEARING FACT. The best-pair ratio alone reads AAA on most of the
    // library, which looks printed rather than computed. This count varies, and
    // that variation is what proves to a sceptical designer that a function ran.
    clear: pairs.filter((p) => p.ratio >= 4.5).length,
    total: pairs.length,
  }
}

// The first two lines of the export after its comment header — the selector and
// the first custom property. A GLIMPSE, deliberately: the export section two
// screens down owns the full panel treatment, and duplicating its chrome here
// would make the two compete instead of one leading to the other.
export const CSS_GLIMPSE_LINES = 2
export function cssGlimpse(css) {
  return css.split('\n').slice(1, 1 + CSS_GLIMPSE_LINES)
}
