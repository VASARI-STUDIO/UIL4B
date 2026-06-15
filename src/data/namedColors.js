const CSS_COLORS = [
  { name: 'AliceBlue', hex: '#F0F8FF' }, { name: 'AntiqueWhite', hex: '#FAEBD7' }, { name: 'Aqua', hex: '#00FFFF' },
  { name: 'Aquamarine', hex: '#7FFFD4' }, { name: 'Azure', hex: '#F0FFFF' }, { name: 'Beige', hex: '#F5F5DC' },
  { name: 'Bisque', hex: '#FFE4C4' }, { name: 'Black', hex: '#000000' }, { name: 'BlanchedAlmond', hex: '#FFEBCD' },
  { name: 'Blue', hex: '#0000FF' }, { name: 'BlueViolet', hex: '#8A2BE2' }, { name: 'Brown', hex: '#A52A2A' },
  { name: 'BurlyWood', hex: '#DEB887' }, { name: 'CadetBlue', hex: '#5F9EA0' }, { name: 'Chartreuse', hex: '#7FFF00' },
  { name: 'Chocolate', hex: '#D2691E' }, { name: 'Coral', hex: '#FF7F50' }, { name: 'CornflowerBlue', hex: '#6495ED' },
  { name: 'Cornsilk', hex: '#FFF8DC' }, { name: 'Crimson', hex: '#DC143C' }, { name: 'Cyan', hex: '#00FFFF' },
  { name: 'DarkBlue', hex: '#00008B' }, { name: 'DarkCyan', hex: '#008B8B' }, { name: 'DarkGoldenRod', hex: '#B8860B' },
  { name: 'DarkGray', hex: '#A9A9A9' }, { name: 'DarkGreen', hex: '#006400' }, { name: 'DarkKhaki', hex: '#BDB76B' },
  { name: 'DarkMagenta', hex: '#8B008B' }, { name: 'DarkOliveGreen', hex: '#556B2F' }, { name: 'DarkOrange', hex: '#FF8C00' },
  { name: 'DarkOrchid', hex: '#9932CC' }, { name: 'DarkRed', hex: '#8B0000' }, { name: 'DarkSalmon', hex: '#E9967A' },
  { name: 'DarkSeaGreen', hex: '#8FBC8F' }, { name: 'DarkSlateBlue', hex: '#483D8B' }, { name: 'DarkSlateGray', hex: '#2F4F4F' },
  { name: 'DarkTurquoise', hex: '#00CED1' }, { name: 'DarkViolet', hex: '#9400D3' }, { name: 'DeepPink', hex: '#FF1493' },
  { name: 'DeepSkyBlue', hex: '#00BFFF' }, { name: 'DimGray', hex: '#696969' }, { name: 'DodgerBlue', hex: '#1E90FF' },
  { name: 'FireBrick', hex: '#B22222' }, { name: 'FloralWhite', hex: '#FFFAF0' }, { name: 'ForestGreen', hex: '#228B22' },
  { name: 'Fuchsia', hex: '#FF00FF' }, { name: 'Gainsboro', hex: '#DCDCDC' }, { name: 'GhostWhite', hex: '#F8F8FF' },
  { name: 'Gold', hex: '#FFD700' }, { name: 'GoldenRod', hex: '#DAA520' }, { name: 'Gray', hex: '#808080' },
  { name: 'Green', hex: '#008000' }, { name: 'GreenYellow', hex: '#ADFF2F' }, { name: 'HoneyDew', hex: '#F0FFF0' },
  { name: 'HotPink', hex: '#FF69B4' }, { name: 'IndianRed', hex: '#CD5C5C' }, { name: 'Indigo', hex: '#4B0082' },
  { name: 'Ivory', hex: '#FFFFF0' }, { name: 'Khaki', hex: '#F0E68C' }, { name: 'Lavender', hex: '#E6E6FA' },
  { name: 'LavenderBlush', hex: '#FFF0F5' }, { name: 'LawnGreen', hex: '#7CFC00' }, { name: 'LemonChiffon', hex: '#FFFACD' },
  { name: 'LightBlue', hex: '#ADD8E6' }, { name: 'LightCoral', hex: '#F08080' }, { name: 'LightCyan', hex: '#E0FFFF' },
  { name: 'LightGoldenRodYellow', hex: '#FAFAD2' }, { name: 'LightGray', hex: '#D3D3D3' }, { name: 'LightGreen', hex: '#90EE90' },
  { name: 'LightPink', hex: '#FFB6C1' }, { name: 'LightSalmon', hex: '#FFA07A' }, { name: 'LightSeaGreen', hex: '#20B2AA' },
  { name: 'LightSkyBlue', hex: '#87CEFA' }, { name: 'LightSlateGray', hex: '#778899' }, { name: 'LightSteelBlue', hex: '#B0C4DE' },
  { name: 'LightYellow', hex: '#FFFFE0' }, { name: 'Lime', hex: '#00FF00' }, { name: 'LimeGreen', hex: '#32CD32' },
  { name: 'Linen', hex: '#FAF0E6' }, { name: 'Magenta', hex: '#FF00FF' }, { name: 'Maroon', hex: '#800000' },
  { name: 'MediumAquaMarine', hex: '#66CDAA' }, { name: 'MediumBlue', hex: '#0000CD' }, { name: 'MediumOrchid', hex: '#BA55D3' },
  { name: 'MediumPurple', hex: '#9370DB' }, { name: 'MediumSeaGreen', hex: '#3CB371' }, { name: 'MediumSlateBlue', hex: '#7B68EE' },
  { name: 'MediumSpringGreen', hex: '#00FA9A' }, { name: 'MediumTurquoise', hex: '#48D1CC' }, { name: 'MediumVioletRed', hex: '#C71585' },
  { name: 'MidnightBlue', hex: '#191970' }, { name: 'MintCream', hex: '#F5FFFA' }, { name: 'MistyRose', hex: '#FFE4E1' },
  { name: 'Moccasin', hex: '#FFE4B5' }, { name: 'NavajoWhite', hex: '#FFDEAD' }, { name: 'Navy', hex: '#000080' },
  { name: 'OldLace', hex: '#FDF5E6' }, { name: 'Olive', hex: '#808000' }, { name: 'OliveDrab', hex: '#6B8E23' },
  { name: 'Orange', hex: '#FFA500' }, { name: 'OrangeRed', hex: '#FF4500' }, { name: 'Orchid', hex: '#DA70D6' },
  { name: 'PaleGoldenRod', hex: '#EEE8AA' }, { name: 'PaleGreen', hex: '#98FB98' }, { name: 'PaleTurquoise', hex: '#AFEEEE' },
  { name: 'PaleVioletRed', hex: '#DB7093' }, { name: 'PapayaWhip', hex: '#FFEFD5' }, { name: 'PeachPuff', hex: '#FFDAB9' },
  { name: 'Peru', hex: '#CD853F' }, { name: 'Pink', hex: '#FFC0CB' }, { name: 'Plum', hex: '#DDA0DD' },
  { name: 'PowderBlue', hex: '#B0E0E6' }, { name: 'Purple', hex: '#800080' }, { name: 'RebeccaPurple', hex: '#663399' },
  { name: 'Red', hex: '#FF0000' }, { name: 'RosyBrown', hex: '#BC8F8F' }, { name: 'RoyalBlue', hex: '#4169E1' },
  { name: 'SaddleBrown', hex: '#8B4513' }, { name: 'Salmon', hex: '#FA8072' }, { name: 'SandyBrown', hex: '#F4A460' },
  { name: 'SeaGreen', hex: '#2E8B57' }, { name: 'SeaShell', hex: '#FFF5EE' }, { name: 'Sienna', hex: '#A0522D' },
  { name: 'Silver', hex: '#C0C0C0' }, { name: 'SkyBlue', hex: '#87CEEB' }, { name: 'SlateBlue', hex: '#6A5ACD' },
  { name: 'SlateGray', hex: '#708090' }, { name: 'Snow', hex: '#FFFAFA' }, { name: 'SpringGreen', hex: '#00FF7F' },
  { name: 'SteelBlue', hex: '#4682B4' }, { name: 'Tan', hex: '#D2B48C' }, { name: 'Teal', hex: '#008080' },
  { name: 'Thistle', hex: '#D8BFD8' }, { name: 'Tomato', hex: '#FF6347' }, { name: 'Turquoise', hex: '#40E0D0' },
  { name: 'Violet', hex: '#EE82EE' }, { name: 'Wheat', hex: '#F5DEB3' }, { name: 'White', hex: '#FFFFFF' },
  { name: 'WhiteSmoke', hex: '#F5F5F5' }, { name: 'Yellow', hex: '#FFFF00' }, { name: 'YellowGreen', hex: '#9ACD32' },
]

