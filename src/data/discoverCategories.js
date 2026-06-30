// Discover category map — the single source of truth for category colour + icon.
// Card left-rail, category pill, browse tile, and filter-chip dot all read from
// here so the colour/icon system stays consistent. Accents are muted/desaturated
// (NOT neon); per-surface tints are derived at render time with color-mix() in
// global.css from `--dsc-c` (set via [data-cat]). Glyphs are inline SVG paths
// ported from the old ExternalResources page so we ship one icon source.
//
// `key` doubles as the resource `category` value AND the [data-cat] attribute.

// Each glyph is a render function so consumers control size and get a single
// element back (no JSX-in-data ambiguity). All are 24×24, stroke-based, and
// inherit `currentColor`.
function glyph(paths, { fill = false } = {}) {
  return (size = 18) => ({
    viewBox: '0 0 24 24',
    size,
    fill: fill ? 'currentColor' : 'none',
    paths,
  })
}

// Categories in display order. `community` tracks the app accent (var(--accent))
// rather than a fixed hex so it stays on-brand across themes.
export const DISCOVER_CATEGORIES = [
  {
    key: 'gradients',
    label: 'Gradients',
    color: '#8b5cf6',
    glyph: glyph([
      { d: 'M3 3h18v18H3z' },
      { d: 'M3 12l18-9' },
      { d: 'M3 21l18-9' },
    ]),
  },
  {
    key: 'palettes',
    label: 'Palettes',
    color: '#ec4899',
    glyph: glyph([
      { d: 'M12 2a10 10 0 0 0 0 20 2 2 0 0 0 2-2 2 2 0 0 1 2-2h2a4 4 0 0 0 4-4 10 10 0 0 0-10-10z' },
      { circle: [6.5, 11.5, 1] },
      { circle: [9.5, 7.5, 1] },
      { circle: [14.5, 7.5, 1] },
      { circle: [17.5, 11.5, 1] },
    ]),
  },
  {
    key: 'inspiration',
    label: 'Inspiration',
    color: '#3b82f6',
    glyph: glyph([
      { d: 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z' },
      { circle: [12, 12, 3] },
    ]),
  },
  {
    key: 'dev-tools',
    label: 'Dev tools',
    color: '#10b981',
    glyph: glyph([
      { d: 'M16 18l6-6-6-6' },
      { d: 'M8 6l-6 6 6 6' },
    ]),
  },
  {
    key: 'free-assets',
    label: 'Free assets',
    color: '#f59e0b',
    glyph: glyph([
      { d: 'M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z' },
      { circle: [12, 13, 4] },
    ]),
  },
  {
    key: 'fonts',
    label: 'Fonts',
    color: '#06b6d4',
    glyph: glyph([
      { points: '4 7 4 4 20 4 20 7' },
      { d: 'M9 20h6' },
      { d: 'M12 4v16' },
    ]),
  },
  {
    key: 'components',
    label: 'Components',
    color: '#f43f5e',
    glyph: glyph([
      { d: 'M4 4h7v7H4z' },
      { d: 'M13 4h7v7h-7z' },
      { d: 'M4 13h7v7H4z' },
      { d: 'M13 13h7v7h-7z' },
    ]),
  },
  {
    key: 'community',
    label: 'Community',
    color: 'var(--accent)',
    glyph: glyph([
      { d: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2' },
      { circle: [9, 7, 4] },
      { d: 'M23 21v-2a4 4 0 0 0-3-3.87' },
      { d: 'M16 3.13a4 4 0 0 1 0 7.75' },
    ]),
  },
]

// Fast lookup by key.
export const CATEGORY_MAP = Object.fromEntries(DISCOVER_CATEGORIES.map(c => [c.key, c]))

// The filter-chip / browse-tile order (excludes community for 2a — community
// resources are a Slice 2b surface). "All" is handled by the consumer.
export const FILTER_CATEGORIES = DISCOVER_CATEGORIES.filter(c => c.key !== 'community')

export function categoryLabel(key) {
  return CATEGORY_MAP[key]?.label || key
}
export function categoryColor(key) {
  return CATEGORY_MAP[key]?.color || 'var(--accent)'
}
