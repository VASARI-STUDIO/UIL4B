// What the homepage Discover gallery renders.
//
// This module exists so the section's two load-bearing guarantees are testable
// without a browser:
//
//   1. every card links INWARD, to a real in-product route with the values
//      already loaded — the section used to be twelve outbound links to
//      Dribbble, Awwwards, Behance and Mobbin, which is the opposite of what
//      Discover is for (positioning.md);
//   2. no Pro brand system is handed over through ?c=. The Palette Builder owns
//      that gate (pickBrand there) and the Discover grid already refuses to
//      route around it; this surface must refuse too.
//
// Explicit .js extensions: this module is imported directly by the Node test
// runner, which does not do extensionless resolution. Vite resolves either form.
import { GALLERY_PALETTES, paletteBuilderUrl, paletteCss } from './paletteGallery.js'
import { GALLERY_GRADIENTS, gradientCss, gradientToolUrl } from './gradientGallery.js'
import { BRAND_LIBRARY_PALETTES } from './paletteLibrary.js'

function fromPalette(palette, kind) {
  return {
    key: `${kind}-${palette.id}`,
    kind,
    name: palette.name,
    colors: palette.colors,
    to: paletteBuilderUrl(palette.colors),
    openLabel: 'Open in Palette Builder',
    openHint: `Open ${palette.name} in the Palette Builder`,
    // The artefact's own facts. Never a save count: it would honestly be zero
    // on every card, and a grid of zeros reads as emptiness rather than
    // integrity. A reuse metric arrives with the community build.
    facts: palette.colors.map((hex) => hex.toUpperCase()),
    css: paletteCss(palette),
  }
}

function fromGradient(gradient) {
  const value = gradientCss(gradient.type, gradient.angle, gradient.stops)
  return {
    key: `gradient-${gradient.id}`,
    kind: 'gradient',
    name: gradient.name,
    gradient: value,
    to: gradientToolUrl(gradient),
    openLabel: 'Open in Gradient Generator',
    openHint: `Open ${gradient.name} in the Gradient Generator`,
    // A radial gradient has no meaningful angle, so quoting one would be a
    // number that means nothing.
    facts: gradient.type === 'Radial' ? [gradient.type] : [gradient.type, `${Math.round(gradient.angle)}°`],
    css: `background: ${value};`,
  }
}

export const HOME_CURATED = GALLERY_PALETTES.map((palette) => fromPalette(palette, 'palette'))
export const HOME_GRADIENTS = GALLERY_GRADIENTS.map(fromGradient)
export const HOME_BRANDS = BRAND_LIBRARY_PALETTES
  .filter((brand) => !brand.pro)
  .map((brand) => fromPalette(brand, 'brand'))

// Round-robin rather than concatenate, so the first screen of "All" shows a mix
// of what the product makes rather than sixty-four palettes before a gradient.
function interleave(lists) {
  const out = []
  const longest = Math.max(...lists.map((list) => list.length))
  for (let i = 0; i < longest; i += 1) {
    for (const list of lists) if (list[i]) out.push(list[i])
  }
  return out
}

export const HOME_GALLERY = {
  all: interleave([HOME_CURATED, HOME_GRADIENTS, HOME_BRANDS]),
  palette: HOME_CURATED,
  gradient: HOME_GRADIENTS,
  brand: HOME_BRANDS,
}

// These filter by KIND, which is a real property of the data. They are NOT the
// old Trending / Newest / Most saved ordering: these sources carry no
// popularity or recency signal at all, so those three tabs would have been
// sorting on nothing.
export const HOME_GALLERY_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'palette', label: 'Palettes' },
  { id: 'gradient', label: 'Gradients' },
  { id: 'brand', label: 'Brands' },
]
