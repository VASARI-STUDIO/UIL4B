// THE ARGUMENT LISTS THE CONVERTER HANDS TO ffmpeg, AND THE ARITHMETIC AROUND
// THEM. DOM-free and React-free on purpose: every number and flag in here is a
// claim about the file somebody downloads, so it is tested as data
// (tests/unit/media-encode.test.js) rather than inferred from a render.
//
// ── WHAT THE ENGINE ACTUALLY HAS ────────────────────────────────────────────
// Measured 2026-09-23 against the pinned single-threaded core
// (@ffmpeg/core@0.12.6) in Chromium, by running `-encoders` and then a real
// 12-frame, 240x160, alpha-carrying PNG sequence through each candidate:
//
//   gif            native encoder             ok    34 ms
//   libwebp_anim   animated WebP              ok    16 ms
//   apng           native encoder             ok    12 ms
//   libx264        MP4 / H.264                ok    46 ms
//   libvpx         WebM / VP8                 ok    79 ms
//   libvpx-vp9     WebM / VP9                 CRASHED: "memory access out of
//                                             bounds", and the engine instance
//                                             is unusable afterwards
//
// So WebM here is VP8, not VP9. That is not a preference; VP9 does not run in
// this build. A crash inside exec() leaves the wasm heap corrupt, which is why
// ffmpegEngine.js throws the instance away after any failed job.
//
// ── LOOP COUNTS, MEASURED RATHER THAN READ FROM THE DOCS ────────────────────
// Each container spells "how many times does this play" differently. Encoded
// with each flag and read back with the browser's own ImageDecoder
// (repetitionCount; Infinity means forever):
//
//   GIF   -loop -1 → 0 repeats (plays once)   -loop 0 → forever   -loop N → N repeats
//   WebP  -loop 0  → forever                  -loop N → N-1 repeats (N plays)
//   APNG  -plays 0 → forever                  -plays N → N-1 repeats (N plays)
//
// GIF is the odd one out: its number counts REPEATS, the other two count PLAYS.
// The UI speaks in plays ("Play twice"), and loopArgs() does the translation.
// MP4 and WebM have no loop field at all — whether a video loops is decided by
// whatever plays it — so for those the control is disabled and says so.

/** Output formats for both the animation builder and Video → Animation. */
export const ANIMATION_FORMATS = [
  { id: 'gif', label: 'GIF', ext: 'gif', mime: 'image/gif', kind: 'image', loops: true, alpha: true, alphaNote: '1-bit' },
  { id: 'webp', label: 'Animated WebP', ext: 'webp', mime: 'image/webp', kind: 'image', loops: true, alpha: true },
  { id: 'apng', label: 'APNG', ext: 'png', mime: 'image/apng', kind: 'image', loops: true, alpha: true },
  { id: 'mp4', label: 'MP4 (H.264)', ext: 'mp4', mime: 'video/mp4', kind: 'video', loops: false, alpha: false, evenDims: true },
  { id: 'webm', label: 'WebM (VP8)', ext: 'webm', mime: 'video/webm', kind: 'video', loops: false, alpha: true },
]

export const findFormat = (id) => ANIMATION_FORMATS.find((f) => f.id === id) || ANIMATION_FORMATS[0]

/**
 * Two more things the Video tab can save, both of the frames the edit makes:
 * every frame as a PNG in a ZIP, and one sheet with all of them in a grid. The
 * engine writes the frames as one stream of PNGs (image2pipe), which
 * splitPngStream() cuts apart again for the ZIP; the sheet is one PNG from the
 * `tile` filter.
 */
export const FRAME_EXPORTS = [
  { id: 'frames', label: 'Frames (ZIP of PNGs)', ext: 'zip', engineExt: 'pngs', mime: 'application/zip', kind: 'frames', loops: false, alpha: true },
  { id: 'sprite', label: 'Sprite sheet (PNG)', ext: 'png', mime: 'image/png', kind: 'image', loops: false, alpha: true },
]
export const VIDEO_FORMATS = [...ANIMATION_FORMATS, ...FRAME_EXPORTS]
export const findVideoFormat = (id) => VIDEO_FORMATS.find((f) => f.id === id) || ANIMATION_FORMATS[0]

/** "How many times it plays", as the control offers it. 0 = forever. */
export const PLAY_OPTIONS = [
  { id: 0, label: 'Loop forever' },
  { id: 1, label: 'Play once' },
  { id: 2, label: 'Play twice' },
  { id: 3, label: 'Play 3 times' },
  { id: 5, label: 'Play 5 times' },
]

export const QUALITY_LEVELS = [
  { id: 'low', label: 'Low (smaller file)' },
  { id: 'medium', label: 'Medium' },
  { id: 'high', label: 'High' },
]

