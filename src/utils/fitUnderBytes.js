// "Fit under N KB": a search over one setting for the largest output that is
// still under a byte target. DOM-free; the encoder is passed in, so the search
// can be tested with a fake one.
//
// The search assumes a bigger setting makes a bigger file. Real encoders are
// close to that and not exactly, so the answer is "the largest setting the
// search found under the target", and the smallest result it saw is kept for
// when nothing is.
import { formatBytes } from './mediaEncode.js'

export const QUALITY_RANGE = Object.freeze({ lo: 1, hi: 100 })
export const COLOUR_RANGE = Object.freeze({ lo: 2, hi: 256 })
export const SCALE_RANGE = Object.freeze({ lo: 5, hi: 99 }) // percent
export const KB_MIN = 1
export const KB_MAX = 102400

/** The target in bytes for a typed number of KB, or 0 for none. */
export const targetBytes = (kb) => {
  const n = Math.round(Number(kb))
  return Number.isFinite(n) && n >= KB_MIN ? Math.min(n, KB_MAX) * 1024 : 0
}

/**
 * The largest whole number in [lo, hi] whose result is within `limit` bytes.
 * Tries hi first (no search at all when it already fits), then lo (so an
 * unreachable target costs two encodes), then halves the gap.
 *
 * @param {{lo: number, hi: number, limit: number, test: (v: number) => Promise<{bytes: number}>}} o
 * @returns {Promise<{best: {value, result}|null, smallest: {value, result}, tries: number}>}
 */
export async function largestUnder({ lo, hi, limit, test }) {
  let tries = 0
  let smallest = null
  const run = async (value) => {
    const result = await test(value)
    tries++
    if (!smallest || result.bytes < smallest.result.bytes) smallest = { value, result }
    return result
  }
  let result = await run(hi)
  if (result.bytes <= limit) return { best: { value: hi, result }, smallest, tries }
  result = await run(lo)
  if (result.bytes > limit) return { best: null, smallest, tries }
  let best = { value: lo, result }
  let fits = lo
  let over = hi
  while (over - fits > 1) {
    const mid = Math.floor((fits + over) / 2)
    result = await run(mid)
    if (result.bytes <= limit) { best = { value: mid, result }; fits = mid } else over = mid
  }
  return { best, smallest, tries }
}

/**
 * Finds the largest output under `target` bytes.
 *
 * lossy (JPEG, WebP, AVIF): the quality, 1 to 100.
 * png: full colour if it fits; else the colour count, 256 down to 2; else, at
 * 256 colours, the scale. `encode` takes {quality}, or {colours, scale} where a
 * colours of 0 is full colour and scale is a percent, and gives back {bytes, ...}.
 *
 * @returns {Promise<{ok: boolean, result: object, params: object, tries: number}>}
 *   When nothing fits, `result` is the smallest seen and `ok` is false.
 */
export async function fitUnderBytes({ target, kind, encode }) {
  let tries = 0
  let smallest = null
  const note = (s) => { if (s && (!smallest || s.result.bytes < smallest.result.bytes)) smallest = s }
  const done = (best, params) => ({ ok: true, result: best.result, params: params(best.value), tries })
  const miss = () => ({ ok: false, result: smallest.result, params: smallest.params, tries })

  if (kind !== 'png') {
    const r = await largestUnder({ ...QUALITY_RANGE, limit: target, test: (quality) => encode({ quality }) })
    tries += r.tries
    if (r.best) return done(r.best, (quality) => ({ quality }))
    return { ok: false, result: r.smallest.result, params: { quality: r.smallest.value }, tries }
  }

  const full = await encode({ colours: 0, scale: 100 })
  tries++
  if (full.bytes <= target) return { ok: true, result: full, params: { colours: 0, scale: 100 }, tries }
  note({ result: full, params: { colours: 0, scale: 100 } })

  const byColours = await largestUnder({ ...COLOUR_RANGE, limit: target, test: (colours) => encode({ colours, scale: 100 }) })
  tries += byColours.tries
  note({ result: byColours.smallest.result, params: { colours: byColours.smallest.value, scale: 100 } })
  if (byColours.best) return done(byColours.best, (colours) => ({ colours, scale: 100 }))

  const byScale = await largestUnder({
    ...SCALE_RANGE, limit: target, test: (scale) => encode({ colours: COLOUR_RANGE.hi, scale }),
  })
  tries += byScale.tries
  note({ result: byScale.smallest.result, params: { colours: COLOUR_RANGE.hi, scale: byScale.smallest.value } })
  if (byScale.best) return done(byScale.best, (scale) => ({ colours: COLOUR_RANGE.hi, scale }))
  return miss()
}

/** The setting a search settled on, in words ("quality 72", "64 colours", "256 colours at 40% size"). */
export function describeParams(params) {
  if (params.quality != null) return `quality ${params.quality}`
  const colours = params.colours ? `${params.colours} colours` : 'full colour'
  return params.scale < 100 ? `${colours} at ${params.scale}% size` : colours
}

/** One line for a card: what the target was and what came out. */
export function fitSummary({ ok, bytes, params }, target) {
  const goal = formatBytes(target)
  const how = describeParams(params)
  return ok
    ? `Under ${goal}: ${formatBytes(bytes)} at ${how}`
    : `Couldn’t reach ${goal}. Smallest was ${formatBytes(bytes)} at ${how}`
}
