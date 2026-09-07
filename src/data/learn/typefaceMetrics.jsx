// Article: What a typeface's metrics decide. Metadata and sources in
// src/data/learnIndex.js.
//
// The table in the middle of this article is measured in the reader's own
// browser by TypeMetricsTable, off the font stacks in this page's running
// stylesheet — so the article cannot disagree with the type it is set in. No
// metric of any named typeface is written down here; the ones that are quoted
// (0.545 and 0.447) are the CSS Fonts specification's own example figures and
// are attributed to it in the paragraph that uses them.
//
// The one product fact stated in prose — the weight range this page's face
// declares — is read back out of src/styles/global.css by
// tests/unit/learn-figures.test.js rather than trusted, which is the same
// arrangement the two colour guides use for their hexes.

import { Aside, Formula, Spec } from '../../components/LearnParts'
import TypeMetricsTable from '../../components/TypeMetricsTable'

const FONTS4 = 'https://www.w3.org/TR/css-fonts-4'
const WCAG = 'https://www.w3.org/TR/WCAG22'

export default function TypefaceMetrics() {
  return (
    <>
      <section id="em-box">
        <h2>What font-size sets</h2>
        <p>
          <code>font-size: 16px</code> does not make any letter 16 pixels tall.
          It sizes the em box — the square the typeface was drawn on — and the
          letters are wherever the designer put them inside it. A capital H
          fills a different fraction of that square in every face, and so does a
          lowercase x. The table further down measures both, for the faces this
          page is being read in.
        </p>
        <p>
          This is why two faces set at the same size are not the same size on
          the screen. Nothing has gone wrong and no browser is misbehaving: the
          instruction was about the box, and the box is the only thing that
          matched.
        </p>
        <Aside>
          The em box is a coordinate system rather than a boundary. Ascenders,
          descenders and accents routinely extend past it, which is why a line
          of text can overlap the line above it at a tight line height.
        </Aside>
      </section>

      <section id="aspect-value">
        <h2>The aspect value</h2>
        <p>
          One number captures most of the difference, and CSS names it.
        </p>

        <Spec source="CSS Fonts Module Level 4 — the font-size-adjust property" href={`${FONTS4}/#font-size-adjust-prop`}>
          &hellip; aspect value and is equal to the x-height of a font divided
          by the font size.
        </Spec>

        <p>
          A face with a high aspect value has tall lowercase letters relative to
          its capitals, and holds up at small sizes because the part of a word
          the eye reads — the lowercase — is bigger for the same instruction.
          A face with a low one looks smaller and more spacious at the identical
          <code> font-size</code>.
        </p>

        <TypeMetricsTable />

        <p>
          The last three rows of that table are not this product&rsquo;s
          choices. They are whatever this machine supplies for
          <code> serif</code>, <code>sans-serif</code> and
          <code> monospace</code>, so they are different on a Mac, on a Windows
          PC and on an Android phone — and comparing them against a
          colleague&rsquo;s screen demonstrates the point of this section better
          than any fixed figure could. The spread between the first row and the
          rest is what a font fallback costs.
        </p>
        <p>
          The cap-height column is there because the aspect value alone can
          mislead. Two faces can share an x-height ratio and still read as
          different sizes if their capitals differ, since it is the capitals
          that set how tall a heading looks. The third column divides one by the
          other, which is the ratio the specification describes as a determining
          factor of legibility for scripts that distinguish upper and lower
          case.
        </p>
      </section>

      <section id="matching">
        <h2>Matching one face to another</h2>
        <p>
          Because the difference is a ratio, it can be cancelled. CSS gives the
          arithmetic for it rather than leaving it to be estimated.
        </p>

        <Spec source="CSS Fonts Module Level 4 — font-size-adjust, the adjusted font size" href={`${FONTS4}/#font-size-adjust-prop`}>
          Specifies the aspect value used in the calculation below to calculate
          the adjusted font size: c = ( a / a&prime; ) s &mdash; where s =
          font-size value, a = aspect value as specified by the
          &lsquo;font-size-adjust&rsquo; property, a&prime; = aspect value of
          actual font, c = adjusted font-size to use.
        </Spec>

        <p>
          The specification&rsquo;s own worked example uses Verdana, which it
          gives an aspect value of 0.545, and Times, which it gives 0.447. Set
          both at 16px and the Times text has visibly smaller lowercase.
          Substituting those two figures into the formula gives the size Times
          has to be set at to match:
        </p>

        <Formula caption="The specification's own two example aspect values, its own formula, and a 16px starting size. The result is the used font-size, not the computed one.">
{`c = ( a / a' ) s
c = ( 0.545 / 0.447 ) × 16px
c = 19.51px`}
        </Formula>

        <p>
          Three and a half pixels, to keep the lowercase the same height. That
          is the size of the mistake being made every time a fallback face
          stands in for a webfont and nothing compensates for it — and it is
          also, read the other way, how far apart two faces can be while both
          being described as &ldquo;16px body text&rdquo; in a specification
          document.
        </p>
        <p>
          Level 5 of the same module generalises the property: the metric being
          matched can be named, so <code>cap-height</code> matches capitals
          rather than lowercase, and the formula becomes
          <code> u = (m / m&prime;) s</code> over whichever metric was chosen.
          The last column of the table above is that calculation, run at 16px
          for every row against the first row&rsquo;s x-height.
        </p>
      </section>

      <section id="weight">
        <h2>Weight is a number, and it can be a range</h2>
        <p>
          Bold is not a state a face is in. It is a position on a numeric axis,
          and the axis is wider than the nine names usually put on it.
        </p>

        <Spec source="CSS Fonts Module Level 4 — the font-weight property" href={`${FONTS4}/#font-weight-prop`}>
          Each number indicates a weight that is at least as dark as its
          predecessor. Only values greater than or equal to 1, and less than or
          equal to 1000, are valid, and all other values are invalid.
        </Spec>

        <p>
          A variable font declares the span it actually contains. The face this
          page is set in declares <code>font-weight: 200 800</code> on its
          <code> @font-face</code> rule: 600 units of the 999 the property
          allows, continuous rather than stepped, so <code>font-weight: 437</code>
          is a real instruction and not a rounding to 400.
        </p>
        <p>
          Asking for a weight outside a declared range does not fail. The
          browser clamps to the nearest end and may then draw a heavier version
          itself by thickening the strokes — a synthesised bold, which is not
          the weight the designer drew and is usually visible as smeared
          counters at small sizes. Whether that is allowed is a property, not an
          accident:
        </p>

        <Spec source="CSS Fonts Module Level 4 — the font-synthesis-weight property" href={`${FONTS4}/#font-synthesis-weight`}>
          This property controls whether user agents are allowed to synthesize
          bold font faces when a font family lacks bold faces.
        </Spec>

        <p>
          The practical consequence is that a type scale built on weights the
          face does not contain will look correct in the design tool, which has
          the full family, and wrong in the browser, which has the subset that
          was shipped. The weights available are a fact about the file, and the
          <code> @font-face</code> rule states them.
        </p>
      </section>

      <section id="reader-settings">
        <h2>What the reader changes underneath</h2>
        <p>
          None of these metrics is the last word on how large the text ends up,
          because the reader has settings and the standard requires them to
          work.
        </p>

        <Spec source="WCAG 2.2 — SC 1.4.4 Resize Text" href={`${WCAG}/#resize-text`} level="Level AA">
          Except for captions and images of text, text can be resized without
          assistive technology up to 200 percent without loss of content or
          functionality.
        </Spec>

        <Spec source="WCAG 2.2 — SC 1.4.12 Text Spacing" href={`${WCAG}/#text-spacing`} level="Level AA">
          &hellip; no loss of content or functionality occurs by setting all of
          the following and by changing no other style property: Line height
          (line spacing) to at least 1.5 times the font size; Spacing following
          paragraphs to at least 2 times the font size; Letter spacing
          (tracking) to at least 0.12 times the font size; Word spacing to at
          least 0.16 times the font size.
        </Spec>

        <p>
          Read 1.4.12 carefully: it does not ask for those four values to be
          used. It asks that nothing breaks when a reader imposes them. A layout
          that only holds together at the tracking it was designed with fails
          the criterion without ever looking wrong to its author.
        </p>
        <p>
          Metrics also decide which CSS units move. The specification is
          explicit that a face swap changes the units derived from font metrics
          and leaves the em alone:
        </p>

        <Spec source="CSS Fonts Module Level 4 — what font-size-adjust affects" href={`${FONTS4}/#font-size-adjust-prop`}>
          It affects the size of relative units that are based on font metrics
          such as ex and ch but does not affect the size of em units.
        </Spec>

        <p>
          So a column capped at <code>68ch</code> holds a different number of
          characters in a fallback face than in the intended one, while a gap
          set in <code>em</code> does not move at all. Sizing a reading measure
          in <code>ch</code> is the right choice for exactly that reason — the
          cap tracks the characters rather than a nominal size — and it is also
          the reason the column visibly changes width when a webfont arrives.
        </p>
      </section>
    </>
  )
}
