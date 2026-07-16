// Curated colour-palette gallery — the colorhunt-style browse set rendered by
// PaletteGalleryGrid (Discover's palettes view + the Palette Builder's gallery
// popup). Static and local: nothing here is ever fetched, so there is no SSRF
// surface and the gallery works offline.
//
// Each palette: a stable id (likes key in localStorage), a human name, and
// 4 hex colours ordered dominant → accent (the grid renders the first colour
// as the tall hero stripe, colorhunt-style).

export const GALLERY_PALETTES = [
  { id: 'midnight-teal', name: 'Midnight Teal', colors: ['#222831', '#393E46', '#00ADB5', '#EEEEEE'] },
  { id: 'terracotta-dusk', name: 'Terracotta Dusk', colors: ['#264653', '#2A9D8F', '#E9C46A', '#E76F51'] },
  { id: 'happy-hues', name: 'Happy Hues', colors: ['#16161A', '#7F5AF0', '#2CB67D', '#FFFFFE'] },
  { id: 'blush-cream', name: 'Blush & Cream', colors: ['#FFF5E4', '#FFE3E1', '#FFD1D1', '#FF9494'] },
  { id: 'forest-floor', name: 'Forest Floor', colors: ['#1A4D2E', '#4F6F52', '#E8DFCA', '#F5EFE6'] },
  { id: 'electric-grape', name: 'Electric Grape', colors: ['#2D033B', '#810CA8', '#C147E9', '#E5B8F4'] },
  { id: 'ocean-deep', name: 'Ocean Deep', colors: ['#0B2447', '#19376D', '#576CBC', '#A5D7E8'] },
  { id: 'paper-ink', name: 'Paper & Ink', colors: ['#F9F7F7', '#DBE2EF', '#3F72AF', '#112D4E'] },
  { id: 'sunset-boulevard', name: 'Sunset Boulevard', colors: ['#F67280', '#C06C84', '#6C5B7B', '#355C7D'] },
  { id: 'matcha-latte', name: 'Matcha Latte', colors: ['#D8E3C3', '#B6C99B', '#75975E', '#527853'] },
  { id: 'candy-pop', name: 'Candy Pop', colors: ['#FFB5DA', '#FF7ED4', '#FF2DF1', '#7C00FE'] },
  { id: 'desert-clay', name: 'Desert Clay', colors: ['#FEF9E1', '#E5D0AC', '#A31D1D', '#6D2323'] },
  { id: 'noir-gold', name: 'Noir & Gold', colors: ['#000000', '#150050', '#3F0071', '#FB2576'] },
  { id: 'seafoam-drift', name: 'Seafoam Drift', colors: ['#F8FDCF', '#E2F6CA', '#9BD2C0', '#5C8984'] },
  { id: 'retro-arcade', name: 'Retro Arcade', colors: ['#F94C10', '#F8DE22', '#C70039', '#900C3F'] },
  { id: 'lavender-mist', name: 'Lavender Mist', colors: ['#E5D9F2', '#CDC1FF', '#A594F9', '#7371FC'] },
  { id: 'ember-glow', name: 'Ember Glow', colors: ['#1F1D36', '#3F3351', '#864879', '#E9A6A6'] },
  { id: 'citrus-splash', name: 'Citrus Splash', colors: ['#FFF6E9', '#FFD09B', '#FFB0B0', '#FF8080'] },
  { id: 'nordic-frost', name: 'Nordic Frost', colors: ['#2E3440', '#3B4252', '#88C0D0', '#ECEFF4'] },
  { id: 'jade-dynasty', name: 'Jade Dynasty', colors: ['#F5EFE7', '#D8C4B6', '#3E5879', '#213555'] },
  { id: 'coral-reef', name: 'Coral Reef', colors: ['#0C7B93', '#00A8CC', '#ECFCFF', '#FF7E67'] },
  { id: 'mono-slate', name: 'Mono Slate', colors: ['#F5F5F5', '#D9D9D9', '#7D7C7C', '#191717'] },
  { id: 'peach-sorbet', name: 'Peach Sorbet', colors: ['#FFECD1', '#FFC6AC', '#FF9B82', '#C67B5C'] },
  { id: 'aurora-night', name: 'Aurora Night', colors: ['#10002B', '#3C096C', '#7B2CBF', '#C77DFF'] },
  { id: 'olive-grove', name: 'Olive Grove', colors: ['#FEFAE0', '#FAEDCD', '#CCD5AE', '#606C38'] },
  { id: 'cherry-soda', name: 'Cherry Soda', colors: ['#FFF0F5', '#FFC2D1', '#FB6F92', '#8E0045'] },
  { id: 'denim-days', name: 'Denim Days', colors: ['#DFF6FF', '#47B5FF', '#256D85', '#06283D'] },
  { id: 'golden-hour', name: 'Golden Hour', colors: ['#FFFBE9', '#E3CAA5', '#CEAB93', '#AD8B73'] },
  { id: 'neo-mint', name: 'Neo Mint', colors: ['#161616', '#346751', '#C84B31', '#ECDBBA'] },
  { id: 'berry-crush', name: 'Berry Crush', colors: ['#4C0027', '#570530', '#A6CB12', '#F1F8FD'] },
  { id: 'sky-runner', name: 'Sky Runner', colors: ['#E3F2FD', '#90CAF9', '#1E88E5', '#0D47A1'] },
  { id: 'cocoa-dust', name: 'Cocoa Dust', colors: ['#EEE3CB', '#D7C0AE', '#967E76', '#4C3A32'] },
]

// Build the Palette Builder hand-off URL for a set of colours — matches the
// ?c=4338E0,7C6CF0 format colorsFromQuery() already parses (no '#' prefixes).
export function paletteBuilderUrl(colors) {
  return `/color/palette?c=${colors.map(c => c.replace('#', '')).join(',')}`
}
