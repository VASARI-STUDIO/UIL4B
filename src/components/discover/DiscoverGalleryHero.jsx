// The shared masthead for every Discover *Library* browse surface (palettes,
// gradients, …). One implementation, one CSS block (`dgh-` in global.css) —
// the galleries pass in only what differs: eyebrow, title, description, the
// numeric mark, and an optional inline action.
//
// It is deliberately presentational: no data, no state, no router coupling
// beyond whatever `action` node the caller hands it. That keeps it usable from
// any gallery page without dragging that page's concerns in.

export default function DiscoverGalleryHero({
  eyebrow,
  title,
  description,
  mark,
  action,
}) {
  return (
    <header className="dgh-hero">
      <div className="dgh-copy">
        {eyebrow && <span className="dgh-eyebrow">{eyebrow}</span>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
        {action && <div className="dgh-action">{action}</div>}
      </div>
      {mark && (
        // Decorative counter — the real, announced count lives in the result
        // head's aria-live region, so this is hidden from assistive tech to
        // avoid reading the same number twice.
        <div className="dgh-mark" aria-hidden="true">
          {mark.label && <span>{mark.label}</span>}
          <strong>{mark.value}</strong>
          {mark.caption && <small>{mark.caption}</small>}
        </div>
      )}
    </header>
  )
}
