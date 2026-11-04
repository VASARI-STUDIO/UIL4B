// /credits — the colophon, and the place the product discharges its licence
// obligations rather than describing them.
//
// ── Why this page exists ────────────────────────────────────────────────────
//
// A licence review on 2026-09-23 found the product using third-party icon sets,
// typefaces and packages whose licences REQUIRE attribution, and attributing
// almost none of them. Four icon sets are Creative Commons Attribution sets and
// two of those are on the free tier; the typefaces ship under the SIL Open Font
// License, which asks that each font's copyright notice travel with the files
// we serve; the Firebase SDK ships as `firebase` plus forty-odd `@firebase/*`
// packages, all Apache-2.0, which asks the same of its notices. The app's only
// attribution string was one sentence in IconLibrary.jsx that appeared when the
// visitor selected one pack out of twenty-five.
//
// ── What makes it a page rather than an appendix ────────────────────────────
//
// Every row is DERIVED, and the derivation is the design. /credits cannot fall
// behind the product because nothing on it was typed twice:
//
//   icon packs   src/data/iconPackTiers.js decides the list; the licence comes
//                from src/data/iconPackCredits.js, which is itself the fallback
//                for the licence Iconify publishes at runtime.
//   typefaces    public/fonts/*-OFL.txt — each family's own copyright line,
//                read out of the licence file we already serve.
//   packages     package.json's dependencies and the licence each installed
//                package declares, via scripts/sync-credits.mjs.
//
// tests/unit/credits-coverage.test.js fails the build if a pack, a font or a
// dependency exists with no credit, which is why the page is grouped by licence
// rather than tiled as cards: the grouping is the obligation made visible, and
// the sentence under each heading is what that licence actually asks of us.
//
// ── The one thing here that is typed ────────────────────────────────────────
//
// ASSET_CREDITS below. Some sources have no manifest to read — an emoji search
// index built from Unicode CLDR, the emoji shortcodes taken from GitHub's
// gemoji, and the Iconify API the icon grid fetches through — so their
// provenance lives in a comment in the script that uses them. They are stated
// here and CHECKED there: the coverage test asserts scripts/build-emoji-index.mjs
// still names the CLDR source this page credits, and that
// scripts/build-emoji-meta.mjs still names gemoji, so a change of source cannot
// leave the credit behind.
import { useId, useState } from 'react'
import { Link } from 'react-router-dom'
import useMediaQuery from '../hooks/useMediaQuery'
import { allPackCredits, licenceOf } from '../data/iconPackCredits'
// GENERATED — `node scripts/sync-credits.mjs`. A data file rather than a module
// because its content is npm package names, and a module under src/ that NAMES
// a package reads to a text scan exactly like one that IMPORTS it; the generator
// records the run that caught that. tests/unit/credits-coverage.test.js fails
// the build if it has drifted from public/fonts/, package.json or node_modules/.
import creditsManifest from '../data/creditsManifest.json'
import nearestSources from '../../scripts/nearest-sources/systems.json'
import '../styles/pages/credits.css'

const { fonts: FONT_CREDITS, dependencies: DIRECT_DEPENDENCIES, firebase: FIREBASE_PACKAGES } = creditsManifest

/* ── The sources with no file to read ──────────────────────────────────
 *
 * `checkedIn` names the file that would have to change for the credit to go
 * stale, so the assertion in the coverage test and the sentence on the page
 * cannot drift apart. */
