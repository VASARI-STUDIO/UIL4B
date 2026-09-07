import { useId } from 'react'
import { Link } from 'react-router-dom'

// The last thing on a gallery page.
//
// Founder request (2026-09-07): "at the very bottom of all gallery pages,
// include a CTA, 'cant find what you are looking for' Create and Submit your
// own or something."
//
// ── WHAT IT IS, AND THE FOUR THINGS IT IS NOT ───────────────────────────────
//
// A question and one action. That is the whole component.
//
// It is NOT A CARD. A card is the unit this page has just shown a hundred of;
// one more card at the bottom joins the grid and gets scrolled past with it.
// The closing line has to read as the END of the list, not as its last entry.
//
// It is NOT A BANNER, and specifically not a gradient one. A full-bleed tinted
// block below the grid is the shape of an advert, and the anti-slop bar names
// exactly this — "glow, blur, glass, gradients … layered together as a generic
// premium signal". Nothing here needs a premium signal; the user has already
// scrolled the whole library and is being offered the obvious next move.
//
// It is NOT AN ICON ROW. There is one action, so there is nothing to
// distinguish with iconography.
//
// It is NOT FIVE COPIES. Every gallery renders this component. The wording is
// the founder's, once, in one file — five hand-written variants would drift on
// the first edit and the drift would be invisible until somebody read all five.
//
// Mobbin, for how a browse surface closes:
//   Discord  https://mobbin.com/sites/sections/430c2298-297c-4c3f-9b40-cf66550ec8af
//     "Didn't find what you were looking for?" over a single New post button,
//     sitting directly under the last card of the grid and above the footer.
//     Centred, untinted, no container. This is the pattern, near-verbatim.
//   Twingate https://mobbin.com/sites/sections/071de120-0906-4807-99ca-c1ca3eb1ce95
//     "Still need help?" + one line of subtext + one pill, closing a grid of
//     channel cards. The subtext earns its place by naming WHERE the action
//     goes, which is what `detail` is for here.
//
// Dribbble and Unsplash were the other two asked about. Neither closes at all —
// both are infinite scrollers with no terminal state — so there was no pattern
// to take from them, which is itself the argument for closing the page: a
// gallery that simply stops leaves the "I could not find it" user with nothing.

/**
 * @param {string}  detail      one line under the question. Says where the
 *                              action leads, in the product's own words.
 * @param {string}  action      the pill's label.
 * @param {string}  [to]        route for a link-shaped action.
 * @param {Function}[onAction]  handler for an on-page action (a surface whose
 *                              submission form lives on the gallery itself).
 * @param {boolean} [busy]      disables the pill while auth is still resolving,
 *                              so it cannot flash the wrong prompt.
 */
export default function GalleryCloseCta({ detail, action, to, onAction, busy = false, className = '' }) {
  // useId rather than a literal: nothing stops a future page rendering two of
  // these, and a duplicated id silently points both headings at the first one.
  // Before the guard below, so the hook is never skipped on a throwing render.
  const headingId = useId()

  // One of the two, never both, never neither — a CTA that leads nowhere is the
  // failure this component exists to prevent, and a silent no-op would ship.
  if ((to == null) === (onAction == null)) {
    throw new Error('GalleryCloseCta: pass exactly one of `to` or `onAction`')
  }

  return (
    // <section>, not a bare div: this is a landmark at the end of the page and
    // a screen-reader user arriving at it by landmark navigation should be told
    // what it is. Labelled by the heading rather than by an aria-label, so the
    // announced name and the visible words cannot drift apart.
    <section className={`gcta${className ? ` ${className}` : ''}`} aria-labelledby={headingId}>
      {/* h2, because every gallery's grid heading is an h2 or h3 under an h1
          masthead and this closes the page at the same level rather than
          pretending to be inside the grid it follows. */}
      <h2 className="gcta-q" id={headingId}>Can’t find what you’re looking for?</h2>
      <p className="gcta-detail">{detail}</p>
      {/* `btn btn-accent` and not a bespoke pill. The app already has one
          primary-action shape, including the 44px touch floor it grows on
          mobile (#412/#413), and a closing CTA is the last place that should
          introduce a second one. `gcta-action` carries nothing but the block's
          own spacing. */}
      {to
        ? <Link className="btn btn-accent gcta-action" to={to}>{action}</Link>
        : (
          <button type="button" className="btn btn-accent gcta-action" onClick={onAction} disabled={busy}>
            {action}
          </button>
        )}
    </section>
  )
}
