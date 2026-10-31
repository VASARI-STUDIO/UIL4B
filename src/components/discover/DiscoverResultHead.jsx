// The results row that sits between a Discover Library toolbar and its grid.
// Shared by every gallery so the "what am I looking at / how many of them"
// rhythm is identical across the surface. Styles: `drh-` in global.css.
//
// `count` is announced (aria-live="polite") because it is the only feedback a
// filter or search gives when the grid itself is below the fold.
//
// `total` is optional: pass the size of the whole library when the viewer is
// shown only part of it, and the line reads "101 palettes · 3 shown" instead of
// a bare "3 palettes" that disagrees with the rest of the page.
//
// Leave `count` out and the line is not drawn at all, for a moment when no
// number would be the right one (a Pro library still on its way).

export default function DiscoverResultHead({ eyebrow, title, count, noun, id, total }) {
  const partial = Number.isFinite(total) && total > count
  return (
    <div className="drh-head">
      <div>
        {eyebrow && <span>{eyebrow}</span>}
        <h2 id={id}>{title}</h2>
      </div>
      {count != null && (
        <p aria-live="polite">
          {partial
            ? `${total} ${total === 1 ? noun : `${noun}s`} · ${count} shown`
            : `${count} ${count === 1 ? noun : `${noun}s`}`}
        </p>
      )}
    </div>
  )
}
