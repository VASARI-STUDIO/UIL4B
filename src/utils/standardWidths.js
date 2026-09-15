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

/** The widths a designer actually exports at, largest first.
 *
 * TWO KINDS OF LABEL LIVE HERE, AND ONLY ONE OF THEM TRAVELS.
 *
 * A name like "Desktop" or "Thumbnail" describes a WIDTH, so it stays true
 * whatever height the locked ratio asks for. A name like "4K" or "Full HD"
 * describes a WHOLE RESOLUTION - 3840x2160, 1920x1080 - and those are 16:9.
 * Printed beside a height that is not 16:9 the name is simply false, which is
 * what shipped on 2026-09-15: at 19.5:9 the ladder read "1280 x 591 / 720p"
 * and at 4:3 it read "1920 x 1440 / Full HD". A4 @ 300dpi was wrong at every
 * ratio in the list, because 2480 is its SHORT side and the sheet is portrait,
 * so "2480 x 1395 / A4 @ 300dpi" appeared even on the 16:9 the rest is cut for.
 *
 * That is the defect this whole page was reworked to remove - the founder
 * asked for standard sizes so he would be "working in real sizes not partial
 * ratios", and a ladder that prints a real name over an invented size is worse
 * than one that prints no name at all.
 *
 * So an entry that denotes a resolution carries the SHAPE it denotes, and
 * standardSizesForRatio() only attaches the name when the locked ratio is
 * actually that shape. An entry with no `shape` names its width and is always
 * safe.
 */
export const STANDARD_WIDTHS = [
  { w: 7680, label: '8K', shape: [16, 9] },
  { w: 5120, label: '5K', shape: [16, 9] },
  { w: 3840, label: '4K', shape: [16, 9] },
  { w: 2560, label: '2K / QHD', shape: [16, 9] },
  // The one portrait entry: ISO A4 at 300dpi is 2480 x 3508, so 2480 is the
  // SHORT side and the name is only true of a portrait 1:root-2 page.
  { w: 2480, label: 'A4 @ 300dpi', shape: [2480, 3508] },
  { w: 1920, label: 'Full HD', shape: [16, 9] },
  { w: 1600, label: 'Desktop' },
  { w: 1440, label: 'Laptop' },
  { w: 1280, label: '720p', shape: [16, 9] },
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
    .map(({ w, label, shape }) => ({
      name: `${w} × ${Math.round((w * rh) / rw)}`,
      // A resolution name only travels to the ratio it denotes; a width name
      // travels everywhere. Empty rather than approximate - the caller renders
      // nothing for an empty meta, and no name is better than a wrong one.
      meta: shape && !ratioMatches(rw, rh, shape[0], shape[1]) ? '' : label,
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