// GIF stores a frame's delay in hundredths of a second, so above 50 fps two
// neighbouring rates encode to the same file. The same ceiling everywhere
// keeps one control honest for every format.
export const FPS_MIN = 1
export const FPS_MAX = 50
export const clampFps = (n) => Math.max(FPS_MIN, Math.min(FPS_MAX, Math.round(Number(n) || 0) || FPS_MIN))

// A ceiling on what one browser tab is asked to hold. Every frame is decoded,
// redrawn and written into the engine's in-memory filesystem as a PNG, and the
// single-threaded core then walks all of them; past this the tab runs out of
// memory long before it runs out of patience.
export const MAX_FRAMES = 300
export const MAX_ANIMATION_SIDE = 1920

/** Frame file name inside the engine's filesystem: f0001.png, f0002.png… */
export const frameName = (i) => `f${String(i + 1).padStart(4, '0')}.png`
export const FRAME_PATTERN = 'f%04d.png'

// ── The video editor's choices (Video tab) ───────────────────────────────────
export const CROP_SHAPES = [
  { id: 'original', label: 'Original', ratio: null },
  { id: '1:1', label: '1:1', ratio: [1, 1] },
  { id: '4:5', label: '4:5', ratio: [4, 5] },
  { id: '16:9', label: '16:9', ratio: [16, 9] },
  { id: '9:16', label: '9:16', ratio: [9, 16] },
  // A box the visitor drags or types in; its size lives in the recipe, not here.
  { id: 'custom', label: 'Custom', ratio: null },
]
/** What happens to the part of a ratio that does not fit: cut it off, or add bars. */
export const FIT_MODES = [
  { id: 'crop', label: 'Crop' },
  { id: 'fit', label: 'Fit' },
]
/** A cut-out drawn over the final picture. Outside it is transparent or a colour. */
export const CUTOUTS = [
  { id: 'none', label: 'None' },
  { id: 'circle', label: 'Circle' },
  { id: 'oval', label: 'Oval' },
  { id: 'rounded', label: 'Rounded' },
]
export const CORNER_MIN = 1
export const CORNER_MAX = 50
export const CORNER_DEFAULT = 20
/** The fill outside bars and cut-outs. 'transparent' needs a format with alpha. */
export const TRANSPARENT = 'transparent'
export const FILL_DEFAULT = '#000000'
export const isHexColour = (s) => /^#[0-9a-f]{6}$/i.test(String(s || ''))
/** Degrees clockwise. */
export const TURNS = [
  { id: 0, label: 'None' },
  { id: 90, label: '90° right' },
  { id: 180, label: '180°' },
  { id: 270, label: '90° left' },
]
export const SPEEDS = [
  { id: 0.25, label: '¼×', name: 'Quarter speed' },
  { id: 0.5, label: '½×', name: 'Half speed' },
  { id: 1, label: '1×', name: 'Normal speed' },
  { id: 1.5, label: '1.5×', name: '1.5 times speed' },
  { id: 2, label: '2×', name: 'Double speed' },
  { id: 4, label: '4×', name: '4 times speed' },
]
export const DIRECTIONS = [
  { id: 'forward', label: 'Forward' },
  { id: 'reverse', label: 'Reverse' },
  { id: 'boomerang', label: 'Boomerang' },
]
export const DITHERS = [
  { id: 'none', label: 'None', filter: 'none' },
  { id: 'pattern', label: 'Pattern', filter: 'bayer:bayer_scale=2' },
  { id: 'diffusion', label: 'Diffusion', filter: 'floyd_steinberg' },
]
export const GIF_COLOURS_MIN = 2
export const GIF_COLOURS_MAX = 256
// Reverse holds every decoded frame in memory. This budget is 300 frames at
// 640 x 640. A judgement, not a measurement.
export const REVERSE_MAX_PIXELS = 300 * 640 * 640

const floorEven = (n) => 2 * Math.floor(n / 2)
const clampColours = (n) => Math.max(GIF_COLOURS_MIN, Math.min(GIF_COLOURS_MAX, Math.round(Number(n) || GIF_COLOURS_MAX)))

/**
 * The part of a source a shape keeps: `{ w, h, x, y, axis }` in source pixels,
 * all even, or null when there is nothing to cut. `anchor` is 'start' |
 * 'centre' | 'end'; `axis` is 'x' when the sides are cut, 'y' for top/bottom.
 */
