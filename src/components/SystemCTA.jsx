import { Link } from 'react-router-dom'

export default function SystemCTA({
  eyebrow = 'Start free',
  title,
  description,
  primaryLabel = 'Start building free',
  primaryTo = '/login',
  secondaryLabel,
  secondaryTo,
  hint = 'No credit card · Build in your browser',
}) {
  return (
    <section className="system-cta" aria-labelledby="system-cta-title">
      <div className="system-cta-beams" aria-hidden="true">
        <i /><i /><i /><i /><i /><i /><i />
      </div>
      <div className="system-cta-grid" aria-hidden="true" />
      <div className="system-cta-inner" data-reveal>
        <span className="home-eyebrow">{eyebrow}</span>
        <h2 className="system-cta-title" id="system-cta-title">{title}</h2>
        {description && <p className="system-cta-lede">{description}</p>}
        <div className="system-cta-actions">
          <Link className="ui-pill ui-pill-ink ui-pill-lg" to={primaryTo}>
            {primaryLabel}
            <span className="ui-pill-arrow" aria-hidden="true">&rarr;</span>
          </Link>
          {secondaryLabel && secondaryTo && (
            <Link className="ui-pill ui-pill-out ui-pill-lg" to={secondaryTo}>
              {secondaryLabel}
            </Link>
          )}
        </div>
        {hint && <p className="system-cta-hint">{hint}</p>}
      </div>
    </section>
  )
}
