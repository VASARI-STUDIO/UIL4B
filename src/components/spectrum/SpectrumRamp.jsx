import { useEffect, useRef } from 'react'
import { prefersReducedMotion } from './reducedMotion'

// THE SPECTRUM BAND — the page's one recurring motif, and the thing it is named
// after.
//
// Twenty-one bars of unequal height across the full bleed of the page, three
// times: under the hero (mirrored above itself, fading into the ground), and as
// a rule between the sales argument and the footer. The design source repeats
// the same twenty-one `hsl()` triples inline at every one of those sites; here
// they are ONE table and the component is used three times, so the hero band and
// the closing band cannot drift into two different spectra.
//
// ── WHY THE HUE ROTATES ON SCROLL ───────────────────────────────────────────
// Spectrum's own `tick()` adds `scrollY * 0.24` to every bar's hue at once. The
// important word is "every": the offset is the SAME for all twenty-one, so the
// band stays a ramp while it cycles rather than becoming noise. It is the only
// scroll-linked colour on the page and it is what makes the ground feel like a
// colour tool rather than a marketing page with a rainbow on it.
//
// It is done in CSS, from ONE custom property, rather than by writing twenty-one
// `style.background` strings per frame the way the source does. `--sp-spin` is
// set on the container; each bar resolves
// `hsl(calc(var(--sp-h) + var(--sp-spin)) …)` off it. That is one property write
// per frame instead of twenty-one style recalculations, and the bars' own hues
// stay declarative in the markup where they can be read.
//
// ── AND WHY IT STOPS ────────────────────────────────────────────────────────
// Under reduced motion the listener is never attached, so `--sp-spin` keeps its
// `0deg` fallback and the band renders at its authored hues. That is the same
// answer the design gives (`if (!motion) return` before the hue loop) and it is
// what the repo's a11y sweeps require: the band still exists, it simply does not
// move. Nothing here is load-bearing for reading the page.

// [hue, saturation %, lightness %, height % of the band]. Lifted verbatim from
// RAMP_BASE in the design source. The last three are the neutral tail — the warm
// greys a real palette ends on — which is why they are short and desaturated.
const BARS = [
  [8, 58, 56, 64], [22, 60, 57, 78], [36, 62, 58, 52], [48, 58, 56, 88], [62, 44, 52, 66],
  [84, 34, 48, 96], [104, 30, 45, 58], [134, 28, 44, 82], [160, 30, 44, 70], [182, 32, 45, 100],
  [200, 38, 50, 62], [216, 40, 55, 86], [238, 32, 56, 54], [262, 28, 54, 92], [288, 26, 52, 68],
  [312, 32, 54, 80], [332, 40, 56, 56], [350, 48, 56, 74], [28, 12, 42, 44], [28, 8, 30, 34],
  [28, 6, 22, 26],
]

function Bars({ mirror }) {
  return (
    <div className={mirror ? 'sp-ramp-bars sp-ramp-bars--mirror' : 'sp-ramp-bars'} aria-hidden="true">
      {BARS.map(([h, s, l, height], i) => (
        <span
          key={i}
          className="sp-ramp-bar"
          style={{
            '--sp-h': `${h}deg`,
            '--sp-s': `${s}%`,
            '--sp-l': `${l}%`,
            '--sp-bar-h': `${height}%`,
          }}
        />
      ))}
    </div>
  )
}

export default function SpectrumRamp({ mirror = false, className = '' }) {
  const ref = useRef(null)

  useEffect(() => {
    const node = ref.current
    if (!node) return undefined
    if (prefersReducedMotion()) return undefined

    let raf = 0
    const paint = () => {
      raf = 0
      // The same 0.24 coefficient the design uses. Left as a literal because it
      // is a tuning value with no other reader, not a token.
      node.style.setProperty('--sp-spin', `${(window.scrollY || 0) * 0.24}deg`)
    }
    const request = () => { if (!raf) raf = requestAnimationFrame(paint) }

    paint()
    window.addEventListener('scroll', request, { passive: true })
    return () => {
      window.removeEventListener('scroll', request)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  // aria-hidden on the WRAPPER, not only on the bar rows: the band carries no
  // information a screen reader needs and twenty-one (or forty-two) empty spans
  // announced as a group is noise. The hero's meaning is in the h1 above it.
  //
  // THE MIRROR IS BELOW THE BAND, because it is a REFLECTION. The design source
  // puts it second in source order and then hoists the real band above it with
  // `order:2` on the mirror's own wrapper; read quickly that looks like the
  // mirror comes first, and building it that way — as this file did first —
  // produces an upside-down ramp hanging from the sky above the real one. It is
  // the bars' own reflection falling away from their baseline and fading into
  // the ground.
  return (
    <div ref={ref} className={`sp-ramp ${className}`.trim()} aria-hidden="true">
      <Bars />
      {mirror && (
        <div className="sp-ramp-mirror">
          <Bars mirror />
          <span className="sp-ramp-fade" />
        </div>
      )}
    </div>
  )
}