export function cropRect(srcW, srcH, shapeId, anchor = 'centre') {
  const shape = CROP_SHAPES.find((s) => s.id === shapeId)
  if (!shape || !shape.ratio || !(srcW > 0 && srcH > 0)) return null
  const [a, b] = shape.ratio
  const w = floorEven(Math.min(srcW, (srcH * a) / b))
  const h = floorEven(Math.min(srcH, (srcW * b) / a))
  // A sliver (a very thin source at a wide shape) leaves nothing ffmpeg can crop.
  if (w < 2 || h < 2) return null
  if (w >= srcW - 1 && h >= srcH - 1) return null
  const place = (full, part) => (anchor === 'start' ? 0 : anchor === 'end' ? floorEven(full - part) : floorEven((full - part) / 2))
  return { w, h, x: place(srcW, w), y: place(srcH, h), axis: w < srcW - 1 ? 'x' : 'y' }
}

const ceilEven = (n) => 2 * Math.ceil(n / 2)

/**
 * A typed or dragged box held to the picture: whole pixels, even sides (H.264
 * wants them), inside the source, at least 2 x 2. A missing field means the
 * whole picture on that side.
 */
export function clampBox(box, srcW, srcH) {
  if (!(srcW >= 2 && srcH >= 2)) return null
  const num = (v, fallback) => (Number.isFinite(Number(v)) && v !== '' && v != null ? Math.round(Number(v)) : fallback)
  const w = Math.max(2, Math.min(floorEven(srcW), floorEven(num(box?.w, srcW))))
  const h = Math.max(2, Math.min(floorEven(srcH), floorEven(num(box?.h, srcH))))
  const x = floorEven(Math.max(0, Math.min(srcW - w, num(box?.x, 0))))
  const y = floorEven(Math.max(0, Math.min(srcH - h, num(box?.y, 0))))
  return { x, y, w, h }
}

/** The custom box as a crop, or null when it covers the whole picture. */
export function freeCrop(srcW, srcH, box) {
  const b = clampBox(box, srcW, srcH)
  if (!b || (b.w >= srcW - 1 && b.h >= srcH - 1)) return null
  return { ...b, axis: b.w < srcW - 1 ? 'x' : 'y' }
}

/**
 * Moves a crop box by a drag of `dx`, `dy` source pixels from where it was when
 * the drag began. `handle` is 'move' or the edge or corner being pulled
 * ('n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'). The result is held to the same
 * rules as a typed box, so a drag and the four number fields always agree.
 */
export function dragBox(box, handle, dx, dy, srcW, srcH) {
  const b = clampBox(box, srcW, srcH)
  if (!b) return null
  let x1 = b.x
  let y1 = b.y
  let x2 = b.x + b.w
  let y2 = b.y + b.h
  if (handle === 'move') {
    const mx = Math.max(-x1, Math.min(srcW - x2, dx))
    const my = Math.max(-y1, Math.min(srcH - y2, dy))
    x1 += mx; x2 += mx; y1 += my; y2 += my
  } else {
    if (handle.includes('w')) x1 = Math.max(0, Math.min(x2 - 2, x1 + dx))
    if (handle.includes('e')) x2 = Math.min(srcW, Math.max(x1 + 2, x2 + dx))
    if (handle.includes('n')) y1 = Math.max(0, Math.min(y2 - 2, y1 + dy))
    if (handle.includes('s')) y2 = Math.min(srcH, Math.max(y1 + 2, y2 + dy))
  }
  return clampBox({ x: x1, y: y1, w: x2 - x1, h: y2 - y1 }, srcW, srcH)
}

/**
 * Where the source sits on a canvas of a shape's ratio, with bars filling the
 * rest: `{ w, h, x, y, axis }` (canvas size, then the source's top-left), or
 * null when the source already has that ratio. `axis` is the side the bars go on.
 */
export function padRect(srcW, srcH, shapeId, anchor = 'centre') {
  const shape = CROP_SHAPES.find((s) => s.id === shapeId)
  if (!shape || !shape.ratio || !(srcW > 0 && srcH > 0)) return null
  const [a, b] = shape.ratio
  const wide = srcW * b >= srcH * a // the source is wider than the shape: bars above and below
  const w = wide ? ceilEven(srcW) : ceilEven((srcH * a) / b)
  const h = wide ? ceilEven((srcW * b) / a) : ceilEven(srcH)
  if (w <= srcW + 1 && h <= srcH + 1) return null
  const place = (full, part) => (anchor === 'start' ? 0 : anchor === 'end' ? floorEven(full - part) : floorEven((full - part) / 2))
  return { w, h, x: place(w, srcW), y: place(h, srcH), axis: w > srcW + 1 ? 'x' : 'y' }
}

/**
 * What the Shape row asks of the frame before it is turned and scaled:
 * `crop` (cut a box out), `pad` (put the picture on a bigger canvas) or
 * neither, and `frame`, the size that goes on to the turn and the scale.
 */
