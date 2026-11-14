import { useMemo } from 'react'
import useMeasured from './useMeasured'
import useMediaQuery from '../../hooks/useMediaQuery'
import { boxWithin, inkFor, sceneInks, sceneBadge } from '../../utils/gradientText'
import {
  POSTER_COPY, PHONE_COPY, ICON_GLYPH, ICON_INK_BOX, phoneButton,
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
  const [ref, room] = useMeasured(measureHexRoom)
  const hexes = fitHexes(specHexes(stops), room || undefined)
  const note = specSampledNote(stops)
  return (
    <div className="grd-txt" ref={ref}>
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

// One icon: the canvas's gradient on a square, with the "T" in `ink`. A blank is a neutral
// home-screen neighbour and has no glyph.
function AppIcon({ size, paint, ink, blank }) {
  if (blank) return <span className={`grd-ic grd-ic--${size} grd-ic--blank`} />
  return (
    <span className={`grd-ic grd-ic--${size}`} style={{ background: paint, color: ink }}>
      <span className="grd-ic-t">{ICON_GLYPH}</span>
    </span>
  )
}

// Every icon is square, so the one ink for the glyph is chosen against the middle of a square
// of the gradient and used at every size.
function IconText({ paint, stops, type, angle }) {
  const ink = useMemo(() => inkFor(stops, type, angle, { aspect: 1, box: ICON_INK_BOX }), [stops, type, angle])
  const badge = sceneBadge([ink])
  const icon = (size, key) => <AppIcon key={key ?? size} size={size} paint={paint} ink={ink.css} />
  return (
    <div className="grd-txt">
      <div className="grd-txt-box grd-icon-box" aria-hidden="true">
        <div className="grd-icon-area">
          <div className="grd-icon-group">
            {icon('big')}
            <div className="grd-icon-col">
              <div className="grd-icon-sizes">{icon('120')}{icon('60')}{icon('40')}</div>
              <div className="grd-icon-home">
                <AppIcon size="60" blank />
                {icon('60', 'home')}
                <AppIcon size="60" blank />
                <AppIcon size="60" blank />
              </div>
            </div>
          </div>
        </div>
      </div>
      <Badge badge={badge} />
    </div>
  )
}

// The sign-in band against its own box, to pick the ink for the line set over it.
const measurePhone = (view) => {
  const band = view.querySelector('.grd-phone-band').getBoundingClientRect()
  return { line: boxWithin(band, view.querySelector('[data-box="line"]').getBoundingClientRect()) }
}

// A flat stop as a two-stop ramp, to pick the ink for the label set on it.
const flat = (color) => [{ color, position: 0 }, { color, position: 100 }]

function PhoneScene({ framed, paint, stops, type, angle }) {
  const [ref, spots] = useMeasured(measurePhone)
  const fill = phoneButton(stops)
  const lineInk = useMemo(() => inkFor(stops, type, angle, spots?.line), [stops, type, angle, spots])
  const buttonInk = useMemo(() => inkFor(flat(fill), type, angle), [fill, type, angle])
  const badge = sceneBadge([lineInk, buttonInk])
  const screen = (
    <div className="grd-phone">
      <div className="grd-phone-band" style={{ background: paint }}>
        <p className="grd-phone-line" data-box="line" style={{ color: lineInk.css }}>{PHONE_COPY.line}</p>
      </div>
      <div className="grd-phone-form">
        <p className="grd-phone-h">{PHONE_COPY.heading}</p>
        <p className="grd-phone-label">{PHONE_COPY.label}</p>
        <div className="grd-phone-field" />
        <div className="grd-phone-btn" style={{ background: fill, color: buttonInk.css }}>{PHONE_COPY.button}</div>
        <p className="grd-phone-link">{PHONE_COPY.link}</p>
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
export default function GradientText({ id, paint, stops, type, angle, oklch, name }) {
  if (id === 'poster') return <PosterText stops={stops} type={type} angle={angle} />
  if (id === 'spec') return <SpecText paint={paint} stops={stops} type={type} angle={angle} oklch={oklch} name={name} />
  if (id === 'icon') return <IconText paint={paint} stops={stops} type={type} angle={angle} />
  if (id === 'phone') return <PhoneText paint={paint} stops={stops} type={type} angle={angle} />
  return null
}
