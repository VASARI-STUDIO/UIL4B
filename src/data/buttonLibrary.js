// The Button Library: ten button designs, and the functions that turn one
// design plus a few quick edits into the CSS, HTML and AI prompt a visitor
// copies.
//
// The CSS a card shows, the CSS the preview runs and the CSS the Copy button
// puts on the clipboard are the SAME string, built by buttonCss(). A preview
// that was styled by the page's own sheet and a snippet that was typed beside
// it would drift the first time either was edited.
//
// ── What every design carries ───────────────────────────────────────────────
//
// The shared parts are written once, in buttonCss(), so no design can ship
// without them:
//
//   hover      inside `@media (hover: hover)`, so a touch screen never latches it
//   pressed    `:active`, a 0.97 scale (a translate for the offset design)
//   focus      a 2px `:focus-visible` outline, 2px off the edge
//   disabled   half opacity, `not-allowed`, and it never scales
//   motion     120ms ease-out on named properties (never `transition: all`);
//              under `prefers-reduced-motion` the movement goes and the
//              colour fade stays
//   touch      `min-height: 44px` on a coarse pointer
//
// No gradients, no glow, no pure black or pure white.
//
// ── The edits ───────────────────────────────────────────────────────────────
//
// Size, corners and colour. Each is a small closed set, so every combination is
// one the designs were checked against (tests/unit/button-library.test.js
// measures the colour contrast of every accent). An edit only rewrites the
// custom properties at the top of the rule: the snippet stays one class and a
// handful of `--button-*` variables a person can keep editing by hand.

// ── The closed sets ─────────────────────────────────────────────────────────

// Surface ink and paper shared by every design. Near-black and off-white, not
// #000 and #fff.
export const BUTTON_INK = '#18181b'
export const BUTTON_PAPER = '#fafafa'
// The page the previews sit on (pages/button-library.css paints the same value).
// Fixed rather than themed, so a button is always judged against the page it was
// measured on: the contrast test uses this as "the page".
export const BUTTON_STAGE = BUTTON_PAPER

// Each accent is one family: a solid fill with its two states, the text that
// sits on it, and a soft tint with its two states and the dark text that sits
// on that. `ring` is the focus outline colour.
export const BUTTON_ACCENTS = Object.freeze({
  ink: Object.freeze({
    id: 'ink', label: 'Ink',
    solid: '#18181b', hover: '#27272a', active: '#09090b', on: BUTTON_PAPER,
    soft: '#e4e4e7', softHover: '#d4d4d8', softActive: '#a1a1aa', softInk: '#18181b',
  }),
  blue: Object.freeze({
    id: 'blue', label: 'Blue',
    solid: '#1d4ed8', hover: '#1e40af', active: '#1e3a8a', on: BUTTON_PAPER,
    soft: '#dbeafe', softHover: '#bfdbfe', softActive: '#93c5fd', softInk: '#1e3a8a',
  }),
  green: Object.freeze({
    id: 'green', label: 'Green',
    solid: '#15803d', hover: '#166534', active: '#14532d', on: BUTTON_PAPER,
    soft: '#dcfce7', softHover: '#bbf7d0', softActive: '#86efac', softInk: '#14532d',
  }),
  violet: Object.freeze({
    id: 'violet', label: 'Violet',
    solid: '#6d28d9', hover: '#5b21b6', active: '#4c1d95', on: BUTTON_PAPER,
    soft: '#ede9fe', softHover: '#ddd6fe', softActive: '#c4b5fd', softInk: '#4c1d95',
  }),
})

// Destructive is not a choice of colour, so it is not in the picker. It has the
// same shape as an accent so the builder treats it the same way.
export const BUTTON_DANGER = Object.freeze({
  id: 'danger', label: 'Red',
  solid: '#b91c1c', hover: '#991b1b', active: '#7f1d1d', on: BUTTON_PAPER,
  soft: '#fee2e2', softHover: '#fecaca', softActive: '#fca5a5', softInk: '#7f1d1d',
})

