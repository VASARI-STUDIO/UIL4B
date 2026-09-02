// Which thing on the page the user was pointing at — and when to keep our
// hands off the browser's own menu.
//
// ─────────────────────────────────────────────────────────────────────────────
// WHY A SIGNATURE AND NOT A DOM DUMP
// ─────────────────────────────────────────────────────────────────────────────
// A report that says "the button broke" is unactionable; a report carrying
// 40KB of serialised DOM is worse. It is unreadable in a triage inbox, it
// bloats every record in the feedback store, and — the part that actually
// matters — it is overwhelmingly likely to contain something private, because
// the DOM is where the user's work lives. Palette names, prompt text, document
// titles and email addresses are all sitting in there as text nodes and
// attribute values.
//
// So we emit ONE short string: `button.plb-add`, `.pnav-menu a`. Enough for
// someone to find the element in the source, and structurally incapable of
// carrying content, because the only inputs are tag names, ids, classes and
// data-testids — and every one of those is filtered again below.
//
// ─────────────────────────────────────────────────────────────────────────────
// DOM-FREE ON PURPOSE
// ─────────────────────────────────────────────────────────────────────────────
// Everything here takes plain descriptors, so the redaction rules — the part
// that must not quietly regress — are testable with node:test and no browser.
// `chainFrom()` at the bottom is the only DOM-aware function, and it is a
// deliberate thin read: it copies four fields per node and nothing else.

// A signature longer than this stops being a lead and starts being noise.
const MAX_SIGNATURE = 60
// How far up from the pointer we look for something nameable. Past this the
// answer is always a layout wrapper, which tells a triager nothing.
const MAX_DEPTH = 4
// Individual tokens: a class or id longer than this is machine-made.
const MAX_TOKEN = 32

// Classes that describe a STATE rather than a component. `.on` and `.active`
// are true of hundreds of elements, so a signature built from one identifies
// nothing — and the same element yields a different signature depending on
// when you right-clicked it, which is the opposite of stable.
const STATE_CLASSES = new Set([
  'on', 'off', 'active', 'open', 'closed', 'selected', 'current', 'disabled',
  'is-active', 'is-open', 'hidden', 'show', 'hide', 'visible', 'expanded',
  'collapsed', 'loading', 'error', 'ok', 'sr-only', 'dragging', 'drag-over',
])

/**
 * Is this class/id token something a human wrote, and will it mean the same
 * thing tomorrow?
 *
 * The rejections are not stylistic. Each one is a value that either changes
 * between renders (so it cannot be reproduced from) or is capable of carrying
 * user data (so it must not leave the browser).
 */
export function isStableToken(token) {
  if (typeof token !== 'string') return false
  const t = token.trim()
  if (!t || t.length > MAX_TOKEN) return false
  // Only the characters a CSS identifier is actually made of. This is the hard
  // stop for content: anything with a space, quote, slash, colon, `@` or `.`
  // in it is not a class name we authored, and could be a path, an email or a
  // sentence that found its way into an attribute.
  if (!/^[A-Za-z][A-Za-z0-9_-]*$/.test(t)) return false
  if (STATE_CLASSES.has(t.toLowerCase())) return false
  // React's useId produces `:r3:`; the leading-colon form is already rejected
  // above, but the bare `r3`-style residue is not, and neither are the hashes
  // bundlers append. A run of 4+ digits is almost always a record id — the row
  // number of someone's saved palette, which is their data, not our markup.
  if (/\d{4,}/.test(t)) return false
  // A long unbroken hex/base36 run is a build hash or a generated id
  // (`a3f9c1d0`, `x1k9m2p4q7`). `--` and `_` separated words survive, because
  // that is what a hand-written BEM/utility class looks like.
  if (/^[0-9a-f]{8,}$/i.test(t)) return false
  if (/[A-Za-z0-9]{16,}/.test(t)) return false
  return true
}

// The one token we will show for a node, in descending order of how much it
// tells a triager. A data-testid is authored precisely to name a thing, so it
// wins; an id is next; a class last.
function tokenFor(node) {
  if (!node) return ''
  if (isStableToken(node.testId)) return `[data-testid="${node.testId}"]`
  if (isStableToken(node.id)) return `#${node.id}`
  const classes = Array.isArray(node.classes) ? node.classes : []
  const named = classes.find(isStableToken)
  return named ? `.${named}` : ''
}

function tagOf(node) {
  const tag = typeof node?.tag === 'string' ? node.tag.toLowerCase() : ''
  return /^[a-z][a-z0-9-]*$/.test(tag) ? tag : ''
}

// Elements that are never the thing the user meant. Every button in this app
// wraps an inline <svg>, so `event.target` on a right-click is almost always a
// `<path>` — and `path` as a signature is useless while `button.plb-add` is
// exactly the answer. These are stepped over (unless they name themselves,
// which an icon with its own testid legitimately does).
const PRESENTATIONAL = new Set([
  'svg', 'path', 'g', 'use', 'circle', 'rect', 'line', 'polyline', 'polygon',
  'ellipse', 'defs', 'span', 'em', 'strong', 'i', 'b', 'small',
])

/**
 * A short, stable CSS-ish name for the element under the pointer.
 *
 * `chain` is closest-first: [element, parent, grandparent, ...].
 *
 * Three shapes come out, in order of preference:
 *   `button.plb-add`   — the element names itself
 *   `.pnav-menu a`     — it doesn't, but a near ancestor does
 *   `button`           — neither does; the tag alone is still a hint
 * and `''` when even that is untrustworthy.
 */
