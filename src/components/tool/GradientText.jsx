import { useMemo } from 'react'
import useMeasured from './useMeasured'
import ShallowEndMark from '../ShallowEndMark'
import useMediaQuery from '../../hooks/useMediaQuery'
import { boxWithin, inkFor, sceneInks, sceneBadge } from '../../utils/gradientText'
import {
  POSTER_COPY, PHONE_COPY, ICON_INK_BOX, phoneButton,
  specStrip, specHexes, fitHexes, specTypeLine, specSampledNote,
} from '../../utils/gradientPreviewStyles'

// The Phone draws its frame from this width up, the same cut gradient.css makes.
const FRAME_QUERY = '(min-width: 901px)'

// The text layer of the preview styles that set words or objects (Poster, Spec card, App
// icon and Phone). The page
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

// How many hexes fit the Spec card's hex line. Every hex is set in the mono face, so the
// first one's width stands for all of them; the "+N" takes one slot of its own.
const measureHexRoom = (view) => {
  const line = view.querySelector('.grd-spec-hexes')
  const hex = line?.querySelector('span')
  if (!line || !hex || !line.clientWidth) return null
  const gap = parseFloat(getComputedStyle(line).columnGap) || 0
  return Math.max(2, Math.floor((line.clientWidth + gap) / (hex.getBoundingClientRect().width + gap)))
}

function Badge({ badge }) {
  if (!badge) return null
  return <span className={`grd-ctx-ratio${badge.low ? ' is-low' : ''}`} role="status">{badge.text}</span>
}

function PosterText({ stops, type, angle, mesh }) {
  const [ref, spots] = useMeasured(measurePoster)
  const inks = useMemo(() => sceneInks(stops, type, angle, spots, POSTER_BOXES, mesh), [stops, type, angle, spots, mesh])
  const badge = sceneBadge(Object.values(inks))
  return (
    <div className="grd-txt" ref={ref}>
      <div className="grd-txt-box" aria-hidden="true">
        <div className="grd-poster-frame">
          <div className="grd-poster-in">
            <div className="grd-poster-top" data-box="top" style={{ color: inks.top.css }}>
              <p className="grd-poster-brand"><ShallowEndMark />{POSTER_COPY.brand}</p>
              <p className="grd-poster-h">{POSTER_COPY.display}</p>
            </div>
            <svg className="grd-poster-lanes" viewBox="0 0 200 80" preserveAspectRatio="xMaxYMid meet" aria-hidden="true" fill="none" stroke={inks.foot.css} strokeWidth="2">
              {[0, 1, 2, 3, 4].map((lane) => {
                const offset = lane * 7
                return <path key={lane} d={`M0 ${6 + offset}h95c28 0 34 38 65 38h40`} />
              })}
            </svg>
            <p className="grd-poster-foot" data-box="foot" style={{ color: inks.foot.css }}>{POSTER_COPY.footer}</p>
          </div>
        </div>
      </div>
      <Badge badge={badge} />
    </div>
  )
}