// Padding steps are multiples of 4; `medium` measures 44px tall with its
// border, which is also the touch-target floor.
export const BUTTON_SIZES = Object.freeze({
  small: Object.freeze({ id: 'small', label: 'Small', padY: 8, padX: 16, font: 13 }),
  medium: Object.freeze({ id: 'medium', label: 'Medium', padY: 12, padX: 20, font: 15 }),
  large: Object.freeze({ id: 'large', label: 'Large', padY: 16, padX: 28, font: 17 }),
})

export const BUTTON_CORNERS = Object.freeze({
  square: Object.freeze({ id: 'square', label: 'Square', radius: '0' }),
  soft: Object.freeze({ id: 'soft', label: 'Soft', radius: '8px' }),
  round: Object.freeze({ id: 'round', label: 'Round', radius: '999px' }),
})

export const BUTTON_EDIT_GROUPS = Object.freeze({
  size: Object.freeze({ label: 'Size', options: Object.values(BUTTON_SIZES) }),
  corners: Object.freeze({ label: 'Corners', options: Object.values(BUTTON_CORNERS) }),
  accent: Object.freeze({ label: 'Colour', options: Object.values(BUTTON_ACCENTS) }),
})

// ── The designs ─────────────────────────────────────────────────────────────
//
// A design supplies only what is particular to it:
//
//   cls       the class in the snippet
//   role      where it sits in a hierarchy; the page's filter
//   use       one sentence on when to reach for it
//   note      one sentence on how it is built or what to watch for
//   defaults  size / corners / accent when nothing has been edited
//   edits     which of the three edits make sense for it
//   label     the words on the preview and in the HTML
//   vars      colour custom properties: (accent) => [name, value][]
//   base      resting declarations: () => string[]
//   hover     declarations on hover:  () => string[]
//   active    declarations on press:  () => string[]
//   extra     optional extra rules:   (sel) => { sel, decl, media? }[]
//   html      the markup
//   fade      colour properties that transition (default: background, border, colour)
//   move      properties that move on hover/press (default: transform)

const ARROW_SVG = '<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false"><path d="M3 8h10M9 4l4 4-4 4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>'
const PLUS_SVG = '<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false"><path d="M8 3v10M3 8h10" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>'

const filledVars = (a) => [
  ['--button-bg', a.solid],
  ['--button-bg-hover', a.hover],
  ['--button-bg-active', a.active],
  ['--button-fg', a.on],
  ['--button-ring', a.solid],
]
const filledBase = () => ['border: 1px solid transparent', 'background: var(--button-bg)', 'color: var(--button-fg)']
const filledHover = () => ['background: var(--button-bg-hover)']
const filledActive = () => ['background: var(--button-bg-active)']

const softVars = (a) => [
  ['--button-bg', a.soft],
  ['--button-bg-hover', a.softHover],
  ['--button-bg-active', a.softActive],
  ['--button-fg', a.softInk],
  ['--button-ring', a.solid],
]

