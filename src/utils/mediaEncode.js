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
]
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
export const MAX_VIDEO_WIDTH = 2000
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

/** The size that comes out, mirroring ffmpeg's `scale=W:-2` rounding. */
export function outputSize(srcW, srcH, { crop = null, turn = 0, width = 480 } = {}) {
  let iw = crop ? crop.w : srcW
  let ih = crop ? crop.h : srcH
  if (!(iw > 0 && ih > 0)) return { w: 0, h: 0 }
  if (turn === 90 || turn === 270) [iw, ih] = [ih, iw]
  const w = Math.max(16, Math.min(MAX_VIDEO_WIDTH, Math.round(Number(width) || 480)))
  return { w, h: 2 * Math.round((w * ih) / (iw * 2)) }
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
function encoderArgs(fmt, { quality = 'medium', plays = 0, filters = [], transparentGif = false, gif = null }) {
  const q = QUALITY_LEVELS.some((l) => l.id === quality) ? quality : 'medium'
  const out = `output.${fmt.ext}`
  if (fmt.id === 'gif') {
    // `gif` (Colours + Dither) replaces the Quality mapping. The Video tab
    // always passes it, so Quality does not apply there; without it (the
    // image-sequence tab) the output is exactly what Quality has always made.
    let gen = transparentGif ? 'palettegen=reserve_transparent=1' : 'palettegen'
    let dither = GIF_DITHER[q]
    if (gif) {
      const colours = clampColours(gif.colours)
      gen = colours === GIF_COLOURS_MAX ? 'palettegen' : `palettegen=max_colors=${colours}`
      dither = (DITHERS.find((d) => d.id === gif.dither) || DITHERS[1]).filter
    }
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
 * a length of 0 means "to the end". Width is clamped, and the height is left
 * to ffmpeg as `-2`: the aspect ratio held and the result rounded to an even
 * number, which H.264 in yuv420p requires and every other format tolerates.
 *
 * Both trim flags sit BEFORE -i, so they limit how much of the source is read.
 * As an output option, -t would cap the length of what comes out, which is
 * wrong the moment speed changes: at half speed a 3 s clip is 6 s long.
 *
 * Filter order (each step is left out when it does nothing): speed, fps, crop,
 * turn, flips, scale, direction. Speed and fps come first so every later filter
 * only touches the frames that end up in the file; crop precedes the turn (the
 * crop box is drawn on the unturned picture); scale follows the turn so Width is
 * the width of what comes out; reverse runs last, on the smallest frames,
 * because it buffers all of them.
 */
export function videoToAnimationArgs({
  format, input, fps, width, plays = 0, quality = 'medium', start = 0, length = 0,
  crop = null, turn = 0, flipH = false, flipV = false, speed = 1, direction = 'forward',
  colours = GIF_COLOURS_MAX, dither = 'pattern',
}) {
  const fmt = findFormat(format)
  const w = Math.max(16, Math.min(MAX_VIDEO_WIDTH, Math.round(Number(width) || 480)))
  const args = []
  if (start > 0) args.push('-ss', String(start))
  if (length > 0) args.push('-t', String(length))
  args.push('-i', input)
  const filters = []
  if (speed && speed !== 1) filters.push(`setpts=PTS/${speed}`)
  filters.push(`fps=${clampFps(fps)}`)
  if (crop) filters.push(`crop=${crop.w}:${crop.h}:${crop.x}:${crop.y}`)
  filters.push(...turnFilters(turn))
  if (flipH) filters.push('hflip')
  if (flipV) filters.push('vflip')
  filters.push(`scale=${w}:-2:flags=lanczos`)
  const dir = directionFilter(direction)
  if (dir) filters.push(dir)
  return [...args, ...encoderArgs(fmt, { quality, plays, filters, gif: fmt.id === 'gif' ? { colours, dither } : null })]
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
