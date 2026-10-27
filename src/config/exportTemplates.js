// The ONE list of templates each export can be laid out in, beside
// exportFormats.js, so the panel, the server and the tests read one list.
//
//   live — the template is BUILT. Without it the panel offers no tile for it and
//          the server refuses its id, exactly as exportFormats.js treats a format.
//
// Keys are format ids and must be live formats. The id is only ever a lookup key:
// the layout comes from the module the generator imports, never from the request.

const t = (id, name, desc, { isDefault = false, live = false } = {}) =>
  Object.freeze({ id, name, desc, default: isDefault, live })

export const EXPORT_TEMPLATES = Object.freeze({
  kit: Object.freeze([
    t('studio', 'Studio', 'A working page, components first.', { isDefault: true, live: true }),
    t('manual', 'Manual', 'Every token in a ruled table.', { live: true }),
    t('showcase', 'Showcase', 'Your typefaces at full size.'),
  ]),
  book: Object.freeze([
    t('specification', 'Specification', 'Numbered sections, full-colour dividers.', { isDefault: true, live: true }),
    t('monograph', 'Monograph', 'A quiet book, one idea per page.', { live: true }),
    t('atlas', 'Atlas', 'Each colour on its own plate.', { live: true }),
  ]),
  guidelines: Object.freeze([
    t('presentation', 'Presentation', 'A slide deck, one point per slide.', { isDefault: true, live: true }),
    t('poster', 'Poster', 'Big type, one colour per slide.', { live: true }),
    t('grid', 'Grid', 'Dense columns, made to read, not present.', { live: true }),
  ]),
})

// The longest description a tile can show in two lines at the narrowest width.
export const DESC_MAX = 42

export const defaultTemplate = (format) => (Object.hasOwn(EXPORT_TEMPLATES, format)
  ? EXPORT_TEMPLATES[format].find((x) => x.default)?.id
  : undefined)

export const isTemplate = (format, id) => typeof id === 'string' && Object.hasOwn(EXPORT_TEMPLATES, format)
  && EXPORT_TEMPLATES[format].some((x) => x.id === id && x.live)

// The templates a row offers. The picker shows only when there is a choice.
export const liveTemplates = (format) => (Object.hasOwn(EXPORT_TEMPLATES, format)
  ? EXPORT_TEMPLATES[format].filter((x) => x.live)
  : [])

/**
 * The template chosen for each format, from `design.exportTemplates`. Any id that
 * is not a live template falls back to the format's default, so a stored value
 * from an older or edited copy can never reach the generators.
 */
export function readExportTemplates(design) {
  const raw = design?.exportTemplates && typeof design.exportTemplates === 'object' ? design.exportTemplates : {}
  return Object.fromEntries(Object.keys(EXPORT_TEMPLATES).map((format) => [
    format,
    isTemplate(format, raw[format]) ? raw[format] : defaultTemplate(format),
  ]))
}

const ID = /^[a-z]{3,16}$/

/** The invariants the list rests on. Exported so a test runs it against the real list. */
export function assertTemplatesCoherent(templates = EXPORT_TEMPLATES, formats) {
  for (const [format, list] of Object.entries(templates)) {
    if (formats && !formats.some((f) => f.id === format && f.live)) {
      throw new Error(`export templates are keyed by ${format}, which is not a live export format`)
    }
    const defaults = list.filter((x) => x.default)
    if (defaults.length !== 1) throw new Error(`${format} needs exactly one default template, has ${defaults.length}`)
    if (!defaults[0].live) throw new Error(`the default ${format} template ${defaults[0].id} is not live`)
    const ids = list.map((x) => x.id)
    if (new Set(ids).size !== ids.length) throw new Error(`duplicate ${format} template id`)
    for (const x of list) {
      if (!ID.test(x.id)) throw new Error(`template id "${x.id}" is not 3 to 16 lower-case letters`)
    }
  }
  return true
}
