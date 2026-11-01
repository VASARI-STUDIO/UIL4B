// Article: Modular type scales. Metadata and sources in src/data/learnIndex.js.
//
// Every size in this article is produced by stepPx() / buildFluidScale() from
// src/utils/fluidType.js — the functions the Type Scale Generator exports from
// — so the ladder here and the ladder the tool hands you cannot disagree. The
// two accessibility criteria it leans on are quoted from WCAG 2.2 with links.

import { Aside, DataTable, Formula, Spec } from '../../components/LearnParts'
import ReadingMeasure from '../../components/ReadingMeasure'
import TypeLadder from '../../components/TypeLadder'
import { stepPx } from '../../utils/fluidType'

const WCAG = 'https://www.w3.org/TR/WCAG22'

// The classical intervals, which are musical facts rather than product data.
// The multipliers beside them are computed, not typed.
const RATIOS = [
  ['1.125', 1.125, 'Major second', 'Dense product UI, tables, admin screens'],
  ['1.2', 1.2, 'Minor third', 'A safe default for applications'],
  ['1.25', 1.25, 'Major third', 'The common web default'],
  ['1.333', 1.333, 'Perfect fourth', 'Marketing and landing pages'],
  ['1.5', 1.5, 'Perfect fifth', 'Display-led layouts, few steps'],
  ['1.618', 1.618, 'Golden ratio', 'Dramatic; two or three steps at most'],
]

