// THE DAILY TIP — one fact a day, in the register of a loading-screen tip.
//
// ─────────────────────────────────────────────────────────────────────────────
// WHY THIS EXISTS AND WHAT IT IS FOR
// ─────────────────────────────────────────────────────────────────────────────
// Founder request, 2026-09-05, verbatim: “maybe a quick daily fact or tip from a
// list of random ones, this makes it feel more personal. similar to video game
// loading screen tips, make sure they are actually useful, maybe a few comedic
// / satire ones or something to help keep the app feeling light and like a
// little easter egg”.
//
// Two halves of that brief pull against each other and both have to hold:
//
//   ACTUALLY USEFUL. Every `craft` tip below teaches something checkable about
//   colour, type or the CSS platform — a number you can verify, a behaviour you
//   can reproduce. None of them is encouragement, none is a platitude, and none
//   of them says a thing the reader already knew. If you add one, it has to
//   survive the question “would a working designer learn something?”. If it
//   would not, do not add it. A short list of good tips beats a long list.
//
//   GENUINELY FUNNY. The `joke` tips are jokes, not whimsy. The failure mode
//   here is the flattery card — the “Hey Jane, you’re awesome / we’re proud of
//   you” panel on Charma’s home (mobbin.com/screens/3c42cab9-2aaf-4744-a7b9-c38d311afb22)
//   is the exact thing this must never become. Empty warmth reads as generated;
//   a dry observation a designer recognises does not.
//
// EVERY FACTUAL CLAIM IS CHECKABLE, and tests/unit/daily-tips.test.js pins the
// arithmetic ones (the 1.618 ladder, the sRGB mid-grey, the 21:1 ceiling) so a
// well-meaning copy edit cannot quietly make one of them false. A tip that
// states a wrong number is worse than no tip, because it is the one thing on
// this page that claims to be teaching.
//
// DOM-free and React-free, like utils/firstWin.js and utils/projectQuota.js:
// the list is data, the picker is arithmetic, and both are testable without a
// browser.

/**
 * The tips.
 *
 * `kind` is one of:
 *   · 'colour' — something true about colour, contrast or the sRGB encoding;
 *   · 'type'   — something true about typefaces, scales or measure;
 *   · 'craft'  — a working practice that holds up beyond this product;
 *   · 'joke'   — there to be funny. Allowed to also be true.
 *
 * It is shown as the eyebrow above the tip, so the reader knows whether they
 * are being taught or teased before they read the sentence.
 */