export const BUTTON_ITEMS = Object.freeze([
  {
    id: 'solid',
    name: 'Solid',
    cls: 'btn-solid',
    role: 'primary',
    tags: ['solid', 'filled', 'primary'],
    use: 'The main action on a screen. One per view.',
    note: 'A flat fill that darkens on hover and press. The text is the paper colour on the fill, which measures above 7:1 in every colour.',
    defaults: { size: 'medium', corners: 'soft', accent: 'ink' },
    edits: ['size', 'corners', 'accent'],
    label: 'Get started',
    vars: filledVars,
    base: filledBase,
    hover: filledHover,
    active: filledActive,
  },
  {
    id: 'block',
    name: 'Full width',
    cls: 'btn-block',
    role: 'primary',
    tags: ['full width', 'filled', 'form', 'mobile'],
    use: 'Fills its container: checkout, sign-in forms and mobile sheets.',
    note: 'Set to `display: flex` with `width: 100%`, so it stretches to whatever holds it and stays one line tall.',
    defaults: { size: 'large', corners: 'soft', accent: 'blue' },
    edits: ['size', 'corners', 'accent'],
    label: 'Continue to payment',
    previewWidth: 260,
    vars: filledVars,
    base: () => ['display: flex', 'width: 100%', ...filledBase()],
    hover: filledHover,
    active: filledActive,
  },
  {
    id: 'arrow',
    name: 'Arrow',
    cls: 'btn-arrow',
    role: 'primary',
    tags: ['arrow', 'icon', 'filled', 'next step'],
    use: 'Leads somewhere: the next step, read more, open the full view.',
    note: 'The arrow slides 2px on hover. The slide is dropped for people who ask for reduced motion; the colour change stays.',
    defaults: { size: 'medium', corners: 'soft', accent: 'violet' },
    edits: ['size', 'corners', 'accent'],
    label: 'Read the guide',
    vars: filledVars,
    base: filledBase,
    hover: filledHover,
    active: filledActive,
    arrow: true,
    html: (cls, label) => `<button class="${cls}" type="button">\n  ${label}\n  ${ARROW_SVG}\n</button>`,
  },
  {
    id: 'offset',
    name: 'Offset',
    cls: 'btn-offset',
    role: 'primary',
    tags: ['offset', 'raised', 'bold', 'outlined'],
    use: 'A loud, tactile primary for playful or editorial pages.',
    note: 'A hard shadow with no blur. Hover lifts the button toward the light and tints it; press pushes it into the shadow. Under reduced motion the shift goes and the tint stays.',
    defaults: { size: 'medium', corners: 'soft', accent: 'green' },
    edits: ['size', 'corners', 'accent'],
    label: 'Join the list',
    // The tint is the cue that survives reduced motion, which drops the shift.
    fade: ['background-color'],
    move: ['transform', 'box-shadow'],
    vars: (a) => [
      ['--button-bg', a.soft],
      ['--button-bg-hover', a.softHover],
      ['--button-bg-active', a.softActive],
      ['--button-fg', BUTTON_INK],
      ['--button-edge', BUTTON_INK],
      ['--button-ring', BUTTON_INK],
    ],
    base: () => ['border: 2px solid var(--button-edge)', 'background: var(--button-bg)', 'color: var(--button-fg)', 'box-shadow: 4px 4px 0 var(--button-edge)'],
    hover: () => ['background: var(--button-bg-hover)', 'transform: translate(-1px, -1px)', 'box-shadow: 5px 5px 0 var(--button-edge)'],
    active: () => ['background: var(--button-bg-active)', 'transform: translate(3px, 3px)', 'box-shadow: 1px 1px 0 var(--button-edge)'],
    pressMove: true,
  },
  {
    id: 'outline',
    name: 'Outline',
    cls: 'btn-outline',
    role: 'secondary',
    tags: ['outline', 'bordered', 'secondary'],
    use: 'The second choice beside a primary: Cancel, Learn more, Back.',
    note: 'A 1px border and no fill, so it stays quieter than the solid button next to it. Hover tints the inside.',
    defaults: { size: 'medium', corners: 'soft', accent: 'ink' },
    edits: ['size', 'corners', 'accent'],
    label: 'Learn more',
    vars: (a) => [
      ['--button-line', a.solid],
      ['--button-bg-hover', a.soft],
      ['--button-bg-active', a.softHover],
      ['--button-fg', a.softInk],
      ['--button-ring', a.solid],
    ],
    base: () => ['border: 1px solid var(--button-line)', 'background: transparent', 'color: var(--button-fg)'],
    hover: () => ['background: var(--button-bg-hover)'],
    active: () => ['background: var(--button-bg-active)'],
  },
  {
    id: 'soft',
    name: 'Soft',
    cls: 'btn-soft',
    role: 'secondary',
    tags: ['soft', 'tinted', 'secondary'],
    use: 'A friendly secondary on busy screens, or an action that should not shout.',
    note: 'A tint of the accent with dark text from the same family. Both are chosen together, so the text passes 4.5:1 on every tint.',
    defaults: { size: 'medium', corners: 'soft', accent: 'blue' },
    edits: ['size', 'corners', 'accent'],
    label: 'Save for later',
    vars: softVars,
    base: filledBase,
    hover: filledHover,
    active: filledActive,
  },
  {
    id: 'ghost',
    name: 'Ghost',
    cls: 'btn-ghost',
    role: 'tertiary',
    tags: ['ghost', 'quiet', 'toolbar'],
    use: 'Toolbars and dense rows, where a visible box on every action would be noise.',
    note: 'No fill and no border at rest. The hover tint is what tells you it is a button, so keep it clear of text-only links.',
    defaults: { size: 'medium', corners: 'soft', accent: 'ink' },
    edits: ['size', 'corners', 'accent'],
    label: 'Skip for now',
    vars: (a) => [
      ['--button-bg-hover', a.soft],
      ['--button-bg-active', a.softHover],
      ['--button-fg', a.softInk],
      ['--button-ring', a.solid],
    ],
    base: () => ['border: 1px solid transparent', 'background: transparent', 'color: var(--button-fg)'],
    hover: () => ['background: var(--button-bg-hover)'],
    active: () => ['background: var(--button-bg-active)'],
  },
  {
    id: 'link',
    name: 'Underline',
    cls: 'btn-link',
    role: 'tertiary',
    tags: ['text', 'link', 'underline', 'inline'],
    use: 'An action that sits inside a line of text: Forgot password, Show more.',
    note: 'Text only. Hover thickens the underline instead of changing the colour. Use a real link when it goes to another page.',
    defaults: { size: 'medium', corners: 'soft', accent: 'blue' },
    edits: ['size', 'accent'],
    label: 'Forgot your password?',
    noPress: true,
    vars: (a) => [
      ['--button-fg', a.solid],
      ['--button-fg-active', a.active],
      ['--button-ring', a.solid],
    ],
    base: () => ['border: 0', 'background: transparent', 'color: var(--button-fg)', 'text-decoration: underline', 'text-decoration-thickness: 1px', 'text-underline-offset: 4px'],
    hover: () => ['text-decoration-thickness: 2px'],
    active: () => ['color: var(--button-fg-active)'],
    padding: 'var(--button-pad-y) 0',
    fade: ['color'],
    move: [],
  },
  {
    id: 'icon',
    name: 'Icon only',
    cls: 'btn-icon',
    role: 'tertiary',
    tags: ['icon', 'compact', 'square'],
    use: 'A single glyph for a familiar action: add, close, more.',
    note: 'There is no visible text, so it needs an `aria-label`. The box is square by `aspect-ratio`, and a touch screen gets 44px each way.',
    defaults: { size: 'medium', corners: 'round', accent: 'violet' },
    edits: ['size', 'corners', 'accent'],
    label: 'Add item',
    iconOnly: true,
    vars: softVars,
    base: () => ['aspect-ratio: 1', 'border: 1px solid transparent', 'background: var(--button-bg)', 'color: var(--button-fg)'],
    hover: filledHover,
    active: filledActive,
    padding: 'var(--button-pad-y)',
    html: (cls, label) => `<button class="${cls}" type="button" aria-label="${label}">\n  ${PLUS_SVG}\n</button>`,
  },
  {
    id: 'danger',
    name: 'Destructive',
    cls: 'btn-danger',
    role: 'destructive',
    tags: ['destructive', 'danger', 'delete', 'filled'],
    use: 'Delete, remove, cancel a subscription. Pair it with a confirm step.',
    note: 'Red is fixed on purpose: the colour is the warning. The fill is darker than the other designs so white text keeps above 6:1.',
    defaults: { size: 'medium', corners: 'soft', accent: 'danger' },
    edits: ['size', 'corners'],
    label: 'Delete project',
    vars: filledVars,
    base: filledBase,
    hover: filledHover,
    active: filledActive,
  },
])

