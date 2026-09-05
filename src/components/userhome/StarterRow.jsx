import { Link } from 'react-router-dom'
import { STARTER_TOTALS, startersForDay } from '../../data/dailyStarters'

// Four real artefacts out of the library, rotating daily, each opening the tool
// that builds it with the values already loaded.
//
// The card art is the artefact ITSELF — a real gradient, or a palette drawn as
// hard-stop bands — not a decorative blend standing in for something that lives
// elsewhere. That is the correction `homepage-community-points-outward` made on
// the homepage strip, and the reasoning is the same here: a swatch that is not
// the swatch is decoration pretending to be product.
//
// Nothing in this component writes down a colour, a name or a URL. All three are
// read out of the gallery that owns the artefact, through the same
// gradientToolUrl() / paletteBuilderUrl() hand-offs the Discover galleries use.
//
// The only numbers printed are catalogue sizes counted off the arrays.

export default function StarterRow({ date }) {
  // Computed on every render rather than memoised. startersForDay is two index
  // walks and four small object builds — memoising it would cost a dependency
  // on a date the caller may not pass, to save arithmetic that does not show up
  // in a profile.
  const starters = startersForDay(date)

  if (!starters.length) return null

  return (
    <section className="uh-starters" aria-labelledby="uh-starters-h">
      <div className="uh-starters-head">
        <h2 className="uh-eyebrow" id="uh-starters-h">Starters, rotating daily</h2>
        <p className="uh-starters-note">
          Four out of {STARTER_TOTALS.gradients} gradients and {STARTER_TOTALS.palettes} palettes.
          Each one opens its tool with the values already in.
        </p>
      </div>

      <ul className="uh-starter-grid">
        {starters.map((s) => (
          <li key={`${s.kind}-${s.id}`}>
            <Link className="uh-starter" to={s.to}>
              {/* aria-hidden: the art carries no information the text does not
                  already give, and "linear-gradient(135deg, #FF6B35 0%..." is
                  not something anyone needs read aloud. */}
              <span className="uh-starter-art" style={{ background: s.art }} aria-hidden="true" />
              <span className="uh-starter-body">
                <span className="uh-starter-kind">{s.kind}</span>
                <span className="uh-starter-name">{s.name}</span>
                <span className="uh-starter-fact">{s.fact}</span>
                <span className="uh-starter-opens">Opens in {s.opens}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
