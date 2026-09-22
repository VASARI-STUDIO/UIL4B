// Generate src/data/creditsManifest.js — the half of /credits that lives on
// disk rather than in a hand-kept table.
//
//   node scripts/sync-credits.mjs
//
// ── Why a generator, and not a page that types it out ───────────────────────
//
// Two of the three things /credits has to say are already written down
// somewhere in this repository, in a form nobody maintains by hand:
//
//   the fonts   public/fonts/*-OFL.txt. The SIL Open Font License requires the
//               copyright notice to travel with the font, and each of those
//               files opens with that font's own line. We serve the .woff2
//               files from public/, so we redistribute them, so the notice is
//               owed. Retyping six copyright lines onto a page is how five of
//               them end up right and one ends up describing the wrong project.
//   the code    package.json's `dependencies`, and the licence each installed
//               package declares in its own package.json. Firebase alone ships
//               as `firebase` plus forty-odd `@firebase/*` packages, every one
//               of them Apache-2.0, and Apache-2.0 asks that the notice travel
//               with the copies. Nobody is going to keep that list by hand.
//
// So this reads both and writes them out as data. The committed file is what a
// reviewer sees in a diff; tests/unit/credits-coverage.test.js re-runs the
// derivation and fails the build if the two disagree. That is the same shape
// public/sitemap.xml, vercel.json and public/llms.txt already have here, and
// for the same reason: a generated file anyone can hand-edit is a hand-written
// file with a misleading comment on top.
//
// ── What it deliberately does NOT do ────────────────────────────────────────
//
// It does not walk the whole dependency tree. `npm ls` resolves hundreds of
// build-time packages that never reach a browser or a function, and a credits
// page listing them would be a page nobody reads, which is the same as no page.
// The scope is: everything in `dependencies` (what ships), plus the
// `@firebase/*` packages that `firebase` brings with it (which is most of the
// shipped bytes and all of the Apache-2.0 obligation). devDependencies are
// excluded BY NAME rather than by guesswork — @firebase/rules-unit-testing sits
// in node_modules/@firebase/ and is a test tool, not a shipped one.
//
// It does not record versions either. A version in a credit line is a second
// number to keep in step with npm, and it would rewrite this file — and go red
// in the test — on every routine bump, teaching people to regenerate without
// reading. Licences move far more slowly than versions, and the licence is the
// thing that is owed.
import { readFile, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const FONT_DIR = path.join(root, 'public', 'fonts')

/* ── WHY .json AND NOT .js ──────────────────────────────────────────────────
 *
 * This file's whole content is a list of npm package NAMES, and a module under
 * src/ that names a package is indistinguishable, to a text scan, from a module
 * that imports one. tests/unit/ffmpeg-core-off-origin.test.js caught it on the
 * first run: its positive control counts the files matching `'@ffmpeg/ffmpeg'`
 * and expects exactly one, and a credits manifest naming that dependency became
 * a second — a red build about an asset budget, caused by a credit.
 *
 * That is not a one-off. Several guards in this suite grep src/ for a package
 * name (the ffmpeg core, the Firebase entry points, the admin chunk), and every
 * one of them would have the same false positive. A data file is not a module,
 * `.json` is not walked by any of those scans, and Vite imports it directly. */
const OUT = path.join(root, 'src', 'data', 'creditsManifest.json')

/* ── FONTS ─────────────────────────────────────────────────────────────────
 *
 * The family name is derived, not typed, and the derivation needs one trick.
 *
 * The filename carries the family and the copyright line carries the casing:
 * GEIST-MONO-OFL.txt is the Geist Mono file, but its notice says "The Geist
 * Project Authors" (Geist Mono is part of the Geist project — the notice is
 * correct, it just does not name the face). JETBRAINS-MONO-OFL.txt's notice
 * says "The JetBrains Mono Project Authors", which is where the only piece of
 * casing no title-caser would guess actually lives.
 *
 * So: the words come from the FILENAME, and each word's spelling comes from a
 * dictionary built out of every project name in the directory. GEIST + MONO →
 * "Geist" (from Geist's notice) + "Mono" (from JetBrains Mono's) → "Geist
 * Mono". Nothing is written down; add a seventh font and it spells itself.
 */
const PROJECT_LINE = /^Copyright\s+(\d{4})\s+The\s+(.+?)\s+Project Authors\s*\(([^)]+)\)/

