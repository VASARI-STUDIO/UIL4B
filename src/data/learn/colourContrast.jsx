// Article: Colour contrast and the WCAG thresholds. Metadata in src/data/learnIndex.js, sources in src/data/learn/sources.js.
//
// Every threshold in this file is quoted from the standard with a link to the
// clause. Every ratio is either arithmetic the reader can repeat, or computed
// at render time by contrastRatio() from src/utils/colors.js — the same
// function the Contrast Checker at /create/contrast runs on. Nothing here is a
// number typed into prose from memory, which is the whole reason the live table
// exists rather than a static one.

import { Aside, DataTable, Formula, Spec } from '../../components/LearnParts'
import TokenContrastTable from '../../components/TokenContrastTable'
import { ChannelBars, FailureSpecimens, FieldPair, SizeRuler, Working } from '../../components/ContrastFigures'
import { blendWhite, lumText, ratioText } from '../../utils/contrastFormat'

const WCAG = 'https://www.w3.org/TR/WCAG22'

// Every ratio and lightness figure quoted in the prose below, measured with the
// product's own contrastRatio() and luminance().
const EDGE_PALE = '#E5E5E5'
const EDGE_DARK = '#949494'
const HUE_A = '#C25E00'
const HUE_B = '#4D8000'
const RED = '#DC2626'
const WHITE = '#FFFFFF'
const BLEND = blendWhite(RED, 0.9)

