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
function encoderArgs(fmt, { quality = 'medium', plays = 0, filters = [], transparentGif = false }) {
  const q = QUALITY_LEVELS.some((l) => l.id === quality) ? quality : 'medium'
  const out = `output.${fmt.ext}`
  if (fmt.id === 'gif') {
    const gen = transparentGif ? 'palettegen=reserve_transparent=1' : 'palettegen'
    const chain = [...filters, 'split[s0][s1]'].join(',') + `;[s0]${gen}[p];[s1][p]paletteuse=dither=${GIF_DITHER[q]}`
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
 */
export function videoToAnimationArgs({ format, input, fps, width, plays = 0, quality = 'medium', start = 0, length = 0 }) {
  const fmt = findFormat(format)
  const w = Math.max(16, Math.min(2000, Math.round(Number(width) || 480)))
  const args = []
  if (start > 0) args.push('-ss', String(start))
  args.push('-i', input)
  if (length > 0) args.push('-t', String(length))
  const filters = [`fps=${clampFps(fps)}`, `scale=${w}:-2:flags=lanczos`]
  return [...args, ...encoderArgs(fmt, { quality, plays, filters })]
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
