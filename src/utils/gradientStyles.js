// GRADIENT STYLE FAMILIES: Horizon, Mesh, Curtains, Beams and Steps, plus Plain.
//
// One engine for every surface that draws a styled gradient. `recipe()` turns
// the person's stops and a family's parameters into a plain description of
// layers; `toCss`, `toSvg`, `liveTree` and `paint` all read that description,
// so the canvas, the thumbnails and an image export cannot disagree about what
// a family looks like.
//
// DOM-free on purpose: nothing here touches `document` or `window`, so the
// unit tests can pin it. `paint()` takes the canvas it draws on from the
// caller, and the grain painter works on raw RGBA arrays.
//
// TWO-COLOUR-LED. A family never adds a hue. Every colour in a layer is one of
// the stops, or one of the stops with its lightness and chroma moved and its
// hue moved by at most 14 degrees. Steps is the one exception that reads
// between the stops: each flat step is a sample of the ramp, so it sits on the
// OKLCH path from one stop to the next.
//
// SEEDED. Anything that looks random (Mesh point layout, jitter) comes from a
// seed saved with the design, so the same design always draws the same way.

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))
const RAD = Math.PI / 180
const fmt = (n) => String(+n.toFixed(2))

/* ── colour maths: OKLCH <-> sRGB hex ────────────────────────────────── */

const toLinear = (v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
const toGamma = (v) => (v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055)

export function hexToRgb(hex) {
  const h = hex.replace('#', '')
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16))
}

// {L: 0..1, C, H: 0..360}. A grey's hue is rounding noise, so it reads 0.
export function hexToOk(hex) {
  const [r, g, b] = hexToRgb(hex).map((v) => toLinear(v / 255))
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s
  const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s
  const bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
  const C = Math.hypot(a, bb)
  let H = Math.atan2(bb, a) / RAD
  if (H < 0) H += 360
  return { L, C, H: C < 0.002 ? 0 : H }
}

function okToLinearRgb(L, C, H) {
  const a = C * Math.cos(H * RAD)
  const b = C * Math.sin(H * RAD)
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ]
}

const inGamut = (rgb) => rgb.every((v) => v >= -0.0005 && v <= 1.0005)

// A colour outside sRGB loses chroma, never hue or lightness, until it fits.
export function okToHex(L, C, H) {
  const l = clamp(L, 0, 1)
  let c = Math.max(0, C)
  let rgb = okToLinearRgb(l, c, H)
  if (!inGamut(rgb)) {
    let lo = 0
    let hi = c
    for (let i = 0; i < 14; i++) {
      const mid = (lo + hi) / 2
      if (inGamut(okToLinearRgb(l, mid, H))) lo = mid
      else hi = mid
    }
    c = lo
    rgb = okToLinearRgb(l, c, H)
  }
  return `#${rgb.map((v) => Math.round(clamp(toGamma(clamp(v, 0, 1)), 0, 1) * 255).toString(16).padStart(2, '0')).join('')}`
}

// A stop moved in lightness and chroma, and in hue by at most 14 degrees.
export function shiftColour(hex, { dL = 0, dC = 0, dH = 0 } = {}) {
  const o = hexToOk(hex)
  return okToHex(o.L + dL, Math.max(0, o.C + dC), (o.H + clamp(dH, -14, 14) + 360) % 360)
}

export const hueDistance = (a, b) => { const d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d }

// Interpolate along the shorter hue arc, the way `in oklch` does.
export function mixOk(hexA, hexB, t) {
  const a = hexToOk(hexA)
  const b = hexToOk(hexB)
  const hA = a.C < 0.01 ? b.H : a.H
  const hB = b.C < 0.01 ? a.H : b.H
  let dh = hB - hA
  if (dh > 180) dh -= 360
  if (dh < -180) dh += 360
  return okToHex(a.L + (b.L - a.L) * t, a.C + (b.C - a.C) * t, (hA + dh * t + 360) % 360)
}

const hexList = (stops) => stops.map((s) => (typeof s === 'string' ? s : s.color)).map((h) => h.toLowerCase())

// A colour at position t (0..1) along evenly spaced stops.
export function sampleRamp(stops, t) {
  const st = hexList(stops)
  if (st.length === 1) return st[0]
  const f = clamp(t, 0, 1) * (st.length - 1)
  const i = Math.min(st.length - 2, Math.floor(f))
  return mixOk(st[i], st[i + 1], f - i)
}

const rgbCss = (hex, a = 1) => {
  if (a >= 0.999) return hex
  const [r, g, b] = hexToRgb(hex)
  return `rgb(${r} ${g} ${b} / ${fmt(a)})`
}

