// /credits — the colophon, and the place the product discharges its licence
// obligations rather than describing them.
//
// ── Why this page exists ────────────────────────────────────────────────────
//
// A licence review on 2026-09-23 found the product using third-party icon sets,
// typefaces and packages whose licences REQUIRE attribution, and attributing
// almost none of them. Four icon sets are Creative Commons Attribution sets and
// two of those are on the free tier; six typefaces ship under the SIL Open Font
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
// ASSET_CREDITS below. Two sources have no manifest to read — an emoji search
// index built from Unicode CLDR, and the Iconify API the icon grid fetches
// through — so their provenance lives in a comment in the script that uses
// them. They are stated here and CHECKED there: the coverage test asserts
// scripts/build-emoji-index.mjs still names the CLDR source this page credits,
// so a change of source cannot leave the credit behind.
import { Link } from 'react-router-dom'
import { allPackCredits, licenceOf } from '../data/iconPackCredits'
// GENERATED — `node scripts/sync-credits.mjs`. A data file rather than a module
// because its content is npm package names, and a module under src/ that NAMES
// a package reads to a text scan exactly like one that IMPORTS it; the generator
// records the run that caught that. tests/unit/credits-coverage.test.js fails
// the build if it has drifted from public/fonts/, package.json or node_modules/.
import creditsManifest from '../data/creditsManifest.json'
import '../styles/pages/credits.css'

const { fonts: FONT_CREDITS, dependencies: DIRECT_DEPENDENCIES, firebase: FIREBASE_PACKAGES } = creditsManifest

/* ── The two sources with no file to read ──────────────────────────────────
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
    name: 'Iconify',
    author: 'Vjacheslav Trushkin and the Iconify contributors',
    url: 'https://iconify.design',
    licenceUrl: 'https://github.com/iconifydesign/iconify/blob/main/license.txt',
    licenceName: 'MIT',
    used: 'The Icon Library reads every catalogue and every glyph through the public Iconify API. Iconify hosts and normalises the sets credited above; it does not own them.',
    checkedIn: 'src/pages/IconLibrary.jsx',
  },
]

/* jszip is dual-licensed and a dual licence is a CHOICE, not a description.
   Naming which half we take is the whole obligation — an unstated election
   leaves a reader unable to tell which notice we are bound to keep. Keyed by
   package name so the row it annotates is still generated. */
