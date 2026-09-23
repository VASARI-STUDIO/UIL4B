// Community ICON submissions — what may be sent, and what a reviewer is shown.
//
// ─────────────────────────────────────────────────────────────────────────────
// WHY THIS EXISTS
// ─────────────────────────────────────────────────────────────────────────────
// Founder, 2026-09-18: "people can submit icons to the community they just need
// to be reviewed - all submissions of any sorts are tied to the account not
// browser."
//
// The Community Hub already takes DESIGNS (a name and a link) and the queue
// already carries gradients and palettes. An icon is different from all three
// in one way that decides this whole module: an icon IS A DOCUMENT. A gradient
// is four numbers, a palette is a list of hex codes, a design is a URL — none of
// them can execute. An SVG can carry <script>, an onload= handler, a
// <foreignObject> full of HTML, a <!ENTITY> expansion, or a reference that makes
// the page phone out when it renders.
//
// So the contract is the same one utils/brandLogo.js already set for the user's
// uploaded logo, and it is deliberately the SAME CODE where it can be
// (sanitiseSvg, svgIntrinsicSize are imported, not re-written — a second copy of
// a security check is a second thing to forget to update):
//
//   DECISION 1 — SUBMITTED MARKUP IS NEVER INLINED. It is rendered in an <img>,
//   on both the submitter's preview and the reviewer's queue row. An <img> is a
//   replaced element: script inside its source does not run and external
//   subresources are not fetched. That is the browser's rule, not ours, which is
//   why it is the primary defence. Everything below is defence in depth behind
//   it, not instead of it.
//
//   DECISION 2 — IT IS TEXT IN THE QUEUE DOCUMENT, NOT A FILE IN STORAGE. The
//   icon rides `payload.svg` on the existing `community-submissions` document.
//   No Storage bucket, no upload URL, no new origin — and, decisively, NO NEW
//   API ROUTE: /api is full at Vercel's 12-function limit, so anything that
//   needed a server to accept the file could not be built at all.
//
//   DECISION 3 — THE CAP IS 8 KB OF MARKUP, AND IT IS A REAL CONSTRAINT. The
//   admin queue reads up to 200 documents at once (communityQueueApi.listQueue),
//   so the cap is what bounds that read: 200 x 8 KB is 1.6 MB, which a dashboard
//   can wear. A real icon is 300 bytes to 3 KB — Lucide's largest is under 2 KB —
//   so 8 KB is generous for artwork and hostile to anything that is not artwork.
//   It is stated to the submitter BEFORE they choose a file, never sprung on
//   them as an error.
//
// ─────────────────────────────────────────────────────────────────────────────
// MOBBIN, and which screen drove which decision
// ─────────────────────────────────────────────────────────────────────────────
//   • Discord, "Upload a file" (sticker submission) — the accepted formats and
//     the size ceiling are printed in the modal's SUBHEAD, above the picker, and
//     the artwork is previewed on a DARK tile and a LIGHT tile side by side,
//     because Discord has two themes and a sticker has to survive both. UIL4B has
//     two themes and an icon has exactly the same problem, which is why
//     iconPreviewSvg() exists and why it is called twice.
//     https://mobbin.com/screens/41b172d2-993a-4a77-8e44-39f3fdbc2582
//   • Coda, "Upload an icon" — "We recommend a square image with a transparent
//     background under 5MB." The recommendation is about what the PRODUCT will do
//     with the file, stated before anything is chosen. That drove ICON_ACCEPT_LABEL
//     and ICON_MAX_LABEL being exported for the UI to print rather than typed into
//     the JSX, so the form cannot state a number this module does not enforce.
//     https://mobbin.com/screens/70345eb7-519e-46cc-a4e7-0d81d42f3c2f
//   • Behance, "New Asset" — a submission is a FILE plus basic info plus a
//     category, and the file row shows the resolved filename back. That is the
//     shape of the icon form: pick or paste, then see what was actually read.
//     https://mobbin.com/screens/feb60d74-2868-4c17-9abb-fbe15ac6b52d
//
// DOM-free and React-free, exactly like utils/brandLogo.js and
// utils/communityQueue.js: the validation is the thing this feature is judged on,
// so it has to be testable under `node --test` without a browser. Explicit .js
// extensions on the imports for the same reason. The local store at the bottom
// takes its storage as an argument for that same reason, exactly as
// utils/communitySubmissions.js does.
import { sanitiseSvg, svgIntrinsicSize } from './brandLogo.js'

/** The largest submitted icon, in bytes of markup. See DECISION 3. */
export const ICON_MAX_BYTES = 8 * 1024

/** Human form of ICON_MAX_BYTES, so the UI cannot print a different number. */
export const ICON_MAX_LABEL = `${Math.round(ICON_MAX_BYTES / 1024)} KB`

/** What the file picker takes, and what the form prints beside it. */
export const ICON_ACCEPT_ATTR = '.svg,image/svg+xml'
export const ICON_ACCEPT_LABEL = 'SVG'

