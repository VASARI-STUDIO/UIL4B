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
// tests/unit/learn-type-figures.test.js rather than trusted, which is the same
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
          It sizes the em box, which is the square the typeface was drawn on. The
          letters sit wherever the designer put them inside it. A capital H fills
          a different share of that square in every face, and so does a lowercase
          x. The table further down measures both, for the faces this page is
          being read in.
        </p>
        <p>
          So two faces set at the same size are not the same size on the screen.
          Nothing has gone wrong and no browser is misbehaving. The instruction
          was about the box, and the box is the only thing that matched.
        </p>
        <Aside>
          The em box is a coordinate system, not a boundary. Ascenders, descenders
          and accents often reach past it. That is why a line of text can overlap
          the line above it at a tight line height.
        </Aside>
      </section>

      <section id="aspect-value">
        <h2>The aspect value</h2>
        <p>
          One number captures most of the difference, and CSS gives it a name.
        </p>

        <Spec source="CSS Fonts Module Level 4 — the font-size-adjust property" href={`${FONTS4}/#font-size-adjust-prop`}>
          &hellip; aspect value and is equal to the x-height of a font divided
          by the font size.
        </Spec>

        <p>
          A face with a high aspect value has tall lowercase letters compared with
          its capitals. It holds up at small sizes, because the part of a word the
          eye reads, the lowercase, is bigger for the same instruction. A face
          with a low one looks smaller and more spacious at the identical
          <code> font-size</code>.
        </p>

        <TypeMetricsTable />

        <p>
          The last three rows of that table are not this product&rsquo;s
          choices. They are whatever this machine supplies for
          <code> serif</code>, <code>sans-serif</code> and
          <code> monospace</code>. They differ on a Mac, on a Windows PC and on
          an Android phone. Compare them with a colleague&rsquo;s screen and you
          see the point of this section better than any fixed figure shows it.
          The spread between the first row and the rest is what a font fallback
          costs.
        </p>
        <p>
          The cap-height column is there because the aspect value alone can
          mislead. Two faces can share an x-height ratio and still read as
          different sizes if their capitals differ. The capitals set how tall a
          heading looks. The third column divides one by the other. The
          specification describes that ratio as a determining factor of
          legibility for scripts that distinguish upper and lower case.
        </p>
      </section>

      <section id="matching">
        <h2>Matching one face to another</h2>
        <p>
          Because the difference is a ratio, it can be cancelled out. CSS gives
          the arithmetic, so you do not have to estimate it.
        </p>

        <Spec source="CSS Fonts Module Level 4 — font-size-adjust, the adjusted font size" href={`${FONTS4}/#font-size-adjust-prop`}>
          Specifies the aspect value used in the calculation below to calculate
          the adjusted font size: c = ( a / a&prime; ) s &mdash; where s =
          font-size value, a = aspect value as specified by the
          &lsquo;font-size-adjust&rsquo; property, a&prime; = aspect value of
          actual font, c = adjusted font-size to use.
        </Spec>

        <p>
          The specification&rsquo;s own worked example uses Verdana, with an
          aspect value of 0.545, and Times, which it gives 0.447. Set both at 16px and the
          Times text has visibly smaller lowercase. Put those two figures into the
          formula to get the size Times needs to match:
        </p>

        <Formula caption="The specification's own two example aspect values, its own formula, and a 16px starting size. The result is the used font-size, not the computed one.">
{`c = ( a / a' ) s
c = ( 0.545 / 0.447 ) × 16px
c = 19.51px`}
        </Formula>

        <p>
          Three and a half pixels more, to keep the lowercase the same height. It
          is the size of the mistake made whenever a fallback face
          stands in for a webfont and nothing compensates. Read the other way, it
          shows how far apart two faces can be while both are called
          &ldquo;16px body text&rdquo; in a specification document.
        </p>
        <p>
          Level 5 of the same module widens the property. You can name the metric
          being matched, so <code>cap-height</code> matches capitals and not
          lowercase. The formula becomes <code> u = (m / m&prime;) s</code> for
          whichever metric you chose. The last column of the table above is that
          calculation, run at 16px for every row against the first row&rsquo;s
          x-height.
        </p>
      </section>

      <section id="weight">
        <h2>Weight is a number, and it can be a range</h2>
        <p>
          Bold is not a state a face is in. It is a position on a numeric axis.
          The axis is wider than the nine names usually put on it.
        </p>

        <Spec source="CSS Fonts Module Level 4 — the font-weight property" href={`${FONTS4}/#font-weight-prop`}>
          Each number indicates a weight that is at least as dark as its
          predecessor. Only values greater than or equal to 1, and less than or
          equal to 1000, are valid, and all other values are invalid.
        </Spec>

        <p>
          A variable font declares the span it actually contains. The face this
          page is set in declares <code>font-weight: 100 900</code> on its
          <code> @font-face</code> rules, upright and italic alike. That is 800
          units of the 999 the property allows. The range is continuous, not
          stepped, so <code> font-weight: 437</code> is a real instruction and not
          a rounding to 400.
        </p>
        <p>
          Asking for a weight outside a declared range does not fail. The browser
          clamps to the nearest end. It may then draw a heavier version itself by
          thickening the strokes. That is a synthesised bold. It is not the weight
          the designer drew, and in practice it can look smeared at small sizes.
          A property controls whether this is allowed:
        </p>

        <Spec source="CSS Fonts Module Level 4 — the font-synthesis-weight property" href={`${FONTS4}/#font-synthesis-weight`}>
          This property controls whether user agents are allowed to synthesize
          bold font faces when a font family lacks bold faces.
        </Spec>

        <p>
          So a type scale built on weights the face does not contain will look
          right in the design tool, which has the full family. It will look wrong
          in the browser, which has whatever was shipped. The weights available
          are a fact about the file, and the <code> @font-face</code> rule states
          them.
        </p>
      </section>

      <section id="reader-settings">
        <h2>What the reader changes underneath</h2>
        <p>
          None of these metrics has the last word on how large the text ends up.
          The reader has settings, and the standard requires them to work.
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
          Read 1.4.12 with care. It does not ask you to use those four values. It
          asks that nothing breaks when a reader sets them. A layout that only
          holds together at the tracking it was designed with fails the
          criterion, and it never looks wrong to its author.
        </p>
        <p>
          Metrics also decide which CSS units move. The specification says that a
          face swap changes the units based on font metrics and leaves the em
          alone:
        </p>

        <Spec source="CSS Fonts Module Level 4 — what font-size-adjust affects" href={`${FONTS4}/#font-size-adjust-prop`}>
          It affects the size of relative units that are based on font metrics
          such as ex and ch but does not affect the size of em units.
        </Spec>

        <p>
          So a column capped at <code>68ch</code> holds a different number of
          characters in a fallback face than in the intended one. A gap set in{' '}
          <code>em</code> does not move at all. That is the reason to size a
          reading measure in <code>ch</code>: the cap follows the characters, not
          a nominal size. It is also the reason the column visibly changes width
          when a webfont arrives.
        </p>
      </section>
    </>
  )
}
