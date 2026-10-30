import { Link } from 'react-router-dom'
import PhIcon from './PhIcon'
import SpectrumWords from './SpectrumWords'

// The sales pages' closing block: a centred headline, one line under it and two
// actions (spectrum.css, "the handoff"). `secondary` is one of
//   { label, to }   a ghost link,
//   { placeholder } an invisible stand-in with the label's width, for a viewer
//                   whose answer is not in yet, so the row is already its final
//                   width and nothing moves when the real link arrives,
//   null            no second action.
// The headline carries no reveal attribute, so it is still on arrival.
export default function SpectrumClose({ id, heading, body, primary, secondary = null }) {
  return (
    <section className="sp-close" aria-labelledby={id}>
      <h2 id={id}><SpectrumWords text={heading} /></h2>
      <p>{body}</p>
      <div className="sp-close-cta">
        <Link className="sp-pill sp-pill--close" to={primary.to}>
          <span>{primary.label}</span>
          <span className="sp-pill-icon" aria-hidden="true"><PhIcon name="arrow-up-right" /></span>
        </Link>
        {secondary?.placeholder && (
          <span className="sp-ghost sp-ghost--close" aria-hidden="true" style={{ visibility: 'hidden' }}>{secondary.placeholder}</span>
        )}
        {secondary?.to && <Link className="sp-ghost sp-ghost--close" to={secondary.to}>{secondary.label}</Link>}
      </div>
    </section>
  )
}