function SpecText({ paint, stops, type, angle, oklch, name }) {
  const [ref, room] = useMeasured(measureHexRoom)
  const hexes = fitHexes(specHexes(stops), room || undefined)
  const note = specSampledNote(stops)
  return (
    <div className="grd-txt" ref={ref}>
      <div className="grd-txt-box grd-spec-box" aria-hidden="true">
        <div className="grd-spec">
          <div className="grd-spec-head" style={{ background: paint }}><i className="grd-proof-corner" /></div>
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

function AppIcon({ paint, ink, small = false }) {
  return (
    <span className={`grd-ic ${small ? 'grd-ic--small' : 'grd-ic--big'}`} style={{ background: paint, color: ink }}>
      <span className="grd-radio-mark"><i /><i /><i /><i /><i /></span>
    </span>
  )
}

function IconText({ paint, stops, type, angle, mesh }) {
  const ink = useMemo(() => inkFor(stops, type, angle, { aspect: 1, box: ICON_INK_BOX }, mesh), [stops, type, angle, mesh])
  return (
    <div className="grd-txt">
      <div className="grd-txt-box grd-icon-box" aria-hidden="true">
        <div className="grd-radio-sheet">
          <div className="grd-radio-art"><AppIcon paint={paint} ink={ink.css} /></div>
          <div className="grd-radio-listing">
            <small>Music &amp; Audio</small><strong>Frequency FM</strong><p>Independent radio, live from Melbourne.</p>
            <div className="grd-radio-playing"><AppIcon small paint={paint} ink={ink.css} /><div><small>On air</small><b>Listening Room</b></div></div>
          </div>
        </div>
      </div>
      <Badge badge={sceneBadge([ink])} />
    </div>
  )
}

// Measure the boarding pass header to choose ink for the route lettering.
const measurePhone = (view) => {
  const band = view.querySelector('.grd-phone-band').getBoundingClientRect()
  return { line: boxWithin(band, view.querySelector('[data-box="line"]').getBoundingClientRect()) }
}

// A flat stop as a two-stop ramp, to pick the ink for the label set on it.
const flat = (color) => [{ color, position: 0 }, { color, position: 100 }]

function PhoneScene({ framed, paint, stops, type, angle, mesh }) {
  const [ref, spots] = useMeasured(measurePhone)
  const fill = phoneButton(stops)
  const lineInk = useMemo(() => inkFor(stops, type, angle, spots?.line, mesh), [stops, type, angle, spots, mesh])
  const buttonInk = useMemo(() => inkFor(flat(fill), type, angle), [fill, type, angle])
  const badge = sceneBadge([lineInk, buttonInk])
  const screen = (
    <div className="grd-phone">
      <div className="grd-phone-band" style={{ background: paint }}>
        <span className="grd-phone-ticket-tag">Channel Ferry Co.</span>
        <p className="grd-phone-line" data-box="line" style={{ color: lineInk.css }}>{PHONE_COPY.line}</p>
      </div>
      <div className="grd-phone-form">
        <p className="grd-phone-h">{PHONE_COPY.heading}</p>
        <p className="grd-phone-label">{PHONE_COPY.label}</p>
        <div className="grd-phone-field">{PHONE_COPY.departure}</div>
        <div className="grd-phone-btn" style={{ background: fill, color: buttonInk.css }}>{PHONE_COPY.button}</div>

      </div>
    </div>
  )
  return (
    <div className="grd-txt" ref={ref}>
      <div className="grd-txt-box grd-phone-box" aria-hidden="true">
        {framed ? <div className="grd-phone-frame">{screen}</div> : screen}
      </div>
      <Badge badge={badge} />
    </div>
  )
}

// The phone's frame is drawn from 901px; under that the screen is the whole stage and the
// frame is not in the page. The scene is keyed on it so the ink is measured again.
function PhoneText(props) {
  const framed = useMediaQuery(FRAME_QUERY)
  return <PhoneScene key={framed ? 'frame' : 'screen'} framed={framed} {...props} />
}

/**
 * The words and objects of one preview style over the canvas. `paint` is the canvas's own
 * gradient and `oklch` whether it blends in OKLCH; `name` is the Spec card's heading.
 */
export default function GradientText({ id, paint, stops, type, angle, oklch, name, mesh }) {
  if (id === 'poster') return <PosterText mesh={mesh} stops={stops} type={type} angle={angle} />
  if (id === 'spec') return <SpecText paint={paint} stops={stops} type={type} angle={angle} oklch={oklch} name={name} />
  if (id === 'icon') return <IconText mesh={mesh} paint={paint} stops={stops} type={type} angle={angle} />
  if (id === 'phone') return <PhoneText mesh={mesh} paint={paint} stops={stops} type={type} angle={angle} />
  return null
}
