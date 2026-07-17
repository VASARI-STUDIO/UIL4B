// Curated gradient gallery — the designgradients-style browse set rendered by
// GradientGalleryGrid (/discover/gradients) and importable into the Gradient
// Generator. Static and local: nothing here is ever fetched, so there is no
// SSRF surface and the gallery works offline.
//
// Each gradient: a stable id (likes key in localStorage), a human name, the
// gradient definition (type / angle / stops) and tags for the gallery filters.

export const GRADIENT_TAGS = ['warm', 'cool', 'dark', 'light', 'pastel', 'vivid', 'mono']

const GRAD_FN = { Linear: 'linear-gradient', Radial: 'radial-gradient', Conic: 'conic-gradient' }

// Compose the production CSS value for a gradient. Stops are sorted so a
// dragged-past handle still reads left→right. Shared with the Gradient
// Generator so the gallery, the tool and every copied snippet agree.
export function gradientCss(type, angle, stops) {
  const fn = GRAD_FN[type] || 'linear-gradient'
  const prefix = type === 'Linear' ? `${angle}deg, ` : type === 'Conic' ? `from ${angle}deg at 50% 50%, ` : ''
  const parts = [...stops]
    .sort((a, b) => a.position - b.position)
    .map(s => `${s.color.toUpperCase()} ${Math.round(s.position)}%`)
    .join(', ')
  return `${fn}(${prefix}${parts})`
}

// Build the Gradient Generator hand-off URL — ?gs=RRGGBB-pos_RRGGBB-pos with the
// type and angle alongside, decoded by decodeGradientParams below.
export function gradientToolUrl(g) {
  const gs = g.stops.map(s => `${s.color.replace('#', '')}-${Math.round(s.position)}`).join('_')
  return `/color/gradient?gs=${gs}&gt=${g.type.toLowerCase()}&ga=${Math.round(g.angle)}&gn=${encodeURIComponent(g.name)}`
}

// Parse a gallery hand-off out of the tool's search params. Returns
// { type, angle, stops, name } or null when there is no (valid) hand-off —
// every field is validated so a mangled URL can never produce broken stops.
export function decodeGradientParams(params) {
  const gs = params.get('gs')
  if (!gs) return null
  const stops = gs.split('_').map(part => {
    const m = /^([0-9a-f]{6})-(\d{1,3})$/i.exec(part)
    return m ? { color: `#${m[1].toUpperCase()}`, position: Math.min(100, +m[2]) } : null
  })
  if (stops.length < 2 || stops.some(s => !s)) return null
  const type = { linear: 'Linear', radial: 'Radial', conic: 'Conic' }[(params.get('gt') || 'linear').toLowerCase()] || 'Linear'
  const angle = Math.min(360, Math.max(0, parseInt(params.get('ga'), 10) || 0))
  const name = (params.get('gn') || '').slice(0, 60) || null
  return { type, angle, stops, name }
}

const lin = (id, name, angle, colors, tags) => ({
  id,
  name,
  type: 'Linear',
  angle,
  stops: colors.map((color, i) => ({ color, position: Math.round((i / (colors.length - 1)) * 100) })),
  tags,
})