export default function TypeScales() {
  return (
    <>
      <section id="the-formula">
        <h2>The formula</h2>
        <p>
          A modular scale is two numbers and one operation. You pick a base size
          and a ratio. Every other size is the base multiplied by the ratio,
          raised to the power of its distance from the base.
        </p>

        <Formula caption="Positive exponents step up from the base, negative ones step down. Step 0 is the base itself, because any ratio to the power of zero is 1.">{`size(step) = base * ratio ^ step

  16 * 1.25 ^ 0  =  16px      base
  16 * 1.25 ^ 1  =  20px      one step up
  16 * 1.25 ^ 3  =  31.25px   three steps up
  16 * 1.25 ^ -1 =  12.8px    one step down`}</Formula>

        <p>
          Two numbers is the whole appeal. Every size traces back to a decision
          someone made, not to a value someone liked. Changing the ratio moves the
          whole ladder at once. You do not need nine separate edits that then
          disagree.
        </p>

        <h3>Rounding is a decision, not a detail</h3>
        <p>
          The formula gives fractions almost at once. At a 16px base and a 1.25
          ratio, step 5 is exactly <code>{stepPx(16, 1.25, 5, 'none')}px</code>{' '}
          and step 6 is <code>{stepPx(16, 1.25, 6, 'none')}px</code>. Sub-pixel
          type sizes are legal CSS and browsers render them. But they reach the
          export as numbers nobody chose and nobody can defend in review. They
          can also leave two neighbouring steps too close to read as a
          hierarchy.
        </p>
        <p>
          Rounding to whole or half pixels turns those into{' '}
          <code>{stepPx(16, 1.25, 5, 'half')}px</code> and{' '}
          <code>{stepPx(16, 1.25, 6, 'half')}px</code>. What matters is that the
          rounding happens once, on purpose, when the scale is generated. It
          should not happen quietly inside whichever component reads the value.
        </p>
      </section>

      <section id="choosing-a-ratio">
        <h2>Choosing a ratio</h2>
        <p>
          The usual ratios are musical intervals. That is a historical habit, not
          a claim about perception. There is no evidence that a perfect fourth is
          more legible than 1.32. What the intervals do give is a short list of
          well-known values with names people recognise. The gaps between them
          are large enough to matter.
        </p>

        <DataTable
          head={['Ratio', 'Interval', 'Six steps up', 'Suits (rule of thumb)']}
          numeric={[2]}
          rows={RATIOS.map(([label, value, name, suits]) => [
            label,
            name,
            `${Math.pow(value, 6).toFixed(2)}x`,
            suits,
          ])}
          caption="Multipliers computed at render, not typed. The third column is the ratio raised to the sixth power: the size of a heading six steps above the base, relative to it. The last column is a rule of thumb from design practice, not a measured result."
        />

        <p>
          The right end of that table should decide the choice, but people often
          decide the wrong way round. They pick a ratio because the heading looks
          good, then find the small end later. A dense table needs six usable
          steps between roughly 11px and 24px. At 1.25 the third step up from 16px
          has already passed 31px. A landing page has the opposite problem. At
          1.125 the largest heading is barely twice the body size, and nothing on
          the page reads as a headline.
        </p>
      </section>

      <section id="compounding">
        <h2>The ratio compounds</h2>
        <p>
          The ratio is applied again and again, so the gap between two ratios
          grows fast. 1.5 is 20% larger than 1.25 as a number. Six steps up, it
          gives a size three times as large.
        </p>

        <DataTable
          head={['Ratio', 'Six steps up', 'From a 16px base']}
          numeric={[1, 2]}
          rows={[1.2, 1.25, 1.333, 1.5, 1.618, 2].map((r) => [
            String(r),
            `${Math.pow(r, 6).toFixed(2)}x`,
            `${stepPx(16, r, 6, 'half')}px`,
          ])}
          caption="Sizes from stepPx() at half-pixel rounding, the Type Scale Generator's default."
        />

        <p>
          This explains a common failure in shipped type systems: one scale used
          at every viewport. A 1.333 ratio gives a 90px heading six steps up. That
          looks confident at 1440px and absurd at 375px, where one word takes up
          nearly a quarter of the screen width. A ratio that reads as editorial on
          a desktop shouts on a phone. No single number fixes both ends. The
          problem is not the number. One ladder is being asked to serve two
          rooms.
        </p>
      </section>

      <section id="two-scales">
        <h2>Two scales, joined by clamp()</h2>
        <p>
          The answer is one scale per breakpoint, each with its own base and its
          own ratio, and a blend between them. Between the two viewport widths the
          size grows in a straight line with the viewport width. The line runs
          through the two anchor points.
        </p>

        <Formula caption="The implementation is fluidClamp() in src/utils/fluidType.js. minVw and maxVw default to 375 and 1440.">{`slope     = (maxSize - minSize) / (maxVw - minVw)
intercept = minSize - slope * minVw
size(vw)  = intercept + slope * vw

css       = clamp(minRem, interceptRem + slopeVw, maxRem)`}</Formula>

        <p>
          CSS writes <code>slope &times; vw</code> as a <code>vw</code> unit.
          1vw is 1% of the viewport width, so the coefficient is the slope times
          100. <code>clamp()</code> pins the ends. That stops a 375px anchor from
          shrinking further on a 320px phone. A heading that runs from 24px at 375
          to 40px at 1440 comes out as{' '}
          <code>clamp(1.5rem, 1.1479rem + 0.0939vw, 2.5rem)</code>. It resolves to
          29.9px at a 768px viewport.
        </p>

        <h3>Why the intercept has to be in rem</h3>
        <Spec
          source="WCAG 2.2 — SC 1.4.4 Resize Text"
          href={`${WCAG}/#resize-text`}
          level="Level AA"
        >
          Except for captions and images of text, text can be resized without
          assistive technology up to 200 percent without loss of content or
          functionality.
        </Spec>
        <p>
          A preferred value made only of <code>vw</code> does not respond to the
          reader&rsquo;s default font size at all. An example is <code>4vw</code>,
          in place of <code>1.1479rem + 0.0939vw</code>. Someone who has raised
          their default to 24px sees the same pixels as everyone else, because
          nothing in the expression is relative to the root size. Keep the
          intercept in <code>rem</code>. Then the whole line shifts when the root
          size does, and the text really resizes. That is the only reason the
          intercept is not folded into the <code>vw</code> term, which would make
          the arithmetic simpler and the output shorter.
        </p>

        <h3>The ladder</h3>
        <TypeLadder />
      </section>

      <section id="line-length">
        <h2>Line length and line height</h2>
        <p>
          A scale sets sizes. Two things the scale says nothing about decide
          whether the text is readable. One is how far the eye travels before it
          has to find the next line. The other is how far down it has to drop to
          find it.
        </p>

        <p>
          The measure is the number of characters on a line. It has a long-standing
          range. Bringhurst writes: &ldquo;anything from 45 to 75 characters
          is widely regarded as a satisfactory length of line for a single-column
          page set in a serifed text face in a text size&rdquo;, and &ldquo;the
          66-character line (counting both letters and spaces) is widely regarded
          as ideal&rdquo;. This is a common readability guideline from print
          typography. It is not a measured effect, and studies of reading on
          screens give mixed results. Treat the range as a starting point, not a
          rule.
        </p>

        <p>
          The trap is the unit. CSS offers <code>ch</code>, and{' '}
          <code>max-width: 66ch</code> looks like it says &ldquo;66
          characters&rdquo;. It does not. <code>ch</code> is the advance width of
          the digit zero in the current font. In most proportional faces zero is
          wider than the average letter. So a cap in <code>ch</code> fits more
          characters than its number says. The extra depends on the typeface. It
          is not a constant.
        </p>

        <Aside>
          The specification also says what happens when the zero glyph cannot be
          measured. That can be a font with no digits, or a fallback that has not
          loaded. Then <code>ch</code> &ldquo;must be assumed to be 0.5em wide by
          1em tall&rdquo;. That default is where the old rule of thumb comes from
          that an average character is half an em.
        </Aside>

        <ReadingMeasure />

        <p>
          Line height moves the opposite way to size. Long lines need more
          leading, so the eye does not slip back to the line it just left. Short
          lines need less. Large type needs proportionally less than small type.
          So one <code>line-height</code> applied to every step of a scale leaves
          the headings loose and the captions tight. A common starting point,
          from design practice, is around 1.5 for body text and 1.1 to 1.25 for
          headings.
        </p>

        <Spec
          source="WCAG 2.2 — SC 1.4.12 Text Spacing"
          href={`${WCAG}/#text-spacing`}
          level="Level AA"
        >
          In content implemented using markup languages that support the following
          text style properties, no loss of content or functionality occurs by
          setting all of the following and by changing no other style property:
          line height (line spacing) to at least 1.5 times the font size;
          spacing following paragraphs to at least 2 times the font size; letter
          spacing (tracking) to at least 0.12 times the font size; word spacing to
          at least 0.16 times the font size.
        </Spec>

        <Aside>
          1.4.12 does not tell you to set those values. It requires that the
          layout survives a reader setting them, usually through a browser
          extension or a user stylesheet. A fixed-height card that clips its text
          at 1.5 line height fails, even if every measurement in the design file
          looks correct.
        </Aside>
      </section>
    </>
  )
}
