import { useRef, useState } from 'react'

// One tile for the palette and gradient libraries: a 4:5 (or square) panel, the
// name and a one-line meta under it.
//
//   <article class="vpt">
//     <div class="vpt-media" aria-hidden>   stacked colour bands, or one gradient
//     <div class="vpt-foot"> h3 name, p meta
//     <button class="vpt-open">             "Preview {name}", stretched over the tile
//     <button class="vpt-like">             sits above the open button
//
// The open button is the only way into the tile, so the whole panel is one
// target for a pointer and one stop for a keyboard. A locked tile (the stand-in
// rows behind a gate) renders the same markup with neither button: it offers
// nothing to focus or follow.
//
// On a mouse the meta line shows the hex of the band under the pointer. That
// swap is cosmetic (the dialog lists every hex), so it is skipped for touch and
// pen input.

export function HeartGlyph({ filled }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  )
}

/**
 * The grid every tile sits in. The outer element is the size container the
 * column rules query (an element cannot query its own size), the inner one is
 * the grid. `labelledBy` names the group, as LibraryGrid does.
 */
export function VptGrid({ children, labelledBy, className = '' }) {
  return (
    <div
      className={`vpt-grid${className ? ` ${className}` : ''}`}
      role={labelledBy ? 'group' : undefined}
      aria-labelledby={labelledBy}
    >
      <div className="vpt-cols">{children}</div>
    </div>
  )
}

export default function VerticalPanelTile({
  name,
  meta,
  hexes,
  mediaStyle,
  locked = false,
  onOpen,
  liked = false,
  onLike,
  className = '',
  ...rest
}) {
  const mediaRef = useRef(null)
  const [band, setBand] = useState(-1)

  const track = (event) => {
    if (!hexes || event.pointerType !== 'mouse' || !mediaRef.current) return
    const box = mediaRef.current.getBoundingClientRect()
    if (event.clientY < box.top || event.clientY > box.bottom) { setBand(-1); return }
    const at = Math.floor(((event.clientY - box.top) / box.height) * hexes.length)
    setBand(Math.max(0, Math.min(hexes.length - 1, at)))
  }

  const shownMeta = band >= 0 && hexes ? hexes[band].toUpperCase() : meta

  return (
    <article
      className={`vpt${locked ? ' vpt--locked' : ''}${className ? ` ${className}` : ''}`}
      onPointerMove={locked ? undefined : track}
      onPointerLeave={locked ? undefined : () => setBand(-1)}
      {...rest}
    >
      <div className="vpt-media" ref={mediaRef} style={hexes ? undefined : mediaStyle} aria-hidden="true">
        {hexes && hexes.map((hex, i) => <span key={`${hex}-${i}`} className="vpt-band" style={{ background: hex }} />)}
      </div>
      <div className="vpt-foot">
        <h3 className="vpt-name">{name}</h3>
        <p className="vpt-meta">{shownMeta}</p>
      </div>
      {!locked && (
        <>
          <button
            type="button"
            className="vpt-open"
            onClick={onOpen}
            aria-label={`Preview ${name}`}
            aria-haspopup="dialog"
          />
          {onLike && (
            <button
              type="button"
              className={`vpt-like${liked ? ' is-liked' : ''}`}
              onClick={onLike}
              aria-pressed={liked}
              aria-label={liked ? `Unlike ${name}` : `Like ${name}`}
              title={liked ? 'Liked' : 'Like'}
            >
              <HeartGlyph filled={liked} />
            </button>
          )}
        </>
      )}
    </article>
  )
}