export function mulberry32(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/* ── families and their parameters ───────────────────────────────────── */

export const STYLES = ['plain', 'horizon', 'mesh', 'curtains', 'beams', 'steps']
export const STYLE_LABEL = { plain: 'Plain', horizon: 'Horizon', mesh: 'Mesh', curtains: 'Curtains', beams: 'Beams', steps: 'Steps' }
export const STEP_SHAPES = ['arches', 'blades', 'fan', 'ribbons']

const slider = (key, label, min, max, def, unit = '') => ({ kind: 'slider', key, label, min, max, def, unit })
const choice = (key, label, options, def) => ({ kind: 'choice', key, label, options, def })

// Four rows per family, always (the panel keeps one height). The Steps third
// row changes its label with the shape; `paramRows` resolves that.
export const PARAM_ROWS = {
  plain: [
    choice('type', 'Type', ['Linear', 'Radial', 'Conic'], 'Linear'),
    slider('angle', 'Angle', 0, 359, 135, '°'),
    choice('space', 'Interpolation', ['oklch', 'srgb'], 'oklch'),
  ],
  horizon: [
    slider('light', 'Light from', 0, 359, 180, '°'),
    slider('height', 'Height', 10, 90, 38, '%'),
    slider('spread', 'Spread', 0, 100, 60),
    slider('haze', 'Haze', 0, 100, 35),
  ],
  mesh: [
    slider('points', 'Points', 3, 5, 4),
    slider('softness', 'Softness', 0, 100, 65),
    slider('drift', 'Drift', 0, 100, 40),
    slider('layout', 'Layout', 1, 99, 12),
  ],
  curtains: [
    slider('bands', 'Bands', 2, 4, 3),
    slider('tilt', 'Tilt', -30, 30, -12, '°'),
    slider('length', 'Length', 30, 90, 65, '%'),
    slider('sky', 'Sky', 0, 100, 30),
  ],
  beams: [
    slider('angle', 'Angle', 0, 359, 115, '°'),
    slider('width', 'Width', 4, 24, 9, '%'),
    slider('softness', 'Softness', 0, 100, 40),
    slider('base', 'Base light', 0, 100, 50),
  ],
  steps: [
    choice('shape', 'Shape', STEP_SHAPES, 'arches'),
    slider('steps', 'Steps', 6, 16, 10),
    slider('turn', 'Turn', 45, 270, 120, '°'),
    choice('ground', 'Ground', ['dark', 'light'], 'dark'),
  ],
}

export function paramRows(style, params = {}) {
  const rows = PARAM_ROWS[style] || []
  if (style !== 'steps') return rows
  const arch = params.shape === 'arches' || params.shape === 'ribbons'
  return rows.map((r) => (r.key === 'turn' && arch ? slider('offset', 'Offset', 0, 100, 40) : r))
}

export function defaultParams(style) {
  const out = {}
  for (const r of PARAM_ROWS[style] || []) out[r.key] = r.def
  if (style === 'steps') out.offset = 40
  return out
}

export function clampParams(style, params = {}) {
  const out = { ...defaultParams(style), ...params }
  const rows = [...(PARAM_ROWS[style] || [])]
  if (style === 'steps') rows.push(slider('offset', 'Offset', 0, 100, 40))
  for (const r of rows) {
    if (r.kind === 'slider') out[r.key] = clamp(Math.round(+out[r.key]), r.min, r.max)
    else if (!r.options.includes(out[r.key])) out[r.key] = r.def
  }
  return out
}

/* ── the colour-rule guard ───────────────────────────────────────────── */

// A family's own colour rules, which narrow the ranges Random uses and never
// add a hue. `check` reports what is out of range; `fit` moves lightness and
// chroma (never hue) until the stops sit inside.
const lc = (hex) => { const o = hexToOk(hex); return { L: o.L, C: o.C, H: o.H } }

const RULES = {
  plain: () => [],
  mesh: (st) => {
    const out = []
    const cs = st.map((h) => hexToOk(h).C)
    if (Math.max(...cs) - Math.min(...cs) > 0.08) out.push('Stops differ in chroma by more than 0.08, so one shouts over the other')
    return out
  },
  horizon: (st) => {
    const sky = lc(st[0])
    const hz = lc(st[st.length - 1])
    const out = []
    if (sky.L < 0.12 || sky.L > 0.85) out.push(`Sky lightness ${sky.L.toFixed(2)} is outside 0.12 to 0.85`)
    if (hz.C < 0.12) out.push(`Horizon chroma ${hz.C.toFixed(2)} is under 0.12`)
    if (Math.abs(hz.L - sky.L) < 0.15) out.push('Horizon and sky are less than 0.15 apart in lightness')
    return out
  },
  curtains: (st) => {
    const base = lc(st[0])
    const cur = lc(st[st.length - 1])
    const out = []
    if (base.L > 0.25) out.push(`Base lightness ${base.L.toFixed(2)} is over 0.25, so the night is not dark`)
    if (cur.L < 0.65 || cur.L > 0.85) out.push(`Curtain lightness ${cur.L.toFixed(2)} is outside 0.65 to 0.85`)
    if (cur.C < 0.12) out.push(`Curtain chroma ${cur.C.toFixed(2)} is under 0.12`)
    return out
  },
  beams: (st) => {
    const base = lc(st[0])
    const beam = lc(st[st.length - 1])
    const out = []
    if (base.L < 0.12 || base.L > 0.22) out.push(`Base lightness ${base.L.toFixed(2)} is outside 0.12 to 0.22`)
    if (beam.L < 0.75 || beam.L > 0.9) out.push(`Beam lightness ${beam.L.toFixed(2)} is outside 0.75 to 0.90`)
    if (beam.C < 0.08 || beam.C > 0.16) out.push(`Beam chroma ${beam.C.toFixed(2)} is outside 0.08 to 0.16`)
    return out
  },
  steps: (st) => {
    const a = lc(st[0])
    const b = lc(st[st.length - 1])
    return Math.abs(a.L - b.L) < 0.35 ? ['First and last stop are less than 0.35 apart in lightness, so the steps do not read'] : []
  },
}

export function checkColourRules(style, stops) {
  const problems = (RULES[style] || RULES.plain)(hexList(stops))
  return { ok: problems.length === 0, problems }
}

const FIT = {
  horizon: (st) => {
    const out = [...st]
    const i = st.length - 1
    const sky = hexToOk(st[0])
    const hz = hexToOk(st[i])
    const skyL = clamp(sky.L, 0.12, 0.85)
    out[0] = okToHex(skyL, sky.C, sky.H)
    let hzL = hz.L
    if (Math.abs(hzL - skyL) < 0.15) hzL = skyL + (skyL > 0.5 ? -0.15 : 0.15)
    out[i] = okToHex(hzL, Math.max(hz.C, 0.12), hz.H)
    return out
  },
  curtains: (st) => {
    const out = [...st]
    const i = st.length - 1
    const base = hexToOk(st[0])
    const cur = hexToOk(st[i])
    out[0] = okToHex(Math.min(base.L, 0.25), base.C, base.H)
    out[i] = okToHex(clamp(cur.L, 0.65, 0.85), Math.max(cur.C, 0.12), cur.H)
    return out
  },
  beams: (st) => {
    const out = [...st]
    const i = st.length - 1
    const base = hexToOk(st[0])
    const beam = hexToOk(st[i])
    out[0] = okToHex(clamp(base.L, 0.12, 0.22), base.C, base.H)
    out[i] = okToHex(clamp(beam.L, 0.75, 0.9), clamp(beam.C, 0.08, 0.16), beam.H)
    return out
  },
  steps: (st) => {
    const out = [...st]
    const i = st.length - 1
    const a = hexToOk(st[0])
    const b = hexToOk(st[i])
    if (Math.abs(a.L - b.L) < 0.35) {
      const dir = a.L >= 0.5 ? -1 : 1
      out[i] = okToHex(clamp(a.L + dir * 0.35, 0.05, 0.97), b.C, b.H)
    }
    return out
  },
  mesh: (st) => {
    const cs = st.map((h) => hexToOk(h).C)
    const cap = Math.min(...cs) + 0.08
    return st.map((h) => { const o = hexToOk(h); return o.C > cap ? okToHex(o.L, cap, o.H) : h })
  },
}

export function fitToRules(style, stops) {
  const st = hexList(stops)
  return (FIT[style] || ((s) => s))(st)
}

/* ── layers ──────────────────────────────────────────────────────────── */

// A layer is one gradient. Stops are [hex, alpha, pos%, endPos%?]; a fourth
// number makes the stop hard (a flat band from pos to endPos).
const evenStops = (hexes, closed = false) => {
  const list = closed ? [...hexes, hexes[0]] : hexes
  return list.map((c, i) => [c, 1, list.length === 1 ? 0 : (i / (list.length - 1)) * 100])
}
const fade = (hex, ...pts) => pts.map(([a, pos]) => [hex, a, pos])

const linear = (angle, stops, space = 'oklch') => ({ k: 'linear', angle, stops, space })
const radial = (cx, cy, rx, ry, stops) => ({ k: 'radial', cx, cy, rx, ry, stops, space: 'oklch' })

function horizonLayers(st, p) {
  const hz = st[st.length - 1]
  const a = p.light * RAD
  const cx = 50 + 50 * Math.sin(a)
  const cy = 50 - 50 * Math.cos(a)
  const wide = Math.abs(Math.cos(a)) >= Math.abs(Math.sin(a))
  const size = (along, across) => (wide ? [along, across] : [across, along])
  const open = 20 + (1 - p.spread / 100) * 35
  const core = shiftColour(hz, { dL: 0.12, dC: -0.03 })
  const hazeA = 0.55 * (p.haze / 100)
  return [
    radial(cx, cy, ...size(70, p.height * 0.45), fade(core, [0.95, 0], [0.5, 45], [0, 100])),
    radial(cx, cy, ...size(130, p.height), fade(hz, [1, 0], [0.7, open], [0, 100])),
    radial(cx, cy, ...size(150, p.height * 1.7), fade(hz, [hazeA, 0], [0, 100])),
    linear(p.light, evenStops(st)),
  ]
}

// The first two points sit on the diagonal (first stop top left, last stop
// bottom right) so the mesh always has a clear light-to-deep direction; the
// rest fill the other corners and the middle.
const MESH_ANCHORS = [[18, 20], [82, 80], [82, 18], [20, 82], [50, 50]]

// A falloff that eases out to transparent (smoothstep), so a point's edge never
// shows as a ring. Plain linear fades band visibly on a large blob.
const easedFade = (hex, shoulder, peak = 1) => {
  const pts = [[peak, 0], [0.85 * peak, shoulder]]
  for (let k = 1; k <= 6; k++) {
    const u = k / 6
    pts.push([0.85 * peak * (1 - u * u * (3 - 2 * u)), shoulder + (100 - shoulder) * u])
  }
  return fade(hex, ...pts)
}

// A bell that falls to transparent: the soft edge of a light, with no corner.
const bellFade = (hex, peak) => {
  const pts = []
  for (let k = 0; k < 8; k++) pts.push([peak * Math.exp(-3.5 * (k / 8) ** 2), (k / 8) * 100])
  pts.push([0, 100])
  return fade(hex, ...pts)
}

function meshLayers(st, p, seed) {
  const rng = mulberry32(seed * 7919 + p.layout * 104729)
  const r = 55 + p.softness * 0.25
  const shoulder = (1 - p.softness / 100) * 40
  const layers = []
  for (let i = 0; i < p.points; i++) {
    const [ax, ay] = MESH_ANCHORS[i]
    const x = clamp(ax + (rng() - 0.5) * 2 * p.drift * 0.35, 5, 95)
    const y = clamp(ay + (rng() - 0.5) * 2 * p.drift * 0.35, 5, 95)
    const src = st[i % st.length]
    // Extra points are the stop pushed a step deeper (and a touch richer) or
    // lighter, never a new hue.
    const c = i < st.length ? src : shiftColour(src, i % 2 ? { dL: 0.07, dC: -0.025 } : { dL: -0.05, dC: 0.025 })
    layers.push(radial(x, y, r, r, easedFade(c, shoulder)))
  }
  layers.push(linear(135 + Math.round((rng() - 0.5) * 20), evenStops(st)))
  return layers
}

function curtainColours(st) {
  const cur = st[st.length - 1]
  return [cur, shiftColour(cur, { dL: -0.04, dH: 14 })]
}
export { curtainColours }

// Curtains: layered, blurred ribbons of light over a dark sky. Each band is
// three lights of one hue: a wide dim glow (the haze the curtain throws), a
// ribbon (the body) and a thin bright core. They are blurred by different
// amounts and each ribbon fans a few degrees off the tilt, so the bands overlap
// at different depths instead of stacking as flat blobs. The colours are the
// curtain stop deepened (body) and lightened (core), never a new hue.
function curtainsLayers(st, p, seed) {
  const rng = mulberry32(seed * 6151 + p.bands * 31)
  const bh = hexToOk(st[0])
  const base = okToHex(0.08 + (p.sky / 100) * 0.17, Math.min(bh.C, 0.04), bh.H)
  // The curtain stop and a second tone 8 degrees round the hue wheel. (Not the
  // 14 that curtainColours uses for names: 8-bit rounding eats a few degrees,
  // and the family has to stay inside 15 of its stops.)
  const cur = st[st.length - 1]
  const tones = [0, 8]
  // The body is never darker than L 0.26. Near black, an 8-bit colour has too
  // few steps per channel to hold its hue (a dark orange rounds to pure red),
  // and the gamut clamp can drop a channel to zero.
  const deepen = (dL, dH) => { const L = hexToOk(cur).L; return shiftColour(cur, { dL: Math.max(L + dL, 0.26) - L, dC: 0.04, dH }) }
  const body = tones.map((dH, i) => deepen(i ? -0.24 : -0.2, dH))
  const core = tones.map((dH, i) => shiftColour(cur, { dL: i ? 0.04 : 0.05, dC: -0.02, dH }))
  const glows = []
  const groups = []
  const ribbons = []
  const cores = []
  for (let i = 0; i < p.bands; i++) {
    const t = p.bands === 1 ? 0.5 : i / (p.bands - 1)
    const x = 22 + 56 * t + (rng() - 0.5) * 10
    const y = 54 + (rng() - 0.5) * 12
    const fan = (t - 0.5) * 12
    const rot = p.tilt + fan
    const ribbon = radial(x, y, 9 + rng() * 3, p.length, bellFade(body[i % 2], 0.9))
    const bright = radial(x, y + 5, 3.4 + rng() * 1.6, p.length * 0.7, bellFade(core[i % 2], 0.95))
    glows.push(radial(x, y, 24 + rng() * 6, p.length * 1.05, bellFade(body[i % 2], 0.5)))
    ribbons.push(ribbon)
    cores.push(bright)
    groups.push({ layers: [ribbon], blur: 5, rotate: rot }, { layers: [bright], blur: 2, rotate: rot })
  }
  groups.unshift({ layers: glows, blur: 9, rotate: p.tilt })
  const flat = linear(180, evenStops([base, base]))
  return {
    // The plain-CSS fallback: the same lights, upright and unblurred.
    layers: [...cores, ...ribbons, ...glows, flat],
    soft: { layers: [...glows, ...ribbons, ...cores], under: flat, groups, scale: 4 },
  }
}

// Beams: shafts of light from one end of the frame, fading as they travel.
// Each shaft has a crisp leading edge and a soft trailing one (a lopsided bell,
// so the direction reads); a second, wider rhythm sits under the first so the
// shafts are not evenly spaced; a falloff in the base colour dims them with
// distance and a glow sits at the source. Pure gradients, so it needs no blur.
function beamProfile(hex, peak, period, centre, sigma) {
  const sigL = sigma * 0.55
  const sigR = Math.min(sigma * 1.45, period / 6)
  const at = (pos, a) => [hex, a, clamp(pos, 0, period)]
  const stops = [[hex, 0, 0]]
  for (const z of [3, 2.2, 1.6, 1.1, 0.65, 0.3]) stops.push(at(centre - z * sigL, peak * Math.exp(-0.5 * z * z)))
  stops.push(at(centre, peak))
  for (const z of [0.3, 0.65, 1.1, 1.6, 2.2, 3]) stops.push(at(centre + z * sigR, peak * Math.exp(-0.5 * z * z)))
  stops.push([hex, 0, period])
  return stops
}

function beamsLayers(st, p) {
  const base = st[0]
  const beam = st[st.length - 1]
  const soft = p.softness / 100
  const along = (p.angle + 270) % 360
  const toSource = (along + 180) % 360
  const sx = clamp(50 + 55 * Math.sin(toSource * RAD), 0, 100)
  const sy = clamp(50 - 55 * Math.cos(toSource * RAD), 0, 100)
  const period = p.width * 2.4
  const sigma = period * (0.035 + 0.13 * soft)
  const period2 = period * 1.618
  const lit = shiftColour(beam, { dL: 0.06 })
  return [
    { k: 'linear', angle: along, stops: [[base, 0, 0], [base, 0, 8], [base, 0.3, 40], [base, 0.72, 72], [base, 0.94, 100]], space: 'oklch' },
    { k: 'repeat', angle: p.angle, stops: beamProfile(lit, 0.45, period2, period2 * 0.38, sigma * 0.9), space: 'oklch' },
    { k: 'repeat', angle: p.angle, stops: beamProfile(lit, 0.8, period, period * 0.47, sigma), space: 'oklch' },
    radial(sx, sy, 95, 80, easedFade(beam, 0, 0.7 * (p.base / 100))),
    linear(180, evenStops([base, base])),
  ]
}

/* ── Steps: flat colours sampled from the ramp ───────────────────────── */

function groundColour(st, p) {
  const o = hexToOk(st[0])
  return p.ground === 'light' ? okToHex(0.96, 0.01, o.H) : okToHex(0.13, 0.01, o.H)
}

const stepColour = (st, i, n) => sampleRamp(st, n === 1 ? 0 : i / (n - 1))

// The shapes live in a 100 x 100 square and are drawn with `slice`, so any
// frame shows the middle of the square.
function stepsShapes(st, p) {
  const n = p.steps
  const items = []
  for (let i = 0; i < n; i++) {
    const fill = stepColour(st, i, n)
    const t = n === 1 ? 0 : i / (n - 1)
    if (p.shape === 'arches') {
      const w = 80 * (1 - t * 0.84)
      const top = 12 + t * 56 * (0.45 + p.offset / 100 * 0.9)
      const r = w / 2
      const x0 = 50 - r
      items.push({ fill, d: `M${fmt(x0)} 130V${fmt(top + r)}A${fmt(r)} ${fmt(r)} 0 0 1 ${fmt(x0 + w)} ${fmt(top + r)}V130Z` })
    } else if (p.shape === 'blades') {
      const ang = -160 + t * p.turn
      const len = 58 + t * 18
      items.push({ fill, d: `M0 -4.5H${fmt(len - 2)}Q${fmt(len)} -4.5 ${fmt(len)} -2.5V2.5Q${fmt(len)} 4.5 ${fmt(len - 2)} 4.5H0Z`, transform: `translate(30 70) rotate(${fmt(ang)})` })
    } else if (p.shape === 'fan') {
      const r = 96 * 0.94 ** i
      const a1 = (200 + t * p.turn) * RAD
      const a2 = a1 + 62 * RAD
      const x1 = 64 + r * Math.cos(a1)
      const y1 = 80 + r * Math.sin(a1)
      const x2 = 64 + r * Math.cos(a2)
      const y2 = 80 + r * Math.sin(a2)
      items.push({ fill, d: `M64 80L${fmt(x1)} ${fmt(y1)}A${fmt(r)} ${fmt(r)} 0 0 1 ${fmt(x2)} ${fmt(y2)}Z` })
    } else {
      const ox = -24 + i * (118 / n) * (0.6 + p.offset / 100 * 0.8)
      const bw = 20
      items.push({ fill, d: `M${fmt(ox)} 130C${fmt(ox)} 80 ${fmt(ox + 26)} 40 ${fmt(ox + 64)} -10L${fmt(ox + 64 + bw)} -10C${fmt(ox + 26 + bw)} 40 ${fmt(ox + bw)} 80 ${fmt(ox + bw)} 130Z` })
    }
  }
  return items
}

// The CSS for Steps: hard-stop gradients. Ribbons has no CSS, so it gets a
// plain ramp as a stand-in and says so through `cssKind`.
function stepsLayers(st, p) {
  const n = p.steps
  const ground = groundColour(st, p)
  if (p.shape === 'arches') {
    const stops = []
    for (let i = n - 1; i >= 0; i--) {
      const t = i / (n - 1)
      const inner = i === n - 1 ? 0 : (1 - (i + 1) / (n - 1) * 0.84) * 100
      const outer = (1 - t * 0.84) * 100
      stops.push([stepColour(st, i, n), 1, inner, outer])
    }
    stops.push([ground, 1, 100, 100])
    return [{ k: 'radial', cx: 50, cy: 100, rx: 40, ry: 90, stops, space: 'srgb', hard: true }]
  }
  if (p.shape === 'ribbons') return [linear(90, evenStops([ground, ...st]))]
  const span = p.shape === 'blades' ? p.turn / n : 62
  const start = p.shape === 'blades' ? 0 : p.turn
  const stops = [[ground, 1, 0, 0]]
  for (let i = 0; i < n; i++) stops.push([stepColour(st, i, n), 1, ((start + i * span) / 360) * 100, ((start + (i + 1) * span) / 360) * 100])
  stops.push([ground, 1, ((start + n * span) / 360) * 100, 100])
  return [{ k: 'conic', from: 0, cx: p.shape === 'blades' ? 30 : 64, cy: p.shape === 'blades' ? 70 : 80, stops, space: 'srgb', hard: true }]
}

/* ── the recipe ──────────────────────────────────────────────────────── */

function plainLayers(st, p) {
  if (p.type === 'Radial') return [{ k: 'radial', cx: 50, cy: 50, rx: 70.7, ry: 70.7, stops: evenStops(st), space: p.space }]
  if (p.type === 'Conic') return [{ k: 'conic', from: p.angle, cx: 50, cy: 50, stops: evenStops(st, true), space: p.space }]
  return [linear(p.angle, evenStops(st), p.space)]
}

// How close the CSS is to the canvas: the status line under the code well.
export function cssKind(style, params = {}) {
  if (style === 'plain' || style === 'horizon' || style === 'mesh') return 'exact'
  if (style === 'beams') return 'close'
  if (style === 'curtains') return 'approximation'
  return params.shape === 'ribbons' ? 'none' : 'close'
}
export const CLOSENESS_LABEL = {
  exact: 'Exact',
  close: 'Close to the canvas',
  approximation: 'An approximation. Download an image for an exact copy.',
  none: 'No CSS for this shape. Download an image or SVG.',
}

export function recipe(style, stops, params = {}, seed = 1) {
  const st = hexList(stops)
  style = STYLES.includes(style) ? style : 'plain'
  const p = clampParams(style, params)
  let out
  if (style === 'horizon') out = { layers: horizonLayers(st, p) }
  else if (style === 'mesh') out = { layers: meshLayers(st, p, seed) }
  else if (style === 'curtains') out = curtainsLayers(st, p, seed)
  else if (style === 'beams') out = { layers: beamsLayers(st, p) }
  else if (style === 'steps') out = { layers: stepsLayers(st, p), steps: { shapes: stepsShapes(st, p), ground: groundColour(st, p) } }
  else out = { layers: plainLayers(st, p) }
  return { style, stops: st, params: p, seed, kind: cssKind(style, p), ...out }
}

/* ── CSS ─────────────────────────────────────────────────────────────── */

const stopTxt = (s) => `${rgbCss(s[0], s[1])} ${fmt(s[2])}%${s.length > 3 ? ` ${fmt(s[3])}%` : ''}`

function layerCss(l) {
  const list = l.stops.map(stopTxt).join(', ')
  const space = l.space === 'srgb' ? '' : ' in oklch'
  if (l.k === 'linear') return `linear-gradient(${fmt(l.angle)}deg${space}, ${list})`
  if (l.k === 'repeat') return `repeating-linear-gradient(${fmt(l.angle)}deg${space}, ${list})`
  if (l.k === 'radial') return `radial-gradient(${space ? 'in oklch ' : ''}ellipse ${fmt(l.rx)}% ${fmt(l.ry)}% at ${fmt(l.cx)}% ${fmt(l.cy)}%, ${list})`
  return `conic-gradient(${space ? 'in oklch ' : ''}from ${fmt(l.from)}deg at ${fmt(l.cx)}% ${fmt(l.cy)}%, ${list})`
}

// The `background` value: pure gradients, never a url().
export const toCss = (rec) => rec.layers.map(layerCss).join(', ')

/* ── SVG ─────────────────────────────────────────────────────────────── */

// Dense sRGB stops so SVG and canvas, which blend in sRGB, match `in oklch`.
export function densify(stops, per = 8) {
  const out = []
  for (let i = 0; i < stops.length; i++) {
    const s = stops[i]
    if (s.length > 3) { out.push([s[0], s[1], s[2]], [s[0], s[1], s[3]]); continue }
    out.push([s[0], s[1], s[2]])
    const nx = stops[i + 1]
    if (!nx || nx.length > 3 || nx[2] === s[2] || nx[0] === s[0]) continue
    for (let k = 1; k < per; k++) {
      const t = k / per
      out.push([mixOk(s[0], nx[0], t), s[1] + (nx[1] - s[1]) * t, s[2] + (nx[2] - s[2]) * t])
    }
  }
  return out
}

const svgStops = (stops) => densify(stops).map(([c, a, pos]) => `<stop offset="${fmt(clamp(pos, 0, 100) / 100)}" stop-color="${c}"${a < 0.999 ? ` stop-opacity="${fmt(a)}"` : ''}/>`).join('')

export function toSvg(rec, { w = 1600, h = 900 } = {}) {
  if (rec.style === 'beams' || rec.style === 'curtains') return null
  if (rec.style === 'plain' && rec.params.type === 'Conic') return null
  const head = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">`
  if (rec.style === 'steps') {
    const body = rec.steps.shapes.map((s) => `<path fill="${s.fill}" d="${s.d}"${s.transform ? ` transform="${s.transform}"` : ''}/>`).join('')
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice"><rect x="-1000" y="-1000" width="3000" height="3000" fill="${rec.steps.ground}"/>${body}</svg>`
  }
  let defs = ''
  let body = ''
  ;[...rec.layers].reverse().forEach((l, i) => {
    const id = `g${i}`
    if (l.k === 'linear') {
      const dx = Math.sin(l.angle * RAD)
      const dy = -Math.cos(l.angle * RAD)
      const len = Math.abs(w * dx) + Math.abs(h * dy)
      defs += `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${fmt(w / 2 - (dx * len) / 2)}" y1="${fmt(h / 2 - (dy * len) / 2)}" x2="${fmt(w / 2 + (dx * len) / 2)}" y2="${fmt(h / 2 + (dy * len) / 2)}">${svgStops(l.stops)}</linearGradient>`
      body += `<rect width="${w}" height="${h}" fill="url(#${id})"/>`
    } else {
      defs += `<radialGradient id="${id}">${svgStops(l.stops)}</radialGradient>`
      const last = l.stops[l.stops.length - 1]
      if (last[1] > 0.999) body += `<rect width="${w}" height="${h}" fill="${last[0]}"/>`
      body += `<ellipse cx="${fmt((l.cx / 100) * w)}" cy="${fmt((l.cy / 100) * h)}" rx="${fmt((l.rx / 100) * w)}" ry="${fmt((l.ry / 100) * h)}" fill="url(#${id})"/>`
    }
  })
  return `${head}<defs>${defs}</defs>${body}</svg>`
}

/* ── film grain ──────────────────────────────────────────────────────── */

export const GRAIN_URL = '/textures/grain-256.webp'
export const GRAIN_SIZE = 256
// The tile's spread, as a share of the full range. It has to be big enough
// that the largest View amount (10%) is reachable at an opacity of 1 or less
// (soft-light turns a tile spread of s into about 0.41 s on mid grey, and the
// 8-bit clip trims the tails), and small enough that the WebP stays near 48 KB (fine, barely-softened noise compresses far worse than the lumpy noise it replaced).
// 0.25 gives a mid-grey swing of 0.108, so 10% asks for an opacity of 0.93.
export const GRAIN_TILE_SIGMA = 0.25
// How much of one 3x3 blur is mixed back into the raw noise. Film grain is
// near pixel-sized: a full blur makes it lumpy (it reads as dirt), none leaves
// it digital and sharp. About a third keeps neighbouring pixels only weakly
// related.
export const GRAIN_TILE_SOFTEN = 0.3

// The shared noise tile, made from a seed: fine grey noise with a touch of
// softening, wrapped at the edges (so the tile repeats without a seam) and
// centred on mid grey. scripts/make-grain-tile.mjs encodes exactly this to the
// WebP, and the image painter reads these pixels directly.
export function makeGrainTile(size = GRAIN_SIZE, seed = 0x6d2b79f5) {
  const rng = mulberry32(seed)
  const raw = new Float32Array(size * size)
  for (let i = 0; i < raw.length; i++) raw[i] = rng() + rng() + rng() + rng() - 2
  const sm = new Float32Array(raw.length)
  const at = (x, y) => raw[((y + size) % size) * size + ((x + size) % size)]
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const blur = (4 * at(x, y) + 2 * (at(x - 1, y) + at(x + 1, y) + at(x, y - 1) + at(x, y + 1)) + at(x - 1, y - 1) + at(x + 1, y - 1) + at(x - 1, y + 1) + at(x + 1, y + 1)) / 16
      sm[y * size + x] = raw[y * size + x] * (1 - GRAIN_TILE_SOFTEN) + blur * GRAIN_TILE_SOFTEN
    }
  }
  let sum = 0
  for (let i = 0; i < sm.length; i++) sum += sm[i]
  const mean = sum / sm.length
  let sq = 0
  for (let i = 0; i < sm.length; i++) sq += (sm[i] - mean) ** 2
  const gain = GRAIN_TILE_SIGMA / Math.sqrt(sq / sm.length)
  const data = new Uint8ClampedArray(sm.length)
  for (let i = 0; i < sm.length; i++) data[i] = Math.round(clamp(0.5 + (sm[i] - mean) * gain, 0, 1) * 255)
  return { size, data }
}

