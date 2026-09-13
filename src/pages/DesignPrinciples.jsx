// /principles — the rules the product holds to when it builds an interface
// system, each one beside the screen that applies it.
//
// FOUNDER DIRECTION, verbatim (2026-08-20, group D of the surface batch):
// "these are less documents are more designed like a sales page style of large
// visual, main point, simple not overly verbose points underneath." And
// 2026-09-06: "make sure to make user centric design choices."
//
// ── The one decision this page turns on ────────────────────────────────────
//
// A principles page is the easiest surface in a product to fake, and Mobbin's
// corpus shows how consistently it gets faked: Grain, Sprig, Qatalog and
// ElevenLabs all ship the identical section — a heading, then three to six
// equally weighted cards, each an icon over a two-word abstraction ("Never
// settle", "First principles", "Keep things simple") and a sentence of
// explanation. Not one statement on any of those pages can be checked, and not
// one of them points at the product. See the citations and the reasoning in
// src/data/designPrinciples.js.
//
// So the rule for this page is: a principle may only appear on it if a screen
// in this product already enforces it, and the proof beside it must be COMPUTED
// by the same function that screen runs. Every ratio here comes from
// contrastRatio(), every size from stepPx(), every format name from the `live`
// flag that decides whether its export button does anything. Nothing is typed.
//
// The layout follows Hashnode's editor section, which puts the real product
// surface above the claim so the claim reads as a caption on evidence:
// https://mobbin.com/sites/sections/ce305258-5218-49f8-8cf0-cc49059d10e4
// The rows alternate side rather than tiling, and the first one is given the
// full width — that is the "large visual" the direction asks for, and it stops
// the page becoming the five-equal-cards construction above.
//
// ── Voice ──────────────────────────────────────────────────────────────────
//
// Neutral and factual, no first person — the same register the founder chose
// for the Learn guides on 2026-09-05, and for the same reason: this is the
// product stating a position, not a person arguing one.
//
// ── What is NOT here ───────────────────────────────────────────────────────
//
// The internal design references under .claude/skills/uil4b-brand-design/ are a
// review vocabulary for people working ON this repository. Their language —
// "slop", "under-authored", "operative not performative" — describes how to
// judge a surface, not what the product believes about interfaces, and none of
// it is quoted or paraphrased here.
import { Link } from 'react-router-dom'
import { useReveal } from '../hooks/useReveal'
import { DESIGN_PRINCIPLES } from '../data/designPrinciples'
import {
  ContrastProof,
  ExportProof,
  SoonProof,
  ThemeValueProof,
  TypeLadderProof,
} from '../components/SystemProofs'
// The stylesheet families this surface needs, split out of the one
// render-blocking global sheet (see src/styles/deferred/). They ride this
// route's own lazy chunk, so they arrive with it and never with the homepage.
import '../styles/deferred/reading.css'

// Keyed by principle id rather than positioned: a reordering of the data module
// must move the proof with its rule, and a rule added there without a proof
// built here must be visible rather than silently rendering an empty row.
const PROOFS = {
  measured: ContrastProof,
  'two-values': ThemeValueProof,
  arithmetic: TypeLadderProof,
  leaves: ExportProof,
  unbuilt: SoonProof,
}

export default function DesignPrinciples() {
  useReveal()

  return (
    <div className="sec prn">
      <header className="prn-hero">
        <h1 className="prn-h1">
          Every rule here is <mark className="home-mark">enforced</mark> by a screen.
        </h1>
        <p className="prn-lede">
          Nothing on this page is only a statement. Each one names the tool that
          applies it, and the figures beside it were measured when the page
          loaded — by the same functions that tool runs.
        </p>
        <div className="prn-hero-cta">
          <Link className="ui-pill ui-pill-ink ui-pill-lg" to="/learn">
            Read the guides behind them
            <span className="ui-pill-arrow" aria-hidden="true">&rarr;</span>
          </Link>
        </div>
      </header>

      <ol className="prn-list">
        {DESIGN_PRINCIPLES.map((p, i) => {
          const Proof = PROOFS[p.id]
          if (!Proof) return null
          return (
            <li
              className="prn-item"
              key={p.id}
              /* The first row is the page's large visual: full width, proof
                 above the rule. The rest alternate side, so the page reads as a
                 sequence rather than a grid of equal tiles. */
              data-lead={i === 0 ? 'true' : undefined}
              data-side={i === 0 ? undefined : (i % 2 === 1 ? 'left' : 'right')}
              data-reveal
            >
              <div className="prn-proof">
                <Proof />
              </div>
              <div className="prn-say">
                <h2 className="prn-rule">{p.rule}</h2>
                <p className="prn-body">{p.body}</p>
                <Link className="prn-go" to={p.to}>
                  {p.linkLabel}
                  <span aria-hidden="true">&rarr;</span>
                </Link>
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
