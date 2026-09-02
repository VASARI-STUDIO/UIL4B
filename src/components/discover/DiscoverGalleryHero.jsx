// The shared masthead for every Library browse surface (palettes, gradients,
// icons + emoji, …). One implementation, one CSS block (`dgh-` in global.css) —
// the pages pass in only what differs: eyebrow, title, description, the numeric
// mark or a control cluster, and an optional inline action.
//
// It is deliberately presentational: no data, no state, no router coupling
// beyond whatever `action` / `aside` node the caller hands it. That keeps it
// usable from any browse page without dragging that page's concerns in.
//
// `mark` vs `aside` — both occupy the right-hand column, and they are mutually
// exclusive because there is only one column. The difference is what may go in
// it, and that difference is load-bearing:
//   • `mark` is a decorative counter. It is aria-hidden (the announced count
//     lives in the result head's aria-live region) and it is DROPPED below
//     720px, because losing a duplicate number costs nothing.
//   • `aside` holds real controls — the Icon/Emoji surface puts its library
//     tablist here. So it is never aria-hidden and never dropped at any width:
//     on a phone it stacks under the copy. A control you can only reach on a
//     wide screen is a control half the users do not have.
export default function DiscoverGalleryHero({
  eyebrow,
  title,
  description,
  mark,
  action,
  aside,
}) {
  return (
    <header className={`dgh-hero${aside ? ' dgh-hero--controls' : ''}`}>
      <div className="dgh-copy">
        {eyebrow && <span className="dgh-eyebrow">{eyebrow}</span>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
        {action && <div className="dgh-action">{action}</div>}
      </div>
      {aside
        ? <div className="dgh-aside">{aside}</div>
        : mark && (
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