const softLight = (cb, cs) => {
  if (cs <= 0.5) return cb - (1 - 2 * cs) * cb * (1 - cb)
  const d = cb <= 0.25 ? ((16 * cb - 12) * cb + 4) * cb : Math.sqrt(cb)
  return cb + (2 * cs - 1) * (d - cb)
}

let defaultTile = null
export const grainTile = () => defaultTile || (defaultTile = makeGrainTile())

// How much of the tile's soft-light swing is one unit of "amount". Amount is
// defined as the luminance standard deviation the grain adds to a flat mid
// grey field, as a share of the full range, so 4.5% is about 11.5 of 255 and
// can be measured. `tile.sigma` is that swing at full opacity.
export function grainSigma(tile = grainTile()) {
  if (tile.sigma) return tile.sigma
  let sum = 0
  let sq = 0
  for (let i = 0; i < tile.data.length; i++) {
    const d = softLight(0.5, tile.data[i] / 255) - 0.5
    sum += d
    sq += d * d
  }
  const n = tile.data.length
  tile.sigma = Math.sqrt(sq / n - (sum / n) ** 2)
  return tile.sigma
}

// The CSS opacity that gives the same amount on screen.
export const grainOpacity = (amount, tile = grainTile()) => clamp(amount / grainSigma(tile), 0, 1)