const ASSET_CREDITS = [
  {
    name: 'Unicode CLDR',
    author: 'Unicode, Inc.',
    url: 'https://github.com/unicode-org/cldr-json',
    licenceUrl: 'https://www.unicode.org/license.txt',
    licenceName: 'Unicode licence',
    used: 'The emoji search index in src/data/emojiIndex.txt is built from CLDR’s English emoji annotations — the names and keywords that let the Emoji Library find one character rather than a whole category.',
    checkedIn: 'scripts/build-emoji-index.mjs',
  },
  {
    name: 'gemoji',
    author: 'GitHub, Inc.',
    url: 'https://github.com/github/gemoji',
    licenceUrl: 'https://github.com/github/gemoji/blob/master/LICENSE',
    licenceName: 'MIT',
    used: 'The chat shortcodes (:wave:) and the Unicode version shown in the Emoji Library’s detail dialog, in src/data/emojiShortcodes.txt, come from GitHub’s gemoji list.',
    checkedIn: 'scripts/build-emoji-meta.mjs',
  },
  {
    name: 'Iconify',
    author: 'Vjacheslav Trushkin and the Iconify contributors',
    url: 'https://iconify.design',
    licenceUrl: 'https://github.com/iconify/iconify/blob/main/license.txt',
    licenceName: 'MIT',
    used: 'The Icon Library reads every catalogue and every glyph through the public Iconify API. Iconify hosts and normalises the sets credited above; it does not own them.',
    checkedIn: 'src/pages/IconLibrary.jsx',
  },
  // The colour systems Nearest match compares against, read from the registry
  // the build script fetches them by, so a system added there is credited here.
  ...nearestSources.systems.map((sys) => ({
    name: `${sys.label} colours`,
    author: sys.owner,
    url: sys.sourceUrl,
    licenceUrl: sys.licenceUrl,
    licenceName: sys.licence.split(',')[0],
    used: `Nearest match finds the closest named colour in this set (${sys.version}).`,
    checkedIn: 'scripts/nearest-sources/systems.json',
  })),
  // Engines fetched from jsDelivr at a pinned version and never bundled, so no
  // package.json entry generates a row for them. Each `checkedIn` is the file
  // that pins the URL; the coverage test fails if it stops naming the package.
  {
    name: 'FFmpeg (WebAssembly build)',
    author: 'The FFmpeg developers, compiled by ffmpeg.wasm',
    url: 'https://github.com/ffmpegwasm/ffmpeg.wasm',
    licenceUrl: 'https://www.gnu.org/licenses/old-licenses/gpl-2.0.html',
    licenceName: 'GPL-2.0-or-later',
    used: 'The File converter’s video, audio and GIF work runs FFmpeg compiled to WebAssembly. That build includes x264 and x265, so the binary is under the GPL even though the npm wrapper around it is MIT. It is loaded from jsDelivr at a pinned version, not served from this site; its source is in the ffmpeg.wasm repository.',
    checkedIn: 'src/utils/ffmpegEngine.js',
  },
  {
    name: 'occt-import-js',
    author: 'Viktor Kovacs, on Open CASCADE Technology',
    url: 'https://github.com/kovacsv/occt-import-js',
    licenceUrl: 'https://github.com/kovacsv/occt-import-js/blob/main/LICENSE.md',
    licenceName: 'LGPL-2.1',
    used: 'STEP, IGES and BREP files open through Open CASCADE compiled to WebAssembly, loaded from jsDelivr at a pinned version.',
    checkedIn: 'src/utils/cadEngine.js',
  },
  {
    name: 'web-ifc',
    author: 'That Open Company',
    url: 'https://github.com/ThatOpen/engine_web-ifc',
    licenceUrl: 'https://github.com/ThatOpen/engine_web-ifc/blob/main/LICENSE.md',
    licenceName: 'MPL-2.0',
    used: 'IFC building models open through web-ifc, loaded from jsDelivr at a pinned version.',
    checkedIn: 'src/utils/ifcEngine.js',
  },
  {
    name: 'rhino3dm',
    author: 'Robert McNeel & Associates',
    url: 'https://github.com/mcneel/rhino3dm',
    licenceUrl: 'https://github.com/mcneel/rhino3dm/blob/main/LICENSE',
    licenceName: 'MIT',
    used: 'Rhino .3dm files open through openNURBS compiled to WebAssembly, loaded from jsDelivr at a pinned version.',
    checkedIn: 'src/utils/mesh/rhino.js',
  },
  {
    name: 'meshoptimizer',
    author: 'Arseny Kapoulkine',
    url: 'https://github.com/zeux/meshoptimizer',
    licenceUrl: 'https://github.com/zeux/meshoptimizer/blob/master/LICENSE.md',
    licenceName: 'MIT',
    used: 'Compressed GLB exports use meshoptimizer’s lossless encoder, loaded from jsDelivr at a pinned version.',
    checkedIn: 'src/utils/mesh/meshopt.js',
  },
  // Switzer is not OFL, so sync-credits.mjs (which reads *-OFL.txt) never sees
  // it. Its licence does not ask for credit; the row is a courtesy.
  {
    name: 'Switzer',
    author: 'Jérémie Hornus, Indian Type Foundry',
    url: 'https://www.fontshare.com/fonts/switzer',
    licenceUrl: 'https://www.fontshare.com/licenses/itf-ffl',
    licenceName: 'ITF Free Font License 2.0',
    used: 'The site’s interface typeface, served from this site as the unmodified files from Fontshare. It is never offered as a font in a tool or included in anything you download.',
    checkedIn: 'scripts/fetch-switzer.mjs',
  },
]