const JAPANESE_COLORS = [
  { name: 'Sakura', hex: '#FEEEED' }, { name: 'Matcha', hex: '#C5E99B' }, { name: 'Sumi', hex: '#1C1C1C' },
  { name: 'Kon', hex: '#192F60' }, { name: 'Ai', hex: '#264348' }, { name: 'Enji', hex: '#9B111E' },
  { name: 'Wasurenagusa', hex: '#89C3EB' }, { name: 'Yamabuki', hex: '#F8B500' }, { name: 'Tokiwa', hex: '#007B43' },
  { name: 'Uguisu', hex: '#838B0D' }, { name: 'Karakurenai', hex: '#D0104C' }, { name: 'Murasaki', hex: '#884898' },
  { name: 'Kitsune', hex: '#C57F2E' }, { name: 'Asagi', hex: '#48929B' }, { name: 'Kohaku', hex: '#CA6924' },
  { name: 'Mizu', hex: '#81C7D4' }, { name: 'Shiro', hex: '#FFFFFB' }, { name: 'Kuro', hex: '#0D0D0D' },
  { name: 'Hai', hex: '#828282' }, { name: 'Moegi', hex: '#AAC74C' }, { name: 'Tsubaki', hex: '#C03A3A' },
  { name: 'Sumire', hex: '#7058A3' }, { name: 'Ruri', hex: '#005CAF' }, { name: 'Beni', hex: '#CB4042' },
  { name: 'Koke', hex: '#5B6356' }, { name: 'Ukon', hex: '#EFBB24' }, { name: 'Sohi', hex: '#E2521D' },
  { name: 'Kurenai', hex: '#9F353A' }, { name: 'Azuki', hex: '#672422' }, { name: 'Torinoko', hex: '#DAC9A6' },
]

