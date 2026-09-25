import { useEffect, useRef } from 'react'
import SpectrumWords from './SpectrumWords'
import { PROOF_STATS } from './spectrumFacts'
import { prefersReducedMotion } from './reducedMotion'

// "DON'T JUST TAKE IT FROM US" — the design's proof band, as drawn.
//
// Heading, four figures between two rules, four columns → two at 860px → one at
// 460px. Each figure counts up from 0 over 1.1s (ease-out cubic) the first time
// it comes within 92% of the viewport — the design's countUp(), line for line.
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
    const els = [...(row.current?.querySelectorAll('[data-count]') || [])]
    if (!els.length || prefersReducedMotion()) return undefined
    const frames = new Set()
    let raf = 0
    const start = (el) => {
      el.dataset.counted = '1'
      const target = Number(el.dataset.count)
      const grouped = target >= 1000
      const t0 = performance.now()
      el.textContent = fmt(0, grouped)
      const step = (now) => {
        const k = Math.min(1, (now - t0) / 1100)
        el.textContent = fmt(Math.round(target * (1 - Math.pow(1 - k, 3))), grouped)
        if (k < 1) frames.add(requestAnimationFrame(step))
      }
      frames.add(requestAnimationFrame(step))
    }
    const check = () => {
      raf = 0
      const vh = window.innerHeight || 0
      for (const el of els) {
        if (el.dataset.counted === '1') continue
        const r = el.getBoundingClientRect()
        if (r.top > vh * 0.92 || r.bottom < 0) continue
        start(el)
      }
    }
    const request = () => { if (!raf) raf = requestAnimationFrame(check) }
    check()
    window.addEventListener('scroll', request, { passive: true })
    return () => {
      window.removeEventListener('scroll', request)
      if (raf) cancelAnimationFrame(raf)
      frames.forEach((f) => cancelAnimationFrame(f))
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
            <span className="sp-proof-n" data-count={s.value}>{fmt(s.value, s.value >= 1000)}</span>
            <span className="sp-proof-l">{s.label}</span>
          </div>
        ))}
      </div>
    </section>
  )
}
