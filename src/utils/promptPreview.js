// How a prompt card previews the prompt.
//
// THE ASK, and the reference behind it. The founder asked the library to
// "preivew the prompts" and pointed at motionsites.com: a gallery whose cards
// continuously auto-play a scrolling preview of the real page behind them, with
// the title and category beneath and a badge on the paid entries. The
// transferable idea is not the scrolling — it is that THE CARD SHOWS THE
// ARTEFACT rather than a name for it. A prompt library whose cards carry a
// title and three tags is a list of filenames.
//
// So the card body is now the prompt's real text, set the way the modal sets it,
// and the scroll is how the rest of it becomes reachable without opening
// anything.
//
// ── WHY THE SCROLL PLAYS ON HOVER AND FOCUS, NOT CONTINUOUSLY ───────────────
//
// motionsites plays every card at once and it works there, because its artefact
// is a PAGE: a static crop of a website tells you almost nothing and there is no
// text to read. A prompt is text, and text that moves while you are reading it
// is worse than text that is clipped. Twelve prompt bodies scrolling at once is
// not a preview, it is a room full of ticker tape.
//
// It is also a WCAG 2.2 problem rather than a taste one. SC 2.2.2 (Pause, Stop,
// Hide) applies to content that moves automatically for more than five seconds
// alongside other content, and requires a mechanism to pause it. An infinite
// text scroll on twelve cards is exactly that, and this design has no pause
// control to offer. Playing on hover and on keyboard focus makes the motion
// user-initiated and self-cancelling, which is outside 2.2.2 entirely — and it
// answers the same question, one card at a time, for the card the reader is
// actually looking at.
//
// At rest every card shows the TOP of its prompt, which is the half that says
// what the prompt is for. Nothing is hidden that hovering is required to reveal:
// the whole text is one click away in the modal, as selectable text.
//
// ── DURATION ────────────────────────────────────────────────────────────────
//
// One pass is timed from the prompt's LENGTH, not from its measured height.
// Height is what the animation actually travels, but reading it means a forced
// layout per card and there are twenty cards on this page; length is a faithful
// proxy for it at a fixed width and font, and it costs nothing. The effect of
// timing it at all is that a 400-character prompt and a 3,000-character one
// scroll past at roughly the same reading pace instead of the long one
// blurring.
//
// The floor stops a short prompt snapping; the ceiling stops the longest one in
// the library taking a minute to reach its end.

// Characters of prompt per second of travel. Slower than reading speed on
// purpose: the scroll is for taking in the SHAPE of the brief — its sections,
// its length, whether it is prose or a numbered list — not for reading it
// through. Reading it through is what the modal is for.
export const PREVIEW_CHARS_PER_SECOND = 60

// Seconds. A pass shorter than the floor reads as a twitch; one longer than the
// ceiling reads as broken.
export const PREVIEW_MIN_SECONDS = 9
export const PREVIEW_MAX_SECONDS = 34

/**
 * Seconds for one pass of the preview scroll, clamped to the band above.
 *
 * Always a finite number >= PREVIEW_MIN_SECONDS, for empty, null, undefined and
 * non-string input alike. That matters more than it looks: this value is
 * written into a CSS custom property inside the `animation` shorthand, and a
 * `NaNs` there invalidates the WHOLE shorthand — so the failure mode of a bad
 * input is not a wrong duration, it is no preview animation at all, silently.
 *
 * The type test is the entire guard and it is deliberately the only one. A
 * trailing `Number.isFinite` check on the division was written here first and
 * then deleted, because `chars` is a string length or 0 by construction, so
 * the division cannot be non-finite and no mutation of that branch could be
 * made to fail a test. Unreachable defence reads as covered without being
 * covered, which is worse than no defence.
 */
export function previewDuration(text) {
  const chars = typeof text === 'string' ? text.length : 0
  const raw = chars / PREVIEW_CHARS_PER_SECOND
  return Math.round(Math.min(PREVIEW_MAX_SECONDS, Math.max(PREVIEW_MIN_SECONDS, raw)))
}