/* jszip is dual-licensed and a dual licence is a CHOICE, not a description.
   Naming which half we take is the whole obligation — an unstated election
   leaves a reader unable to tell which notice we are bound to keep. Keyed by
   package name so the row it annotates is still generated. */
const DEPENDENCY_NOTES = {
  jszip: 'Dual-licensed. UIL4B elects the MIT half, and keeps the MIT notice with every copy.',
  gsap: 'Not an open-source licence. Used under GSAP’s own standard “no charge” terms.',
  '@ffmpeg/core': 'This MIT package only wraps the FFmpeg binary, which is GPL-2.0-or-later. See FFmpeg under Data & services.',
}

/* NO PER-LINK "(opens in a new tab)". AppFooter carries that span because it has
   ONE external link; this page has more than sixty, and MEASURED with them on,
   every heading in the accessibility tree read "Apache 2.0, opens in a new tab,
   attribution required" and every row's name carried it too. Sixty repetitions
   of a warning is a warning nobody hears. The page states it once, in the lede,
   which is WCAG's G201 done at page scope — and it is true of every external
   link here without exception, which is what makes one statement honest. */
function Ext({ href, children, className }) {
  return (
    <a className={className} href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  )
}

/* A group heading is a licence NAME. npm's `license` field is usually one — MIT,
   Apache-2.0 — but it is a free string, and gsap declares a whole sentence with
   a URL in it ("Standard 'no charge' license: https://gsap.com/standard-license").
   Uppercased into an <h3> that is a wall, and truncating it would be inventing a
   name for somebody else's terms. So the heading says what KIND of thing it is
   and the declared string is printed verbatim underneath, where it can be read. */
const HEADING_MAX = 40
const licenceHeading = (raw) => (raw.length <= HEADING_MAX ? raw : 'Publisher’s own terms')

/** Group rows by a key, keeping first-seen order. */
function groupBy(rows, key) {
  const out = new Map()
  for (const row of rows) {
    const k = key(row)
    if (!out.has(k)) out.set(k, [])
    out.get(k).push(row)
  }
  return [...out.entries()]
}

/* The search box. Every word typed must appear somewhere in a row's own text, so
   "mit" finds the licence group and "carbon ibm" finds one set. */
const haystack = (...parts) => parts.filter(Boolean).join(' ').toLowerCase()
const matchesQuery = (words, text) => words.every((w) => text.includes(w))

