// What a page strip depends on, and the line that names it. Plain functions with no
// React in them, so the cache key and the caption are checked without a browser.
import { EXPORT_TEMPLATES, defaultTemplate, isTemplate } from '../config/exportTemplates.js'

// The strip always shows the first three pages (slides, for the deck).
export const PREVIEW_PAGE_COUNT = 3
const UNIT = { book: 'pages', guidelines: 'slides' }
const NOUN = { book: 'book', guidelines: 'guidelines' }

/** The template a strip is drawn in: the id when it is a live template of this row, else the row's default. */
export const previewTemplate = (kind, id) => (isTemplate(kind, id) ? id : defaultTemplate(kind))

/** The template's display name, e.g. "Monograph". */
export function previewTemplateName(kind, id) {
  const chosen = previewTemplate(kind, id)
  return EXPORT_TEMPLATES[kind]?.find((t) => t.id === chosen)?.name || ''
}

/** "Your book in Monograph, pages 1 to 3" / "Your guidelines in Poster, slides 1 to 3". */
export function previewCaption(kind, id) {
  return `Your ${NOUN[kind]} in ${previewTemplateName(kind, id)}, ${UNIT[kind]} 1 to ${PREVIEW_PAGE_COUNT}`
}

// What the pictures are drawn from, as a short string. A change to the palette, the
// type, the name or the logo draws them again.
export function designKey(design, projectName) {
  return JSON.stringify([
    projectName,
    design?.palette?.colors, design?.palette?.base,
    design?.fonts?.heading, design?.fonts?.body,
    design?.typeScale?.headingWeight, design?.typeScale?.base, design?.typeScale?.ratio,
    typeof design?.logo?.src === 'string' ? `${design.logo.src.length}:${design.logo.src.slice(-64)}` : 0,
  ])
}

/** The cache key: the row, the template, whether it is blurred, and the design. */
export const previewKey = ({ kind, template, blurred, design, projectName }) =>
  `${kind}|${previewTemplate(kind, template)}|${blurred ? 'blur' : 'sharp'}|${designKey(design, projectName)}`
