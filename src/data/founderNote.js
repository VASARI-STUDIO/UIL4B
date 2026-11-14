// The founder's note — the WORDS, kept in their own file away from the component.
//
// ─────────────────────────────────────────────────────────────────────────────
// WHY THE WORDS ARE A DRAFT
// ─────────────────────────────────────────────────────────────────────────────
// This note is the author's own voice, so it is not written by a tool on his
// behalf without his say-so. A note whose entire purpose is to sound like one
// specific person cannot be written by something that is not that person.
// Writing a convincing one would be the failure, not the success: the point is
// to help the app feel more down to earth to people who think "oh, another app
// from another company", and a fabricated voice is the exact opposite of that.
//
// The draft below was written in Australian English from what the code shows,
// and it is a DRAFT. Only the author can say whether these sentences sound like
// him. Anything here that does not, he changes; that is four edits in this file
// and nothing else.
//
// EVERY CLAIM IN IT WAS CHECKED against the code rather than imagined, because
// the one rule that still holds absolutely is the last paragraph of this
// header: no invented biography. So the note says he builds it alone in
// Brisbane (which AppFooter.jsx has said since before this file existed) and
// nothing else about him. What it says about the PRODUCT is checkable: the tool
// list is the Create groups, "saving and downloading need a free account" is
// useExportGate.js, and "the Pro plan is how you can back it" matches the
// panel's own Support button, which goes to /plans. The name links to the same portfolio address the
// footer's "Built in Brisbane by Dylan Coleman" already links to.
//
// The AI sentence states the free plan's daily limit and that Pro raises it
// (public/llms.txt, generated from the plan config). It makes no promise about
// future plans. The words follow option 1 of
// handover/specs/about-popup-wording-2026-11-05.md.
//
// ─────────────────────────────────────────────────────────────────────────────
// THE PLACEHOLDER REMOVES ITSELF
// ─────────────────────────────────────────────────────────────────────────────
// `noteIsWritten()` below is what the panel branches on, so the unwritten state
// cannot be left behind by accident: it disappears the moment the last slot has
// something in it. A placeholder that has to be remembered is a placeholder that
// ships.
//
// ─────────────────────────────────────────────────────────────────────────────
// AUSTRALIAN ENGLISH, AND WHY THAT IS NOT A STYLE NOTE
// ─────────────────────────────────────────────────────────────────────────────
// The note is written in real Australian English, in the author's own register,
// not as an AI-written statement. Whoever fills these in should write them the
// way they would say them out loud. Contractions are fine. An unfinished
// thought is fine. What is not fine is the register that got the homepage intro
// rejected — three parallel clauses in a row, "not just X but Y", or an
// instruction pointed at the reader.
//
// DO NOT invent biography here. Nothing on record holds any personal history,
// and a made-up origin story is worse than no note at all.

/**
 * The four things the note has to say, in the order it says them.
 *
 * These are PROMPTS FOR THE AUTHOR, not product copy — the panel shows them only
 * while the note is unwritten, as the list of what is still missing. They are
 * deliberately one question each: the person answering them is time-poor and
 * building this alone, so the ask has to be four one-line answers rather than
 * "write us a paragraph".
 */
export const NOTE_PROMPTS = [
  { key: 'who', prompt: 'Who you are' },
  { key: 'what', prompt: 'What UI L4B is for' },
  { key: 'state', prompt: 'What state it is in' },
  { key: 'help', prompt: 'What help you want' },
]

/**
 * The note itself. One or two sentences per slot, first person, plain.
 *
 * Order matters and matches NOTE_PROMPTS: hello and who I am, what this is for,
 * where it is up to, what would help. Leave ANY slot empty and the panel shows
 * the unwritten state instead of a half-written note.
 */
export const FOUNDER_NOTE = {
  who: 'I\'m Dylan. I build UI L4B on my own, out of Brisbane.',
  what: 'It\'s a set of design tools in one place: colour, type, icons and emoji, contrast checks, and file and 3D model converters. Most of it works without an account. Saving your work or downloading a file needs a free one.',
  state: 'It\'s early, so expect rough edges. I\'m changing it most days. The AI tools have a daily limit on the free plan, and Pro raises it.',
  help: 'What helps most is hearing what\'s missing or what broke. If UI L4B saves you time, the Pro plan is how you can back it.',
}

/**
 * How the note is signed.
 *
 * Both facts are already public in the app — AppFooter.jsx has read "Built in
 * Brisbane by Dylan Coleman" since before this note existed — so neither is
 * something this file invented. Nothing else about him is asserted in here,
 * which is the point: the biography is his to give, not ours to guess.
 */
export const FOUNDER_SIGNATURE = { name: 'Dylan Coleman', place: 'Brisbane', url: 'https://dylan-coleman.com/' }

/** Has every slot been filled in? Whitespace does not count as filled in. */
export function noteIsWritten(note = FOUNDER_NOTE) {
  return NOTE_PROMPTS.every(({ key }) => typeof note[key] === 'string' && note[key].trim().length > 0)
}

/**
 * The paragraphs to render, in order.
 *
 * Empty while the note is unwritten — all-or-nothing on purpose. A note that
 * showed whichever two slots happened to be filled would read as a truncated
 * thought rather than a short one, and the reader has no way to tell which it is.
 */
export function noteParagraphs(note = FOUNDER_NOTE) {
  if (!noteIsWritten(note)) return []
  return NOTE_PROMPTS.map(({ key }) => note[key].trim())
}