// Soft-light the tile over RGBA pixels in place. `scale` is how many output
// pixels one tile pixel covers (screen CSS draws the tile at 128px, so 0.5).
export function applyGrain(rgba, w, h, amount, { tile = grainTile(), scale = 0.5 } = {}) {
  const a = grainOpacity(amount, tile)
  const { size, data } = tile
  for (let y = 0; y < h; y++) {
    const ty = Math.floor(y / scale) % size
    for (let x = 0; x < w; x++) {
      const t = data[ty * size + (Math.floor(x / scale) % size)] / 255
      const o = (y * w + x) * 4
      for (let c = 0; c < 3; c++) {
        const cb = rgba[o + c] / 255
        rgba[o + c] = Math.round((cb + a * (softLight(cb, t) - cb)) * 255)
      }
    }
  }
  return rgba
}

// +-1 level of seeded noise per channel, so 8-bit steps do not band.
export function ditherPixels(rgba, seed = 1) {
  const rng = mulberry32(seed)
  for (let i = 0; i < rgba.length; i += 4) {
    for (let c = 0; c < 3; c++) rgba[i + c] = clamp(rgba[i + c] + Math.floor(rng() * 3) - 1, 0, 255)
  }
  return rgba
}

/* ── Glass bars ──────────────────────────────────────────────────────── */

