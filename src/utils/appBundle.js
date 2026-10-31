// The app-ready bundle: one zip with a folder per app (Figma, Adobe, other design
// apps, code) and a README that says which folder is for which app.
//
// appBundleEntries(design, opts) lists the files as [{ path, data }] and has no
// zip dependency, so it can be read and tested on its own. buildAppBundle() puts
// the same entries into a zip and returns a Blob.
//
// Folder names are numbered and in sentence case for people. File names are
// lowercase kebab-case with the project slug first (the token files keep the dot).
// Font binaries are never included: the README links each family instead.
//
// Pure functions, no React, no DOM.

import { projectSlug } from './exportFileName.js'
import { buildTokensCss, buildTokensJson } from './designTokens.js'
import { figmaTokenFiles } from './figmaTokens.js'
import { swatchGroups, buildAse, buildAco } from './swatchFiles.js'
import { readBook } from './bookModel.js'

const START = '00 Start here'
const FIGMA = '01 Figma'
const ADOBE = '02 Adobe'
const OTHER = '03 Other design apps'
const CODE = '04 Code'

const HOW_TO = 'How to import.md'

/** Families that are not on Google Fonts, so they get no link. */
const NOT_GOOGLE = new Set([
  'system-ui', 'sans-serif', 'serif', 'monospace', 'ui-sans-serif', 'ui-serif', 'ui-monospace',
  'arial', 'helvetica', 'georgia', 'times new roman', 'courier new', 'verdana', 'tahoma', 'trebuchet ms',
])

const pad = (n) => String(n).padStart(2, '0')

/** `YYYY-MM-DD` from a Date (local time) or from a string already in that shape. */
export function bundleDate(date = new Date()) {
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) return date
  const d = date instanceof Date && !Number.isNaN(date.getTime()) ? date : new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

const rgbText = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(', ')

/** A markdown table cell: pipes and line breaks would break the row. */
const cell = (s) => String(s).replace(/\|/g, '\\|').replace(/[\r\n]+/g, ' ')

/* ── Import steps, shared by the README and each How to import file ──────── */

const FIGMA_STEPS = [
  'Open your Figma file and open the Variables panel (the local variables).',
  'Import `1-primitives.tokens.json` into a new collection and name that collection exactly "Primitives". The semantic files link to it by that name.',
  'Import `2-semantic.light.tokens.json` and `2-semantic.dark.tokens.json` together into a second collection. Each file becomes one mode, so check the modes are named Light and Dark.',
]
const FIGMA_NOTE = 'Two modes in one collection need Figma Professional or above. On the free plan, import only the light file, or use the dark file in a separate collection.'

const ADOBE_STEPS = [
  'Illustrator and InDesign: open the Swatches panel, then open the swatch library menu and load the `.ase` file (in InDesign, use Load Swatches from the panel menu).',
  'Photoshop: open the Swatches panel, choose Import Swatches from its menu, and pick the `.aco` file (or the `.ase`).',
  'Look for the groups named Brand, Brand tints, Semantic and States.',
]
const ADOBE_NOTE = 'The `.aco` file has no groups, so the light and dark interface colours start with `light/` or `dark/`. Photoshop may not keep the `.ase` groups.'

const affinitySteps = (slug) => [
  'Open the Swatches panel and choose Import Palette from its menu.',
  `Pick \`${slug}-colours.ase\` from the Affinity folder.`,
  'The palette appears in the panel with the groups intact.',
]
const PROCREATE_STEPS = [
  'Copy the `.ase` file to your iPad (the Files app, AirDrop or iCloud Drive).',
  'In Procreate, open the Colour panel, go to Palettes, tap + and choose Import a file.',
  'Pick the file. Check the new palette afterwards, because Procreate may not show every swatch of a long palette.',
]

const numbered = (steps) => steps.map((s, i) => `${i + 1}. ${s}`).join('\n')

const howToFigma = () => `# Import into Figma

${numbered(FIGMA_STEPS)}

${FIGMA_NOTE}

Figma imports colours, numbers, strings and font names. It does not create text styles, effect styles or gradients from these files.
`

const howToAdobe = (slug) => `# Import into Adobe apps

Files: \`${slug}-colours.ase\` and \`${slug}-colours.aco\`.

${numbered(ADOBE_STEPS)}

${ADOBE_NOTE}
`

const howToAffinity = (slug) => `# Import into Affinity

File: \`${slug}-colours.ase\`.

${numbered(affinitySteps(slug))}
`

const howToProcreate = (slug) => `# Import into Procreate

File: \`${slug}-colours.ase\`.

${numbered(PROCREATE_STEPS)}
`

/* ── README ───────────────────────────────────────────────────────────────── */

/** Fonts as [{ family, link }]: heading first, body second, each family once. */
function fontList(design) {
  const book = readBook(design)
  const families = [...new Set([book.heading, book.body])]
  return families.map((family) => ({
    family,
    link: NOT_GOOGLE.has(family.toLowerCase())
      ? null
      : `https://fonts.google.com/specimen/${encodeURIComponent(family).replace(/%20/g, '+')}`,
  }))
}