export default function Credits() {
  const packs = allPackCredits()

  // Obligation first. Within a licence, alphabetical — a reader looking for one
  // pack should not have to know which tier it is on to find it.
  const packGroups = groupBy(
    [...packs].sort((a, b) => {
      if (a.licenceRequired !== b.licenceRequired) return a.licenceRequired ? -1 : 1
      if (a.licenceName !== b.licenceName) return a.licenceName.localeCompare(b.licenceName)
      return a.name.localeCompare(b.name)
    }),
    (p) => p.spdx,
  )

  // The Firebase scope is one obligation with forty-four names on it, so it is
  // folded into the `firebase` row rather than flooding the package list.
  const codeGroups = groupBy(
    [...DIRECT_DEPENDENCIES].sort((a, b) => (
      a.licence === b.licence ? a.name.localeCompare(b.name) : a.licence.localeCompare(b.licence)
    )),
    (d) => d.licence,
  )

  const [query, setQuery] = useState('')
  const searchId = useId()
  // Phones get closed licence groups to scroll past; from 640px up there is room
  // to read every group without opening it.
  const roomy = useMediaQuery('(min-width: 640px)')
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
  const searching = words.length > 0
  const groupOpen = searching || roomy
  const credits = packs.length + FONT_CREDITS.length + DIRECT_DEPENDENCIES.length + FIREBASE_PACKAGES.length

  const iconGroups = packGroups
    .map(([spdx, rows]) => {
      const licence = licenceOf(spdx)
      return [spdx, licence, rows.filter((p) => matchesQuery(words,
        haystack(p.name, p.author, p.prefix, p.note, licence.name)))]
    })
    .filter(([, , rows]) => rows.length)
  const shownFonts = FONT_CREDITS.filter((f) => matchesQuery(words, haystack(f.family, f.copyright)))
  const pkgGroups = codeGroups
    .map(([licence, rows]) => [licence, rows.filter((d) => matchesQuery(words, haystack(
      d.name, licence, DEPENDENCY_NOTES[d.name],
      d.name === 'firebase' && FIREBASE_PACKAGES.map((p) => p.name).join(' '),
    )))])
    .filter(([, rows]) => rows.length)
  const shownAssets = ASSET_CREDITS.filter((a) => matchesQuery(words,
    haystack(a.name, a.author, a.used, a.licenceName)))
  // A package row counts once; the firebase row also stands for the scope it folds.
  const shown = iconGroups.reduce((n, [, , rows]) => n + rows.length, 0)
    + shownFonts.length
    + pkgGroups.reduce((n, [, rows]) => n + rows.reduce(
      (m, d) => m + (d.name === 'firebase' ? 1 + FIREBASE_PACKAGES.length : 1), 0), 0)
    + shownAssets.length

  return (
    <div className="sec crd">
      <div className="sec-h">
        <h1>Credits &amp; licences.</h1>
        <p>
          UIL4B is built on other people’s work. Everything below is here because
          its licence asks for it, or because leaving it out would be mean. Every
          row is read from the same tables the product runs on, so a set, a
          typeface or a package cannot ship here uncredited. Every link out of
          the product — to a project, a licence or a package — opens in a new
          tab.
        </p>
      </div>

      <ul className="crd-tally">
        <li><b>{packs.length}</b> icon sets</li>
        <li><b>{FONT_CREDITS.length}</b> typefaces</li>
        <li><b>{DIRECT_DEPENDENCIES.length + FIREBASE_PACKAGES.length}</b> packages</li>
      </ul>

      <div className="crd-search">
        <label className="sr-only" htmlFor={searchId}>Search credits</label>
        <input
          id={searchId}
          className="crd-search-input"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Search ${credits} credits`}
          autoComplete="off"
          spellCheck="false"
        />
        <p className="crd-search-status" role="status">
          {searching ? `${shown} of ${credits} credits match.` : ''}
        </p>
      </div>

      {searching && shown === 0 && (
        <p className="crd-empty">Nothing here matches “{query.trim()}”.</p>
      )}

      {/* ── ICONS ────────────────────────────────────────────────────────── */}
      {iconGroups.length > 0 && (
        <section className="crd-sec" aria-labelledby="crd-icons">
          <div className="crd-sec-head">
            <h2 className="crd-h2" id="crd-icons">Icons</h2>
            <p className="crd-sec-note">
              The sets behind the{' '}
              <Link to="/create/icons">Icon Library</Link>. Which of them a visitor
              can browse depends on their plan; what is owed to their authors does
              not. Groups are ordered by what the licence asks, with the ones that
              require attribution first.
            </p>
          </div>

          {iconGroups.map(([spdx, licence, rows]) => (
            <details className="crd-group" key={`${spdx}:${groupOpen}`} open={groupOpen}>
              <summary className="crd-group-sum">
                <h3 className="crd-group-h">{licence.name}</h3>
                <span className="crd-group-count">{rows.length}</span>
              </summary>
              <div className="crd-group-body">
                <p className="crd-asks">
                  {licence.asks}
                  {licence.url && <>{' '}<Ext href={licence.url}>Read the licence</Ext>.</>}
                </p>
                <ul className="crd-list">
                  {rows.map((pack) => (
                    <li className="crd-row" key={pack.prefix}>
                      <Ext className="crd-row-link" href={pack.url}>
                        <span className="crd-row-name">{pack.name}</span>
                        <span className="crd-row-by">{pack.author} · <code>{pack.prefix}</code></span>
                      </Ext>
                      {pack.licenceUrl !== licence.url && (
                        <Ext className="crd-row-side" href={pack.licenceUrl}>licence</Ext>
                      )}
                      {pack.note && <span className="crd-row-note">{pack.note}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            </details>
          ))}
        </section>
      )}

      {/* ── TYPE ─────────────────────────────────────────────────────────── */}
      {shownFonts.length > 0 && (
        <section className="crd-sec" aria-labelledby="crd-type">
          <div className="crd-sec-head">
            <h2 className="crd-h2" id="crd-type">Typefaces</h2>
            <p className="crd-sec-note">
              All {FONT_CREDITS.length} are served from this origin under the{' '}
              <Ext href="https://openfontlicense.org/">SIL Open Font License 1.1</Ext>,
              which asks that each font’s own notice travel with the files. These
              are those notices, read out of the licence files beside the fonts.
              The template previews load further OFL families, each with its
              licence file beside it.
            </p>
          </div>
          <ul className="crd-list crd-list--fonts">
            {shownFonts.map((font) => (
              <li className="crd-row crd-row--font" key={font.slug}>
                {/* NO SPECIMEN. Some of these families are served but not
                    declared in global.css's @font-face block (they back the type
                    tools' previews), so setting each row in its own face would
                    render some of them correctly and the rest in Geist —
                    a page about accuracy being inaccurate in its own typography. */}
                <span className="crd-row-name">{font.family}</span>
                <p className="crd-copy">{font.copyright}</p>
                {/* The licence file is served from this origin, and it is still an
                    Ext: it is a 4.5 KB plain-text document, not a page of the app,
                    and following it in place would drop the reader out of the SPA
                    with nothing but the back button. It is also what the sentence
                    in the lede promises of every link to a licence. */}
                <span className="crd-links">
                  <Ext href={font.source}>Project</Ext>
                  <Ext href={font.licenceFile}>Full licence</Ext>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ── CODE ─────────────────────────────────────────────────────────── */}
      {pkgGroups.length > 0 && (
        <section className="crd-sec" aria-labelledby="crd-code">
          <div className="crd-sec-head">
            <h2 className="crd-h2" id="crd-code">Packages</h2>
            <p className="crd-sec-note">
              The dependencies that reach a browser or a serverless function, with
              the licence each one declares. Build-time tooling is not listed — it
              ships to nobody.
            </p>
          </div>

          {pkgGroups.map(([licence, rows]) => (
            <details className="crd-group" key={`${licence}:${groupOpen}`} open={groupOpen}>
              <summary className="crd-group-sum">
                <h3 className="crd-group-h">{licenceHeading(licence)}</h3>
                <span className="crd-group-count">{rows.length}</span>
              </summary>
              <div className="crd-group-body">
                {licenceHeading(licence) !== licence && (
                  <p className="crd-asks">Declared as “{licence}”.</p>
                )}
                <ul className="crd-list crd-list--pkgs">
                  {rows.map((dep) => (
                    <li className="crd-row crd-row--pkg" key={dep.name}>
                      <Ext className="crd-row-link" href={`https://www.npmjs.com/package/${dep.name}`}>
                        <span className="crd-row-name">{dep.name}</span>
                      </Ext>
                      {DEPENDENCY_NOTES[dep.name] && (
                        <span className="crd-row-note">{DEPENDENCY_NOTES[dep.name]}</span>
                      )}
                      {/* The Firebase scope, in full. Apache-2.0 asks that the
                          notice travel with the copies, and "and about forty more"
                          is not a notice — so the names are here, folded so they do
                          not bury the fourteen packages beside them. */}
                      {dep.name === 'firebase' && (
                        <details className="crd-more" key={`scope:${searching}`} open={searching}>
                          <summary>
                            …and the {FIREBASE_PACKAGES.length} <code>@firebase/*</code> packages it installs
                          </summary>
                          <ul className="crd-scope">
                            {FIREBASE_PACKAGES.map((p) => (
                              <li key={p.name}><code>{p.name}</code> <span>{p.licence}</span></li>
                            ))}
                          </ul>
                        </details>
                      )}
                    </li>
                  ))}
                </ul>
                {licence === 'Apache-2.0' && (
                  <p className="crd-asks">
                    Apache 2.0 keeps its notices with every copy.{' '}
                    <Ext href="https://www.apache.org/licenses/LICENSE-2.0">Read the licence</Ext>.
                  </p>
                )}
              </div>
            </details>
          ))}
        </section>
      )}

      {/* ── DATA AND SERVICES ────────────────────────────────────────────── */}
      {shownAssets.length > 0 && (
        <section className="crd-sec" aria-labelledby="crd-data">
          <div className="crd-sec-head">
            <h2 className="crd-h2" id="crd-data">Data &amp; services</h2>
            <p className="crd-sec-note">
              Sources that are neither an installed package nor an icon set:
              data the tools read, engines loaded while you use them, and this
              site’s own typeface.
            </p>
          </div>
          <ul className="crd-list">
            {shownAssets.map((asset) => (
              <li className="crd-row crd-row--asset" key={asset.name}>
                <Ext className="crd-row-link" href={asset.url}>
                  <span className="crd-row-name">{asset.name}</span>
                  <span className="crd-row-by">{asset.author}</span>
                </Ext>
                <Ext className="crd-row-side" href={asset.licenceUrl}>{asset.licenceName}</Ext>
                <p className="crd-row-note">{asset.used}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="crd-foot">
        Nothing on this page is typed twice. The icon sets come from the same
        table that decides who may browse them, the notices come from the licence
        files served beside the fonts, and the packages come from
        <code>package.json</code>. If something is missing, it is missing from
        one of those — which is the only way it can be fixed once.
      </p>
    </div>
  )
}
