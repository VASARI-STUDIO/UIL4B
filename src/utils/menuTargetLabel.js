// A plain-words name for the thing a right-click landed on, for the heading of
// the feedback menu. It is shown to the person in front of the screen and goes
// nowhere else: the report carries elementSignature()'s selector, which stays
// out of sight.
//
// The name comes from aria-label (or title), which is what a screen reader
// would say for the control. Visible text is never read.

const MAX_NAME = 40
// How far up from the pointer to look for a named control, the same reach
// elementSignature() uses.
const MAX_DEPTH = 4

const NOUNS = {
  button: 'button',
  h1: 'heading', h2: 'heading', h3: 'heading', h4: 'heading', h5: 'heading', h6: 'heading',
  nav: 'menu',
  section: 'section', article: 'section', aside: 'section', main: 'section',
  header: 'section', footer: 'section', form: 'form', table: 'table',
}

const FALLBACK_NOUN = 'part of the page'

function tidyName(raw) {
  const name = String(raw || '').replace(/\s+/g, ' ').trim()
  if (!name) return ''
  return name.length > MAX_NAME ? `${name.slice(0, MAX_NAME - 1).trimEnd()}…` : name
}

/**
 * "Button: Copy #3A5F2B" when the control has an accessible name, "This button"
 * when it does not. Takes plain descriptors so it can be tested without a DOM.
 */
export function describeTarget({ tag = '', name = '' } = {}) {
  const noun = NOUNS[String(tag).toLowerCase()] || FALLBACK_NOUN
  const label = tidyName(name)
  if (label) return `${noun.charAt(0).toUpperCase()}${noun.slice(1)}: ${label}`
  return `This ${noun}`
}

/** The DOM adapter: walk up from the element and describe the first named one. */
export function plainTargetLabel(el) {
  let node = el
  for (let i = 0; node && node.nodeType === 1 && i < MAX_DEPTH; i += 1) {
    const name = tidyName(node.getAttribute('aria-label') || node.getAttribute('title'))
    if (name) return describeTarget({ tag: node.tagName, name })
    node = node.parentElement
  }
  const own = el && el.nodeType === 1 ? el.tagName : ''
  return describeTarget({ tag: own === 'BODY' || own === 'HTML' ? '' : own })
}
