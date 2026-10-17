// SERVER-ONLY. What the Palette Library (/discover/palettes) actually browses.
// Nothing under src/ may import this file; see api/_lib/library/serve.js.
//
// Two sources, deliberately NOT merged upstream:
//
//   GALLERY_PALETTES (paletteGallery.js) — the curated, invented colour
//     systems. Also the default set for the Palette Builder's gallery popup.
//   BRAND_PALETTES  (brandPalettes.js)   — publicly documented brand identity
//     colours. Owned by the Palette Builder's "Brands" panel, which reads that
//     module directly and gates loading a brand system behind Pro.
//
// The two shapes differ (brands carry `free` + `system`, curated palettes carry
// neither; brands have five colours, curated have four), so this module MAPS
// brands into the library shape instead of forcing either side to change. The
// Palette Builder keeps importing BRAND_PALETTES exactly as before.
//
// Every library entry:
//   id      unique across BOTH sources — brand ids are namespaced `brand-*` so
//           the localStorage likes key can never collide with a curated id.
//   name    what the card shows.
//   colors  4 (curated) or 5 (brand) hex values, dominant → accent.
//   kind    'curated' | 'brand' — the only thing the UI branches on.
//   pro     brand only. True when the Palette Builder gates loading this brand
//           behind Pro (see pickBrand() there); mirrored, never redefined here.

// Explicit .js extensions: this module is also imported directly by the
// Playwright suite under plain Node ESM, which does not do extensionless
// resolution. Vite resolves either form.
import { GALLERY_PALETTES } from './paletteGallery.js'
import { BRAND_PALETTES } from './brandPalettes.js'

export const CURATED_LIBRARY_PALETTES = GALLERY_PALETTES.map((palette) => ({
  ...palette,
  kind: 'curated',
}))

export const BRAND_LIBRARY_PALETTES = BRAND_PALETTES.map((brand) => ({
  id: `brand-${brand.id}`,
  name: brand.name,
  colors: brand.colors,
  kind: 'brand',
  pro: !brand.free,
  // The colour system the Palette Builder applies when a Pro account loads this
  // brand (pickBrand). Dropped by the library page, needed by the Brands panel.
  system: brand.system,
}))

export const LIBRARY_PALETTES = [...CURATED_LIBRARY_PALETTES, ...BRAND_LIBRARY_PALETTES]