function readme(design, { slug, date, name, rootName, groups }) {
  const title = name ? `${name}: app-ready export` : 'App-ready export'

  const folders = [
    ['00 Start here', 'Everyone', 'This README.'],
    ['01 Figma', 'Figma', 'Variables for colour, type and spacing, with light and dark modes.'],
    ['02 Adobe', 'Photoshop, Illustrator, InDesign', 'Colour swatches (.ase and .aco).'],
    ['03 Other design apps', 'Affinity, Procreate', 'Colour swatches (.ase), one folder per app.'],
    ['04 Code', 'Websites and apps', 'CSS custom properties and design tokens in JSON, with light and dark values.'],
  ]
  const folderTable = [
    '| Folder | For | What is in it |',
    '|---|---|---|',
    ...folders.map(([f, who, what]) => `| ${cell(f)} | ${cell(who)} | ${cell(what)} |`),
  ].join('\n')

  const fonts = fontList(design)
  const fontLines = fonts.map((f) => (f.link ? `- ${f.family}: ${f.link}` : `- ${f.family}: not a Google font, so install it from wherever you licensed it.`)).join('\n')

  const rows = []
  for (const g of groups) {
    for (const s of g.swatches) rows.push(`| ${cell(s.name)} | ${cell(g.group)} | ${s.hex} | ${rgbText(s.hex)} |`)
  }
  const colourTable = ['| Name | Role | HEX | RGB |', '|---|---|---|---|', ...rows].join('\n')

  return `# ${title}

This folder (${rootName}) holds your design system ready to use in other apps. Open the folder for the app you use and follow its "How to import" file.

## Which folder is for which app

${folderTable}

## How to import

### Figma

${numbered(FIGMA_STEPS)}

${FIGMA_NOTE}

### Adobe (Photoshop, Illustrator, InDesign)

${numbered(ADOBE_STEPS)}

${ADOBE_NOTE}

### Affinity

${numbered(affinitySteps(slug))}

### Procreate

${numbered(PROCREATE_STEPS)}

## Fonts

${fontLines}

Font files are not included. Install each family before you open a design file.

## Colours

${colourTable}

## What's not included

- CMYK and PMS values. Converting from RGB without a colour profile gives values a printer may reject.
- Photoshop and Illustrator text styles. Neither app can import them from a file.
- Gradients.

## About this export

Made with UIL4B. Exported ${date}.
`
}

/**
 * Every file of the bundle as [{ path, data }], paths using `/` and starting with
 * the root folder. `data` is a string or a Uint8Array.
 * opts: `date` (a Date or `YYYY-MM-DD`, local; default today), `name` (the project
 * name as typed; default untitled).
 */
export function appBundleEntries(design, { date, name } = {}) {
  const day = bundleDate(date)
  const slug = projectSlug(name)
  const root = `UIL4B-${slug}-${day}`
  const groups = swatchGroups(design)
  const ase = buildAse(groups)
  const aco = buildAco(groups)
  // Noon UTC so the stylesheet header prints the same day in any time zone.
  const stamp = new Date(`${day}T12:00:00Z`)
  const projectName = name || undefined
  const tokenOpts = projectName ? { projectName, modes: true } : { modes: true }

  const files = [
    [`${START}/README.md`, readme(design, { slug, date: day, name: name || '', rootName: root, groups })],
    [`${FIGMA}/${HOW_TO}`, howToFigma()],
    ...figmaTokenFiles(design).map((f) => [`${FIGMA}/${f.name}`, f.text]),
    [`${ADOBE}/${HOW_TO}`, howToAdobe(slug)],
    [`${ADOBE}/${slug}-colours.ase`, ase],
    [`${ADOBE}/${slug}-colours.aco`, aco],
    [`${OTHER}/Affinity/${HOW_TO}`, howToAffinity(slug)],
    [`${OTHER}/Affinity/${slug}-colours.ase`, ase],
    [`${OTHER}/Procreate/${HOW_TO}`, howToProcreate(slug)],
    [`${OTHER}/Procreate/${slug}-colours.ase`, ase],
    [`${CODE}/css/${slug}.tokens.css`, buildTokensCss(design, { ...tokenOpts, date: stamp })],
    [`${CODE}/tokens/${slug}.tokens.json`, buildTokensJson(design, tokenOpts)],
  ]
  return files.map(([path, data]) => ({ path: `${root}/${path}`, data }))
}

/** The bundle as a zip Blob. */
export async function buildAppBundle(design, opts = {}) {
  const { default: JSZip } = await import('jszip')
  const zip = new JSZip()
  for (const { path, data } of appBundleEntries(design, opts)) zip.file(path, data)
  return zip.generateAsync({ type: 'blob', compression: 'DEFLATE' })
}