export const GLASS_DEFAULTS = { bars: 12, orient: 'vertical', frost: 50 }
// The seam between two flutes, as a share of one bar's period.
const GLASS_GAP = 0.03
// How many bar-widths of the scene each flute gathers into itself. A flute is a
// small cylindrical lens: it shows the scene around it squeezed into its own
// width and flipped, which is what makes the colour jump at every bar edge.
const GLASS_REFRACT = 2.4

// The frost, in CSS px of blur on the lens layer (2px at the default 50).
export const glassBlur = (frost) => (clamp(frost, 0, 100) / 100) * 4

// The light on one flute across its period (fractions of the period): a dark
// seam, a hairline highlight on the leading edge, a soft sheen that falls off
// over the first half, then a shadow gathering toward the trailing edge.
const SEAM = GLASS_GAP / 2
export const GLASS_SHADE = [
  [0, 'rgba(0,0,0,0.12)'],
  [SEAM, 'rgba(255,255,255,0.55)'],
  [SEAM + 0.035, 'rgba(255,255,255,0.22)'],
  [0.32, 'rgba(255,255,255,0.08)'],
  [0.58, 'rgba(255,255,255,0)'],
  [0.78, 'rgba(0,0,0,0)'],
  [1 - SEAM - 0.014, 'rgba(0,0,0,0.16)'],
  [1 - SEAM, 'rgba(0,0,0,0.34)'],
  [1 - SEAM, 'rgba(0,0,0,0.12)'],
  [1, 'rgba(0,0,0,0.12)'],
]

