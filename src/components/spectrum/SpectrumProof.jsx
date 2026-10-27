import { useEffect, useRef } from 'react'
import SpectrumWords from './SpectrumWords'
import { PROOF_STATS } from './spectrumFacts'
import { prefersReducedMotion } from './reducedMotion'

// "DON'T JUST TAKE IT FROM US" — the design's proof band, as drawn.
//
// Heading, four figures between two rules, four columns → two at 860px → one at
// 460px. The four figures count up from 0 together (ease-out cubic, 700ms, or
// 600ms at 1000px and below) the first time the row is in view, which one
// IntersectionObserver decides; nothing listens to scroll.
//
// THE FIGURES ARE REAL. The design's four were usage stats nobody measures; these are
// counted off the arrays that decide them (PROOF_STATS in spectrumFacts.js).
//
// RESTING STATE IS THE FINAL NUMBER. The markup carries the real figure, so the
// prerendered shell, a runtime with no JS and reduced motion all read it; the
// count only starts (from 0) once the figure is on screen, and never under
// reduced motion.
const fmt = (n, grouped) => (grouped ? n.toLocaleString('en-GB') : String(n))

export default function SpectrumProof() {
  const row = useRef(null)

  useEffect(() => {
    const rowEl = row.current
    const els = [...(rowEl?.querySelectorAll('[data-count]') || [])]
    if (!els.length || prefersReducedMotion() || typeof IntersectionObserver === 'undefined') return undefined
    // Shorter on a phone, where the four figures pass in under a screen.
    const ms = window.matchMedia && window.matchMedia('(max-width: 1000px)').matches ? 600 : 700
    let raf = 0
    // All four figures start in the same frame, once, when the row is 15% up
    // from the bottom of the viewport. Each box keeps its final width (see
    // `--sp-digits`), so the count changes digits and never layout.
    const startAll = () => {
      const t0 = performance.now()
      const targets = els.map((el) => Number(el.dataset.count))
      els.forEach((el, i) => { el.dataset.counted = '1'; el.textContent = fmt(0, targets[i] >= 1000) })
      const step = (now) => {
        const k = Math.min(1, (now - t0) / ms)
        els.forEach((el, i) => {
          el.textContent = fmt(Math.round(targets[i] * (1 - Math.pow(1 - k, 3))), targets[i] >= 1000)
        })
        raf = k < 1 ? requestAnimationFrame(step) : 0
      }
      raf = requestAnimationFrame(step)
    }
    const io = new IntersectionObserver((entries, obs) => {
      if (!entries.some((e) => e.isIntersecting)) return
      obs.disconnect()
      startAll()
    }, { threshold: 0, rootMargin: '0px 0px -15% 0px' })
    io.observe(rowEl)
    return () => {
      io.disconnect()
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <section id="index" className="sp-section sp-proof" aria-labelledby="sp-proof-h">
      <div className="sp-proof-head" data-sp-reveal>
        <h2 id="sp-proof-h"><SpectrumWords text="Don't just take it from us" /></h2>
      </div>
      <div className="sp-proof-row" ref={row}>
        {PROOF_STATS.map((s) => (
          <div key={s.label}>
            <span className="sp-proof-n" data-count={s.value} style={{ '--sp-digits': fmt(s.value, s.value >= 1000).length }}>{fmt(s.value, s.value >= 1000)}</span>
            <span className="sp-proof-l">{s.label}</span>
          </div>
        ))}
      </div>
    </section>
  )
}
