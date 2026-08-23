import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { HOME_CURATED } from '../data/homeGallery'
import { cssGlimpse, measurePalette } from '../data/heroSpecimen'

// ── The hero specimen band ───────────────────────────────────────────────────
//
// The problem it solves: a product whose entire pitch is that it GENERATES
// things used to show a visitor nothing it had generated until they scrolled.
// The first screen was eight centred text blocks on an empty ground, and the
// only object in it with edges was an empty text input. That is the shape a
// generator produces, which is why the founder was told the site "instantly
// looks like AI built it".
//
// So the decoration is deleted and the product's own output stands in its
// place: ONE real entry from the shipped palette library, rendered as three
// facts — the artefact, the measurement we took of it, and the file it exports
// as.
//
// WHY THIS IS UNCOPYABLE, which is the point. Plenty of sites can put a swatch
// row in a hero. What no competitor can copy without building the product is
// the middle column: the contrast figures come out of the same functions the
// style-guide export runs, so the hero can never disagree with a file a
// customer downloads. Showing output is table stakes; showing the measurement
// you took of your own output is the thing only the real tool can do.
//
// EVERY VALUE COMES FROM A MODULE THAT ALREADY SHIPS. No new data file, no
// route literal, no Math.random():
//
//   entries   HOME_CURATED (data/homeGallery.js) — the same 64 the Discover
//             section renders three screens down.
//   artefact  item.colors, in paletteGallery.js's documented dominant→accent
//             order.
//   CSS       item.css, from paletteCss() — the same BYTES the gallery's Copy
//             CSS hands over, so a visitor who copies from both gets identical
//             text.
//   hand-off  item.to, from paletteBuilderUrl(). NEVER a typed route: the
//             Create tools moved to /create/<pagetitle> and
//             tests/unit/redirects.test.js fails the build on a retired path
//             anywhere in src/.
//   measure   measurePalette() (data/heroSpecimen.js), which reads
//             contrastRatio() from utils/colors.js and grade() from
//             utils/styleGuideExport.js.

const ENTRIES = HOME_CURATED

export default function HomeSpecimen() {
  // Starts at 0. NOT random, not date-seeded, not localStorage-seeded — the
  // build prerenders 27 shells and this markup has to be byte-identical on the
  // server and on the first client paint. HomeWorkbench.makePalette() uses
  // Math.random(), which is fine below the fold in a client-only panel and is
  // NOT fine here; do not hoist it and do not "improve" this by randomising the
  // starting index.
  const [index, setIndex] = useState(0)
  // Empty at rest, so the live region announces nothing until the visitor acts.
  const [announcement, setAnnouncement] = useState('')

  const item = ENTRIES[index]
  const m = useMemo(() => measurePalette(item.colors), [item])
  const glimpse = useMemo(() => cssGlimpse(item.css), [item])

  const next = () => {
    const at = (index + 1) % ENTRIES.length
    const entry = ENTRIES[at]
    setIndex(at)
    const facts = measurePalette(entry.colors)
    setAnnouncement(`${entry.name} — ${facts.clear} of ${facts.total} pairs clear AA`)
  }

  return (
    // A <figure> with a <figcaption>, so assistive technology gets ONE coherent
    // object with a name rather than fifteen loose fragments.
    <figure className="home-hero-specimen">
      <p className="hspec-lab hspec-lab-a">Palette</p>
      {/* Keyed on the entry so React remounts the cell and the CSS fade replays.
          Under reduced motion the animation is off and the values still change —
          instantly and completely. Reduced motion removes the transition, never
          the update. */}
      <div className="hspec-cell hspec-cell-a" key={`a-${item.key}`}>
        {/* aria-hidden because the hex row directly beneath carries exactly the
            same information as text. Text is never painted ON a generated
            swatch: readableInk()'s luminance threshold does not guarantee 4.5:1
            at this size, and moving the labels onto the page ground deletes that
            whole failure class rather than managing it. */}
        <div className="hspec-swatches" aria-hidden="true">
          {item.colors.map((hex) => (
            <span className="hspec-swatch" key={hex} style={{ background: hex }} />
          ))}
        </div>
        <p className="hspec-hexes">
          {item.colors.map((hex) => (
            <span className="hspec-hex" key={hex}>{hex.toUpperCase()}</span>
          ))}
        </p>
      </div>

      <p className="hspec-lab hspec-lab-b">Contrast</p>
      <div className="hspec-cell hspec-cell-b" key={`b-${item.key}`}>
        <p className="hspec-pair">
          <span className="hspec-hex">{m.ink}</span>
          <span className="hspec-on"> on </span>
          <span className="hspec-hex">{m.ground}</span>
          <span className="hspec-ratio">{m.ratio}:1</span>
          {/* --accent-strong on --bg-2, NOT the --hi AAA badge used elsewhere in
              the design: --hi is budgeted at one element per viewport and it is
              spent on the headline mark. This is .hcmd-row-cat's language. */}
          <span className="hspec-grade">{m.grade}</span>
        </p>
        <p className="hspec-count">{m.clear} of {m.total} pairs clear AA</p>
      </div>

      <p className="hspec-lab hspec-lab-c">CSS</p>
      <div className="hspec-cell hspec-cell-c" key={`c-${item.key}`}>
        {glimpse.map((line, i) => (
          <code className="hspec-code" key={i}>{line}</code>
        ))}
      </div>

      <div className="hspec-act">
        {/* ONE control, and the artefact regenerates from it — Ramp's hero does
            the same with a single Balance slider driving one figure.
            It NEVER auto-advances. A hero that cycles its own artefact in a
            reader's peripheral vision while they read the headline is a gimmick,
            and an auto-cycle over five seconds would drag WCAG 2.2.2 in for no
            gain. */}
        <button type="button" className="ui-pill ui-pill-quiet ui-pill-md hspec-next" onClick={next}>
          Next palette
        </button>
        {/* A real <Link>, so middle-click and open-in-new-tab work — the same
            rule HomeCommandBar's result rows follow. item.to, never a literal. */}
        <Link className="hstep-cta hspec-open" to={item.to}>
          Open in Palette Builder
          <span aria-hidden="true">&rarr;</span>
        </Link>
      </div>

      {/* sRGB is deliberate: for a product whose pitch is defensible colour
          systems, naming the space is both more correct and a credibility
          signal. */}
      <figcaption className="hspec-cap" key={`cap-${item.key}`}>
        {item.name} · sRGB · from the UIL4B palette library
      </figcaption>

      {/* A SECOND polite live region in this viewport, and that is deliberate.
          HomeCommandBar owns one for its result count. Two live regions in one
          viewport is normally a mistake; it is safe here because BOTH are empty
          until the visitor acts and NO single action can populate both — one
          fires on typing, this one on a button press. Do not "tidy" them into
          one. */}
      <p className="sr-only" role="status" aria-live="polite">{announcement}</p>
    </figure>
  )
}