export function glassRecipe(over = {}) {
  const g = { ...GLASS_DEFAULTS, ...over }
  return { bars: clamp(Math.round(g.bars), 6, 24), orient: g.orient === 'horizontal' ? 'horizontal' : 'vertical', frost: clamp(g.frost, 0, 100) }
}

/* ── live DOM tree ───────────────────────────────────────────────────── */

const FILL = { position: 'absolute', inset: 0 }

// Each flute is its own window onto a full copy of the scene: the copy is
// placed so the flute sits over its own part of the picture, then squeezed
// about the flute's centre and flipped. The copy is the scene's own tree, so
// every family, including Steps and Curtains, gets the same glass.
function glassNodes(sceneNodes, g) {
  const v = g.orient === 'vertical'
  const period = 100 / g.bars
  const size = period * (1 - GLASS_GAP)
  const bars = []
  for (let i = 0; i < g.bars; i++) {
    const pos = i * period + (period * GLASS_GAP) / 2
    const centre = pos + size / 2
    const inner = v
      ? { position: 'absolute', top: 0, height: '100%', left: `${fmt((-pos / size) * 100)}%`, width: `${fmt(10000 / size)}%`, transformOrigin: `${fmt(centre)}% 50%`, transform: `scaleX(${fmt(-1 / GLASS_REFRACT)})` }
      : { position: 'absolute', left: 0, width: '100%', top: `${fmt((-pos / size) * 100)}%`, height: `${fmt(10000 / size)}%`, transformOrigin: `50% ${fmt(centre)}%`, transform: `scaleY(${fmt(-1 / GLASS_REFRACT)})` }
    bars.push({
      style: v
        ? { position: 'absolute', top: 0, height: '100%', left: `${fmt(pos)}%`, width: `${fmt(size)}%`, overflow: 'hidden' }
        : { position: 'absolute', left: 0, width: '100%', top: `${fmt(pos)}%`, height: `${fmt(size)}%`, overflow: 'hidden' },
      children: [{ style: inner, children: sceneNodes }],
    })
  }
  const shade = `repeating-linear-gradient(${v ? 90 : 180}deg, ${GLASS_SHADE.map(([at, c]) => `${c} ${fmt(at * period)}%`).join(', ')})`
  return [
    { style: { ...FILL, filter: g.frost > 0 ? `blur(${fmt(glassBlur(g.frost))}px)` : undefined }, children: bars },
    { style: { ...FILL, background: shade } },
  ]
}

