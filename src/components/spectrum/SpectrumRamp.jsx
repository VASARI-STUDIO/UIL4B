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

function Bars({ mirror, indexed }) {
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
            // A bar's place in the ramp, which staggers its arrival (spectrum.css).
            ...(indexed ? { '--sp-i': i } : null),
          }}
        />
      ))}
    </div>
  )
}

// `arrive` sets the band on arrival: each bar grows from its baseline in hue
// order (spectrum.css, "the hero's arrival"), starting `arriveAt` in. Only the
// hero's band asks for it, so the movement happens once per page.
export default function SpectrumRamp({ mirror = false, arrive = false, arriveAt = '0ms', className = '' }) {
  const ref = useRef(null)

  // WHOLE-PIXEL BARS, AS THE DESIGN LAYS THEM OUT. Its tick() gives every bar
  // floor((width - gaps) / 21) px and spreads them with space-between, so each
  // bar is the same whole width and the leftover pixels fall in the gaps
  // rather than making some bars a pixel wider than others. One custom
  // property on the root, rewritten only when the band's width changes; the
  // CSS falls back to equal flex shares until it is set (and in the shell).
  useEffect(() => {
    const node = ref.current
    const bars = node?.querySelector('.sp-ramp-bars')
    if (!node || !bars || typeof ResizeObserver === 'undefined') return undefined
    const n = BARS.length
    const layout = () => {
      // The CONTENT width: the hero strip has 2px of side padding, and sizing
      // the bars from the border box made them up to 4px too wide for the room
      // they sit in.
      const cs = getComputedStyle(bars)
      const w = bars.getBoundingClientRect().width
        - (parseFloat(cs.paddingLeft) || 0) - (parseFloat(cs.paddingRight) || 0)
        - (parseFloat(cs.borderLeftWidth) || 0) - (parseFloat(cs.borderRightWidth) || 0)
      if (w <= 0) return
      node.style.setProperty('--sp-bar-w', `${Math.max(1, Math.floor((w - 2 * (n - 1)) / n))}px`)
    }
    const ro = new ResizeObserver(layout)
    ro.observe(bars)
    layout()
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    const node = ref.current
    if (!node) return undefined
    if (prefersReducedMotion()) return undefined

    let raf = 0
    let listening = false
    const paint = () => {
      raf = 0
      // The same 0.24 coefficient the design uses. Left as a literal because it
      // is a tuning value with no other reader, not a token.
      node.style.setProperty('--sp-spin', `${(window.scrollY || 0) * 0.24}deg`)
    }
    const request = () => { if (!raf) raf = requestAnimationFrame(paint) }

    // THE LISTENER LIVES ONLY WHILE THE BAND IS ON SCREEN. The page has three
    // bands and the hue is written per frame, so a listener that stayed attached
    // wrote a colour for most of the scroll that nobody could see. Entering the
    // viewport attaches it (and paints the current hue first); leaving removes it.
    const attach = () => {
      if (listening) return
      listening = true
      paint()
      window.addEventListener('scroll', request, { passive: true })
    }
    const detach = () => {
      if (!listening) return
      listening = false
      window.removeEventListener('scroll', request)
      if (raf) { cancelAnimationFrame(raf); raf = 0 }
    }

    if (typeof IntersectionObserver === 'undefined') {
      attach()
      return detach
    }
    // The margin arms the listener a little before the band shows, so its first
    // visible hue is already the right one.
    const io = new IntersectionObserver((entries) => {
      const latest = entries[entries.length - 1]
      if (latest.isIntersecting) attach()
      else detach()
    }, { threshold: 0, rootMargin: '200px 0px' })
    io.observe(node)
    return () => {
      io.disconnect()
      detach()
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
    <div
      ref={ref}
      className={`sp-ramp${arrive ? ' sp-ramp--arrive' : ''} ${className}`.trim()}
      style={arrive ? { '--sp-arrive-at': arriveAt } : undefined}
      aria-hidden="true"
    >
      <Bars indexed={arrive} />
      {mirror && (
        <div className="sp-ramp-mirror">
          <Bars mirror indexed={arrive} />
          <span className="sp-ramp-fade" />
        </div>
      )}
    </div>
  )
}