export function cropPlan(srcW, srcH, { shape = 'original', anchor = 'centre', box = null, fit = 'crop' } = {}) {
  const none = { crop: null, pad: null, frame: null }
  if (!(srcW > 0 && srcH > 0)) return none
  if (shape === 'custom') {
    const crop = freeCrop(srcW, srcH, box)
    return crop ? { crop, pad: null, frame: { w: crop.w, h: crop.h } } : none
  }
  if (fit === 'fit') {
    const pad = padRect(srcW, srcH, shape, anchor)
    if (pad) return { crop: null, pad, frame: { w: pad.w, h: pad.h } }
  }
  const crop = fit === 'fit' ? null : cropRect(srcW, srcH, shape, anchor)
  return crop ? { crop, pad: null, frame: { w: crop.w, h: crop.h } } : none
}

/**
 * Resolves the Outside colour for a format: transparent only where the format
 * can carry alpha, otherwise a solid colour (black unless one was chosen).
 */
export function resolveFill(fmt, fill) {
  const colour = isHexColour(fill) ? fill.toLowerCase() : FILL_DEFAULT
  return { transparent: fill === TRANSPARENT && !!fmt?.alpha, colour }
}

/** Filters that put the picture on its padded canvas. */
export function padFilters(pad, { transparent, colour }) {
  if (!pad) return []
  const at = `${pad.w}:${pad.h}:${pad.x}:${pad.y}`
  return transparent ? ['format=rgba', `pad=${at}:color=black@0`] : [`pad=${at}:color=0x${colour.slice(1)}`]
}

/**
 * The filter that cuts the final picture to a circle, oval or rounded box.
 * Coverage (0 to 1, with a pixel of edge softness) is worked out per pixel in
 * `geq` from the picture's own width and height, so it needs no mask file and
 * no knowledge of the output size. Transparent keeps the picture's alpha times
 * the coverage; a solid fill blends toward the colour instead.
 */
export function cutoutFilter(cut, { radius = CORNER_DEFAULT, transparent = true, colour = FILL_DEFAULT } = {}) {
  const px = 'X+0.5-W/2'
  const py = 'Y+0.5-H/2'
  let steps
  let cover
  if (cut === 'circle') {
    steps = []
    cover = `clip(min(W,H)/2-hypot(${px},${py})+0.5,0,1)`
  } else if (cut === 'oval') {
    steps = []
    cover = `clip((1-hypot((${px})/(W/2),(${py})/(H/2)))*min(W,H)/2+0.5,0,1)`
  } else if (cut === 'rounded') {
    const pct = Math.max(CORNER_MIN, Math.min(CORNER_MAX, Math.round(Number(radius) || CORNER_DEFAULT)))
    steps = [
      `st(1,${pct}/100*min(W,H))`,
      `st(2,abs(${px})-(W/2-ld(1)))`,
      `st(3,abs(${py})-(H/2-ld(1)))`,
    ]
    cover = 'clip(0.5-(hypot(max(ld(2),0),max(ld(3),0))+min(max(ld(2),ld(3)),0)-ld(1)),0,1)'
  } else {
    return ''
  }
  const seq = (...tail) => [...steps, ...tail].join(';')
  if (transparent) {
    return `format=gbrap,geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':a='${seq(`alpha(X,Y)*${cover}`)}'`
  }
  const rgb = [colour.slice(1, 3), colour.slice(3, 5), colour.slice(5, 7)].map((h) => parseInt(h, 16))
  const mix = (plane, bg) => `'${seq(`st(0,${cover})`, `${plane}(X,Y)*ld(0)+${bg}*(1-ld(0))`)}'`
  return `format=gbrap,geq=r=${mix('r', rgb[0])}:g=${mix('g', rgb[1])}:b=${mix('b', rgb[2])}:a=255`
}

/** Seconds one pass of the clip takes on screen: a boomerang runs the clip twice. */
export function loopSeconds(len, speed, direction) {
  const pass = direction === 'boomerang' ? 2 * len : len
  return pass / (speed || 1)
}

/**
 * The second of the source a preview shows `progress` (0 to 1) of the way
 * through one pass. Reverse runs the clip backwards; a boomerang goes there and
 * back.
 */
export function previewSourceTime(progress, len, direction) {
  const p = Math.max(0, Math.min(1, Number(progress) || 0))
  if (direction === 'reverse') return (1 - p) * len
  if (direction === 'boomerang') return (p < 0.5 ? 2 * p : 2 - 2 * p) * len
  return p * len
}

/** Filters for a turn in degrees clockwise. */
export function turnFilters(turn) {
  if (turn === 90) return ['transpose=1']
  if (turn === 270) return ['transpose=2']
  if (turn === 180) return ['hflip', 'vflip']
  return []
}

