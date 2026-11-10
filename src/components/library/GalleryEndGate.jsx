import { useId } from 'react'
import { Link } from 'react-router-dom'
import './GalleryEndGate.css'

/* The closing block of a gallery for a viewer who cannot open all of it.
 *
 * One layout for every gallery: the rows the viewer can open, sharp; then the
 * next rows fading into a soft blur and transparency; then a centred block with
 * a display heading, a muted body, a small detail line and two controls, a
 * filled pill and a text link. No card, no border, no panel. The text and both
 * controls are always on screen; nothing depends on hover.
 *
 * The caller owns the words (each gallery keeps its copy beside its data, see
 * data/galleryGateCopy.js and ICON_GATE_COPY) and the faded rows. The faded
 * rows are decoration made of stand-ins: a locked item's real asset or values
 * never go in here (see utils/lockedPreview.js and utils/lockedStandin.js). The
 * fade is hidden from assistive tech, takes no pointer events and is `inert`,
 * so the focus order is the heading area, then the primary control, then the
 * secondary one.
 *
 *   kind        value of data-gate on the root ('anon', 'free', 'search'...).
 *   id          the heading's id; the root is labelled by it.
 *   heading     the display sentence.
 *   level       the heading level (2 by default; pass the level under the
 *               heading that already names the section).
 *   body        one muted paragraph.
 *   detail      an optional small line, e.g. the names of the sets on show.
 *   primary     { label, to, onClick }. With `to` it is a link, without it a
 *               button that calls onClick.
 *   secondary   { label, to, onClick }, optional; a text link.
 *   fade        the faded rows, rendered by the caller.
 *   live        'copy' announces heading and body as a status, 'body' only the
 *               body. Leave it off when the block is not a status.
 */
export default function GalleryEndGate({
  kind, id, heading, level = 2, body, detail, primary, secondary, fade, live, className,
}) {
  const auto = useId()
  const headId = id || `geg-h-${auto.replace(/:/g, '')}`
  const Heading = `h${level}`
  return (
    <section className={`geg${className ? ` ${className}` : ''}`} data-gate={kind} data-end={kind} aria-labelledby={headId}>
      {fade && <div className="geg-fade" aria-hidden="true" inert>{fade}</div>}
      <div className="geg-band">
        <div className="geg-copy" role={live === 'copy' ? 'status' : undefined}>
          <Heading id={headId} className="geg-h">{heading}</Heading>
          <p className="geg-p" role={live === 'body' ? 'status' : undefined}>{body}</p>
          {detail && <p className="geg-detail">{detail}</p>}
        </div>
        <div className="geg-cta">
          {primary.to
            ? <Link to={primary.to} className="geg-pill" onClick={primary.onClick}>{primary.label}</Link>
            : <button type="button" className="geg-pill" onClick={primary.onClick}>{primary.label}</button>}
          {secondary && (secondary.to
            ? <Link to={secondary.to} className="geg-link" onClick={secondary.onClick}>{secondary.label}</Link>
            : <button type="button" className="geg-link" onClick={secondary.onClick}>{secondary.label}</button>)}
        </div>
      </div>
    </section>
  )
}

/* Two rows of placeholder cards for galleries whose items are not icons. Every
 * cell is neutral: no colour, name or id of a locked item. A `poster` cell shows
 * a locked prompt's stand-in picture (utils/lockedStandin), which the caller
 * passes as an address; nothing here can reach the real one.
 *
 *   shape   'swatch' (a strip of neutral bands), 'poster' (a picture), 'glyph'
 *           (outline shapes) or 'lines' (text bars).
 *   srcs    for 'poster', one stand-in address per cell.
 *   count   how many cells are drawn; the grid clips to two rows.
 *   min     the narrowest a cell gets, in px, so the columns match the live
 *           gallery above it.
 */
const SHAPES = ['circle', 'square', 'arrow', 'circle', 'square', 'arrow']
function Shape({ kind }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" focusable="false">
      {kind === 'circle' && <circle cx="12" cy="12" r="8" />}
      {kind === 'square' && <rect x="4" y="4" width="16" height="16" rx="3" />}
      {kind === 'arrow' && <path d="M5 12h14M13 6l6 6-6 6" />}
    </svg>
  )
}

export function GateFadeCards({ shape = 'swatch', srcs = [], count = 12, min = 220 }) {
  const cells = shape === 'poster' ? srcs : Array.from({ length: count }, (_, i) => i)
  return (
    <div className={`geg-ph-grid geg-ph-grid--${shape}`} style={{ '--geg-ph-min': `${min}px` }}>
      {cells.map((cell, i) => (
        <span key={shape === 'poster' ? cell : i} className="geg-ph" data-step={i % 4}>
          {shape === 'swatch' && [0, 1, 2, 3].map((s) => <span key={s} className="geg-ph-band" data-band={s} />)}
          {shape === 'poster' && <img src={cell} alt="" width="960" height="600" loading="lazy" decoding="async" />}
          {shape === 'glyph' && <Shape kind={SHAPES[i % SHAPES.length]} />}
          {shape === 'lines' && [0, 1, 2].map((s) => <span key={s} className="geg-ph-line" data-line={s} />)}
        </span>
      ))}
    </div>
  )
}
