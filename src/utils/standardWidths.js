// STANDARD WIDTHS FOR A RATIO NOBODY CURATED.
//
// RatioCalculator offers a "Standard sizes" picker, and it only appears when
// the ratio you are working in matches one of the eleven curated entries in
// RATIOS. Each of those carries a hand-written `sizes` list, so 16:9 offers
// 720p through 8K and 4:3 offers SVGA through QXGA.
//
// Founder, 2026-09-15: "i then want to be able to lock the ratio based on the
// numbers supplied then chose a standard size to match the ratio such as 1920 x
// or 800 x or 2480x or 1600x or whatever else."
//
// That is the case the curated lists cannot serve. Measure something — a client
// artboard at 1456 × 816, a crop at 2100 × 1400 — and the ratio you get is very
// often NOT one of the eleven, so the picker disappears exactly when you have
// done the work to earn it. This computes the ladder instead: pick the width,
// get the height the locked ratio demands.
//
// The curated lists are kept and still win when they apply, because they carry
// NAMES — "Full HD 1080p" is worth more to a person than "1920 × 1080", and no
// function can derive that.

/** The widths a designer actually exports at, largest first. */
export const STANDARD_WIDTHS = [
  { w: 7680, label: '8K' },
  { w: 5120, label: '5K' },
  { w: 3840, label: '4K' },
  { w: 2560, label: '2K / QHD' },
  { w: 2480, label: 'A4 @ 300dpi' },
  { w: 1920, label: 'Full HD' },
  { w: 1600, label: 'Desktop' },
  { w: 1440, label: 'Laptop' },
  { w: 1280, label: '720p' },
  { w: 1024, label: '1K' },
  { w: 800, label: 'Small' },
  { w: 640, label: 'Thumbnail' },
  { w: 320, label: 'Icon' },
]

/**
 * Every standard width paired with the height this ratio demands.
 *
 * Heights are whole pixels — a fractional pixel dimension is the defect
 * `ratio-whole-pixels.test.js` was written for, where 9:16 at 1920 produced a
 * height of 3413.33 and fed that string to the copy buttons.
 *
 * @param {number} ratioW
 * @param {number} ratioH
 * @param {{max?: number}} [opts] max output height, to drop entries no canvas
 *   or print job wants. Omit for no ceiling.
 * @returns {{name: string, meta: string, w: number, h: number}[]}
 */
export function standardSizesForRatio(ratioW, ratioH, { max = 20000 } = {}) {
  const rw = Number(ratioW)
  const rh = Number(ratioH)
  if (!(rw > 0) || !(rh > 0)) return []

  return STANDARD_WIDTHS
    .map(({ w, label }) => ({
      name: `${w} × ${Math.round((w * rh) / rw)}`,
      meta: label,
      w,
      h: Math.round((w * rh) / rw),
    }))
    // A very tall ratio turns a large width into an unusable height: 9:16 at
    // 7680 wide is 13,653 tall. Dropped rather than offered.
    .filter((s) => s.h >= 1 && s.h <= max)
}

/**
 * True when this ratio is close enough to a curated one that the curated list
 * (which carries real names) should be preferred over the computed ladder.
 *
 * Compared as a DECIMAL within a tolerance, not as equal integers: 1920/1080
 * and 16/9 are the same shape written two ways, and a user who typed their
 * measurements will have the first.
 */
export function ratioMatches(ratioW, ratioH, curatedW, curatedH, tolerance = 0.001) {
  const a = Number(ratioW) / Number(ratioH)
  const b = Number(curatedW) / Number(curatedH)
  if (!Number.isFinite(a) || !Number.isFinite(b)) return false
  return Math.abs(a - b) <= tolerance
}
