// The folder tree of the app-ready bundle, and nothing else about it.
//
// The bundle itself (utils/appBundle.js) is Pro and is built on the server
// (api/_lib/exportDocument.js, format `app-bundle`). The free preview only draws
// the tree, which does not depend on the design, so the paths come from here and
// the browser never needs the builder. appBundleEntries() in appBundle.js takes its
// folder names and date from this file, and tests/unit/app-bundle.test.js holds the
// list below equal to the paths the builder makes.
//
// Pure functions, no React, no DOM.

import { projectSlug } from './exportFileName.js'

export const BUNDLE_FOLDERS = Object.freeze({
  start: '00 Start here',
  figma: '01 Figma',
  adobe: '02 Adobe',
  other: '03 Other design apps',
  code: '04 Code',
})

export const BUNDLE_HOW_TO = 'How to import.md'

/** The Figma token files, in the order the import steps name them. */
export const FIGMA_TOKEN_FILE_NAMES = Object.freeze([
  '1-primitives.tokens.json',
  '2-semantic.light.tokens.json',
  '2-semantic.dark.tokens.json',
])

const pad = (n) => String(n).padStart(2, '0')

/** `YYYY-MM-DD` from a Date (local time) or from a string already in that shape. */
export function bundleDate(date = new Date()) {
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) return date
  const d = date instanceof Date && !Number.isNaN(date.getTime()) ? date : new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** The folder everything sits in: `UIL4B-<project>-<date>`. */
export const bundleRoot = (name, date) => `UIL4B-${projectSlug(name)}-${bundleDate(date)}`

/**
 * Every path in the bundle, `/`-separated and starting with the root folder, in the
 * order the zip lists them. opts: `date` (a Date or `YYYY-MM-DD`, local; default
 * today), `name` (the project name as typed).
 */
export function appBundlePaths(name, { date } = {}) {
  const F = BUNDLE_FOLDERS
  const slug = projectSlug(name)
  return [
    `${F.start}/README.md`,
    `${F.figma}/${BUNDLE_HOW_TO}`,
    ...FIGMA_TOKEN_FILE_NAMES.map((n) => `${F.figma}/${n}`),
    `${F.adobe}/${BUNDLE_HOW_TO}`,
    `${F.adobe}/${slug}-colours.ase`,
    `${F.adobe}/${slug}-colours.aco`,
    `${F.other}/Affinity/${BUNDLE_HOW_TO}`,
    `${F.other}/Affinity/${slug}-colours.ase`,
    `${F.other}/Procreate/${BUNDLE_HOW_TO}`,
    `${F.other}/Procreate/${slug}-colours.ase`,
    `${F.code}/css/${slug}.tokens.css`,
    `${F.code}/tokens/${slug}.tokens.json`,
  ].map((p) => `${bundleRoot(name, date)}/${p}`)
}
