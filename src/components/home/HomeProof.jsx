import { PROOF_ROWS } from './proofStats'
import '../../styles/pages/home-proof.css'

// The proof bar: a heading and four figures, printed as they are. Nothing
// counts up.
export default function HomeProof() {
  return (
    <section id="proof" className="hp" aria-labelledby="proof-h">
      <div className="hp-in">
        <h2 id="proof-h" className="hp-h" tabIndex={-1}>Small, and built in Brisbane.</h2>
        {/* The figure comes first in each item, so a screen reader reads one phrase. */}
        <ul role="list" className="hp-l">
          {PROOF_ROWS.map((row) => (
            <li key={row.label}><strong>{row.n}</strong> {row.label}</li>
          ))}
        </ul>
      </div>
    </section>
  )
}
