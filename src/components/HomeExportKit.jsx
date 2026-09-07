import { Link } from 'react-router-dom'
import { liveFormats, proOnlyFormats } from '../config/exportFormats'
import { guidelineSections, readGuidelines } from '../utils/brandGuidelines'
import { typeLadder } from '../utils/styleGuideExport'

// ── The export section ───────────────────────────────────────────────────────
//
// Founder, 2026-09-07: "we need to also feature the high quality design kit
// export features as a section on the homepage. maybe after showing each tool."
// It sits directly after `section.htools`, which is where he put it.
//
// ── WHY THIS RENDERS A DOCUMENT AND NOT A FEATURE CARD GRID ─────────────────
//
// The #264 salvage found the homepage had no export section at all, and the
// obvious way to add one — six tiles with an icon, a format name and a line of
// benefit copy — is the exact furniture this page has spent a month removing.
// Uniform icon cards, figure strips and bracketed eyebrows were all rejected by
// name (#382, #386, #391, #398), and "Everything below is the real tool. Use
// it." was his "MEGA AI generated" example of copy that argues instead of
// showing.
//
// So this section shows the artefact. The spread below is the FIRST CONTENT
// PAGE of the brand guidelines deck the export panel actually produces, drawn
// from `utils/brandGuidelines.js` — the same module that builds the real
// document — using the palette and type scale the workbench above is holding
// RIGHT NOW. Press Generate up there and this redraws. That is the claim and
// the demonstration in one object, and it needs no sentence underneath telling
// the reader it is real.
//
// Nothing is fabricated. There is no stock mockup, no laptop shell, no tote
// bag and no invented cover — the agent that built the deck refused to
// fabricate those and said so in the document itself; this follows it.
//
// ── MOBBIN, FOR THE DECISIONS THE SPEC LEAVES OPEN ──────────────────────────
//
// · Canva's brand-template editor renders one page of the document large and
//   legible with the rest reduced to a page strip beneath it, rather than
//   showing six equal thumbnails. That is the arrangement here: one spread, and
//   the deck's other section names as a strip.
//   https://mobbin.com/screens/3e3223e8-cacd-449a-ba1d-7f66b50985af
// · Figma's template preview does the same thing — one large preview above a
//   row of smaller page previews — which is why the strip sits below the spread
//   and not beside it.
//   https://mobbin.com/screens/2522f9bf-1f34-4d90-a84e-96b5e52e4a16
// · Canva's Brand Kit prints the hex under every swatch rather than naming the
//   colour abstractly. The spread does the same, because a hex is checkable and
//   a colour name is not.
//   https://mobbin.com/screens/a3b139b4-20e9-4b7d-9043-7aea34a88bfa
//
// ── THE NUMERALS INSIDE THE SPREAD ARE THE DOCUMENT'S, NOT THE PAGE'S ───────
//
// `guidelineSections()` numbers its sections, and the founder retired numbered
// panel badges as homepage decoration. These are not that: they are the deck's
// own folio, rendered because the deck prints them, and they appear only inside
// the depicted page. No numeral is used as furniture anywhere else in this
// section, and there is no bracketed mono eyebrow above the heading.
//
// ── FORMATS ARE DERIVED, NEVER TYPED ────────────────────────────────────────
//
// `src/config/exportFormats.js` is the one truth table. Only `live: true` rows
// appear, Pro rows carry the same badge /plans uses, and the four unbuilt rows
// (css, json, tailwind, assets) are absent — a homepage that advertised them
// would be the "full design JSON" defect again, on the front page.
// tests/unit/plans-truth.test.js already fails the build on a typed claim;
// tests/unit/home-export-truth.test.js extends that contract to this section.

/** The spread renders whatever the workbench is holding. These defaults exist
 *  only so the section is correct on the server-rendered shell, before the
 *  workbench has reported anything — prerender.mjs renders this page. */
const FALLBACK = Object.freeze({
  palette: ['#0F6FFF', '#4D90FF', '#9CC5FF', '#0B5ED7', '#0F0F10'],
  baseSize: 16,
  ratio: 1.25,
})

/**
 * A `design` object in the shape `utils/brandGuidelines.js` expects, built from
 * the live workbench values. Deliberately NOT a second description of a design:
 * readGuidelines() below is the same reader the real export runs.
 */
