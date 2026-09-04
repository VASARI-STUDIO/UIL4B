import { useEffect, useMemo } from 'react'
import {
  CATEGORY_LABEL, CATEGORY_NOTE, DOSSIER_TABS, facesThinCatalogue, fontFacts, titleCase,
} from '../utils/fontDossier'
import {
  fontsInUseSearchUrl, ladderFor, sceneWeights, scenesFor,
} from '../utils/fontScenes'
import { weightName } from '../utils/fontGallery'
import { fontStack, loadFont } from '../utils/googleFonts'

// The ABOUT and EXAMPLES panels — the founder's request, three times stated:
// "a tab that shows real world examples of the font this will help users
// understand font use cases" and "lets also include an about tab".
//
// ONE component, used by BOTH font popups (FontBrowseDialog, which FontPicker
// opens for Font Pair and Type Scale, and the Font Gallery's specimen dialog).
// The backlog asked explicitly whether they should share one rather than
// diverge again; they should. A typeface's facts do not change with which
// dialog you opened it from, and the two dialogs have already drifted once.
//
// ── WHERE THE CONTENT COMES FROM, AND WHY IT IS HONEST ──────────────────────
//
// There is a blocked backlog item, [fonts-in-use-surface], for showing real
// brand work using a typeface. It is blocked on IMAGERY RIGHTS CLEARANCE, and
// nothing here touches that: no photographs, no logos, no screenshots, and no
// claim that any named company uses any of these families. Writing "used by
// Stripe" would be a false statement about a real business, and inventing a
// designer or a release year for a typeface is the same failure aimed at a
// person. So both tabs take a route that needs no permission:
//
//   ABOUT is DERIVED. Every fact is carried straight through from Google's own
//   family metadata (see api/fonts.js) — designer, the date the family was
//   added, weights, italics, variable axes, script coverage, licence. Nothing
//   is inferred and nothing is hand-authored per family, so nothing can rot
//   into a wrong claim about someone's work. A field the catalogue does not
//   supply is OMITTED, never guessed: a thin panel is a fine outcome, an
//   invented one is not.
//
//   `dateAdded` gets the label it actually deserves — "Added to Google Fonts".
//   It is not the year the typeface was designed, and for a revival of a metal
//   face the two are decades apart. Printing it as "Released" would be the
//   quietest lie on the page.
//
//   EXAMPLES are DEMONSTRATED. "Real-world examples" is read as the family set
//   in real-world SITUATIONS THIS PAGE DRAWS ITSELF. That answers what a user
//   actually wants to know ("what is this face FOR?") with zero rights
//   exposure, and it is something this app is unusually well placed to do
//   because it already owns the type and token machinery.
//
// ── THE SCENES ARE CHOSEN FROM THE FAMILY, NOT FIXED ────────────────────────
//
// The first version of this panel held a module-level array of FOUR FIXED
// SCENES and rendered them identically for all 1,946 families — `font.category`
// was not read once. The founder reported it three times (2026-08-08,
// 2026-08-15, 2026-09-04): "for the font examples i want real world examples
// not the same UI examples for each one".
//
// src/utils/fontScenes.js now picks the scenes from what the family IS, using
// two catalogue fields /api/fonts previously discarded (`classifications` and
// `stroke`) because `category` alone gets it wrong for 351 families. See that
// module for the derivation, the ordering and the degraded path. This file only
// DRAWS what it is handed.
//
// TWO CAPABILITY RULES ARE ENFORCED HERE, because a specimen that lies about
// the font is worse than a generic one:
//
//   NO SYNTHETIC WEIGHTS. Every weight set below is snapped to a cut the family
//   really ships (`sceneWeights`), and the ladder is withheld entirely from a
//   family with fewer than three. This panel also calls `loadFont` for exactly
//   the weights it is about to use, because a weight that was never downloaded
//   is faux-bolded by the browser even when the family does ship it.
//
//   NO ITALICS AT ALL. Not a judgement call — `injectFontLink` requests
//   `wght@…` and no `ital` axis, so NO italic cut is ever downloaded for any
//   family in this app. Setting `font-style:italic` here would render a
//   browser-synthesised oblique 100% of the time, including on the families
//   that genuinely ship twelve italics. The About tab states italic
//   availability as a FACT from the catalogue; the Examples tab does not draw
//   one. Adding real italics means teaching the loader the `ital` axis, which
//   changes the css2 URL shape for every caller in the app.
//
// Mobbin drove the shape of all of it:
//
//   AAVE's brand-typography section is the whole premise. It states a role
//   under each face — "For headlines." / "Used in body text." / "Used for
//   code." — and shows a DIFFERENT SPECIMEN for each: "Proto" for the headline
//   face, "23%" for the body face, "uint" for the mono face. The mono face is
//   shown a Solidity type, not "Handgloves". That is this change in miniature.
//   mobbin.com/sites/sections/194a20c4-7e03-4839-86b3-30981d8db06e
//
//   STRIPE's developer section supplied both mono scenes: a code pane with a
//   line-number GUTTER, and beneath it a terminal whose log lines carry aligned
//   timestamps. The gutter proves the digits share a width and the log proves
//   the columns land without anyone aligning them — two different tests, which
//   is why mono gets two panes rather than one.
//   mobbin.com/sites/sections/286613b2-cec3-4b45-ba6e-77930aa42ef4
//
//   EVENTBRITE's Reconvene Summit hero is the poster: a small letterspaced date
//   line ABOVE a huge title, one supporting line below. That three-part
//   structure is what makes a display face legible as a poster rather than as a
//   big word. mobbin.com/sites/sections/d2ac77c3-af65-4cfb-9f59-227d98a51578
//
//   JASPER's Fonts section annotates every rung of its type ladder with the
//   real size and weight instead of leaving the reader to guess, which is why
//   each rung here is labelled with its own number AND its OpenType name.
//   mobbin.com/sites/sections/30434930-ea74-484a-8eca-88ff9c8014f2
//
//   CLAUDE TYPE, a working foundry, ships "12 Styles / With Italics" as a claim
//   tied to the family's actual style count — the foundry convention behind the
//   capability rules above.
//   mobbin.com/sites/sections/87c2dd71-75a5-4bf1-8d12-86e29d509e35
//
// NO PAIRED SECOND FACE, though `rankPairings` is available and correct. Every
// line in every scene is set in the family under examination. A supporting line
// set in some other family would be the one thing on the panel the reader
// cannot attribute — and setting the poster's sub-line in the SAME face at a
// small size is itself informative, because it shows what the face does small.