export function elementSignature(chain) {
  const all = Array.isArray(chain) ? chain : []
  if (!all.length) return ''

  // Step over icon internals FIRST, then take the depth budget — otherwise a
  // three-deep `<path><svg><span>` wrapper eats the whole allowance and the
  // named ancestor we were looking for never gets considered.
  let start = 0
  while (start < all.length - 1 && PRESENTATIONAL.has(tagOf(all[start])) && !tokenFor(all[start])) start += 1
  const nodes = all.slice(start, start + MAX_DEPTH)

  const tag = tagOf(nodes[0])
  const own = tokenFor(nodes[0])
  if (own) return safeSignature(`${tag}${own}`)

  // Nothing on the element itself. The nearest named ancestor plus our tag is
  // still a real lead — "the anchor inside .pnav-menu" is findable in seconds.
  for (let i = 1; i < nodes.length; i += 1) {
    const up = tokenFor(nodes[i])
    if (up) return safeSignature(tag ? `${up} ${tag}` : up)
  }
  return safeSignature(tag)
}

/**
 * Final guard. Nothing reaches the feedback store without passing this, so a
 * future change to the walk above cannot widen what escapes: the shape is
 * pinned here, in one place, rather than trusted to every caller.
 *
 * Exported because it is a redaction rule, not an implementation detail.
 * Nothing reachable through `elementSignature` today can violate it — the
 * token and tag filters already stop everything — which is exactly why it
 * needs testing directly: an untested last line of defence is one that
 * silently stops working the day the line before it changes.
 */
// The guard checks the SHAPE, not merely the characters. An earlier version
// allowed any two charset-valid halves separated by a space, which let
// `div.my palette.saved` through — a sentence wearing a selector's punctuation.
// Only the three forms the walk above can actually produce are accepted:
//
//   section                     a bare tag
//   button.plb-add              a tag naming itself (or the token alone)
//   .pnav-menu a                a named ancestor and our tag
//
const TAG = '[a-z][a-z0-9-]*'
const TOKEN = '(?:[.#][A-Za-z0-9_-]{1,32}|\\[data-testid="[A-Za-z0-9_-]{1,32}"\\])'
const SHAPE = new RegExp(`^(?:${TAG}|${TAG}?${TOKEN}|${TOKEN} ${TAG})$`)

export function safeSignature(sig) {
  const s = String(sig || '').trim()
  if (!s || s.length > MAX_SIGNATURE) return ''
  return SHAPE.test(s) ? s : ''
}

// Right-clicking these is how people copy, paste, save and open in a new tab.
// Taking that away to offer a feedback link is a straight downgrade — a worse
// bug than the one this feature exists to catch.
// `svg` is deliberately NOT here. Inline SVG is how every icon in this app is
// drawn, so vetoing on it would disable the feature over most of the surface —
// and browsers offer no image actions for inline SVG anyway, so there is no
// native menu worth protecting.
const NATIVE_TAGS = new Set([
  'input', 'textarea', 'select', 'option', 'a', 'img', 'video', 'audio',
  'canvas', 'embed', 'object', 'iframe',
])

/**
 * Should the browser's own context menu be left alone?
 *
 * Every `true` here is a case where the native menu is worth more to the user
 * than ours. We are a guest on this gesture.
 */
export function nativeMenuWins(chain, { hasSelection = false, defaultPrevented = false, shiftKey = false } = {}) {
  // Shift+right-click is the long-standing escape hatch for a page that
  // overrides the menu (Firefox honours it natively). Someone who wants the
  // browser menu must always be able to get it — otherwise "we do not swallow
  // the native menu" is a promise with no fallback when our own rules miss a
  // case.
  if (shiftKey) return true
  // A local menu (the sidebar's, PaletteBuilder's) already claimed this event.
  // Ours is the app-wide default, so it yields to anything more specific.
  if (defaultPrevented) return true
  // Text is selected: they are reaching for Copy, and they are right to.
  if (hasSelection) return true

  const nodes = Array.isArray(chain) ? chain : []
  return nodes.some((node) => {
    if (node?.editable) return true
    if (node?.feedbackSurface) return true
    const tag = tagOf(node)
    // A bare <a> with no href is a styling shell, not a link — nothing in the
    // browser menu applies to it, so it does not get to veto.
    if (tag === 'a') return !!node?.href
    return NATIVE_TAGS.has(tag)
  })
}

/**
 * The DOM adapter. The ONLY function here that touches a node, and it reads
 * four fields per element: tag, id, class list, data-testid — plus two
 * booleans. No text, no values, no attributes beyond those.
 */
export function chainFrom(node, { depth = 8 } = {}) {
  const out = []
  let el = node
  while (el && el.nodeType === 1 && out.length < depth) {
    out.push({
      tag: el.tagName,
      id: el.id || '',
      classes: typeof el.className === 'string' ? el.className.split(/\s+/).filter(Boolean) : [],
      testId: el.dataset?.testid || '',
      editable: el.isContentEditable === true,
      href: el.tagName === 'A' ? !!el.getAttribute('href') : false,
      feedbackSurface: el.dataset?.feedbackSurface != null,
    })
    el = el.parentElement
  }
  return out
}