/**
 * The payload keys an icon submission writes — named here so firestore.rules,
 * the unit test and the form all read ONE list. `author` is already in the
 * rules' payload allowlist (gradients and palettes carry it); `svg` is the one
 * key the rules do not yet know, and docs/design/community-icon-rules.patch is
 * the diff that teaches them.
 */
export const ICON_PAYLOAD_KEYS = Object.freeze(['svg', 'author'])

/**
 * Hazards an ICON can carry that a logo could not, or that brandLogo's list does
 * not reach. These are additive to sanitiseSvg(), never a replacement for it.
 *
 *  · A DOCTYPE or ENTITY declaration is the billion-laughs / XXE shape. An icon
 *    has no legitimate use for either, and unlike a <script> tag this one is
 *    dangerous to the PARSER rather than to the page, so an <img> does not make
 *    it harmless.
 *  · <image> embeds another document — a raster, or a URL. An icon that is a
 *    photograph is not an icon, and a remote one makes the queue phone out.
 *  · <style> can carry @import, which is a network request the <img> rule does
 *    not stop in every engine, and it can reach outside the icon's own tree.
 *  · <a> makes part of the artwork a link. Icons are not navigation.
 */
const ICON_HAZARDS = [
  [/<!\s*(?:DOCTYPE|ENTITY)/i, 'a document type declaration'],
  [/<\s*image[\s/>]/i, 'an embedded image'],
  [/<\s*style[\s/>]/i, 'a stylesheet'],
  [/<\s*a[\s/>]/i, 'a link'],
]

/** The root `<svg …>` opening tag, which is the only tag this module edits. */
const ROOT_TAG = /<svg\b[^>]*>/i

/** A `color` presentation attribute inside a tag, single- or double-quoted. */
const ROOT_COLOR_ATTR = /\scolor\s*=\s*(?:"[^"]*"|'[^']*')/gi

/** Collapse the whitespace an exported SVG carries without touching its data. */
const tidy = (source) => String(source ?? '').replace(/\r\n/g, '\n').trim()

/**
 * Is this markup submittable as an icon?
 *
 * Returns `{ svg, width, height }` when it is, or `{ error }` when it is not —
 * phrased for the person holding the file, and reusing brandLogo's own sentences
 * verbatim wherever they already say the right thing, so the product does not
 * refuse the same file two different ways on two different pages.
 */
export function normaliseIconSvg(source) {
  const svg = tidy(source)
  if (!svg) return { error: 'That file does not look like an SVG.' }

  // brandLogo first: it owns <script>, <foreignObject>, inline handlers,
  // embedded documents and external references, and it also answers "is this an
  // SVG at all".
  const unsafe = sanitiseSvg(svg)
  if (unsafe) return { error: unsafe }

  for (const [pattern, what] of ICON_HAZARDS) {
    if (pattern.test(svg)) {
      return { error: `That SVG contains ${what}, so it is not stored. Export it again from your design tool as plain artwork.` }
    }
  }

  // Bytes, not characters: the cap bounds what Firestore stores and what the
  // reviewer's queue downloads, and both count UTF-8.
  const bytes = iconBytes(svg)
  if (bytes > ICON_MAX_BYTES) {
    return { error: `That SVG is ${Math.ceil(bytes / 1024)} KB. Icons are stored up to ${ICON_MAX_LABEL} — export it again without the editor metadata.` }
  }

  // Without a coordinate system there is no honest size to draw it at, and a
  // guessed one puts the reviewer's decision on artwork they were never shown.
  const size = svgIntrinsicSize(svg)
  if (!size) {
    return { error: 'That SVG has no viewBox, so it cannot be drawn at a known size. Export it again with a viewBox.' }
  }

  return { svg, width: size.width, height: size.height }
}

/** UTF-8 byte length of the markup. */
export function iconBytes(source) {
  const src = String(source ?? '')
  // TextEncoder is in node and in every browser this app supports; the fallback
  // is only there so a stray environment counts something rather than throwing.
  if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(src).length
  return unescape(encodeURIComponent(src)).length
}

/**
 * The same artwork, forced to one ink, for a PREVIEW ONLY.
 *
 * WHY THIS IS NOT COSMETIC. Nearly every icon worth submitting is drawn with
 * `stroke="currentColor"` or `fill="currentColor"` — that is how Lucide, Tabler,
 * Phosphor and the app's own NavIcon are all built. Inside an <img> there is no
 * inherited colour to be current, so `currentColor` resolves to the SVG
 * document's own initial colour, which is black. A perfectly good icon would
 * therefore render as an invisible black-on-black square on this app's dark
 * theme, and the submitter would conclude their file was broken.
 *
 * So the preview sets `color` on the ROOT ELEMENT, which is what `currentColor`
 * resolves against. An existing root `color` is REMOVED first rather than
 * overridden: an SVG inside an <img> is parsed as XML, and XML treats a
 * duplicated attribute as a fatal error — the image would simply not render, on
 * exactly the files that had already thought about colour.
 *
 * Child elements keep their own explicit colours, which is correct: those are
 * the submitter's decision and the reviewer must see them.
 *
 * Returns the input unchanged when there is no root tag to edit.
 */