// Labels fw, bw and rv stay clear of s0, s1 and p, which the GIF palette uses.
// start_frame=1 drops the reversed copy's first frame (the forward run's last)
// so the turn-around frame is not shown twice.
const BOOMERANG = 'split[fw][bw];[bw]reverse,trim=start_frame=1,setpts=PTS-STARTPTS[rv];[fw][rv]concat=n=2:v=1:a=0'
export function directionFilter(direction) {
  if (direction === 'reverse') return 'reverse'
  if (direction === 'boomerang') return BOOMERANG
  return ''
}

/**
 * The size that comes out, mirroring the scale filter in videoToAnimationArgs:
 * the width is held to the cap on the longer side and to at least 2, the height
 * follows the shape and is capped too. `crop` is anything with w and h (a crop
 * box or a padded canvas). Sizes are the picture as displayed, so a clip whose
 * pixels are not square (the scale reads the file's own sample aspect ratio)
 * predicts what it encodes.
 */
export function outputSize(srcW, srcH, { crop = null, turn = 0, width = 480 } = {}) {
  let iw = crop ? crop.w : srcW
  let ih = crop ? crop.h : srcH
  if (!(iw > 0 && ih > 0)) return { w: 0, h: 0 }
  if (turn === 90 || turn === 270) [iw, ih] = [ih, iw]
  const asked = Math.max(16, Math.min(MAX_ANIMATION_SIDE, Math.round(Number(width) || 480)))
  const w = Math.max(2, floorEven(Math.min(asked, (iw * MAX_ANIMATION_SIDE) / ih)))
  return { w, h: Math.min(MAX_ANIMATION_SIDE, Math.max(2, 2 * Math.round((w * ih) / (iw * 2)))) }
}

/** How many frames come out. A boomerang runs forward then back, sharing the turn-around frame. */
export function outputFrames(clipSeconds, speed, fps, direction) {
  const n = Math.max(1, Math.round((clipSeconds / (speed || 1)) * clampFps(fps)))
  return direction === 'boomerang' ? 2 * n - 1 : n
}

export const reverseFits = (forwardFrames, w, h) => forwardFrames * w * h <= REVERSE_MAX_PIXELS

// A file bigger than this is not read to find its length; Reverse stays off for it.
export const PROBE_MAX_BYTES = 100 * 1024 * 1024
// A frame delay below this many hundredths of a second plays at 0.1 s, as in
// browsers and in ffmpeg's GIF reader.
const GIF_MIN_DELAY_CS = 2

/**
 * How long an animated GIF or animated WebP runs, in seconds, read from the
 * file's own frame delays. 0 means "cannot tell" (not animated, truncated or
 * some other format), never "zero length". Only headers are walked; no frame is
 * decoded. A <img> exposes no duration, which is why this exists: Reverse needs
 * the length to know whether every frame will fit in memory.
 */
export function animatedImageSeconds(bytes) {
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes || 0)
  const tag = (at, text) => text.split('').every((c, i) => b[at + i] === c.charCodeAt(0))
  if (b.length > 12 && tag(0, 'GIF8')) return gifSeconds(b)
  if (b.length > 12 && tag(0, 'RIFF') && tag(8, 'WEBP')) return webpSeconds(b, tag)
  return 0
}

function gifSeconds(b) {
  let p = 13
  if (b[10] & 0x80) p += 3 * 2 ** ((b[10] & 7) + 1)
  const skipBlocks = () => { while (p < b.length && b[p] !== 0) p += b[p] + 1; p += 1 }
  let delayCs = 0
  let pending = 0
  let frames = 0
  while (p < b.length) {
    const kind = b[p++]
    if (kind === 0x3b) break
    if (kind === 0x21) {
      const label = b[p++]
      if (label === 0xf9 && b[p] >= 4) pending = b[p + 2] | (b[p + 3] << 8)
      skipBlocks()
    } else if (kind === 0x2c) {
      if (p + 9 > b.length) return 0
      const packed = b[p + 8]
      p += 9
      if (packed & 0x80) p += 3 * 2 ** ((packed & 7) + 1)
      p += 1
      skipBlocks()
      frames += 1
      delayCs += pending < GIF_MIN_DELAY_CS ? 10 : pending
      pending = 0
    } else {
      return 0
    }
  }
  return frames > 1 ? delayCs / 100 : 0
}

function webpSeconds(b, tag) {
  let p = 12
  let ms = 0
  let frames = 0
  while (p + 8 <= b.length) {
    const size = (b[p + 4] | (b[p + 5] << 8) | (b[p + 6] << 16) | (b[p + 7] << 24)) >>> 0
    if (tag(p, 'ANMF') && p + 8 + 15 <= b.length) {
      const d = b[p + 8 + 12] | (b[p + 8 + 13] << 8) | (b[p + 8 + 14] << 16)
      ms += Math.max(d, 10)
      frames += 1
    }
    p += 8 + size + (size & 1)
  }
  return frames > 1 ? ms / 1000 : 0
}