export const BUTTON_ROLES = Object.freeze([
  { id: 'all', label: 'All' },
  { id: 'primary', label: 'Primary' },
  { id: 'secondary', label: 'Secondary' },
  { id: 'tertiary', label: 'Quiet' },
  { id: 'destructive', label: 'Destructive' },
])

export const buttonById = (id) => BUTTON_ITEMS.find((b) => b.id === id) || null

// ── Edits ───────────────────────────────────────────────────────────────────

/**
 * What an item looks like once edits are applied. An edit the item does not
 * offer, or a value outside the closed set, is ignored: the result is always a
 * combination the designs were checked against.
 */
export function resolveEdits(item, edits = {}) {
  const out = { ...item.defaults }
  const sets = { size: BUTTON_SIZES, corners: BUTTON_CORNERS, accent: BUTTON_ACCENTS }
  for (const key of item.edits) {
    const wanted = edits?.[key]
    if (typeof wanted === 'string' && Object.prototype.hasOwnProperty.call(sets[key], wanted)) out[key] = wanted
  }
  return out
}

/** True when the edits move an item away from how it ships. */
export function isEdited(item, edits = {}) {
  const now = resolveEdits(item, edits)
  return Object.keys(now).some((k) => now[k] !== item.defaults[k])
}

function tokensFor(item, edits) {
  const r = resolveEdits(item, edits)
  const accent = r.accent === 'danger' ? BUTTON_DANGER : BUTTON_ACCENTS[r.accent]
  return { r, size: BUTTON_SIZES[r.size], corners: BUTTON_CORNERS[r.corners], accent }
}

