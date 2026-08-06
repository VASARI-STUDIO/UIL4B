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

  // ── Second wave ────────────────────────────────────────────────────────────
  // Chosen to widen the *range* of the set rather than pad it: each one owns a
  // hue family, a lightness direction and a use case none of the 32 above had.
  // Where two palettes share a hue family they run in opposite directions (e.g.
  // Ember Glow is dark-dominant plum, Blush Plum is light-dominant rose) so the
  // cards never read as near-duplicates in the grid.
  { id: 'concrete-chartreuse', name: 'Concrete & Chartreuse', colors: ['#E8E8E4', '#B4B4AC', '#4E504F', '#C8D92E'] },
  { id: 'safety-signal', name: 'Safety Signal', colors: ['#111111', '#2B2B2B', '#FFD100', '#FF6B00'] },
  { id: 'cyber-neon', name: 'Cyber Neon', colors: ['#07060E', '#1B0F3B', '#FF00A8', '#00F0FF'] },
  { id: 'burgundy-brass', name: 'Burgundy & Brass', colors: ['#2B0A12', '#5C1229', '#B08D57', '#F2E4D0'] },
  { id: 'sage-charcoal', name: 'Sage & Charcoal', colors: ['#2F3330', '#5C6B5D', '#A8BFA3', '#EDF1E8'] },
  { id: 'newsprint', name: 'Newsprint', colors: ['#F4F1EA', '#D9D3C7', '#1A1A18', '#C6291E'] },
  { id: 'mango-tango', name: 'Mango Tango', colors: ['#FFF3D6', '#FFC24B', '#FF7A00', '#B33F00'] },
  { id: 'rainforest-canopy', name: 'Rainforest Canopy', colors: ['#04170F', '#0E3B24', '#2E7D53', '#9FE0A8'] },
  { id: 'deep-space-gold', name: 'Deep Space Gold', colors: ['#080B1A', '#141B3D', '#3B4A8C', '#E8C36B'] },
  { id: 'clinic-mint', name: 'Clinic Mint', colors: ['#FFFFFF', '#EAF7F2', '#3FD0A8', '#0B3B34'] },
  { id: 'dusty-mauve', name: 'Dusty Mauve', colors: ['#241A26', '#4B3A50', '#9E7E9B', '#E4D3DF'] },
  { id: 'maple-fall', name: 'Maple Fall', colors: ['#FBF1E3', '#E0A458', '#C1462A', '#5A2B1D'] },
  { id: 'pine-frost', name: 'Pine Frost', colors: ['#0C1B18', '#16382F', '#5E9C86', '#D7E8DE'] },
  { id: 'terminal-lime', name: 'Terminal Lime', colors: ['#0D0F0C', '#1A1F17', '#7BE04E', '#D6F5C4'] },
  { id: 'rose-gold', name: 'Rose Gold', colors: ['#FDF1EE', '#F0C9BF', '#C98878', '#7A4A3E'] },
  { id: 'bubblegum-sky', name: 'Bubblegum Sky', colors: ['#FFEAF4', '#FFA8D2', '#7ACDF5', '#2A6FA8'] },
  { id: 'ash-lava', name: 'Ash & Lava', colors: ['#111013', '#3A3438', '#8C8288', '#E23E24'] },
  { id: 'wine-ivy', name: 'Wine & Ivy', colors: ['#1A0E14', '#4A1028', '#2F5D3A', '#E7DCCB'] },
  { id: 'indigo-saffron', name: 'Indigo & Saffron', colors: ['#101A4A', '#2B3A93', '#E8843B', '#F6E3C0'] },
  { id: 'riverbed', name: 'Riverbed', colors: ['#E9EEEC', '#B7C6C2', '#6F8A87', '#33474A'] },
  { id: 'flamingo-dusk', name: 'Flamingo Dusk', colors: ['#4A1F44', '#8E3A6B', '#E8688C', '#FFC4B4'] },
  { id: 'copper-slate', name: 'Copper & Slate', colors: ['#1C2126', '#39434D', '#8A9AA8', '#C87E4F'] },
  { id: 'mustard-denim', name: 'Mustard & Denim', colors: ['#F0EAD9', '#D9A420', '#3E5C76', '#1D2D44'] },
  { id: 'ultramarine-chalk', name: 'Ultramarine & Chalk', colors: ['#FAFAFF', '#C7D1FF', '#3D5AF1', '#0B1C8C'] },
  { id: 'sherbet-shelf', name: 'Sherbet Shelf', colors: ['#FDF3F5', '#FBD9C6', '#CFE9C8', '#B7D4EC'] },
  { id: 'blush-plum', name: 'Blush Plum', colors: ['#F7E7EC', '#DCA9BE', '#8E4A6B', '#3A1B2B'] },
  { id: 'steel-amber', name: 'Steel & Amber', colors: ['#F4F5F7', '#C3C9D1', '#5A6472', '#F0A202'] },
  { id: 'lagoon-shallows', name: 'Lagoon Shallows', colors: ['#04353F', '#0A6E78', '#31B7A9', '#CFF3EC'] },
  { id: 'prussian-peach', name: 'Prussian & Peach', colors: ['#0B2A45', '#1F4E79', '#F2A488', '#FDEDE4'] },
  { id: 'violet-lime', name: 'Violet & Lime', colors: ['#1A0B2E', '#4B1F9E', '#8B5CF6', '#C9F24D'] },
  { id: 'chilli-cocoa', name: 'Chilli & Cocoa', colors: ['#2A1A16', '#5E332A', '#C24A2B', '#EFC7A5'] },
  { id: 'highlighter-pop', name: 'Highlighter Pop', colors: ['#FFFFFF', '#111111', '#FFE600', '#00E0B8'] },
]

// Build the Palette Builder hand-off URL for a set of colours — matches the
// ?c=4338E0,7C6CF0 format colorsFromQuery() already parses (no '#' prefixes).
export function paletteBuilderUrl(colors) {
  return `/color/palette?c=${colors.map(c => c.replace('#', '')).join(',')}`
}