/**
 * The tab strip, shared by both font popups for the same reason the panels are:
 * two dialogs that show the same three tabs must not each grow their own
 * keyboard handling. Arrow keys wrap, focus follows selection, and the roving
 * tabindex keeps the strip a single tab stop — the APG tabs contract, written
 * once.
 *
 * `idBase` namespaces the ids so both dialogs can be in the DOM without
 * colliding, and so each panel can point back at its own tab.
 */
export function FontDossierTabs({ value, onChange, idBase, label }) {
  const move = (event) => {
    const keys = { ArrowRight: 1, ArrowLeft: -1 }
    const step = keys[event.key]
    if (!step) return
    event.preventDefault()
    const i = DOSSIER_TABS.findIndex(t => t.id === value)
    const next = DOSSIER_TABS[(i + step + DOSSIER_TABS.length) % DOSSIER_TABS.length]
    onChange(next.id)
    requestAnimationFrame(() => document.getElementById(`${idBase}-tab-${next.id}`)?.focus())
  }

  return (
    <div className="fdx-tabs" role="tablist" aria-label={label}>
      {DOSSIER_TABS.map(t => (
        <button
          key={t.id}
          type="button"
          role="tab"
          id={`${idBase}-tab-${t.id}`}
          aria-selected={value === t.id}
          aria-controls={`${idBase}-panel-${t.id}`}
          tabIndex={value === t.id ? 0 : -1}
          className={value === t.id ? 'fdx-tab fdx-tab--on' : 'fdx-tab'}
          onClick={() => onChange(t.id)}
          onKeyDown={move}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}

export function FontAboutPanel({ font, id, labelledBy }) {
  const rows = useMemo(() => fontFacts(font), [font])
  if (!font) return null

  const note = CATEGORY_NOTE[font.category]
  const category = CATEGORY_LABEL[font.category] || titleCase(font.category)
  // Told, not hidden: a catalogue that came back thin (the bundled fallback, or
  // an older cached copy) genuinely has no designer or date, and the panel says
  // so rather than leaving a reader wondering which fields are missing and why.
  const thin = facesThinCatalogue(font)

  return (
    <div className="fdx-panel" id={id} role="tabpanel" aria-labelledby={labelledBy} tabIndex={0}>
      <dl className="fdx-facts">
        {rows.map(row => (
          <div className="fdx-fact" key={row.k}>
            <dt>{row.k}</dt>
            <dd>{row.v}</dd>
          </div>
        ))}
      </dl>

      {note && (
        <section className="fdx-note">
          <h4>What a {category.toLowerCase()} face is for</h4>
          <p>{note}</p>
        </section>
      )}

      <p className="fdx-source">
        {thin
          ? 'The catalogue currently loaded is the short bundled list, which carries no designer or date. Reload the full catalogue to see them.'
          : 'Every fact above comes from this family’s entry in the Google Fonts catalogue.'}
      </p>
    </div>
  )
}

// ── SCENE COPY ──────────────────────────────────────────────────────────────
//
// Every name below is INVENTED. Nothing here names a real company, product or
// publication, because "Stripe uses this font" is a claim about a real business
// and this panel has no source for one. [fonts-in-use-surface] is where real
// brand work belongs and it stays blocked on rights clearance.

// Chosen to exercise what a monospace face is actually judged on. The comment
// line is not decoration: 0/O and 1/l/I are the four glyphs a code face has to
// keep apart, and a family that fails there fails at the only job this scene is
// asking about.
const CODE_LINES = [
  'const steps = { base: 16, ratio: 1.25 }',
  'const scale = (n) => +(steps.base * steps.ratio ** n).toFixed(2)',
  '',
  '// 0 O 1 l I — the four that have to stay apart',
  '[0, 1, 2, 3, 4].map(scale)',
  "export default { name: 'minor-third', scale }",
]

// Fixed-width columns that are NOT aligned by CSS — no table, no tab stops, no
// text-align. If they line up, the face did it.
const TERMINAL_LINES = [
  ['10:58:06', 'ok  ', 'palette   ', '12 tokens'],
  ['10:58:06', 'ok  ', 'type-scale', ' 7 tokens'],
  ['10:58:07', 'warn', 'spacing   ', ' 2 unused'],
  ['10:58:07', 'ok  ', 'radius    ', ' 4 tokens'],
]

// Deliberately ragged magnitudes. Digits that hold their width stack into a
// clean right edge; digits that do not, do not — and NO `font-variant-numeric`
// is set here, because forcing tabular figures onto a face that has none would
// be answering the question the scene is asking.
const FIGURES = [
  ['Invoice 0041', '1,208.00'],
  ['Invoice 0042', '96.50'],
  ['Invoice 0043', '11,040.25'],
  ['Invoice 0044', '407.09'],
]

const GLYPH_ROWS = ['ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz', '0123456789']

/**
 * One scene, drawn in the family under examination.
 *
 * Weights reach the type through the --fdx-bw / --fdx-mw / --fdx-hw custom
 * properties set on the wrapper, already snapped to cuts the family really
 * ships, so nothing in here can ask the browser to invent one. On a
 * single-weight family all three resolve to the same number and the scene
 * renders flat — which is the truth about that family, and is exactly what a
 * reader choosing between Anton and Archivo Black needs to see. The ladder is
 * the one case that sets a weight inline, and it reads its rungs from
 * `ladderFor`, which returns only real cuts.
 */
function SceneBody({ id, font }) {
  switch (id) {
    // ── Display ────────────────────────────────────────────────────────────
    case 'poster':
      return (
        <div className="fdx-ex-body fdx-ex-poster">
          <span className="fdx-ex-overline">14 — 16 November</span>
          <p className="fdx-ex-postertitle">Harbour<br />Light</p>
          <span className="fdx-ex-posterfoot">Merrivale Docks · Nightly from 6pm</span>
        </div>
      )

    case 'masthead':
      return (
        <div className="fdx-ex-body fdx-ex-masthead">
          <p className="fdx-ex-mastname">The Quarterly</p>
          <p className="fdx-ex-mastdeck">
            Issue fourteen — on patience, and the things that only show themselves slowly
          </p>
        </div>
      )

    case 'titlecard':
      return (
        <div className="fdx-ex-body fdx-ex-titlecard">
          <span className="fdx-ex-overline">Chapter one</span>
          <p className="fdx-ex-title">A Long Way Round</p>
        </div>
      )

    case 'atsmall':
      return (
        <div className="fdx-ex-body fdx-ex-small">
          <p className="fdx-ex-smalltext">
            At thirteen pixels the detail that carries the poster is the detail that gets in
            the way. Counters close up, the thin strokes thin out, and the eye starts working
            for every word instead of reading through them.
          </p>
          <p className="fdx-ex-verdict">
            That is not a fault in the face. It is why a display family is paired with a plain
            body family rather than asked to do both jobs.
          </p>
        </div>
      )

    // ── Editorial ──────────────────────────────────────────────────────────
    case 'article':
      return (
        <article className="fdx-ex-body fdx-ex-editorial">
          <span className="fdx-ex-kicker">Field notes</span>
          <h5>The measure is the thing nobody adjusts</h5>
          <p className="fdx-ex-lede">
            A column set too wide loses the reader at the line break, and no amount of leading
            gets them back.
          </p>
          <p>
            Somewhere between 45 and 75 characters a line stops being a ribbon and starts being
            a paragraph. The exact number moves with the face, which is why this is a decision
            you make after choosing the family, not before.
          </p>
        </article>
      )

    case 'column':
      return (
        <div className="fdx-ex-body fdx-ex-column">
          <p>
            The first thing a text face has to survive is being ignored. Nobody admires the
            typography of a page they are actually reading; they notice it only when something
            goes wrong — a word space that opens too far, a figure that sits too high, a
            capital that shouts halfway down a paragraph.
          </p>
          <p>
            So the test for a family like this one is not whether a line of it looks good. It is
            whether four hundred words of it disappear. Set it at the measure you will really
            use, at the size you will really use, and read to the bottom. If you get there
            without noticing the letters, that is the answer.
          </p>
        </div>
      )

    case 'pullquote':
      return (
        <div className="fdx-ex-body fdx-ex-pullquote">
          <blockquote>
            <p>
              We kept redrawing the grid until we admitted the problem was the sentence, not the
              column it was sitting in.
            </p>
          </blockquote>
          <span className="fdx-ex-attrib">Rosalind Merrick, studio notes</span>
        </div>
      )

    case 'signage':
      return (
        <div className="fdx-ex-body fdx-ex-signage">
          <div className="fdx-ex-signrow">
            <span className="fdx-ex-signnum">4</span>
            <span className="fdx-ex-signname">Northbound</span>
          </div>
          <p className="fdx-ex-signnote">
            Next departure 14:22 · All stops to Merrivale · Front four carriages only
          </p>
        </div>
      )

    // ── Interface ──────────────────────────────────────────────────────────
    case 'ui':
      return (
        <div className="fdx-ex-body fdx-ex-ui">
          <div className="fdx-ex-bar">
            <span className="fdx-ex-tab fdx-ex-tab--on">Overview</span>
            <span className="fdx-ex-tab">Activity</span>
            <span className="fdx-ex-tab">Settings</span>
          </div>
          <p className="fdx-ex-uinote">
            Three projects need attention before Friday.
          </p>
          <div className="fdx-ex-uirow">
            <span className="fdx-ex-btn">Review changes</span>
            <span className="fdx-ex-btn fdx-ex-btn--quiet">Not now</span>
          </div>
        </div>
      )

    case 'datatable':
      return (
        <div className="fdx-ex-body fdx-ex-data">
          <div className="fdx-ex-scroll">
            <table className="fdx-ex-table">
              <thead>
                <tr><th>Project</th><th>Owner</th><th>Updated</th><th>Size</th></tr>
              </thead>
              <tbody>
                <tr><td>Harbour rebrand</td><td>R. Merrick</td><td>2 hours ago</td><td>4.2 MB</td></tr>
                <tr><td>Signal design system</td><td>A. Okonjo</td><td>Yesterday</td><td>18.9 MB</td></tr>
                <tr><td>Quarterly report</td><td>T. Lindqvist</td><td>14 Aug</td><td>1.1 MB</td></tr>
                <tr><td>Wayfinding audit</td><td>R. Merrick</td><td>11 Aug</td><td>640 KB</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      )

    case 'form':
      return (
        <div className="fdx-ex-body fdx-ex-form">
          <span className="fdx-ex-label">Workspace name</span>
          <span className="fdx-ex-input">Harbour Studio</span>
          <span className="fdx-ex-hint">Lowercase letters, numbers and hyphens.</span>
          <span className="fdx-ex-label fdx-ex-label--2">Billing email</span>
          <span className="fdx-ex-input fdx-ex-input--bad">accounts@harbour</span>
          <span className="fdx-ex-error">That address is missing a domain.</span>
        </div>
      )

    // ── Monospace ──────────────────────────────────────────────────────────
    case 'code':
      return (
        <div className="fdx-ex-body fdx-ex-code">
          <div className="fdx-ex-scroll">
            <ol className="fdx-ex-codelines">
              {CODE_LINES.map((line, n) => (
                <li key={n}><code>{line || '\u00a0'}</code></li>
              ))}
            </ol>
          </div>
        </div>
      )

    case 'terminal':
      return (
        <div className="fdx-ex-body fdx-ex-terminal">
          <div className="fdx-ex-scroll">
            <pre className="fdx-ex-shell">
              <code>
                {'$ uil4b tokens build --check\n'}
                {TERMINAL_LINES.map(([time, level, name, count]) => (
                  `2026-09-04 ${time}  [${level}]  ${name}  ${count}\n`
                )).join('')}
                {'\ndone in 1.08s — 3 ok, 1 warning\n'}
              </code>
            </pre>
          </div>
        </div>
      )

    case 'figures':
      return (
        <div className="fdx-ex-body fdx-ex-figures">
          <dl className="fdx-ex-figlist">
            {FIGURES.map(([label, amount]) => (
              <div className="fdx-ex-figrow" key={label}>
                <dt>{label}</dt>
                <dd>{amount}</dd>
              </div>
            ))}
          </dl>
        </div>
      )

    // ── Script ─────────────────────────────────────────────────────────────
    case 'invitation':
      return (
        <div className="fdx-ex-body fdx-ex-invite">
          <span className="fdx-ex-overline">You are invited</span>
          <p className="fdx-ex-invitetitle">An evening at the docks</p>
          <span className="fdx-ex-invitefoot">Saturday the ninth · Seven o&rsquo;clock</span>
        </div>
      )

    case 'signature':
      return (
        <div className="fdx-ex-body fdx-ex-signature">
          <p className="fdx-ex-sign">With every good wish,</p>
          <span className="fdx-ex-signfoot">— one line, at the size it was drawn for</span>
        </div>
      )

    case 'atlength':
      return (
        <div className="fdx-ex-body fdx-ex-small">
          <p className="fdx-ex-smalltext">
            Read three lines of this and the effort shows up. A joined face asks the eye to
            follow a stroke through every letter instead of recognising word shapes, and that
            is fine for a greeting and expensive for a paragraph.
          </p>
          <p className="fdx-ex-verdict">
            Knowing where a face stops working is the useful half of knowing what it is for.
            This one belongs on one line of a card, with the paragraph underneath set in
            something plain.
          </p>
        </div>
      )

    // ── Symbols ────────────────────────────────────────────────────────────
    case 'glyphs':
      return (
        <div className="fdx-ex-body fdx-ex-glyphs">
          {GLYPH_ROWS.map(row => (
            <p className="fdx-ex-glyphrow" key={row}>{row}</p>
          ))}
        </div>
      )

    // ── Earned, never assumed ──────────────────────────────────────────────
    case 'ladder':
      return (
        <div className="fdx-ex-body fdx-ex-ladder">
          {ladderFor(font).map(weight => (
            <div className="fdx-ex-rung" key={weight}>
              <p className="fdx-ex-rungline" style={{ fontWeight: weight }}>
                Handgloves
              </p>
              <span className="fdx-ex-runglabel">
                {weight}{weightName(weight) ? ` ${weightName(weight)}` : ''}
              </span>
            </div>
          ))}
        </div>
      )

    default:
      return null
  }
}

export function FontExamplesPanel({ font, id, labelledBy }) {
  const scenes = useMemo(() => scenesFor(font), [font])
  const w = useMemo(() => sceneWeights(font), [font])

  // EVERY WEIGHT THIS PANEL IS ABOUT TO SET, requested explicitly. Both dialogs
  // already call loadFont, but for their own purposes — FontBrowseDialog asks
  // for the ladder cuts it draws in the Specimen tab, not for these. A weight
  // the family really ships but that was never downloaded is faux-bolded by the
  // browser exactly like one it does not ship, so snapping to a real cut is
  // only half the guarantee; loadFont unions the request into the existing
  // <link> rather than replacing it, so this cannot regress the other tabs.
  const needed = useMemo(
    () => [...new Set([w.body, w.mid, w.bold, ...ladderFor(font)])],
    [font, w],
  )
  useEffect(() => {
    if (font?.family) loadFont(font.family, needed)
  }, [font, needed])

  if (!font) return null

  const vars = {
    '--fdx-ff': fontStack(font),
    '--fdx-bw': String(w.body),
    '--fdx-mw': String(w.mid),
    '--fdx-hw': String(w.bold),
  }
  const search = fontsInUseSearchUrl(font.family)

  return (
    <div className="fdx-panel" id={id} role="tabpanel" aria-labelledby={labelledBy} tabIndex={0}>
      {/* Said once, plainly, at the top. These are drawn by this page to show
          the family working; they are not photographs of anybody's product, and
          the tab must not be read as claiming a brand uses this face. */}
      <p className="fdx-source fdx-source--lead">
        {font.family} set in {scenes.length} {scenes.length === 1 ? 'situation' : 'situations'} this
        page draws itself, chosen from what kind of face it is — not screenshots of anyone&rsquo;s
        brand work.
      </p>

      {/* data-scene is the STABLE hook. The .fdx-ex-* class on each body is a
          styling hook and several of them carry no rules of their own, so a test
          that asserted on class names would be asserting on something CSS is
          free to rename. What a test needs to know is WHICH SCENES A FAMILY
          GOT, and that is this attribute. */}
      <div className="fdx-examples" style={vars}>
        {scenes.map(scene => (
          <section className="fdx-ex" data-scene={scene.id} key={scene.id}>
            <header className="fdx-ex-head">
              <h4>{scene.label}</h4>
              <p>{scene.asks}</p>
            </header>
            <SceneBody id={scene.id} font={font} />
          </section>
        ))}
      </div>

      {/* THE LINK IS WORDED AS A SEARCH, and that wording is the whole point.
          fontsinuse.com has no derivable per-typeface URL (see
          fontsInUseSearchUrl), so this can only ever be a query — and a query
          can come back empty. Verified 2026-09-04 at their robots.txt
          Crawl-delay of 10: "Playfair Display" returns 59 real /uses/ links,
          "Chokokutai" returns HTTP 200 with the words "No Uses found for
          Chokokutai" AND 47 unrelated popular uses underneath. So the miss case
          is not a 404 a reader can interpret — it is a page that still looks
          full. "See Playfair Display in use" would promise a result set we
          cannot guarantee and would read as a lie on every newer family; "Search
          fontsinuse.com for …" is true either way, and the line beneath says so
          outright rather than letting the reader discover it. */}
      <p className="fdx-fiu-note">
        Real-world usage lives off-site, and we do not host it —{' '}
        <a
          className="fdx-fiu"
          href={search}
          target="_blank"
          rel="noopener noreferrer nofollow"
        >
          search fontsinuse.com for {font.family}<span aria-hidden="true"> ↗</span>
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
        . It is a search, so a newer or less-used family may return nothing.
      </p>
    </div>
  )
}