// ── The snippets ────────────────────────────────────────────────────────────

const MOTION = '120ms ease-out'

const block = (selector, decl, indent = '') => (
  `${indent}${selector} {\n${decl.map((d) => `${indent}  ${d};`).join('\n')}\n${indent}}`
)
const inMedia = (query, rules) => (
  `@media ${query} {\n${rules.map((r) => block(r.sel, r.decl, '  ')).join('\n')}\n}`
)

/**
 * The CSS for one design with the given edits.
 * `scope` puts a parent selector in front of every rule, which is how the page
 * previews a design without its rules reaching the other cards. The copied
 * snippet is always unscoped.
 */
export function buttonCss(item, edits = {}, { scope = '' } = {}) {
  const t = tokensFor(item, edits)
  const sel = `${scope ? `${scope} ` : ''}.${item.cls}`
  const notDisabled = ':not(:disabled)'
  const fade = item.fade || ['background-color', 'border-color', 'color']
  const move = item.move || ['transform']
  const calm = fade.map((p) => `${p} ${MOTION}`)
  const full = [...fade, ...move].map((p) => `${p} ${MOTION}`)
  const press = item.noPress ? [] : item.pressMove ? [] : ['transform: scale(0.97)']

  const vars = [
    ['--button-radius', t.corners.radius],
    ['--button-pad-y', `${t.size.padY}px`],
    ['--button-pad-x', `${t.size.padX}px`],
    ['--button-font', `${t.size.font}px`],
    ...item.vars(t.accent),
  ].filter(([name]) => item.edits.includes('corners') || name !== '--button-radius')

  const base = [
    ...vars.map(([k, v]) => `${k}: ${v}`),
    'display: inline-flex',
    'align-items: center',
    'justify-content: center',
    'gap: 8px',
    `padding: ${item.padding || 'var(--button-pad-y) var(--button-pad-x)'}`,
    ...(item.edits.includes('corners') ? ['border-radius: var(--button-radius)'] : []),
    'font-family: inherit',
    'font-size: var(--button-font)',
    'font-weight: 600',
    'line-height: 1.2',
    'white-space: nowrap',
    'cursor: pointer',
    ...item.base(),
    `transition: ${full.join(', ')}`,
  ]
  // `display` may be overridden by the design (the full-width button is flex);
  // keep the last word in the list rather than printing it twice.
  const seen = new Map()
  for (const d of base) seen.set(d.slice(0, d.indexOf(':')), d)
  const baseDecl = [...seen.values()]

  const hoverDecl = item.hover()
  const activeDecl = [...item.active(), ...press]

  const rules = []
  rules.push(block(sel, baseDecl))
  if (item.extra) {
    for (const r of item.extra(sel, t)) rules.push(r.media ? inMedia(r.media, [r]) : block(r.sel, r.decl))
  }
  if (item.arrow) {
    rules.push(block(`${sel} svg`, ['transition: transform 120ms ease-out']))
  }
  rules.push(inMedia('(hover: hover)', [
    { sel: `${sel}:hover${notDisabled}`, decl: hoverDecl },
    ...(item.arrow ? [{ sel: `${sel}:hover${notDisabled} svg`, decl: ['transform: translateX(2px)'] }] : []),
  ]))
  rules.push(block(`${sel}:active${notDisabled}`, activeDecl))
  rules.push(block(`${sel}:focus-visible`, ['outline: 2px solid var(--button-ring)', 'outline-offset: 2px']))
  rules.push(block(`${sel}:disabled`, ['opacity: 0.5', 'cursor: not-allowed']))
  rules.push(inMedia('(pointer: coarse)', [
    { sel, decl: ['min-height: 44px', ...(item.iconOnly ? ['min-width: 44px'] : [])] },
  ]))
  // Reduced motion keeps the colour fade and drops every movement.
  // The press scale, the offset shift and the arrow slide go back to rest.
  const isMove = (d) => /^(transform|box-shadow)\b/.test(d)
  const restShadow = item.base().find((d) => d.startsWith('box-shadow'))
  const settle = (decl) => ['transform: none', ...(decl.some((d) => d.startsWith('box-shadow')) && restShadow ? [restShadow] : [])]
  const reducedRules = [{ sel, decl: [`transition: ${calm.length ? calm.join(', ') : 'none'}`] }]
  if (hoverDecl.some(isMove)) reducedRules.push({ sel: `${sel}:hover${notDisabled}`, decl: settle(hoverDecl) })
  if (activeDecl.some(isMove)) reducedRules.push({ sel: `${sel}:active${notDisabled}`, decl: settle(activeDecl) })
  if (item.arrow) {
    reducedRules.push({ sel: `${sel} svg`, decl: ['transition: none'] })
    reducedRules.push({ sel: `${sel}:hover${notDisabled} svg`, decl: ['transform: none'] })
  }
  rules.push(inMedia('(prefers-reduced-motion: reduce)', reducedRules))
  return rules.join('\n\n') + '\n'
}