/**
 * A number field's value once the visitor leaves it. An empty or non-numeric
 * draft returns `fallback` (the last good value) rather than a floor.
 */
export function commitNumber(raw, { min, max, fallback, decimals = 0 }) {
  const text = String(raw ?? '').trim().replace(',', '.') // "1,5" is 1.5 for a comma-decimal keyboard
  const n = text === '' ? NaN : Number(text)
  if (!Number.isFinite(n)) return fallback
  const f = 10 ** decimals
  return Math.max(min, Math.min(max, Math.round(n * f) / f))
}

/**
 * The container flag for "plays this many times" (0 = forever), or [] for a
 * format that has no loop field. See the measured table at the top.
 */
export function loopArgs(formatId, plays) {
  const p = Math.max(0, Math.round(Number(plays) || 0))
  if (formatId === 'gif') return ['-loop', String(p === 0 ? 0 : p === 1 ? -1 : p - 1)]
  if (formatId === 'webp') return ['-loop', String(p)]
  if (formatId === 'apng') return ['-plays', String(p)]
  return []
}

const GIF_DITHER = { low: 'none', medium: 'bayer:bayer_scale=2', high: 'sierra2_4a' }
const WEBP_QUALITY = { low: 50, medium: 75, high: 90 }
const X264_CRF = { low: 30, medium: 23, high: 18 }
const VP8_CRF = { low: 40, medium: 24, high: 10 }

/**
 * The encoder half of the argument list: codec, quality and container flags,
 * then the output name. `palette` is the GIF palette chain appended to any
 * filter that came before it.
 */
function encoderArgs(fmt, { quality = 'medium', plays = 0, filters = [], transparentGif = false, gif = null, maxFrames = MAX_FRAMES }) {
  const q = QUALITY_LEVELS.some((l) => l.id === quality) ? quality : 'medium'
  const out = `output.${fmt.engineExt || fmt.ext}`
  if (fmt.id === 'frames') {
    const vf = filters.length ? ['-vf', filters.join(',')] : []
    return [...vf, '-frames:v', String(maxFrames), '-c:v', 'png', '-f', 'image2pipe', out]
  }
  if (fmt.id === 'sprite') {
    // The sheet is one frame: every picture tiled into it. Cells left over at
    // the end stay transparent.
    return ['-vf', filters.join(','), '-frames:v', '1', '-c:v', 'png', out]
  }
  if (fmt.id === 'gif') {
    // `gif` (Colours + Dither) replaces the Quality mapping. The Video tab
    // always passes it, so Quality does not apply there; without it (the
    // image-sequence tab) the output is exactly what Quality has always made.
    const opts = []
    let dither = GIF_DITHER[q]
    if (transparentGif) opts.push('reserve_transparent=1')
    if (gif) {
      const colours = clampColours(gif.colours)
      if (colours !== GIF_COLOURS_MAX) opts.unshift(`max_colors=${colours}`)
      dither = (DITHERS.find((d) => d.id === gif.dither) || DITHERS[1]).filter
    }
    const gen = opts.length ? `palettegen=${opts.join(':')}` : 'palettegen'
    const chain = [...filters, 'split[s0][s1]'].join(',') + `;[s0]${gen}[p];[s1][p]paletteuse=dither=${dither}`
    return ['-vf', chain, ...loopArgs('gif', plays), out]
  }
  const vf = filters.length ? ['-vf', filters.join(',')] : []
  if (fmt.id === 'webp') {
    return [...vf, '-c:v', 'libwebp_anim', '-lossless', '0', '-quality', String(WEBP_QUALITY[q]), ...loopArgs('webp', plays), out]
  }
  if (fmt.id === 'apng') {
    return [...vf, '-pix_fmt', 'rgba', ...loopArgs('apng', plays), '-f', 'apng', out]
  }
  if (fmt.id === 'mp4') {
    // yuv420p is what every player decodes; +faststart puts the index first so
    // a browser can start playing before the whole file has arrived.
    return [...vf, '-c:v', 'libx264', '-preset', 'veryfast', '-crf', String(X264_CRF[q]), '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', out]
  }
  // WebM / VP8. yuva420p carries the alpha channel; alt-ref frames must be off
  // for VP8 to encode alpha at all.
  return [...vf, '-c:v', 'libvpx', '-b:v', '0', '-crf', String(VP8_CRF[q]), '-auto-alt-ref', '0', '-pix_fmt', 'yuva420p', '-an', out]
}

/**
 * The whole argument list for an image sequence already written to the
 * engine's filesystem as f0001.png… at the final size.
 */
