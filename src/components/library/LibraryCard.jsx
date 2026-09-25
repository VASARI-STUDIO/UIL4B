// One card anatomy for every Library browse surface.
//
//   ┌─ .lbry-card ──────────────────┐
//   │ ┌─ .lbry-card-shot ─────────┐ │  the preview. Fixed aspect, so the grid's
//   │ │  media                    │ │  geometry is settled at first paint and
//   │ │  badge  ·  float          │ │  cannot move as content streams in.
//   │ │  ┌ .lbry-card-actions ─┐  │ │  revealed on hover AND focus-within
//   │ │  └─────────────────────┘  │ │
//   │ └───────────────────────────┘ │
//   │ ┌─ .lbry-card-foot ─────────┐ │  name + meta on the left, tail on the
//   │ │  name / meta      tail    │ │  right. Always visible — never revealed.
//   │ └───────────────────────────┘ │
//   └───────────────────────────────┘
//
// The two reference implementations disagreed on all of it. The Palette
// Library revealed five actions on hover and kept the like button in the foot;
// the Gradient Library floated the like button over the swatch and kept its
// actions permanently in the foot. Same product, same surface, two different
// answers to "where do I click".
//
// THE REVEAL LAYER IS REAL DOM AT ALL TIMES. It is revealed with CSS
// (opacity/visibility under :hover and :focus-within), never mounted on hover,
// so a keyboard user tabs into exactly the actions a pointer reveals and a
// screen reader never meets a control that only exists under a mouse. This was
// already true of the Palette Library and is the behaviour worth keeping.
//
// `className` carries the page's own identity class alongside the shared one,
// so per-surface deltas (and the browser-test hooks that pin them) survive the
// consolidation.

export default function LibraryCard({
  className = '',
  media,
  badge,
  float,
  actions,
  actionsLabel,
  name,
  meta,
  tail,
  // A full-width line under the name row: the Palette Library's hex chips
  // (UIL4B App.dc.html, palettes screen, line 271).
  footExtra,
  // Consumers that already have a test hook or a type-specific treatment on the
  // name or meta line keep it here rather than nesting another span inside the
  // shared one — nesting would leave two boxes competing for the same ellipsis.
  nameClassName = '',
  metaClassName = '',
  badgeClassName = '',
  selected = false,
  ...rest
}) {
  return (
    <article
      className={`lbry-card${selected ? ' is-selected' : ''}${className ? ` ${className}` : ''}`}
      {...rest}
    >
      <div className="lbry-card-shot">
        {media}
        {badge && <span className={`lbry-card-badge${badgeClassName ? ` ${badgeClassName}` : ''}`}>{badge}</span>}
        {float && <div className="lbry-card-float">{float}</div>}
        {actions && (
          <div className="lbry-card-actions" role="group" aria-label={actionsLabel}>
            {actions}
          </div>
        )}
      </div>
      {(name || meta || tail || footExtra) && (
        <div className="lbry-card-foot">
          <div className="lbry-card-id">
            {name && <span className={`lbry-card-name${nameClassName ? ` ${nameClassName}` : ''}`}>{name}</span>}
            {meta && <span className={`lbry-card-meta${metaClassName ? ` ${metaClassName}` : ''}`}>{meta}</span>}
          </div>
          {tail && <div className="lbry-card-tail">{tail}</div>}
          {footExtra && <div className="lbry-card-extra">{footExtra}</div>}
        </div>
      )}
    </article>
  )
}