const DEPENDENCY_NOTES = {
  jszip: 'Dual-licensed. UIL4B elects the MIT half, and keeps the MIT notice with every copy.',
  gsap: 'Not an open-source licence. Used under GSAP’s own standard “no charge” terms.',
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

  return (
    <div className="sec crd">
      <div className="sec-h">
        <h1>Credits &amp; <em>licences</em>.</h1>
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

      {/* ── ICONS ────────────────────────────────────────────────────────── */}
      <section className="crd-sec" aria-labelledby="crd-icons">
        <div className="crd-sec-head">
          <h2 className="crd-h2" id="crd-icons">Icons</h2>
          <p className="crd-sec-note">
            The sets behind the{' '}
            <Link to="/create/icons">Icon Library</Link>. Which of them a visitor
            can browse depends on their plan; what is owed to their authors does
            not.
          </p>
        </div>

        {packGroups.map(([spdx, rows]) => {
          const licence = licenceOf(spdx)
          return (
            <div className="crd-group" key={spdx}>
              <h3 className="crd-group-h">
                {licence.url
                  ? <Ext href={licence.url}>{licence.name}</Ext>
                  : licence.name}
                <span className={licence.required ? 'crd-tag crd-tag--owed' : 'crd-tag'}>
                  {licence.required ? 'Attribution required' : 'No conditions'}
                </span>
              </h3>
              <p className="crd-asks">{licence.asks}</p>
              <ul className="crd-list">
                {rows.map((pack) => (
                  <li className="crd-row" key={pack.prefix}>
                    <Ext className="crd-row-name" href={pack.url}>{pack.name}</Ext>
                    <span className="crd-row-by">{pack.author}</span>
                    {pack.note && <span className="crd-row-note">{pack.note}</span>}
                    <span className="crd-row-meta">
                      <code>{pack.prefix}</code>
                      {pack.licenceUrl !== licence.url && (
                        <> · <Ext href={pack.licenceUrl}>licence</Ext></>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </section>

      {/* ── TYPE ─────────────────────────────────────────────────────────── */}
      <section className="crd-sec" aria-labelledby="crd-type">
        <div className="crd-sec-head">
          <h2 className="crd-h2" id="crd-type">Typefaces</h2>
          <p className="crd-sec-note">
            All six are served from this origin under the{' '}
            <Ext href="https://openfontlicense.org/">SIL Open Font License 1.1</Ext>,
            which asks that each font’s own notice travel with the files. These
            are those notices, read out of the licence files beside the fonts.
          </p>
        </div>
        <ul className="crd-list crd-list--fonts">
          {FONT_CREDITS.map((font) => (
            <li className="crd-row crd-row--font" key={font.slug}>
              {/* NO SPECIMEN. Three of these six families are served but not
                  declared in global.css's @font-face block (they back the type
                  tools' previews), so setting each row in its own face would
                  render three of them correctly and three of them in Geist —
                  a page about accuracy being inaccurate in its own typography. */}
              <span className="crd-row-name">{font.family}</span>
              <p className="crd-copy">{font.copyright}</p>
              {/* The licence file is served from this origin, and it is still an
                  Ext: it is a 4.5 KB plain-text document, not a page of the app,
                  and following it in place would drop the reader out of the SPA
                  with nothing but the back button. It is also what the sentence
                  in the lede promises of every link to a licence. */}
              <span className="crd-row-meta">
                <Ext href={font.source}>Project</Ext> · <Ext href={font.licenceFile}>Full licence</Ext>
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* ── CODE ─────────────────────────────────────────────────────────── */}
      <section className="crd-sec" aria-labelledby="crd-code">
        <div className="crd-sec-head">
          <h2 className="crd-h2" id="crd-code">Packages</h2>
          <p className="crd-sec-note">
            The dependencies that reach a browser or a serverless function, with
            the licence each one declares. Build-time tooling is not listed — it
            ships to nobody.
          </p>
        </div>

        {codeGroups.map(([licence, rows]) => (
          <div className="crd-group" key={licence}>
            <h3 className="crd-group-h">{licenceHeading(licence)}</h3>
            {licenceHeading(licence) !== licence && (
              <p className="crd-asks">Declared as “{licence}”.</p>
            )}
            <ul className="crd-list crd-list--pkgs">
              {rows.map((dep) => (
                <li className="crd-row crd-row--pkg" key={dep.name}>
                  <Ext className="crd-row-name" href={`https://www.npmjs.com/package/${dep.name}`}>
                    {dep.name}
                  </Ext>
                  {DEPENDENCY_NOTES[dep.name] && (
                    <span className="crd-row-note">{DEPENDENCY_NOTES[dep.name]}</span>
                  )}
                  {/* The Firebase scope, in full. Apache-2.0 asks that the
                      notice travel with the copies, and "and about forty more"
                      is not a notice — so the names are here, folded so they do
                      not bury the fourteen packages beside them. */}
                  {dep.name === 'firebase' && (
                    <details className="crd-more">
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
        ))}
      </section>

      {/* ── DATA AND SERVICES ────────────────────────────────────────────── */}
      <section className="crd-sec" aria-labelledby="crd-data">
        <div className="crd-sec-head">
          <h2 className="crd-h2" id="crd-data">Data &amp; services</h2>
          <p className="crd-sec-note">
            Two sources that are neither a package nor an icon set, and would
            otherwise go unnamed.
          </p>
        </div>
        <ul className="crd-list">
          {ASSET_CREDITS.map((asset) => (
            <li className="crd-row crd-row--asset" key={asset.name}>
              <Ext className="crd-row-name" href={asset.url}>{asset.name}</Ext>
              <span className="crd-row-by">{asset.author}</span>
              <p className="crd-row-note">{asset.used}</p>
              <span className="crd-row-meta">
                <Ext href={asset.licenceUrl}>{asset.licenceName}</Ext>
              </span>
            </li>
          ))}
        </ul>
      </section>

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
