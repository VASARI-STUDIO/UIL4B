import { useMemo } from 'react'
import useMeasured from './useMeasured'
import { boxWithin, sceneInks, sceneBadge } from '../../utils/gradientText'
import { POSTER_COPY, specStrip, specHexes, fitHexes, specTypeLine, specSampledNote } from '../../utils/gradientPreviewStyles'

// The text layer of the preview styles that set words (Poster and Spec card). The page
// draws it after the effects layer (GradientFx), so grain and glass never sit over a
// letter. Text is a solid ink, never faded: on the paint it is the ink pickInk chooses
// for the part of the gradient the text covers, and the scene's one badge gives the
// lowest ratio of those boxes. Text on the neutral card is --tl-ink and --tl-dim.

const POSTER_BOXES = ['top', 'foot']

// The poster's two blocks of words against the poster's own field.
const measurePoster = (view) => {
  const frame = view.querySelector('.grd-poster-frame').getBoundingClientRect()
  const spot = (name) => boxWithin(frame, view.querySelector(`[data-box="${name}"]`).getBoundingClientRect())
  return { top: spot('top'), foot: spot('foot') }
}

function Badge({ badge }) {
  if (!badge) return null
  return <span className={`grd-ctx-ratio${badge.low ? ' is-low' : ''}`} role="status">{badge.text}</span>
}

function PosterText({ stops, type, angle }) {
  const [ref, spots] = useMeasured(measurePoster)
  const inks = useMemo(() => sceneInks(stops, type, angle, spots, POSTER_BOXES), [stops, type, angle, spots])
  const badge = sceneBadge(Object.values(inks))
  return (
    <div className="grd-txt" ref={ref}>
      <div className="grd-txt-box" aria-hidden="true">
        <div className="grd-poster-frame">
          <div className="grd-poster-in">
            <div className="grd-poster-top" data-box="top" style={{ color: inks.top.css }}>
              <p className="grd-poster-brand">{POSTER_COPY.brand}</p>
              <p className="grd-poster-h">{POSTER_COPY.display}</p>
            </div>
            <p className="grd-poster-foot" data-box="foot" style={{ color: inks.foot.css }}>{POSTER_COPY.footer}</p>
          </div>
        </div>
      </div>
      <Badge badge={badge} />
    </div>
  )
}

function SpecText({ paint, stops, type, angle, oklch, name }) {
  const hexes = fitHexes(specHexes(stops))
  const note = specSampledNote(stops)
  return (
    <div className="grd-txt">
      <div className="grd-txt-box grd-spec-box" aria-hidden="true">
        <div className="grd-spec">
          <div className="grd-spec-head" style={{ background: paint }} />
          <div className="grd-spec-body">
            <p className="grd-spec-name">{name}</p>
            <p className="grd-spec-hexes">{hexes.map((h, i) => <span key={`${h}-${i}`}>{h}</span>)}</p>
            <p className="grd-spec-type">{specTypeLine(type, angle, oklch)}</p>
            <ul className="grd-spec-strip">
              {specStrip(stops, oklch).map((hex, i) => (
                <li key={i}>
                  <span className="grd-spec-sw" style={{ background: hex }} />
                  <span className="grd-spec-hex">{hex}</span>
                </li>
              ))}
            </ul>
            {note && <p className="grd-spec-note">{note}</p>}
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * The words of one preview style over the canvas. `paint` is the canvas's own gradient and
 * `oklch` whether it blends in OKLCH; `name` is the Spec card's heading.
 */
export default function GradientText({ id, paint, stops, type, angle, oklch, name }) {
  if (id === 'poster') return <PosterText stops={stops} type={type} angle={angle} />
  if (id === 'spec') return <SpecText paint={paint} stops={stops} type={type} angle={angle} oklch={oklch} name={name} />
  return null
}