export default function ColourContrast() {
  return (
    <>
      <section id="thresholds" className="lcc-sec lcc-s1">
        <h2>Body text needs 4.5:1. Large text needs 3:1.</h2>

        <DataTable
          head={['Success criterion', 'Normal text', 'Large text', 'Level']}
          numeric={[1, 2]}
          stack
          rows={[
            ['1.4.3 Contrast (Minimum)', '4.5:1', '3:1', 'AA'],
            ['1.4.6 Contrast (Enhanced)', '7:1', '4.5:1', 'AAA'],
            ['1.4.11 Non-text Contrast', <span className="lart-dim" key="na">n/a</span>, '3:1', 'AA'],
          ]}
          caption="WCAG 2.2, Guideline 1.4 Distinguishable. 1.4.11 covers non-text content, so it has no text-size split: its 3:1 applies to component boundaries, states and meaningful graphics."
        />

        <div className="lcc-s1-text lcc-fig-gap">
          <p>
            WCAG measures contrast as a ratio between how light two colours are.
            Which number applies depends on the size and weight of the text, not on
            what the text is for.
          </p>

          <p>
            The three exceptions are narrower than people often read them. A disabled
            button is exempt because it is an <i>inactive</i> component. A
            low-contrast label on an enabled control is not. Placeholder text
            isn&rsquo;t exempt either: it is text on screen, so 4.5:1 applies.
          </p>
        </div>

        <Working>
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
            The number 4.5 is not a convention. The Understanding document for 1.4.3
            ties it to &ldquo;the loss in contrast that results from moderately low
            visual acuity, congenital or acquired color deficiencies, or the loss of
            contrast sensitivity that typically accompanies aging&rdquo;. It says the
            target makes up for roughly 20/40 vision. That is an acuity commonly
            reported as typical at around age 80.
          </p>
        </Working>
      </section>

      <section id="large-text" className="lcc-sec lcc-s2">
        <div className="lcc-txt">
          <h2>Large means 24px, or 18.5px in bold.</h2>

          <p>
            WCAG is written in points, and the web uses CSS pixels. 18pt is about 24px
            and 14pt is about 18.5px, so the 3:1 allowance starts at 24px, or at
            18.5px when the text is bold. Everything else needs 4.5:1.
          </p>

          <p>
            What counts is the size on the screen. A heading set with{' '}
            <code>clamp(20px, 4vw, 32px)</code> is large on a desktop, and drops under
            24px in a window narrower than 600px. WCAG never says which weight is
            bold, so treat anything under 24px as normal text unless it is 700 or
            heavier.
          </p>
        </div>

        <SizeRuler />

        <Working>
          <Spec
            source="WCAG 2.2 — large scale (text)"
            href={`${WCAG}/#dfn-large-scale`}
          >
            with at least 18 point or 14 point bold or font size that would yield
            equivalent size for Chinese, Japanese and Korean (CJK) fonts
          </Spec>

          <p>
            The Understanding document gives the conversion: &ldquo;The ratio
            between sizes in points and CSS pixels is 1pt = 1.333px, therefore 14pt
            and 18pt are equivalent to approximately 18.5px and 24px.&rdquo;
          </p>
        </Working>
      </section>

      <section id="formula" className="lcc-sec lcc-s3">
        <div className="lcc-txt">
          <h2>The ratio compares lightness, and green does most of the work.</h2>

          <p>
            Each colour becomes one lightness number between 0 and 1, called relative
            luminance. Red, green and blue are weighted 0.2126, 0.7152 and 0.0722, so
            green counts about ten times as much as blue.
          </p>

          <p>
            The ratio is the lighter value plus 0.05, divided by the darker value plus
            0.05. Black on white comes to exactly 21:1, identical colours to 1:1, and
            nothing on an sRGB screen goes higher. That is why 4.5 and 7 work as fixed
            numbers.
          </p>
        </div>

        <ChannelBars />

        <Working>
          <p>
            There are two steps. First, each 8-bit channel is divided by 255 and
            linearised, which undoes the sRGB transfer curve. Then the three linear
            channels are weighted and added into one relative luminance between 0
            and 1.
          </p>

          <Formula caption="WCAG 2.2, definitions of relative luminance and contrast ratio. R, G and B are the sRGB channels divided by 255.">{`lin(c) = c <= 0.04045  ?  c / 12.92
                      :  ((c + 0.055) / 1.055) ^ 2.4

L      = 0.2126 * lin(R) + 0.7152 * lin(G) + 0.0722 * lin(B)

ratio  = (L_lighter + 0.05) / (L_darker + 0.05)`}</Formula>

          <p>
            The three weights are the Rec. 709 luminance coefficients. They are why
            contrast ratios behave so unevenly across the hue wheel. Because{' '}
            <code>lin(1) = 1</code>, each primary at full strength has a relative
            luminance equal to its own coefficient. Pure blue sits at 0.0722, pure
            red at 0.2126 and pure green at 0.7152. Green carries roughly ten times
            the luminance of blue. So moving the blue channel changes a ratio far
            less than moving the green one. A saturated yellow, which is red plus
            green, is already close to the luminance of white.
          </p>

          <Aside>
            The linearisation threshold above reads 0.04045. WCAG&rsquo;s own
            definition said 0.03928 until May 2021, when it was corrected to match
            IEC 61966-2-1 (<a href="https://github.com/w3c/wcag/issues/308" target="_blank" rel="noreferrer noopener">w3c/wcag#308</a>).
            The correction cannot change an 8-bit result. 0.03928 &times; 255 is
            10.016 and 0.04045 &times; 255 is 10.315. No whole byte sits between
            them, so every channel value takes the same branch under both.
          </Aside>

          <h3>Measured on this page</h3>
          <p>
            The pairs below are read from the running stylesheet. They are measured
            with <code>contrastRatio()</code> from <code>src/utils/colors.js</code>,
            the same function the Contrast Checker uses. They change with the theme,
            because they are the colours this page is painted in.
          </p>
          <TokenContrastTable />
        </Working>
      </section>

      <section id="non-text" className="lcc-sec lcc-s4">
        <div className="lcc-txt">
          <h2>A field&rsquo;s edge needs 3:1 too.</h2>

          <p>
            When a 1px border is the only thing that shows where a field is, the
            border needs 3:1. <code>{EDGE_PALE}</code> on white measures {ratioText(EDGE_PALE, WHITE)} and fails.
            The lightest grey that passes on white is <code>{EDGE_DARK}</code>, at {ratioText(EDGE_DARK, WHITE)}.
          </p>

          <p>
            The same goes for a checkbox tick, a switch&rsquo;s thumb, a focus ring,
            and chart bars you can&rsquo;t read any other way. A filled button
            doesn&rsquo;t need 3:1 against the page if its label and shape already
            make it clear. That is this page&rsquo;s reading of the rule.
          </p>
        </div>

        <FieldPair />

        <Working>
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
            The criterion does not ask for 3:1 between a filled button and the page
            behind it, as long as the label and shape make the button clear. That is
            this page&rsquo;s reading of the criterion. It does not apply to a
            decorative divider or a background texture either. Disabled controls are
            excluded by name, as inactive components.
          </p>
        </Working>
      </section>

      <section id="blind-spots" className="lcc-sec lcc-s5">
        <div className="lcc-txt">
          <h2>A pass can still be hard to read.</h2>
          <p>
            The formula turns three channels into one number. Four common failures
            get past it.
          </p>
        </div>

        <FailureSpecimens />

        <Working>
          <p>
            <b>Hue, in full.</b> Luminance is hue-blind. <code>{HUE_A}</code> and{' '}
            <code>{HUE_B}</code> are a mid orange and a mid green. Their relative
            luminances are {lumText(HUE_A)} and {lumText(HUE_B)}, so the pair measures {ratioText(HUE_A, HUE_B)}. The
            colours look very different, but they are almost the same brightness.
            The reverse case matters more. A red and a green with <i>different</i>{' '}
            luminance can pass 1.4.3 and still look the same to a viewer with
            deuteranopia. The criterion models no colour vision deficiency at all.
            That is why SC 1.4.1 Use of Color exists as a separate rule, at Level A:
            colour must not be the only visual way to convey information.
          </p>

          <p>
            <b>Stroke weight, in full.</b> WCAG 2 splits size into two coarse bands.
            Its numbers ignore stroke width, but a note on large text warns that
            fonts with extraordinarily thin strokes are harder to read. The WCAG 3
            Working Draft of 10 September 2026 has not chosen a contrast method;
            APCA, a proposal that does weigh stroke width, is not in it.
          </p>

          <p>
            <b>Alpha, in full.</b> A contrast ratio is defined for two opaque
            colours. A translucent foreground has to be blended with its background
            before you can measure it. The cost is larger than it looks. Opaque
            white on <code>{RED}</code> measures {ratioText(WHITE, RED)}. The same white at 90%
            opacity blends to <code>{BLEND}</code> and measures {ratioText(BLEND, RED)}. Ninety per
            cent of the way to white gives up 0.7 of the ratio and takes the label
            below AA. A tool fed the two source colours will not show this failure.
            It needs the painted result.
          </p>

          <p>
            <b>The background you assumed, in full.</b> Text over a gradient, a
            photograph or a semi-transparent panel has a different ratio at every
            pixel it covers. The worst pixel decides the result. A measurement
            against the average is a measurement of a colour that appears nowhere on
            the screen.
          </p>
        </Working>
      </section>
    </>
  )
}
