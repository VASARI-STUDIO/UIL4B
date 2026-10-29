// What the free-export preview shows and what makes it draw again. Plain functions
// with no React in them, so they are checked without a browser.

// The code preview shows this many lines of the file.
export const PREVIEW_LINES = 18

// The kit thumbs are 4:5; the style guide sheet is A4 drawn at half scale.
export const STYLE_GUIDE_SCALE = 0.5

/**
 * The first `count` lines of a built file, without the trailing blank line.
 * `skipLeadingComment` drops a block comment that opens the file: the stylesheet
 * starts with a 19-line naming guide, and the person wants to see their values.
 */
export function previewLines(text, { count = PREVIEW_LINES, skipLeadingComment = false } = {}) {
  let lines = String(text ?? '').split('\n')
  if (skipLeadingComment && lines[0]?.trim().startsWith('/*')) {
    const end = lines.findIndex((l) => l.includes('*/'))
    if (end >= 0) lines = lines.slice(end + 1)
  }
  while (lines.length && !lines[0].trim()) lines.shift()
  while (lines.length && !lines[lines.length - 1].trim()) lines.pop()
  return lines.slice(0, count)
}

// The logo is never drawn into these files and is the one large field, so it stays
// out of the key. The template choice has its own place in the key.
const keyReplacer = (k, v) => (k === 'logo' || k === 'exportTemplates' ? undefined : v)

/** What the preview is drawn from, as a string: a change to it draws the preview again. */
export function freePreviewKey({ kind, file, watermark, projectName, design, template }) {
  return JSON.stringify([kind, kind === 'code' ? file : null, kind === 'kit' ? template : null, !!watermark, projectName, design ?? null], keyReplacer)
}