export const DAILY_TIPS = Object.freeze([
  Object.freeze({
    id: 'mid-grey',
    kind: 'colour',
    text: '#808080 looks like the middle grey. It only reflects 22% of white’s light — sRGB is gamma-encoded, so the number is not the brightness. The grey that genuinely sits halfway is nearer #BCBCBC.',
  }),
  Object.freeze({
    id: 'hue-is-not-brightness',
    kind: 'colour',
    text: 'Yellow and blue are both “fully saturated” in HSL, and one is nearly white to the eye while the other is nearly black. Green carries 72% of perceived brightness, red 21%, blue 7%. Build a palette by rotating hue alone and you build one with no contrast in it.',
  }),
  Object.freeze({
    id: 'contrast-ceiling',
    kind: 'colour',
    text: 'Contrast ratios stop at 21:1, and that is pure black on pure white. Nothing can score higher, so a tool reporting 30:1 is reporting a bug.',
  }),
  Object.freeze({
    id: 'darkgray',
    kind: 'colour',
    text: 'CSS ‘darkgray’ is lighter than ‘gray’. #A9A9A9 against #808080. The named colours were merged from two lists that nobody reconciled, and this is the seam.',
  }),
  Object.freeze({
    id: 'rebeccapurple',
    kind: 'colour',
    text: 'rebeccapurple (#663399) went into the CSS spec in 2014 in memory of Eric Meyer’s daughter Rebecca, who died at six. It is the only colour in the language that is a memorial.',
  }),
  Object.freeze({
    id: 'gradient-dead-zone',
    kind: 'colour',
    text: 'Blend blue into yellow in sRGB and the middle turns grey — the channels cross and cancel. Add a third stop to steer through, or interpolate in Oklab and the muddy band disappears.',
  }),
  Object.freeze({
    id: 'white-drains-chroma',
    kind: 'colour',
    text: 'Mixing white into a colour to lighten it also drains the chroma out of it. If your palest tint reads dead rather than light, that is why: raise the lightness and hold the saturation instead of adding white.',
  }),
  Object.freeze({
    id: 'non-text-contrast',
    kind: 'colour',
    text: 'A button’s edge, a focus ring and a chart line need 3:1, not 4.5:1 — the 4.5 figure is for text. Applying the text rule to everything is how a palette ends up with no quiet greys left in it.',
  }),
  Object.freeze({
    id: 'hex-shorthand',
    kind: 'colour',
    text: 'A hex colour is three bytes and nothing else. #F0C is #FF00CC, each digit doubled — which is worth knowing at the moment you are typing one by hand and want to be sure you meant it.',
  }),
  Object.freeze({
    id: 'golden-ratio-scale',
    kind: 'type',
    text: 'A 1.618 type scale is glorious in a specimen and unusable in a UI. From 16px it gives you 16, 26, 42, 68 — nothing whatsoever between 26 and 42, which is precisely where every card title needs to live.',
  }),
  Object.freeze({
    id: 'measure',
    kind: 'type',
    text: 'Comfortable reading is 45 to 75 characters a line. Under 45 the eye jumps too often; over 75 it loses its place on the return sweep. Set the width in ch and the count stays right at every font size.',
  }),
  Object.freeze({
    id: 'leading-tracks-measure',
    kind: 'type',
    text: 'Line height and line length are one decision, not two. A 1.5 that reads beautifully at 60 characters feels airless at 90 — longer lines need more leading to survive the return sweep.',
  }),
  Object.freeze({
    id: 'variable-axis-clamp',
    kind: 'type',
    text: 'Ask a variable font for weight 900 when its axis stops at 800 and you get 800. Nothing errors and nothing warns — the type simply stops getting bolder, and you spend an afternoon on it.',
  }),
  Object.freeze({
    id: 'tracking-by-size',
    kind: 'type',
    text: 'Letter-spacing is a function of size, not of taste. Tighten display type slightly, leave body text alone, and open up anything under 12px — the same face needs different tracking at 48px and at 11px.',
  }),
  Object.freeze({
    id: 'weight-is-not-hierarchy',
    kind: 'type',
    text: 'If your headings and your body text are the same family at the same weight, you do not have a hierarchy — you have a font size. Hierarchy needs at least two of size, weight, colour and space to move at once.',
  }),
  Object.freeze({
    id: 'name-by-role',
    kind: 'craft',
    text: 'Name colours for the job they do, not the hue they are. ‘accent’ survives a rebrand; ‘blue-500’ becomes a lie on the morning somebody picks green.',
  }),
  Object.freeze({
    id: 'test-the-dark-one-first',
    kind: 'craft',
    text: 'Design the dark theme second but test it first. Light-mode palettes hide their contrast failures behind white; the dark build is where a too-pale accent finally admits it.',
  }),
  Object.freeze({
    id: 'export-early',
    kind: 'craft',
    text: 'Export the system before you think it is finished. The export is the first moment anything checks whether your tokens actually resolve — and it is much cheaper to find that out at eight colours than at eighty.',
  }),
  Object.freeze({
    id: 'seven-greys',
    kind: 'joke',
    text: 'If you need seven greys, you need two greys and better spacing.',
  }),
  Object.freeze({
    id: 'accent-2',
    kind: 'joke',
    text: 'Every design system has one colour called accent-2 that nobody can explain and nobody dares delete.',
  }),
  Object.freeze({
    id: 'remove-one',
    kind: 'joke',
    text: 'The fastest way to make a palette look expensive is to take one colour out of it.',
  }),
  Object.freeze({
    id: 'border-radius',
    kind: 'joke',
    text: 'Nobody has ever zoomed in to admire your border radius. Ship it.',
  }),
  Object.freeze({
    id: 'brand-blue',
    kind: 'joke',
    text: 'There is no such thing as a brand blue. There is a hex code, and there is a meeting.',
  }),
  Object.freeze({
    id: 'one-button',
    kind: 'joke',
    text: 'If the only thing telling your two buttons apart is a drop shadow, you have one button.',
  }),
  Object.freeze({
    id: 'three-typefaces',
    kind: 'joke',
    text: 'Two typefaces is a pairing. Three is a decision you will revisit. Four is a ransom note.',
  }),
  Object.freeze({
    id: 'changes-at-midnight',
    kind: 'joke',
    text: 'This tip changes at midnight, not on refresh. You are very welcome to go and check. We both know how that ends.',
  }),
])

/**
 * How far the picker steps through the list each day.
 *
 * Coprime with DAILY_TIPS.length, which is the whole point: stepping by 1 would
 * walk the list in written order, so the two jokes that sit next to each other
 * would show on consecutive days and the run would feel like a list being read
 * out. A coprime step still visits every tip exactly once per cycle — no tip is
 * ever skipped, none repeats early — while consecutive days look unrelated.
 *
 * tests/unit/daily-tips.test.js asserts the coprimality and the full-coverage
 * property, so changing the list length can never silently strand a tip.
 */
export const TIP_STEP = 7

/** Days since the Unix epoch, in the reader’s own timezone. */
export function dayNumber(date) {
  const d = date instanceof Date && !Number.isNaN(date.getTime()) ? date : new Date()
  // Built from the LOCAL calendar fields rather than from the timestamp, so the
  // tip turns over at the reader’s midnight rather than at UTC midnight. A
  // “daily” thing that changes at 1pm because you live in Sydney is not daily.
  return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000)
}

/**
 * Today’s tip. Deterministic: the same date always yields the same tip, so it
 * is stable across a reload, across a route change, and in a test.
 *
 * Never returns null — an empty list is impossible (the module is frozen and the
 * test asserts a floor), and a caller should not have to render an absent tip.
 */
export function tipForDay(date, tips = DAILY_TIPS) {
  const list = Array.isArray(tips) && tips.length ? tips : DAILY_TIPS
  const index = (((dayNumber(date) * TIP_STEP) % list.length) + list.length) % list.length
  return list[index]
}

/** Every id, for the test that pins uniqueness and for the coverage walk. */
export function tipIds(tips = DAILY_TIPS) {
  return tips.map((t) => t.id)
}
