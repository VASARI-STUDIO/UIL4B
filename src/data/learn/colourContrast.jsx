// Article: Colour contrast and the WCAG thresholds. Metadata in src/data/learnIndex.js.
//
// Every threshold in this file is quoted from the standard with a link to the
// clause. Every ratio is either arithmetic the reader can repeat, or computed
// at render time by contrastRatio() from src/utils/colors.js — the same
// function the Contrast Checker at /create/contrast runs on. Nothing here is a
// number typed into prose from memory, which is the whole reason the live table
// exists rather than a static one.

import { Aside, DataTable, Formula, Spec } from '../../components/LearnParts'
import TokenContrastTable from '../../components/TokenContrastTable'

const WCAG = 'https://www.w3.org/TR/WCAG22'

export default function ColourContrast() {
  return (
    <>
      <section id="thresholds">
        <h2>The thresholds</h2>
        <p>
          WCAG specifies contrast as a ratio between the relative luminance of two
          colours, and sets four numbers: two at Level AA and two at Level AAA.
          Which of the pair applies depends on the size and weight of the text,
          not on what the text is for.
        </p>

        <DataTable
          head={['Success criterion', 'Normal text', 'Large text', 'Level']}
          numeric={[1, 2]}
          rows={[
            ['1.4.3 Contrast (Minimum)', '4.5:1', '3:1', 'AA'],
            ['1.4.6 Contrast (Enhanced)', '7:1', '4.5:1', 'AAA'],
            ['1.4.11 Non-text Contrast', <span className="lart-dim" key="na">n/a</span>, '3:1', 'AA'],
          ]}
          caption="WCAG 2.2, Guideline 1.4 Distinguishable. 1.4.11 covers non-text content, so it has no text-size split — its 3:1 applies to component boundaries, states and meaningful graphics."
        />

        <Spec
          source="WCAG 2.2 — SC 1.4.3 Contrast (Minimum)"
          href={`${WCAG}/#contrast-minimum`}
          level="Level AA"
        >
          The visual presentation of text and images of text has a contrast ratio of
          at least 4.5:1, except for the following: <b>Large Text</b> — large-scale
          text and images of large-scale text have a contrast ratio of at least 3:1;{' '}
          <b>Incidental</b> — text or images of text that are part of an inactive
          user interface component, that are pure decoration, that are not visible
          to anyone, or that are part of a picture that contains significant other
          visual content, have no contrast requirement; <b>Logotypes</b> — text that
          is part of a logo or brand name has no contrast requirement.
        </Spec>

        <p>
          The three exceptions are narrower than they are usually read. A disabled
          button is exempt because it is an <i>inactive</i> component; a low-contrast
          label on an enabled control is not. Placeholder text has no exception at
          all — it is text presented visually, so 4.5:1 applies to it exactly as it
          does to the value the user eventually types.
        </p>

        <p>
          The choice of 4.5 rather than 4 or 5 is documented rather than
          conventional. The Understanding document for 1.4.3 attributes it to
          &ldquo;the loss in contrast that results from moderately low visual acuity,
          congenital or acquired color deficiencies, or the loss of contrast
          sensitivity that typically accompanies aging&rdquo;, and describes the
          target as compensating for roughly 20/40 vision — an acuity commonly
          reported as typical at around age 80.
        </p>
      </section>

      <section id="large-text">
        <h2>What counts as large text</h2>

        <Spec
          source="WCAG 2.2 — large scale (text)"
          href={`${WCAG}/#dfn-large-scale`}
        >
          with at least 18 point or 14 point bold or font size that would yield
          equivalent size for Chinese, Japanese and Korean (CJK) fonts
        </Spec>

        <p>
          The standard is written in points and the web is laid out in CSS pixels.
          The Understanding document gives the conversion directly: &ldquo;The ratio
          between sizes in points and CSS pixels is 1pt = 1.333px, therefore 14pt
          and 18pt are equivalent to approximately 18.5px and 24px.&rdquo; So the
          3:1 allowance applies at 24px and above, or at 18.5px and above when the
          text is bold. Everything else needs 4.5:1.
        </p>

        <p>
          Two consequences follow that a static check on a design file will miss.
          The first is that the size which matters is the <i>rendered</i> size: a
          heading set with <code>clamp(20px, 4vw, 32px)</code> qualifies as large
          text on a desktop and stops qualifying somewhere around a 600px viewport,
          where it drops under 24px. The second is that the standard says
          &ldquo;bold&rdquo; and never names a numeric <code>font-weight</code>, so a
          600-weight subheading at 20px sits in an unresolved gap. Treating anything
          below 24px as normal text unless it is 700 or heavier keeps the
          judgement out of the grey area.
        </p>
      </section>

      <section id="formula">
        <h2>How the ratio is calculated</h2>
        <p>
          Two steps. Each 8-bit channel is divided by 255 and linearised to undo
          the sRGB transfer curve; the three linear channels are then weighted and
          summed into a single relative luminance between 0 and 1.
        </p>

        <Formula caption="WCAG 2.2, definitions of relative luminance and contrast ratio. R, G and B are the sRGB channels divided by 255.">{`lin(c) = c <= 0.04045  ?  c / 12.92
                      :  ((c + 0.055) / 1.055) ^ 2.4

L      = 0.2126 * lin(R) + 0.7152 * lin(G) + 0.0722 * lin(B)

ratio  = (L_lighter + 0.05) / (L_darker + 0.05)`}</Formula>

        <p>
          The three weights are the Rec. 709 luminance coefficients, and they are
          why a contrast ratio behaves so unevenly across the hue wheel. Because{' '}
          <code>lin(1) = 1</code>, the relative luminance of each primary at full
          strength <i>is</i> its own coefficient: pure blue sits at 0.0722, pure red
          at 0.2126 and pure green at 0.7152. Green carries roughly ten times the
          luminance of blue, so moving the blue channel changes a ratio far less
          than moving the green one, and a saturated yellow — red plus green — is
          already close to the luminance of white before any lightening.
        </p>

        <p>
          The <code>+ 0.05</code> in the ratio bounds the scale. With it, black on
          white computes as <code>(1 + 0.05) / (0 + 0.05)</code>, or exactly 21:1,
          and identical colours compute as 1:1. Nothing on an sRGB display can
          exceed 21:1, which is what makes 4.5 and 7 meaningful as fixed numbers
          rather than percentages of some larger range.
        </p>

        <Aside>
          The linearisation threshold above reads 0.04045. WCAG&rsquo;s own
          definition said 0.03928 until 2021, when it was corrected to match
          IEC 61966-2-1 (<a href="https://github.com/w3c/wcag/issues/308" target="_blank" rel="noreferrer noopener">w3c/wcag#308</a>).
          The correction cannot change an 8-bit result: 0.03928 &times; 255 is
          10.016 and 0.04045 &times; 255 is 10.315, and there is no whole byte
          between them, so every channel value takes the same branch under both.
        </Aside>

        <h3>Measured on this page</h3>
        <p>
          The pairs below are read out of the running stylesheet and measured with{' '}
          <code>contrastRatio()</code> from <code>src/utils/colors.js</code> — the
          same function the Contrast Checker uses. They change when the theme
          changes, because they are the colours this page is actually painted in.
        </p>
        <TokenContrastTable />
      </section>

      <section id="non-text">
        <h2>Contrast for things that are not text</h2>

        <Spec
          source="WCAG 2.2 — SC 1.4.11 Non-text Contrast"
          href={`${WCAG}/#non-text-contrast`}
          level="Level AA"
        >
          The visual presentation of the following have a contrast ratio of at least
          3:1 against adjacent color(s): <b>User Interface Components</b> — visual
          information required to identify user interface components and states,
          except for inactive components or where the appearance of the component is
          determined by the user agent and not modified by the author;{' '}
          <b>Graphical Objects</b> — parts of graphics required to understand the
          content, except when a particular presentation of graphics is essential to
          the information being conveyed.
        </Spec>

        <p>
          The operative phrase is <i>required to identify</i>. A text input whose
          only boundary is a 1px border makes that border required: at{' '}
          <code>#E5E5E5</code> on white it measures 1.26:1 and fails, and the
          lightest neutral that passes on white is around <code>#949494</code>, at
          3.03:1. The same test applies to a checkbox&rsquo;s tick, the thumb of a
          switch, a focus indicator, and the bars of a chart whose values cannot be
          read any other way.
        </p>

        <p>
          What the criterion does not require is 3:1 between a filled
          button and the page behind it, provided the button is identifiable from
          its label and shape. Nor does it apply to a decorative divider, a
          background texture, or a disabled control — inactive components are
          excluded by name.
        </p>
      </section>

      <section id="blind-spots">
        <h2>What a contrast ratio cannot see</h2>
        <p>
          The formula reduces three channels to one number, and four common failures
          survive it intact.
        </p>

        <h3>Hue</h3>
        <p>
          Luminance is hue-blind. <code>#C25E00</code> and <code>#4D8000</code> — a
          mid orange and a mid green — have relative luminances of 0.1947 and 0.1702,
          so the pair measures 1.11:1: two obviously different colours that are very
          nearly the same brightness. The reverse case is the one that matters more.
          A red and a green with <i>different</i> luminance will pass 1.4.3 and still
          be indistinguishable to a viewer with deuteranopia, because the criterion
          models no colour vision deficiency at all. That gap is why SC 1.4.1 Use of
          Color exists separately, at Level A: colour must not be the only visual
          means of conveying information.
        </p>

        <h3>Stroke weight</h3>
        <p>
          4.5:1 is the same requirement for a 300-weight and a 700-weight word at
          the same size, though the thin one puts far less ink on the screen and
          reads as markedly fainter. WCAG 2 models size in two coarse bands and does
          not model stroke width at all. The successor contrast method under
          development for WCAG 3 (APCA) takes weight as an input; until something
          from that work is normative, a light-weight face is a reason to set a
          higher internal target than 4.5, not a reason the number changes.
        </p>

        <h3>Alpha</h3>
        <p>
          A contrast ratio is defined on two opaque colours, so a translucent
          foreground has to be composited before it can be measured. The cost is
          larger than it looks. Opaque white on <code>#DC2626</code> measures 4.83:1;
          the same white at 90% opacity composites to <code>#FCE9E9</code> and
          measures 4.13:1. Ninety per cent of the way to white gives up 0.7 of the
          ratio and takes the label below AA — a failure invisible in any tool fed
          the two source colours rather than the painted result.
        </p>

        <h3>The background you assumed</h3>
        <p>
          Text over a gradient, a photograph or a semi-transparent panel has a
          different ratio at every pixel it covers, and the worst pixel is the one
          that governs. A single measurement against the average is a measurement of
          a colour that appears nowhere on the screen.
        </p>
      </section>
    </>
  )
}

