// The results row that sits between a Discover Library toolbar and its grid.
// Shared by every gallery so the "what am I looking at / how many of them"
// rhythm is identical across the surface. Styles: `drh-` in global.css.
//
// `count` is announced (aria-live="polite") because it is the only feedback a
// filter or search gives when the grid itself is below the fold.

export default function DiscoverResultHead({ eyebrow, title, count, noun, id }) {
  return (
    <div className="drh-head">
      <div>
        {eyebrow && <span>{eyebrow}</span>}
        <h2 id={id}>{title}</h2>
      </div>
      <p aria-live="polite">
        {count} {count === 1 ? noun : `${noun}s`}
      </p>
    </div>
  )
}
