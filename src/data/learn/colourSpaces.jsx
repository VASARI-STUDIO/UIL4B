// Article: Colour spaces for interface work. Metadata and sources in
// src/data/learnIndex.js.
//
// The colour figures here are computed by luminance(), contrastRatio() and
// hexToOklch() from src/utils/colors.js, and the interpolation table is painted
// and read back in the reader's own browser (see ColourMixTable.jsx). The
// browser behaviours the prose states — what color-mix() serialises to, what an
// out-of-gamut oklch() paints — were measured on Chromium 149 before being
// written down, because this is the section of colour work where confident
// recollection is most often wrong.

import { Aside, DataTable, Formula, Spec } from '../../components/LearnParts'
import ColourMixTable from '../../components/ColourMixTable'
import { contrastRatio, hexToOklch, luminance } from '../../utils/colors'

const rgbOf = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
const lum = (hex) => luminance(...rgbOf(hex))
const okl = (hex) => hexToOklch(hex)[0]

// The four sRGB primaries and secondaries HSL calls "50% lightness".
const HSL_FIFTY = [
  ['hsl(60 100% 50%)', '#FFFF00'],
  ['hsl(120 100% 50%)', '#00FF00'],
  ['hsl(0 100% 50%)', '#FF0000'],
  ['hsl(240 100% 50%)', '#0000FF'],
]

