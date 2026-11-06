import { PROOF_STATS } from './spectrumFacts'

// The proof band: a heading and four figures between two rules, four columns,
// two at 860px, one at 460px. The figures are counted off the arrays that decide
// them (PROOF_STATS in spectrumFacts.js) and are printed as they are: nothing
// counts up.
const fmt = (n, grouped) => (grouped ? n.toLocaleString('en-GB') : String(n))

export default function SpectrumProof() {
  return (
    <section id="proof" className="sp-section sp-proof" aria-labelledby="sp-proof-h">
      <div className="sp-proof-head">
        <h2 id="sp-proof-h" tabIndex={-1}>Don&rsquo;t just take it from us</h2>
      </div>
      <div className="sp-proof-row">
        {PROOF_STATS.map((s) => (
          <div key={s.label}>
            <span className="sp-proof-n" style={{ '--sp-digits': fmt(s.value, s.value >= 1000).length }}>{fmt(s.value, s.value >= 1000)}</span>
            <span className="sp-proof-l">{s.label}</span>
          </div>
        ))}
      </div>
    </section>
  )
}