export const GALLERY_GRADIENTS = [
  // ── Warm ──
  lin('sunset-blaze', 'Sunset Blaze', 135, ['#FF512F', '#F09819'], ['warm', 'vivid']),
  lin('golden-hour', 'Golden Hour', 120, ['#FF5F6D', '#FFC371'], ['warm', 'vivid']),
  lin('mango-pulp', 'Mango Pulp', 90, ['#F09819', '#EDDE5D'], ['warm', 'light']),
  lin('flamingo', 'Flamingo', 135, ['#EC008C', '#FC6767'], ['warm', 'vivid']),
  lin('bloody-mary', 'Bloody Mary', 160, ['#FF512F', '#DD2476'], ['warm', 'vivid', 'dark']),
  lin('peach-melba', 'Peach Melba', 110, ['#FFDDE1', '#EE9CA7'], ['warm', 'pastel', 'light']),
  lin('sand-dune', 'Sand Dune', 100, ['#D1913C', '#FFD194'], ['warm', 'light']),
  lin('ember-fade', 'Ember Fade', 45, ['#870000', '#190A05'], ['warm', 'dark']),
  { id: 'sun-flare', name: 'Sun Flare', type: 'Radial', angle: 0, stops: [{ color: '#FDE68A', position: 0 }, { color: '#F97316', position: 62 }, { color: '#7C2D12', position: 100 }], tags: ['warm', 'vivid'] },
  lin('rosewater', 'Rosewater', 150, ['#E55D87', '#5FC3E4'], ['warm', 'cool', 'vivid']),

  // ── Cool ──
  lin('deep-sea', 'Deep Sea', 135, ['#2E3192', '#1BFFFF'], ['cool', 'vivid']),
  lin('blue-raspberry', 'Blue Raspberry', 120, ['#00B4DB', '#0083B0'], ['cool', 'vivid']),
  lin('arctic-drift', 'Arctic Drift', 105, ['#74EBD5', '#ACB6E5'], ['cool', 'pastel', 'light']),
  lin('moonlit-asteroid', 'Moonlit Asteroid', 135, ['#0F2027', '#203A43', '#2C5364'], ['cool', 'dark']),
  lin('emerald-water', 'Emerald Water', 90, ['#348F50', '#56B4D3'], ['cool', 'vivid']),
  lin('glacier', 'Glacier', 160, ['#E0EAFC', '#CFDEF3'], ['cool', 'pastel', 'light']),
  lin('northern-lights', 'Northern Lights', 200, ['#00C9FF', '#92FE9D'], ['cool', 'vivid', 'light']),
  lin('royal-night', 'Royal Night', 135, ['#141E30', '#243B55'], ['cool', 'dark']),
  { id: 'deep-space', name: 'Deep Space', type: 'Radial', angle: 0, stops: [{ color: '#3B4371', position: 0 }, { color: '#0B0D17', position: 100 }], tags: ['cool', 'dark'] },
  lin('mint-breeze', 'Mint Breeze', 120, ['#B7F8DB', '#50A7C2'], ['cool', 'pastel', 'light']),

  // ── Violet / neon ──
  lin('ultraviolet', 'Ultraviolet', 135, ['#654EA3', '#EAAFC8'], ['cool', 'pastel']),
  lin('purple-bliss', 'Purple Bliss', 120, ['#360033', '#0B8793'], ['cool', 'dark']),
  lin('neon-dusk', 'Neon Dusk', 150, ['#7C3AED', '#DB2777', '#F59E0B'], ['warm', 'vivid']),
  lin('grape-soda', 'Grape Soda', 135, ['#2D033B', '#810CA8', '#C147E9'], ['cool', 'dark', 'vivid']),
  lin('electric-violet', 'Electric Violet', 100, ['#4776E6', '#8E54E9'], ['cool', 'vivid']),
  lin('midnight-bloom', 'Midnight Bloom', 160, ['#232526', '#65379B', '#886AEA'], ['cool', 'dark', 'vivid']),
  { id: 'holo-ring', name: 'Holo Ring', type: 'Conic', angle: 90, stops: [{ color: '#7C3AED', position: 0 }, { color: '#22D3EE', position: 33 }, { color: '#F472B6', position: 66 }, { color: '#7C3AED', position: 100 }], tags: ['cool', 'vivid'] },
  lin('lavender-haze', 'Lavender Haze', 110, ['#E5D9F2', '#A594F9'], ['cool', 'pastel', 'light']),

  // ── Pastel / light ──
  lin('almost-spring', 'Almost Spring', 120, ['#DDD6F3', '#FAACA8'], ['pastel', 'light']),
  lin('cotton-candy', 'Cotton Candy', 90, ['#FFDEE9', '#B5FFFC'], ['pastel', 'light']),
  lin('lemon-sorbet', 'Lemon Sorbet', 100, ['#FFFBD5', '#FFE29F', '#FFA99F'], ['warm', 'pastel', 'light']),
  lin('sea-glass', 'Sea Glass', 135, ['#F8FDCF', '#9BD2C0'], ['cool', 'pastel', 'light']),

  // ── Mono / dark ──
  lin('graphite', 'Graphite', 135, ['#1F2937', '#4B5563'], ['mono', 'dark']),
  lin('midnight-city', 'Midnight City', 120, ['#232526', '#414345'], ['mono', 'dark']),
  lin('paper-fold', 'Paper Fold', 160, ['#F5F7FA', '#C3CFE2'], ['mono', 'light', 'pastel']),
  lin('ink-wash', 'Ink Wash', 180, ['#0F172A', '#64748B'], ['mono', 'dark']),
  { id: 'slate-orb', name: 'Slate Orb', type: 'Radial', angle: 0, stops: [{ color: '#485563', position: 0 }, { color: '#29323C', position: 100 }], tags: ['mono', 'dark'] },
  lin('char-gold', 'Char & Gold', 135, ['#141E30', '#D1913C'], ['warm', 'dark']),
]