async function fonts() {
  const files = (await readdir(FONT_DIR)).filter((f) => f.endsWith('-OFL.txt')).sort()
  if (!files.length) throw new Error('sync-credits: public/fonts holds no *-OFL.txt file')

  const read = await Promise.all(files.map(async (file) => {
    const text = await readFile(path.join(FONT_DIR, file), 'utf8')
    const first = text.split(/\r?\n/).find((l) => l.trim())?.trim() || ''
    const m = PROJECT_LINE.exec(first)
    if (!m) throw new Error(`sync-credits: ${file} does not open on a "Copyright YYYY The X Project Authors (url)" line`)
    return { file, copyright: first, year: m[1], project: m[2], source: m[3] }
  }))

  // Every word any notice in this directory spells, keyed by its upper case.
  const casing = new Map()
  for (const row of read) for (const w of row.project.split(/\s+/)) casing.set(w.toUpperCase(), w)

  return read.map((row) => ({
    // GEIST-MONO-OFL.txt → geist-mono, which is also the .woff2 prefix.
    slug: row.file.replace(/-OFL\.txt$/, '').toLowerCase(),
    family: row.file
      .replace(/-OFL\.txt$/, '')
      .split('-')
      .map((w) => casing.get(w) || w.charAt(0) + w.slice(1).toLowerCase())
      .join(' '),
    copyright: row.copyright,
    source: row.source,
    // Served straight out of public/, so the full licence text is one link
    // away and no page has to reprint 4.5 KB of it six times.
    licenceFile: `/fonts/${row.file}`,
  })).sort((a, b) => a.family.localeCompare(b.family))
}

/* ── CODE ──────────────────────────────────────────────────────────────────
 *
 * The licence string is whatever the installed package declares. It is NOT
 * normalised to an SPDX id: jszip declares "(MIT OR GPL-3.0-or-later)" and gsap
 * declares a sentence pointing at its own standard licence, and flattening
 * either of those to a tidy identifier would be this file inventing a fact
 * about somebody else's terms.
 */
async function packageLicence(name) {
  const file = path.join(root, 'node_modules', name, 'package.json')
  const pkg = JSON.parse(await readFile(file, 'utf8'))
  const licence = typeof pkg.license === 'string'
    ? pkg.license
    : (Array.isArray(pkg.licenses) ? pkg.licenses.map((l) => l.type).filter(Boolean).join(' OR ') : '')
  if (!licence) throw new Error(`sync-credits: ${name} declares no licence in its package.json`)
  return licence
}

async function code() {
  const pkg = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'))
  const dev = new Set(Object.keys(pkg.devDependencies || {}))

  const direct = []
  for (const name of Object.keys(pkg.dependencies || {}).sort()) {
    direct.push({ name, licence: await packageLicence(name) })
  }

  // The @firebase scope, minus anything this repo installs as a test tool.
  const scoped = (await readdir(path.join(root, 'node_modules', '@firebase')))
    .map((n) => `@firebase/${n}`)
    .filter((n) => !dev.has(n))
    .sort()
  const firebase = []
  for (const name of scoped) firebase.push({ name, licence: await packageLicence(name) })

  return { direct, firebase }
}

/* JSON carries no comments, so the note travels as the first key. A generated
 * file that cannot say it is generated gets hand-edited. */
function render({ fontRows, direct, firebase }) {
  return `${JSON.stringify({
    _generated: 'scripts/sync-credits.mjs — run `node scripts/sync-credits.mjs`. Do not edit by hand. '
      + 'tests/unit/credits-coverage.test.js re-derives all three lists from public/fonts/, package.json '
      + 'and node_modules/ and fails the build if this file has drifted, so a font added without its '
      + 'notice or a dependency added without its licence cannot ship uncredited. It is .json rather '
      + 'than .js because its content is npm package NAMES, and a module under src/ that names a '
      + 'package reads to a text scan exactly like a module that imports one.',
    // One row per public/fonts/*-OFL.txt, with that font's own copyright line.
    fonts: fontRows,
    // package.json `dependencies` — what reaches a browser or a function.
    dependencies: direct,
    // The @firebase scope `firebase` installs alongside itself. In full rather
    // than counted: Apache-2.0 asks that the notice travel with the copies, and
    // "about forty of them" is not a notice.
    firebase,
  }, null, 2)}\n`
}

export async function buildCreditsManifest() {
  const [fontRows, codeRows] = await Promise.all([fonts(), code()])
  return render({ fontRows, ...codeRows })
}

if (process.argv[1]?.endsWith('sync-credits.mjs')) {
  const text = await buildCreditsManifest()
  await writeFile(OUT, text, 'utf8')
  const m = JSON.parse(text)
  console.log(
    `sync:credits — wrote src/data/creditsManifest.json: ${m.fonts.length} fonts, `
    + `${m.dependencies.length} dependencies, ${m.firebase.length} @firebase packages`,
  )
}