export function framesToAnimationArgs({ format, fps, plays = 0, quality = 'medium' }) {
  const fmt = findFormat(format)
  return ['-framerate', String(clampFps(fps)), '-i', FRAME_PATTERN,
    ...encoderArgs(fmt, { quality, plays, transparentGif: true })]
}

/**
 * The whole argument list for a video clip. `start` and `length` are seconds;
 * a length of 0 means "to the end". Both sides are capped at MAX_ANIMATION_SIDE
 * without knowing the source: the width is the smaller of the request and
 * `iw*MAX/ih` (so a portrait clip's height cannot pass the cap), floored to even,
 * and the height is left to ffmpeg as `-2`: the aspect ratio held and the result
 * rounded to an even number, which H.264 in yuv420p requires and every other
 * format tolerates. The comma inside min() is escaped because the filters are
 * joined with ','. iw and ih are the frame the scale filter receives, so the cap
 * applies after the crop and the turn.
 *
 * Both trim flags sit BEFORE -i, so they limit how much of the source is read.
 * As an output option, -t would cap the length of what comes out, which is
 * wrong the moment speed changes: at half speed a 3 s clip is 6 s long.
 *
 * Filter order (each step is left out when it does nothing): speed, fps, crop
 * or pad, turn, flips, scale, cut-out, direction, sheet. Speed and fps come first so every later filter
 * only touches the frames that end up in the file; crop precedes the turn (the
 * crop box is drawn on the unturned picture); scale follows the turn so Width is
 * the width of what comes out; reverse runs last, on the smallest frames,
 * because it buffers all of them.
 */
export function videoToAnimationArgs({
  format, input, fps, width, plays = 0, quality = 'medium', start = 0, length = 0,
  crop = null, pad = null, turn = 0, flipH = false, flipV = false, speed = 1, direction = 'forward',
  colours = GIF_COLOURS_MAX, dither = 'pattern',
  fill = TRANSPARENT, cut = 'none', radius = CORNER_DEFAULT, sheet = null, maxFrames = MAX_FRAMES,
}) {
  const fmt = findVideoFormat(format)
  const w = Math.max(16, Math.min(MAX_ANIMATION_SIDE, Math.round(Number(width) || 480)))
  const args = []
  if (start > 0) args.push('-ss', String(start))
  if (length > 0) args.push('-t', String(length))
  args.push('-i', input)
  const filters = []
  if (speed && speed !== 1) filters.push(`setpts=PTS/${speed}`)
  filters.push(`fps=${clampFps(fps)}`)
  const outside = resolveFill(fmt, fill)
  if (crop) filters.push(`crop=${crop.w}:${crop.h}:${crop.x}:${crop.y}`)
  filters.push(...padFilters(pad, outside))
  filters.push(...turnFilters(turn))
  if (flipH) filters.push('hflip')
  if (flipV) filters.push('vflip')
  filters.push(scaleFilter(w))
  const cutout = cutoutFilter(cut, { radius, ...outside })
  if (cutout) filters.push(cutout)
  const dir = directionFilter(direction)
  if (dir) filters.push(dir)
  if (fmt.id === 'sprite' && sheet) filters.push('format=rgba', `tile=${sheet.cols}x${sheet.rows}:padding=0:margin=0:color=black@0`)
  // Transparency in a GIF is one palette slot, reserved only when something
  // in the picture is actually transparent.
  const transparentGif = outside.transparent && (!!pad || cut !== 'none')
  return [...args, ...encoderArgs(fmt, { quality, plays, filters, transparentGif, maxFrames, gif: fmt.id === 'gif' ? { colours, dither } : null })]
}

/**
 * The final scale. Width is held to the cap on the longer side and to at least
 * 2, height follows the shape (and is capped too, so a 4 x 4000 source cannot
 * come out taller than the limit). `sar` is the file's own pixel aspect ratio:
 * the picture is scaled as it is displayed, and setsar=1 then says so. Commas
 * sit inside the quotes, so the chain can still be joined with ','.
 */
export function scaleFilter(width) {
  const cap = MAX_ANIMATION_SIDE
  return `scale=w='max(2,2*floor(min(${width},iw*sar*${cap}/ih)/2))':h='min(${cap},max(2,2*round(ow*ih/(iw*sar)/2)))':flags=lanczos,setsar=1`
}

/**
 * A sprite sheet's grid for `count` frames: the closest exact fit to a square
 * sheet, wider than tall (24 frames of one size make 6 across and 4 down);
 * a count with no even split (a prime, say) gets a near-square grid with the
 * last row short. `cols` overrides the width of the grid.
 */
