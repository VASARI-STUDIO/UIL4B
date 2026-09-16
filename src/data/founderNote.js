// The founder's note — the WORDS, kept in their own file away from the component.
//
// ─────────────────────────────────────────────────────────────────────────────
// WHY THE WORDS SHIPPED EMPTY, AND WHO LIFTED THAT
// ─────────────────────────────────────────────────────────────────────────────
// This note is FOUNDER-OWNED COPY and no agent may write it. That was a standing
// rule here with two precedents behind it. An agent correctly refused to draft
// the homepage hero's headline sentence on the grounds that drafting it would be
// an agent imitating Dylan's voice. And the homepage intro has been rejected
// twice as "MEGA AI generated" — most recently for a rule of three with anaphora
// and an imperative aimed at the reader.
//
// A note whose entire purpose is to sound like one specific person cannot be
// written by something that is not that person. Writing a convincing one would
// be the failure, not the success: the request that started this item said the
// point was "to help the app feel more down to earth to people who think oh
// another app from another company", and a fabricated voice is the exact
// opposite of that.
//
// ON 2026-09-15 DYLAN LIFTED IT, for this piece only: "write this in austrlan
// english based on the information you know". So the draft below is an agent's,
// written to his brief, and it is a DRAFT — the rule above is his and he is the
// only one who can say these sentences sound like him. Anything here that does
// not, he changes; that is four edits in this file and nothing else.
//
// EVERY CLAIM IN IT WAS CHECKED against the code rather than imagined, because
// the one instruction the rule above still enforces absolutely is the last
// paragraph of this header: no invented biography. So the note says he builds it
// alone in Brisbane (which AppFooter.jsx has said since before this file
// existed) and nothing else about him. What it says about the PRODUCT is
// checkable: the tool list is the Create groups, "saving and downloading need a
// free account" is useExportGate.js, and the feedback link is in the Support
// column of this very footer on every page.
//
// The AI sentence follows the founder's own standing instruction on how AI
// usage is described to a reader: lowered while the product is in beta, lifted
// if there is enough support. The instruction is his, recorded in a local-only
// document, and is not reproduced here.
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
// The original request: "make sure to use real australian style english to sound
// like me not an AI written statement." Whoever fills these in should write them
// the way they would say them out loud. Contractions are fine. An unfinished
// thought is fine. What is not fine is the register that got the homepage intro
// rejected — three parallel clauses in a row, "not just X but Y", or an
// instruction pointed at the reader.
//
// DO NOT invent biography here. Nothing on record holds any personal history,
// and a made-up origin story is worse than no note at all.

/**
 * The four things the note has to say, in the order it says them.
 *
 * These are the FOUNDER'S PROMPTS, not product copy — the panel shows them only
 * while the note is unwritten, as the list of what is still missing. They are
 * deliberately one question each: the person answering them is time-poor and
 * building this alone, so the ask has to be four one-line answers rather than
 * "write us a paragraph".
 */
export const NOTE_PROMPTS = [
  { key: 'who', prompt: 'Who you are' },
  { key: 'what', prompt: 'What UIL4B is for' },
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
  who: 'I\'m Dylan. I build UIL4B on my own, out of Brisbane.',
  what: 'It\'s a pile of design tools in one place — colour, type, icons, contrast, a few converters. You can use most of it without an account; saving and downloading need a free one.',
  state: 'It\'s early. I\'m adding tools and fixing things most days, so you\'ll find rough edges. AI usage is dialled down while it\'s in beta — if enough people get use out of it, I\'ll upgrade the plans behind it.',
  help: 'The most useful thing I get sent is what\'s missing or what broke. There\'s a feedback link in the footer of every page and it comes straight to me.',
}

/**
 * How the note is signed.
 *
 * Both facts are already public in the app — AppFooter.jsx has read "Built in
 * Brisbane by Dylan Coleman" since before this note existed — so neither is
 * something this file invented. Nothing else about him is asserted in here,
 * which is the point: the biography is his to give, not ours to guess.
 */
export const FOUNDER_SIGNATURE = { name: 'Dylan Coleman', place: 'Brisbane' }

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