/** The markup for one design. */
export function buttonHtml(item) {
  if (item.html) return `${item.html(item.cls, item.label)}\n`
  return `<button class="${item.cls}" type="button">${item.label}</button>\n`
}

/** All defaults in one sheet, scoped, for the grid of previews. */
export function buttonPreviewCss(scope) {
  return BUTTON_ITEMS.map((item) => buttonCss(item, {}, { scope })).join('\n')
}

// ── The prompt (Pro) ────────────────────────────────────────────────────────
//
// A brief for an AI coding assistant, written from the design's own data. It is
// assembled in the browser from the same fields the free card shows, so the
// gate on it is a feature gate: nothing in it is withheld from the free CSS.

export function buttonPrompt(item, edits = {}) {
  const t = tokensFor(item, edits)
  const lines = [
    `Build a "${item.name}" button for my project.`,
    '',
    `When it is used: ${item.use}`,
    `How it is built: ${item.note}`,
    '',
    'Match this spec:',
    ...(item.edits.includes('size') ? [`- Size: ${t.size.label.toLowerCase()}, ${t.size.padY}px by ${t.size.padX}px padding, ${t.size.font}px text.`] : []),
    ...(item.edits.includes('corners') ? [`- Corners: ${t.corners.label.toLowerCase()} (border-radius ${t.corners.radius}).`] : []),
    ...(item.edits.includes('accent') || item.id === 'danger' ? [`- Colour: ${t.accent.label.toLowerCase()}, fill ${t.accent.solid}.`] : []),
    '- States: hover (only where a pointer can hover), pressed, a visible keyboard focus ring, and disabled.',
    '- Motion: 120ms ease-out on named properties only; nothing animates under reduced motion except the colour fade.',
    '- Touch: at least 44px tall on a touch screen.',
    '',
    'Rules:',
    '- Use a real <button type="button">, or an <a> when it goes to another page.',
    '- Keep the colours and sizes as CSS custom properties so they change in one place.',
    '- Text must keep at least 4.5:1 contrast against its background in every state.',
    '- No gradients, glows or `transition: all`.',
    '',
    'Fit it to my stack: ask which framework and styling approach I use if it is not obvious. Keep the behaviour of this CSS, and rename the class to match my conventions.',
    '',
    '```css',
    buttonCss(item, edits).trimEnd(),
    '```',
    '',
    '```html',
    buttonHtml(item).trimEnd(),
    '```',
  ]
  return `${lines.join('\n')}\n`
}

// ── Search ──────────────────────────────────────────────────────────────────

export function buttonMatches(item, query) {
  const q = String(query || '').trim().toLowerCase()
  if (!q) return true
  return [item.name, item.use, item.label, item.role, ...item.tags].join(' ').toLowerCase().includes(q)
}

export function filterButtons({ role = 'all', query = '' } = {}) {
  return BUTTON_ITEMS.filter((b) => (role === 'all' || b.role === role) && buttonMatches(b, query))
}