// The soft-light groups of Curtains: a small copy of each light, blurred, then
// scaled up. Blurring a quarter-size layer and enlarging it gives the wide blur
// at a sixteenth of the pixels.
function softNodes(s) {
  return [
    { style: { ...FILL, background: layerCss(s.under) } },
    ...s.groups.map((g) => ({
      style: { ...FILL, transform: `rotate(${fmt(g.rotate)}deg) scale(1.2)` },
      children: [{
        style: { position: 'absolute', left: 0, top: 0, width: '25%', height: '25%', transformOrigin: '0 0', transform: `scale(${s.scale})`, filter: `blur(${g.blur}px)`, background: g.layers.map(layerCss).join(', ') },
      }],
    })),
  ]
}

// `finishes.grain` is a percent here (4.5 is 4.5%); `paint()` takes the same
// amount as a fraction (0.045), like applyGrain.
// A tree of absolutely positioned layers a page can render: `{ style,
// children?, svg? }`. The same recipe, with the filters CSS can do live.
export function liveTree(rec, finishes = {}, { grainUrl = GRAIN_URL } = {}) {
  let nodes
  if (rec.style === 'steps') nodes = [{ style: FILL, svg: toSvg(rec, { w: 100, h: 100 }) }]
  else if (rec.soft) nodes = softNodes(rec.soft)
  else nodes = [{ style: { ...FILL, background: toCss(rec) } }]
  if (finishes.glass) nodes = [...nodes, ...glassNodes(nodes, glassRecipe(finishes.glass))]
  if (finishes.grain > 0) {
    nodes.push({ style: { ...FILL, backgroundImage: `url(${grainUrl})`, backgroundSize: '128px', mixBlendMode: 'soft-light', opacity: grainOpacity(finishes.grain / 100) } })
  }
  return nodes
}
/* ── canvas painter (image export) ───────────────────────────────────── */

const rgba = (c, a) => { const [r, g, b] = hexToRgb(c); return `rgba(${r},${g},${b},${fmt(a)})` }

function addStops(grad, stops) {
  for (const [c, a, pos] of densify(stops)) grad.addColorStop(clamp(pos / 100, 0, 1), rgba(c, a))
}