function designFrom(system) {
  const s = system && system.palette && system.palette.length ? system : FALLBACK
  return {
    palette: { colors: s.palette, base: s.palette[0], harmony: 'auto' },
    // The workbench has no font picker, so the deck's faces are the app's own
    // two families rather than a choice the visitor has not made. Naming them
    // here is honest — it is what the export would use — and the deck's type
    // section reads them back out of the same object.
    fonts: { heading: { family: 'Manrope', weight: 800 }, body: { family: 'Manrope', weight: 400 } },
    typeScale: { base: s.baseSize, ratio: s.ratio, lineHeight: 1.5 },
  }
}

export default function HomeExportKit({ system }) {
  const design = designFrom(system)
  // The real reader and the real section planner, not a copy of them.
  const d = readGuidelines(design)
  const sections = guidelineSections(d)
  // The document's colour section is the one worth showing large: it is the
  // page with the most of the visitor's own work on it.
  const colour = sections.find((s) => s.id === 'colour') || sections[0]
  // Three steps, not the full eight — this is a spread at card scale, and a
  // ladder that overflows its page is a preview that lies about the document.
  const ladder = typeLadder(d).filter((s) => ['Display', 'Heading 2', 'Body'].includes(s.name))

  const live = liveFormats()
  const proIds = new Set(proOnlyFormats().map((f) => f.id))

  return (
    <section className="hkit" aria-labelledby="hkit-title">
      <div className="home-container">
        <div className="hkit-head" data-reveal>
          <h2 className="hh2" id="hkit-title">
            Your system leaves as a document, not a screenshot.
          </h2>
        </div>

        <div className="hkit-grid" data-reveal>
          {/* THE ARTEFACT. A real page of the real deck, in the visitor's own
              colours, redrawn whenever the workbench above changes. */}
          <figure className="hkit-spread">
            <div className="hkit-page" aria-hidden="true">
              <div className="hkit-page-rail">
                <span className="hkit-page-mark">Design System</span>
                <span className="hkit-page-secs">
                  {sections.map((s) => (
                    <span key={s.id} data-on={s.id === colour.id || undefined}>{s.num}</span>
                  ))}
                </span>
                <span className="hkit-page-folio">{colour.num}</span>
              </div>

              <p className="hkit-page-title">{colour.title}</p>
              <p className="hkit-page-abstract">{colour.abstract}</p>

              <div className="hkit-page-swatches">
                {d.palette.map((hex) => (
                  <span className="hkit-page-swatch" key={hex}>
                    <span className="hkit-page-chip" style={{ background: hex }} />
                    <span className="hkit-page-hex">{hex}</span>
                  </span>
                ))}
              </div>

              <div className="hkit-page-ladder">
                {ladder.map((step) => (
                  <span className="hkit-page-step" key={step.name}>
                    <span className="hkit-page-step-name">{step.name}</span>
                    <span className="hkit-page-step-size">{step.px}px</span>
                  </span>
                ))}
              </div>
            </div>

            {/* Canva's page navigator: the rest of the document named, so the
                reader can see this is page one of a set rather than the whole
                of what they get. Section names come from the same planner. */}
            <figcaption className="hkit-strip">
              <span className="sr-only">
                The brand guidelines deck, drawn from the palette and type scale in the workbench
                above. Its sections are:
              </span>
              {sections.map((s) => (
                <span className="hkit-strip-page" key={s.id} data-on={s.id === colour.id || undefined}>
                  {s.title}
                </span>
              ))}
            </figcaption>
          </figure>

          <div className="hkit-side">
            {/* Not a card grid — a list of what the panel makes, in the order
                exportFormats.js lists them, with the Pro rows badged exactly as
                /plans badges them. */}
            <ul className="hkit-formats">
              {live.map((f) => (
                <li className="hkit-format" key={f.id}>
                  <span className="hkit-format-name">
                    {f.name}
                    {proIds.has(f.id) && <em className="hkit-format-pro">Pro</em>}
                  </span>
                  <span className="hkit-format-desc">{f.desc}</span>
                </li>
              ))}
            </ul>

            {/* The hand-off. Opens the palette builder carrying the workbench's
                own swatches, which is where the export panel lives — the same
                paletteBuilderUrl() hand-off the workbench's Palette panel and
                the Discover galleries already use. A visitor who follows this
                gets THEIR colours in the deck, not a demo system. */}
            <Link className="ui-pill ui-pill-ink ui-pill-md hkit-cta" to={system?.href || '/create/palette'}>
              Open the export panel with this system
              <span className="ui-pill-arrow" aria-hidden="true">&rarr;</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