const MATERIAL_COLORS = [
  { name: 'Red', hex: '#F44336' }, { name: 'Pink', hex: '#E91E63' }, { name: 'Purple', hex: '#9C27B0' },
  { name: 'Deep Purple', hex: '#673AB7' }, { name: 'Indigo', hex: '#3F51B5' }, { name: 'Blue', hex: '#2196F3' },
  { name: 'Light Blue', hex: '#03A9F4' }, { name: 'Cyan', hex: '#00BCD4' }, { name: 'Teal', hex: '#009688' },
  { name: 'Green', hex: '#4CAF50' }, { name: 'Light Green', hex: '#8BC34A' }, { name: 'Lime', hex: '#CDDC39' },
  { name: 'Yellow', hex: '#FFEB3B' }, { name: 'Amber', hex: '#FFC107' }, { name: 'Orange', hex: '#FF9800' },
  { name: 'Deep Orange', hex: '#FF5722' }, { name: 'Brown', hex: '#795548' }, { name: 'Grey', hex: '#9E9E9E' },
  { name: 'Blue Grey', hex: '#607D8B' },
]

const TAILWIND_COLORS = [
  { name: 'Slate', hex: '#64748B' }, { name: 'Gray', hex: '#6B7280' }, { name: 'Zinc', hex: '#71717A' },
  { name: 'Neutral', hex: '#737373' }, { name: 'Stone', hex: '#78716C' }, { name: 'Red', hex: '#EF4444' },
  { name: 'Orange', hex: '#F97316' }, { name: 'Amber', hex: '#F59E0B' }, { name: 'Yellow', hex: '#EAB308' },
  { name: 'Lime', hex: '#84CC16' }, { name: 'Green', hex: '#22C55E' }, { name: 'Emerald', hex: '#10B981' },
  { name: 'Teal', hex: '#14B8A6' }, { name: 'Cyan', hex: '#06B6D4' }, { name: 'Sky', hex: '#0EA5E9' },
  { name: 'Blue', hex: '#3B82F6' }, { name: 'Indigo', hex: '#6366F1' }, { name: 'Violet', hex: '#8B5CF6' },
  { name: 'Purple', hex: '#A855F7' }, { name: 'Fuchsia', hex: '#D946EF' }, { name: 'Pink', hex: '#EC4899' },
  { name: 'Rose', hex: '#F43F5E' },
]

export const COLOR_LIBRARIES = [
  { id: 'css', name: 'CSS Named Colors', description: '148 standard CSS color keywords', colors: CSS_COLORS },
  { id: 'japanese', name: 'Japanese Traditional', description: 'Classic Japanese color names (Nippon)', colors: JAPANESE_COLORS },
  { id: 'material', name: 'Material Design', description: 'Google Material Design core palette (500)', colors: MATERIAL_COLORS },
  { id: 'tailwind', name: 'Tailwind CSS', description: 'Tailwind default palette (500)', colors: TAILWIND_COLORS },
]

function hexToRgb(hex) {
  const h = hex.replace('#', '')
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}

export function findClosestNamedColor(hex, libraryId = null) {
  const target = hexToRgb(hex)
  let best = null
  const libs = libraryId ? COLOR_LIBRARIES.filter(l => l.id === libraryId) : COLOR_LIBRARIES
  for (const lib of libs) {
    for (const color of lib.colors) {
      const c = hexToRgb(color.hex)
      const d = Math.sqrt((target[0] - c[0]) ** 2 + (target[1] - c[1]) ** 2 + (target[2] - c[2]) ** 2)
      if (!best || d < best.distance) {
        best = { name: color.name, hex: color.hex, library: lib.id, distance: d }
      }
    }
  }
  return best
}

export function searchNamedColors(query, libraryId = null) {
  const q = query.trim().toLowerCase()
  if (!q) return []
  const libs = libraryId ? COLOR_LIBRARIES.filter(l => l.id === libraryId) : COLOR_LIBRARIES
  const results = []
  for (const lib of libs) {
    for (const color of lib.colors) {
      if (color.name.toLowerCase().includes(q) || color.hex.toLowerCase().includes(q)) {
        results.push({ ...color, library: lib.id })
      }
    }
  }
  return results
}