function drawLayer(ctx, l, w, h) {
  if (l.k === 'linear' || l.k === 'repeat') {
    const dx = Math.sin(l.angle * RAD)
    const dy = -Math.cos(l.angle * RAD)
    const len = Math.abs(w * dx) + Math.abs(h * dy)
    const x0 = w / 2 - (dx * len) / 2
    const y0 = h / 2 - (dy * len) / 2
    if (l.k === 'linear') {
      const g = ctx.createLinearGradient(x0, y0, x0 + dx * len, y0 + dy * len)
      addStops(g, l.stops)
      ctx.fillStyle = g
      ctx.fillRect(0, 0, w, h)
      return
    }
    const period = l.stops[l.stops.length - 1][2] / 100
    for (let k = -1; k * period < 1; k++) {
      const s0 = k * period * len
      const g = ctx.createLinearGradient(x0 + dx * s0, y0 + dy * s0, x0 + dx * (s0 + period * len), y0 + dy * (s0 + period * len))
      addStops(g, l.stops.map(([c, a, pos]) => [c, a, (pos / (period * 100)) * 100]))
      ctx.fillStyle = g
      ctx.fillRect(0, 0, w, h)
    }
    return
  }
  if (l.k === 'radial') {
    const cx = (l.cx / 100) * w
    const cy = (l.cy / 100) * h
    const rx = (l.rx / 100) * w
    const ry = (l.ry / 100) * h
    const last = l.stops[l.stops.length - 1]
    if (last[1] > 0.999) { ctx.fillStyle = last[0]; ctx.fillRect(0, 0, w, h) }
    ctx.save()
    ctx.translate(cx, cy)
    ctx.scale(rx, ry)
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1)
    addStops(g, l.stops)
    ctx.fillStyle = g
    ctx.fillRect(-cx / rx, -cy / ry, w / rx, h / ry)
    ctx.restore()
    return
  }
  if (typeof ctx.createConicGradient === 'function') {
    const g = ctx.createConicGradient((l.from - 90) * RAD, (l.cx / 100) * w, (l.cy / 100) * h)
    addStops(g, l.stops)
    ctx.fillStyle = g
    ctx.fillRect(0, 0, w, h)
  }
}

function drawLayers(ctx, layers, w, h) {
  for (let i = layers.length - 1; i >= 0; i--) drawLayer(ctx, layers[i], w, h)
}

function drawSvg(ctx, svg, w, h) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => { ctx.drawImage(img, 0, 0, w, h); resolve() }
    img.onerror = () => reject(new Error('The Steps SVG could not be drawn'))
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
  })
}

// Draws a small copy, blurs it, and stretches it back: the same trick the
// screen uses to get a wide blur at a sixteenth of the cost.
function blurredSmall(src, sw, sh, blurPx, makeCanvas) {
  const out = makeCanvas(sw, sh)
  const c = out.getContext('2d')
  if ('filter' in c) c.filter = `blur(${fmt(blurPx)}px)`
  c.imageSmoothingQuality = 'high'
  c.drawImage(src, 0, 0, sw, sh)
  return out
}

const defaultCanvas = (w, h) => {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h)
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return c
}

// Paints a recipe, with finishes, onto a 2D context w x h. `cssWidth` is the
// width the live version is shown at, so blur and grain size match it.
export async function paint(ctx, w, h, rec, opts = {}) {
  const { grain = 0, glass = null, cssWidth = w, makeCanvas = defaultCanvas, seed = rec.seed } = opts
  const k = w / cssWidth
  const sw = Math.max(1, Math.round(w / 4))
  const sh = Math.max(1, Math.round(h / 4))
  if (rec.style === 'steps') {
    await drawSvg(ctx, toSvg(rec, { w, h }), w, h)
  } else if (rec.soft) {
    drawLayer(ctx, rec.soft.under, w, h)
    // Each group is a small copy of its lights, blurred and enlarged, rotated
    // about the middle: the same steps the screen takes.
    for (const g of rec.soft.groups) {
      const small = makeCanvas(sw, sh)
      drawLayers(small.getContext('2d'), g.layers, sw, sh)
      const blurred = blurredSmall(small, sw, sh, g.blur * k, makeCanvas)
      ctx.save()
      ctx.translate(w / 2, h / 2)
      ctx.rotate(g.rotate * RAD)
      ctx.scale(1.2, 1.2)
      ctx.translate(-w / 2, -h / 2)
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(blurred, 0, 0, w, h)
      ctx.restore()
    }
  } else {
    drawLayers(ctx, rec.layers, w, h)
  }
  if (glass) {
    const g = glassRecipe(glass)
    const v = g.orient === 'vertical'
    const frosted = blurredSmall(ctx.canvas, sw, sh, (glassBlur(g.frost) / 4) * k, makeCanvas)
    const span = v ? w : h
    const period = span / g.bars
    const bar = period * (1 - GLASS_GAP)
    ctx.imageSmoothingQuality = 'high'
    for (let i = 0; i < g.bars; i++) {
      const s0 = i * period + (period * GLASS_GAP) / 2
      const centre = s0 + bar / 2
      // Each flute: clip to its window, then draw the whole scene squeezed
      // about the flute's centre and flipped.
      ctx.save()
      ctx.beginPath()
      if (v) ctx.rect(s0, 0, bar, h)
      else ctx.rect(0, s0, w, bar)
      ctx.clip()
      if (v) { ctx.translate(centre, 0); ctx.scale(-1 / GLASS_REFRACT, 1); ctx.translate(-centre, 0) }
      else { ctx.translate(0, centre); ctx.scale(1, -1 / GLASS_REFRACT); ctx.translate(0, -centre) }
      ctx.drawImage(frosted, 0, 0, w, h)
      ctx.restore()
      // The light across the whole period, seams included.
      const p0 = i * period
      const grad = v ? ctx.createLinearGradient(p0, 0, p0 + period, 0) : ctx.createLinearGradient(0, p0, 0, p0 + period)
      for (const [at, c] of GLASS_SHADE) grad.addColorStop(at, c)
      ctx.fillStyle = grad
      if (v) ctx.fillRect(p0, 0, period, h)
      else ctx.fillRect(0, p0, w, period)
    }
  }
  const img = ctx.getImageData(0, 0, w, h)
  if (grain > 0) applyGrain(img.data, w, h, grain, { scale: 0.5 * k })
  else ditherPixels(img.data, seed)
  ctx.putImageData(img, 0, 0)
}