export function iconPreviewSvg(source, ink) {
  const svg = tidy(source)
  const root = ROOT_TAG.exec(svg)
  if (!root) return svg
  const cleaned = root[0].replace(ROOT_COLOR_ATTR, '')
  // After `<svg`, so it sits before anything the file already declared and is
  // trivially findable when reading the rendered markup.
  const painted = cleaned.replace(/^<svg\b/i, `<svg color="${String(ink || '').replace(/["'<>&]/g, '')}"`)
  return svg.slice(0, root.index) + painted + svg.slice(root.index + root[0].length)
}

/**
 * A `src` for an <img>, per DECISION 1.
 *
 * Percent-encoded UTF-8 rather than base64 for two reasons: it needs no `btoa`
 * or `Buffer`, so the same function runs in the browser and under `node --test`;
 * and every byte that could close an attribute or open a tag is encoded, so the
 * value is inert wherever it is put.
 */
export function iconPreviewDataUri(source, ink) {
  const svg = iconPreviewSvg(source, ink)
  if (!svg) return ''
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

/**
 * The queue payload for an icon. Returns null when the markup is not
 * submittable, so a half-formed document can never reach a reviewer's list
 * looking like something they can act on — the same contract
 * communityQueue.buildQueueRecord keeps for the record around it.
 *
 * Only ICON_PAYLOAD_KEYS are written. A key the rules do not allow is a write
 * Firestore rejects outright, so the allowlist is not tidiness.
 */
export function buildIconPayload({ svg, author } = {}) {
  const normalised = normaliseIconSvg(svg)
  if (normalised.error) return null
  const credit = typeof author === 'string' ? author.replace(/\s+/g, ' ').trim().slice(0, 80) : ''
  const payload = { svg: normalised.svg }
  if (credit) payload.author = credit
  return payload
}

/* ── The local copy ─────────────────────────────────────────────────────────
 *
 * THE ACCOUNT IS THE SOURCE OF TRUTH AND THIS IS NOT IT.
 *
 * The founder's requirement is that a submission is "tied to the account not
 * browser", and the thing that satisfies it is the Firestore document keyed by
 * authorUid — that is what survives a cache clear and follows the user to
 * another device. This store exists for the two seconds either side of that
 * write, and for the case where it fails:
 *
 *   · submitting updates the list without waiting on a round trip, and works
 *     with no network at all;
 *   · a publish that FAILS leaves the user's artwork somewhere rather than
 *     discarding it, and the row says out loud that it has not reached the
 *     queue, with a control to send it again.
 *
 * That last part is the difference from the three flows before it, which keep a
 * local copy and then offer no way to get it to the account. See Community.jsx.
 */
export const ICON_SUBMISSIONS_KEY = 'vs-icon-submissions'

/** A cap, so a runaway loop cannot fill the storage quota. Newest kept. */
export const ICON_SUBMISSIONS_MAX = 30

function resolveStorage(storage) {
  return storage || (typeof localStorage !== 'undefined' ? localStorage : null)
}

const clean = (value, max) => (typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, max) : '')

/**
 * Anything that does not describe a submittable icon is DROPPED rather than
 * stored half-formed. This runs on every read as well as every write, so markup
 * hand-edited into localStorage gets the same refusal as markup pasted into the
 * form — the store is not a way around normaliseIconSvg().
 */
export function sanitizeIconSubmission(item) {
  if (!item || typeof item !== 'object' || Array.isArray(item)) return null
  const normalised = normaliseIconSvg(item.svg)
  if (normalised.error) return null
  const createdAt = typeof item.createdAt === 'string' ? item.createdAt.slice(0, 40) : ''
  return {
    id: clean(item.id, 60) || `i${Date.now()}`,
    name: clean(item.name, 80) || 'Untitled icon',
    author: clean(item.author, 80),
    svg: normalised.svg,
    // 'pending' is the only status a client may hold, here and in the queue.
    // 'approved' is a reviewer's word and is reachable from nowhere on the
    // client, so nothing can put itself in front of anybody.
    status: 'pending',
    createdAt: createdAt || new Date().toISOString(),
  }
}

export function writeIconSubmissions(items, storage) {
  const target = resolveStorage(storage)
  const safe = Array.isArray(items)
    ? items.map(sanitizeIconSubmission).filter(Boolean).slice(0, ICON_SUBMISSIONS_MAX)
    : []
  try { target?.setItem(ICON_SUBMISSIONS_KEY, JSON.stringify(safe)) } catch { /* disabled / quota */ }
  return safe
}

export function readIconSubmissions(storage) {
  const target = resolveStorage(storage)
  try {
    const parsed = JSON.parse(target?.getItem(ICON_SUBMISSIONS_KEY) || '[]')
    return writeIconSubmissions(Array.isArray(parsed) ? parsed : [], target)
  } catch {
    return writeIconSubmissions([], target)
  }
}

/** Newest first — the list reads top-down like a review queue. */
export function appendIconSubmission(item, storage) {
  return writeIconSubmissions([item, ...readIconSubmissions(storage)], storage)
}

export function removeIconSubmission(id, storage) {
  return writeIconSubmissions(readIconSubmissions(storage).filter(s => s.id !== id), storage)
}
