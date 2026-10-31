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

const HOW_TO_FILE = 'How to import.md'

/**
 * The app-ready zip as plain lines: each app folder, then its files indented under
 * it. `paths` are the entry paths from utils/appBundle.js (`/`-separated, the root
 * folder first). The root is left out (the label over the box names the zip), and
 * the "How to import.md" that every app folder carries is one closing line rather
 * than one per folder, so the whole tree fits the box.
 */
export function bundleTreeLines(paths) {
  const folders = new Map()
  let guides = 0
  for (const p of paths ?? []) {
    const [, folder, ...rest] = String(p).split('/')
    if (!folder || !rest.length) continue
    const file = rest.join('/')
    if (rest[rest.length - 1] === HOW_TO_FILE) { guides += 1; continue }
    if (!folders.has(folder)) folders.set(folder, [])
    folders.get(folder).push(file)
  }
  const lines = []
  for (const [folder, files] of folders) {
    lines.push(`${folder}/`, ...files.map((f) => `  ${f}`))
  }
  if (guides) lines.push('', `${HOW_TO_FILE} in each app folder`)
  return lines
}

// The logo is never drawn into these files and is the one large field, so it stays
// out of the key. The template choice has its own place in the key.
const keyReplacer = (k, v) => (k === 'logo' || k === 'exportTemplates' ? undefined : v)

/** What the preview is drawn from, as a string: a change to it draws the preview again. */
export function freePreviewKey({ kind, file, watermark, projectName, design, template, project }) {
  return JSON.stringify([kind, kind === 'code' ? file : null, kind === 'bundle' ? project ?? null : null, kind === 'kit' ? template : null, !!watermark, projectName, design ?? null], keyReplacer)
}