export function spriteLayout(count, frameW, frameH, cols = 0) {
  const n = Math.max(1, Math.floor(count) || 1)
  let c = Math.round(Number(cols) || 0)
  if (c < 1) {
    const want = Math.sqrt((n * frameH) / Math.max(1, frameW))
    c = Math.max(1, Math.ceil(want - 1e-9))
    for (let d = c; d <= Math.min(n, c * 2); d++) {
      if (n % d === 0) { c = d; break }
    }
  }
  c = Math.min(c, n)
  const rows = Math.ceil(n / c)
  return { cols: c, rows, w: c * frameW, h: rows * frameH }
}

/** The largest sheet one export writes: one side and the whole picture are both held. */
export const SPRITE_MAX_SIDE = 16384
export const SPRITE_MAX_PIXELS = 32 * 1024 * 1024
export const spriteFits = (layout) => layout.w <= SPRITE_MAX_SIDE && layout.h <= SPRITE_MAX_SIDE && layout.w * layout.h <= SPRITE_MAX_PIXELS

/**
 * Cuts a stream of PNG files laid end to end (ffmpeg's image2pipe output) into
 * one byte array per file. Each file is walked chunk by chunk to its IEND, so
 * no byte pattern inside the picture can end a frame early. Stops at the first
 * thing that is not a PNG rather than returning half of one.
 */
export function splitPngStream(bytes) {
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes || 0)
  const SIG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
  const out = []
  let p = 0
  while (p + 8 <= b.length && SIG.every((v, i) => b[p + i] === v)) {
    let q = p + 8
    let done = false
    while (q + 12 <= b.length) {
      const len = ((b[q] << 24) | (b[q + 1] << 16) | (b[q + 2] << 8) | b[q + 3]) >>> 0
      const isEnd = b[q + 4] === 0x49 && b[q + 5] === 0x45 && b[q + 6] === 0x4e && b[q + 7] === 0x44
      q += 12 + len
      if (isEnd) { done = true; break }
    }
    if (!done || q > b.length) break
    out.push(b.subarray(p, q))
    p = q
  }
  return out
}

/** ffmpeg's progress lines: "frame=   12 fps=… time=00:00:01.39 …". */
export function parseFrame(line) {
  const m = /frame=\s*(\d+)/.exec(line || '')
  return m ? Number(m[1]) : null
}

export function parseTime(line) {
  const m = /time=\s*(\d+):(\d{2}):(\d{2}(?:\.\d+)?)/.exec(line || '')
  return m ? Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]) : null
}

/** A copy of `list` with the item at `from` moved to `to`. Out-of-range is a no-op. */
export function moveItem(list, from, to) {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return list
  const next = list.slice()
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}

/**
 * The size the animation comes out at: the requested width (capped), with the
 * height from the FIRST frame's aspect ratio — the first frame is the one the
 * visitor sees first, so it sets the canvas and the rest are fitted inside it.
 * Even dimensions are forced only where the codec demands them.
 */
export function animationSize(firstW, firstH, width, { evenDims = false } = {}) {
  if (!(firstW > 0 && firstH > 0)) return { w: 0, h: 0 }
  let w = Math.max(16, Math.min(MAX_ANIMATION_SIDE, Math.round(Number(width) || firstW)))
  let h = Math.max(1, Math.round((w * firstH) / firstW))
  if (h > MAX_ANIMATION_SIDE) {
    h = MAX_ANIMATION_SIDE
    w = Math.max(16, Math.round((h * firstW) / firstH))
  }
  if (evenDims) {
    w -= w % 2
    h = Math.max(2, h - (h % 2))
  }
  return { w, h }
}

/** Where a source image lands inside the output box: contained, centred. */
export function fitContain(srcW, srcH, boxW, boxH) {
  if (!(srcW > 0 && srcH > 0 && boxW > 0 && boxH > 0)) return { x: 0, y: 0, w: 0, h: 0 }
  const r = Math.min(boxW / srcW, boxH / srcH)
  const w = Math.max(1, Math.round(srcW * r))
  const h = Math.max(1, Math.round(srcH * r))
  return { x: Math.round((boxW - w) / 2), y: Math.round((boxH - h) / 2), w, h }
}

/** "12 frames · 1.5 s · 83 ms each" — the timing the file will actually have. */
export function describeTiming(frameCount, fps) {
  const f = clampFps(fps)
  const n = Math.max(0, frameCount | 0)
  const seconds = n / f
  const s = seconds < 10 ? seconds.toFixed(2).replace(/\.?0+$/, '') : seconds.toFixed(1).replace(/\.0$/, '')
  return `${n} frame${n === 1 ? '' : 's'} · ${s} s · ${Math.round(1000 / f)} ms each`
}

export function formatBytes(b) {
  if (b == null) return '—'
  if (b < 1024) return b + ' B'
  if (b < 1048576) return (b / 1024).toFixed(1) + ' KB'
  return (b / 1048576).toFixed(1) + ' MB'
}

export function formatTime(s) {
  if (!isFinite(s)) return '0:00'
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}
