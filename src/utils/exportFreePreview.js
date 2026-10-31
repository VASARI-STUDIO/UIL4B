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
 * The app-ready zip as plain lines, one per app folder: the folder, then what is in
 * it (its sub-folders by name, a single file by name, more files by type).
 * `paths` are the entry paths from utils/appBundle.js (`/`-separated, the root
 * folder first). The root is left out (the label over the box names the zip), and
 * the "How to import.md" that every app folder carries is one closing line, so the
 * tree stays short enough to read whole in the smallest preview box.
 */
export function bundleTreeLines(paths) {
  const folders = new Map()
  let guides = 0
  for (const p of paths ?? []) {
    const [, folder, ...rest] = String(p).split('/')
    if (!folder || !rest.length) continue
    if (rest[rest.length - 1] === HOW_TO_FILE) { guides += 1; continue }
    if (!folders.has(folder)) folders.set(folder, { subs: [], files: [] })
    const entry = folders.get(folder)
    if (rest.length > 1) { if (!entry.subs.includes(rest[0])) entry.subs.push(rest[0]) } else entry.files.push(rest[0])
  }
  const lines = []
  for (const [folder, { subs, files }] of folders) {
    lines.push(`${folder}/ ${[...subs, ...describeFiles(files)].join(', ')}`)
  }
  if (guides) lines.push('', `${HOW_TO_FILE} in each app folder`)
  return lines
}

// One file reads as its name; several read as their types, with a count where a
// type repeats ("3 .tokens.json", ".ase, .aco").
function describeFiles(files) {
  if (files.length === 1) return files
  const counts = new Map()
  for (const f of files) {
    const type = f.match(/(\.tokens)?\.[a-z0-9]+$/i)?.[0] || f
    counts.set(type, (counts.get(type) || 0) + 1)
  }
  return [...counts].map(([type, n]) => (n > 1 ? `${n} ${type}` : type))
}

// The logo is never drawn into these files and is the one large field, so it stays
// out of the key. The template choice has its own place in the key.
const keyReplacer = (k, v) => (k === 'logo' || k === 'exportTemplates' ? undefined : v)

/** What the preview is drawn from, as a string: a change to it draws the preview again. */
export function freePreviewKey({ kind, file, watermark, projectName, design, template, project }) {
  return JSON.stringify([kind, kind === 'code' ? file : null, kind === 'bundle' ? project ?? null : null, kind === 'kit' ? template : null, !!watermark, projectName, design ?? null], keyReplacer)
}
