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
          a position in one space — sRGB — and the browser resolves all of them
          to the same thing. The proof is in the computed value: ask for{' '}
          <code>hsl(60 100% 50%)</code> and read it back and you get{' '}
          <code>rgb(255, 255, 0)</code>. The hue-saturation-lightness form is a
          convenience for humans; nothing downstream keeps it.
        </p>
        <p>
          That matters because the convenience is doing more work than it can
          bear. sRGB is defined by where its three primaries sit and how its
          transfer curve maps a stored number to emitted light. It says nothing
          about how a colour looks to a person, and every coordinate system laid
          over it inherits that silence.
        </p>
        <p>
          The spaces that came later — CIELAB, and Oklab in 2020 — are built the
          other way round, from measurements of what people report seeing. That
          is the whole difference, and it is why a lightness in one is not a
          lightness in the other.
        </p>
      </section>

      <section id="hsl-lightness">
        <h2>HSL lightness is not lightness</h2>
        <p>
          HSL&rsquo;s L is arithmetic on the sRGB channels: the midpoint between
          the largest and the smallest. Every fully saturated hue therefore lands
          at exactly 50%, which is why the colour wheel looks so tidy in HSL and
          why the tidiness is misleading.
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
          0.0722 to 0.9278 — the full useful range of the scale — and contrast
          against white spanning {contrastRatio('#FFFF00', '#FFFFFF').toFixed(2)}:1
          to {contrastRatio('#0000FF', '#FFFFFF').toFixed(2)}:1. A factor of eight,
          from a coordinate that reported no difference at all.
        </p>
        <p>
          The practical damage is done in tonal ramps. A 50&ndash;950 scale built
          by stepping HSL lightness in even increments produces steps that are
          visually even in the neutrals and badly uneven in the saturated hues,
          because the same lightness delta moves a yellow much further than it
          moves a blue. It is the standard reason a palette looks correct in the
          generator and wrong on the page.
        </p>
      </section>

      <section id="oklch">
        <h2>What OKLCH measures instead</h2>
        <p>
          Oklab was published by Björn Ottosson in December 2020 and is now in
          CSS Color 4. <code>oklch()</code> is its polar form: an L for perceptual
          lightness, a C for chroma, and an H for hue in degrees. The difference
          from HSL is not notation. L is fitted to how light a colour is reported
          to look, so two colours at the same L do look about equally light, and
          moving L by a fixed amount moves the appearance by about the same
          amount wherever on the wheel you are.
        </p>

        <Formula caption="Both forms are the same colour. The conversion is hexToOklch() in src/utils/colors.js, and Chromium paints the oklch() form as exactly #FF0000.">{`#FF0000
  =  rgb(255 0 0)
  =  hsl(0 100% 50%)
  =  oklch(62.8% 0.2577 29.23)

L = 62.8%   perceptual lightness, 0 to 100%
C = 0.2577  chroma; 0 is grey, sRGB tops out at 0.342
H = 29.23   hue in degrees`}</Formula>

        <p>
          The lightness axis is the useful part. Ten steps of equal L give ten
          steps that read as evenly spaced, which is what a tonal ramp is for, and
          the hue and chroma can be held while only the tone moves — so a ramp
          keeps its identity rather than washing out through the middle.
        </p>

        <h3>It is still not a contrast check</h3>
        <p>
          Perceptual lightness and WCAG relative luminance are different
          quantities measured for different reasons, and they do not agree. Five
          hues at an identical <code>oklch(0.7 0.1 &hellip;)</code> — same L, same
          chroma, all inside sRGB — paint colours whose contrast against white
          ranges from 2.57:1 to 2.79:1.
        </p>
        <p>
          That is a far tighter spread than HSL&rsquo;s factor of eight, and it is
          not zero. An OKLCH ramp is a good way to build a scale and not a
          substitute for measuring the pair you actually shipped.
        </p>
      </section>

      <section id="gamut">
        <h2>Gamut: colours you can name but not show</h2>
        <p>
          OKLCH can address colours no sRGB screen can produce, because its
          coordinates describe appearance rather than three primaries&rsquo; power
          levels. <code>oklch(0.7 0.4 150)</code> is a legal, meaningful colour
          and outside the sRGB gamut, so the browser has to map it to something
          it can display.
        </p>
        <p>
          The mapping is not a clamp of one number. Asked for{' '}
          <code>oklch(0.7 0.4 150)</code> and given an sRGB surface, Chromium 149
          paints <code>#00D600</code>, which reads back as{' '}
          <code>oklch({hexToOklch('#00D600')[0].toFixed(1)}% {hexToOklch('#00D600')[1].toFixed(2)} {hexToOklch('#00D600')[2].toFixed(1)})</code>.
          Every coordinate moved: the lightness rose by six points, the chroma
          fell by a quarter, and the hue rotated eleven degrees.
        </p>

        <Aside>
          <code>getComputedStyle</code> will not tell you this happened. The
          computed value of <code>oklch(0.7 0.4 150)</code> is{' '}
          <code>oklch(0.7 0.4 150)</code> — the specification, unchanged. Gamut
          mapping happens at paint, so the only way to see the colour that was
          actually shown is to read a pixel.
        </Aside>

        <p>
          The consequence for a design system is narrow but sharp: a value chosen
          near the edge of the gamut is a value whose lightness the browser is
          entitled to change, and a contrast ratio calculated from the declared
          coordinates is a ratio for a colour nobody saw.
        </p>
        <p>
          There is no single chroma ceiling to stay under, because the boundary is
          a shape rather than a number. The most chromatic colour sRGB can produce
          at all is pure green, at{' '}
          <code>oklch({hexToOklch('#00FF00')[0].toFixed(1)}% {hexToOklch('#00FF00')[1].toFixed(3)} {hexToOklch('#00FF00')[2].toFixed(1)})</code>,
          and every other hue and lightness allows less — pure blue reaches{' '}
          {hexToOklch('#0000FF')[1].toFixed(3)} and only at{' '}
          {hexToOklch('#0000FF')[0].toFixed(1)}% lightness. Below about 0.15 chroma
          a colour is comfortably inside the gamut at any hue, and above that the
          only reliable check is to paint it and read it back.
        </p>
      </section>

      <section id="interpolation">
        <h2>What CSS does between two colours</h2>
        <p>
          Every gradient, transition, animation and <code>color-mix()</code> has to
          produce colours between two endpoints, and the answer depends entirely
          on the space it walks through. This is the part most often assumed
          rather than checked. It is also the part where omitting the choice does
          not mean sRGB: in Chromium 149 <code>color-mix(red, blue)</code> with no
          space named computes to exactly the same value as{' '}
          <code>color-mix(in oklab, red, blue)</code>.
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
          Half red and half blue is a purple in sRGB, a lighter and greyer purple
          in Oklab, a vivid magenta-purple in OKLCH, and pure magenta in HSL. The
          last two have straightforward explanations. OKLCH and HSL are polar, so
          chroma or saturation is carried along an arc rather than averaged down
          through the middle — the mix stays saturated. And HSL takes the shorter
          hue arc from 0&deg; to 240&deg;, which runs backwards through 300&deg;,
          landing on magenta rather than passing through the greens.
        </p>

        <h3>The computed value changes shape too</h3>
        <p>
          A mix does not resolve to <code>rgb()</code>. In Chromium 149,{' '}
          <code>color-mix(in srgb, red, blue)</code> computes to{' '}
          <code>color(srgb 0.5 0 0.5)</code>, <code>in hsl</code> computes to{' '}
          <code>color(srgb 1 0 1)</code>, and <code>in oklab</code> stays in the
          interpolation space as <code>oklab(0.539974 0.0962086 -0.0928316)</code>.
          Anything that reads a colour back and expects to parse{' '}
          <code>rgb(&hellip;)</code> — a test assertion, a build step that
          harvests colour values, a
          contrast checker fed a computed value — sees a string it does not
          recognise, and the failure is usually silent.
        </p>

        <Aside>
          Gradients have the same choice and a different default. A CSS gradient
          interpolates in the space named after <code>in</code> —{' '}
          <code>linear-gradient(in oklab, red, blue)</code> — and both the default
          and the treatment of transparency have moved between specification
          revisions and engine versions. If a gradient stop matters, name the
          space, and read a pixel rather than assuming which one you got.
        </Aside>
      </section>
    </>
  )
}