export default function ColourSpaces() {
  return (
    <>
      <section id="one-screen">
        <h2>One screen, several coordinate systems</h2>
        <p>
          A hex code, an <code>rgb()</code> triple and an <code>hsl()</code>{' '}
          declaration are not three colour spaces. They are three ways of writing
          a position in one space, sRGB. The browser resolves all of them to the
          same thing. You can see it in the computed value. Ask for{' '}
          <code>hsl(60 100% 50%)</code>, read it back, and you get{' '}
          <code>rgb(255, 255, 0)</code>. The hue-saturation-lightness form helps
          people. Nothing downstream keeps it.
        </p>
        <p>
          That matters because this convenience is asked to do too much. sRGB is
          defined by where its three primaries sit and how its transfer curve maps
          a stored number to emitted light. It says nothing about how a colour
          looks to a person. Every coordinate system laid over it inherits that
          gap.
        </p>
        <p>
          The spaces that came later, CIELAB and Oklab in 2020, work the other way
          round. They are built from measurements of what people report seeing.
          That is the whole difference. It is why a lightness in one is not a
          lightness in the other.
        </p>
      </section>

      <section id="hsl-lightness">
        <h2>HSL lightness is not lightness</h2>
        <p>
          HSL&rsquo;s L is arithmetic on the sRGB channels. It is the midpoint
          between the largest and the smallest. So every fully saturated hue lands
          at exactly 50%. That is why the colour wheel looks so tidy in HSL, and
          why the tidiness misleads.
        </p>

        <DataTable
          head={['Declared', 'Swatch', 'Relative luminance', 'On white', 'Oklab L']}
          numeric={[2, 3, 4]}
          rows={HSL_FIFTY.map(([label, hex]) => [
            <code key={label}>{label}</code>,
            <span className="lart-swatch lart-swatch--wide" key={`${hex}-sw`} style={{ background: hex }} aria-hidden="true" />,
            lum(hex).toFixed(4),
            `${contrastRatio(hex, '#FFFFFF').toFixed(2)}:1`,
            `${okl(hex).toFixed(1)}%`,
          ])}
          caption="Every row is declared at 50% HSL lightness. Luminance and contrast are computed with luminance() and contrastRatio() from src/utils/colors.js; the last column with hexToOklch()."
        />

        <p>
          Four colours that HSL calls equally light have relative luminances from
          0.0722 to 0.9278. That is the full useful range of the scale. Their
          contrast against white runs from{' '}
          {contrastRatio('#FFFF00', '#FFFFFF').toFixed(2)}:1 to{' '}
          {contrastRatio('#0000FF', '#FFFFFF').toFixed(2)}:1. That is a factor of
          eight, from a coordinate that reported no difference at all.
        </p>
        <p>
          The damage shows up in tonal ramps. Build a 50&ndash;950 scale by
          stepping HSL lightness in even increments. The steps look even in the
          neutrals and badly uneven in the saturated hues. The same lightness
          change moves a yellow much further than it moves a blue. This is one
          common reason a palette looks right in the generator and wrong on the
          page.
        </p>
      </section>

      <section id="oklch">
        <h2>What OKLCH measures instead</h2>
        <p>
          Björn Ottosson published Oklab in December 2020. It is now in CSS Color
          4. <code>oklch()</code> is its polar form. It has an L for perceptual
          lightness, a C for chroma and an H for hue in degrees. The difference
          from HSL is not the notation. L is fitted to how light a colour is
          reported to look. Two colours at the same L look about equally light.
          Moving L by a fixed amount changes the look by about the same amount,
          wherever you are on the wheel.
        </p>

        <Formula caption="Both forms are the same colour. The conversion is hexToOklch() in src/utils/colors.js, and Chromium paints the oklch() form as exactly #FF0000.">{`#FF0000
  =  rgb(255 0 0)
  =  hsl(0 100% 50%)
  =  oklch(62.8% 0.2577 29.23)

L = 62.8%   perceptual lightness, 0 to 100%
C = 0.2577  chroma; 0 is grey, sRGB tops out near ${hexToOklch('#FF00FF')[1].toFixed(2)} (magenta)
H = 29.23   hue in degrees`}</Formula>

        <p>
          The lightness axis is the useful part. Ten steps of equal L read as ten
          evenly spaced steps, which is what a tonal ramp is for. You can hold the
          hue and chroma while only the tone moves. The ramp then keeps its
          identity and does not wash out through the middle.
        </p>

        <h3>It is still not a contrast check</h3>
        <p>
          Perceptual lightness and WCAG relative luminance are different
          quantities, measured for different reasons. They do not agree. Take five
          hues at an identical <code>oklch(0.7 0.1 &hellip;)</code>, with the same
          L and chroma, all inside sRGB. Their contrast against white ranges from
          2.57:1 to 2.79:1.
        </p>
        <p>
          That spread is far tighter than HSL&rsquo;s factor of eight, but it is
          not zero. An OKLCH ramp is a good way to build a scale. It does not
          replace measuring the pair you actually ship.
        </p>
      </section>

      <section id="gamut">
        <h2>Gamut: colours you can name but not show</h2>
        <p>
          OKLCH can name colours that no sRGB screen can produce, because its
          coordinates describe appearance and not the power of three primaries.{' '}
          <code>oklch(0.7 0.4 150)</code> is a legal, meaningful colour. It is
          outside the sRGB gamut, so the browser has to map it to something it can
          display.
        </p>
        <p>
          The mapping is not a clamp of one number. Chromium 149 is asked for{' '}
          <code>oklch(0.7 0.4 150)</code> on an sRGB surface. It paints{' '}
          <code>#00D600</code>, which reads back as{' '}
          <code>oklch({hexToOklch('#00D600')[0].toFixed(1)}% {hexToOklch('#00D600')[1].toFixed(2)} {hexToOklch('#00D600')[2].toFixed(1)})</code>.
          Every coordinate moved. The lightness rose by six points. The chroma
          fell from 0.4 to {hexToOklch('#00D600')[1].toFixed(3)}. The hue turned{' '}
          {(150 - hexToOklch('#00D600')[2]).toFixed(1)} degrees, from 150 back to{' '}
          {hexToOklch('#00D600')[2].toFixed(1)}.
        </p>

        <Aside>
          <code>getComputedStyle</code> will not tell you this happened. The
          computed value of <code>oklch(0.7 0.4 150)</code> is{' '}
          <code>oklch(0.7 0.4 150)</code>, exactly as written. Gamut mapping
          happens at paint. The only way to see the colour that was actually shown
          is to read a pixel.
        </Aside>

        <p>
          The result for a design system is narrow but sharp. The browser may
          change the lightness of a value chosen near the edge of the gamut. A
          contrast ratio worked out from the declared coordinates is then a ratio
          for a colour nobody saw.
        </p>
        <p>
          There is no single chroma ceiling to stay under, because the boundary is
          a shape and not a number. Of the six pure primaries and secondaries,
          magenta is the most chromatic, at{' '}
          <code>oklch({hexToOklch('#FF00FF')[0].toFixed(1)}% {hexToOklch('#FF00FF')[1].toFixed(3)} {hexToOklch('#FF00FF')[2].toFixed(1)})</code>.
          Pure blue reaches {hexToOklch('#0000FF')[1].toFixed(3)} at{' '}
          {hexToOklch('#0000FF')[0].toFixed(1)}% lightness and pure green{' '}
          {hexToOklch('#00FF00')[1].toFixed(3)} at{' '}
          {hexToOklch('#00FF00')[0].toFixed(1)}%. Each hue peaks at its own
          lightness, so the ceiling differs everywhere else. As a rule of thumb,
          a colour below about 0.15 chroma sits inside the gamut at any hue. This
          is a guide, not a computed limit. Above that, the only reliable check is
          to paint the colour and read it back.
        </p>
      </section>

      <section id="interpolation">
        <h2>What CSS does between two colours</h2>
        <p>
          Every gradient, transition, animation and <code>color-mix()</code> has to
          make colours between two endpoints. The result depends on the space it
          walks through. People often assume this part and rarely check it. If you
          leave the space out, you do not get sRGB. In Chromium 149{' '}
          <code>color-mix(red, blue)</code> with no space named computes to
          exactly the same value as <code>color-mix(in oklab, red, blue)</code>.
        </p>

        <Spec
          source="CSS Color Module Level 5 — color-mix()"
          href="https://www.w3.org/TR/css-color-5/#color-mix"
        >
          the <b>color-mix()</b> function takes a list of one or more color
          specifications and returns the result of mixing them, in a given
          color-space, in the specified amounts.
        </Spec>

        <ColourMixTable />

        <p>
          Half red and half blue is a purple in sRGB. It is a lighter, greyer
          purple in Oklab, a vivid magenta-purple in OKLCH, and pure magenta in
          HSL. The last two have simple causes. OKLCH and HSL are polar, so chroma
          or saturation is carried along an arc and not averaged down through the
          middle. The mix stays saturated. HSL also takes the shorter hue arc from
          0&deg; to 240&deg;. That arc runs backwards through 300&deg; and lands on
          magenta, and it does not pass through the greens.
        </p>

        <h3>The computed value changes shape too</h3>
        <p>
          A mix does not resolve to <code>rgb()</code>. In Chromium 149,{' '}
          <code>color-mix(in srgb, red, blue)</code> computes to{' '}
          <code>color(srgb 0.5 0 0.5)</code>, <code>in hsl</code> computes to{' '}
          <code>color(srgb 1 0 1)</code>, and <code>in oklab</code> stays in the
          interpolation space as <code>oklab(0.539974 0.0962086 -0.0928316)</code>.
          Anything that reads a colour back and expects to parse{' '}
          <code>rgb(&hellip;)</code> sees a string it does not recognise. That
          could be a test assertion, a build step that collects colour values, or
          a contrast checker fed a computed value. The failure is usually
          silent.
        </p>

        <Aside>
          Gradients have the same choice and a different default. A CSS gradient
          mixes in the space named after <code>in</code>, as in{' '}
          <code>linear-gradient(in oklab, red, blue)</code>. Both the default and
          the handling of transparency have changed between specification
          revisions and engine versions. If a gradient stop matters, name the
          space. Read a pixel instead of assuming which one you got.
        </Aside>
      </section>
    </>
  )
}
