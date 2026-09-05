import { Link } from 'react-router-dom'
import { tipForDay } from '../../data/dailyTips'

// The two things the User Home says to you before it shows you your work: what
// to do next, and one fact worth knowing.
//
// ── WHY THIS IS NOT TWO CARDS ─────────────────────────────────────────
//
// The obvious build is two rounded cards, each with a circular coloured icon, a
// bold line and a button. That shape is on Mobbin twice over — Kajabi's “Get more
// out of Kajabi” row (mobbin.com/screens/5d415c90-2aa2-4aae-bd05-b5c346f95361)
// and Charma's greeting panel (mobbin.com/screens/3c42cab9-2aaf-4744-a7b9-c38d311afb22)
// — and it is exactly what the anti-slop bar calls out: “every idea enclosed in an
// equally weighted rounded card”, plus “icons or abstract shapes filling space
// without strengthening recognition”.
//
// So this is a BAND, not cards: two columns of text between two hairline rules,
// with mono eyebrows carrying the labelling. It reads as a workshop notice board
// rather than a dashboard widget, it costs no containment, and it leaves the
// cards below to be the only card-shaped things on the page — which is what
// makes them read as objects.
//
// Trello's home rail (mobbin.com/screens/6f78338c-3209-44c2-b590-8d1ee349b7da)
// is the reference that made the case for the placement: orientation before
// inventory, in less vertical space than the inventory takes.

/**
 * @param suggestion  nextToolSuggestion() output, or null while auth resolves.
 * @param resolving   true when we believe there is a session but do not yet know
 *                    whose it is. The NEXT column then holds its space with a
 *                    real loading state rather than guessing at content that
 *                    would change under the reader a second later.
 * @param date        injected so the tip is testable and so a story about
 *                    “yesterday” is possible later.
 */
export default function DailyBand({ suggestion, resolving = false, date }) {
  const tip = tipForDay(date)

  return (
    <section className="uh-band" aria-label="Today">
      <div className="uh-band-col">
        <p className="uh-eyebrow">Next</p>
        {resolving ? (
          <p className="uh-band-text" role="status">
            <span className="uh-skel" aria-hidden="true" />
            <span className="sr-only">Finding where you left off…</span>
          </p>
        ) : suggestion ? (
          <p className="uh-band-text">
            {suggestion.reason}{' '}
            <Link className="uh-band-go" to={suggestion.to}>
              Open the {suggestion.tool}
              <span aria-hidden="true"> →</span>
            </Link>
          </p>
        ) : null}
      </div>

      <div className="uh-band-col">
        {/* The kind is in the eyebrow so the reader knows whether they are being
            taught or teased before they read the sentence. */}
        <p className="uh-eyebrow">
          Tip of the day <span className="uh-eyebrow-kind">{tip.kind}</span>
        </p>
        <p className="uh-band-text uh-tip" data-tip-id={tip.id}>{tip.text}</p>
      </div>
    </section>
  )
}
