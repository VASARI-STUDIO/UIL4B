import { styleVars } from '../../utils/gradientPreviewStyles'

// The Gradient Generator's preview styles, drawn over the canvas slot. Everything is CSS
// (gradients, masks, blur and an SVG noise tile) so it is vector-crisp at any pixel
// density and is painted once per gradient change, never per frame. The rules live in
// gradient.css under "PREVIEW STYLES".
//
// Fluted glass and Glow ring are seen through reeded glass: the scene is drawn several
// times, each copy shifted a little sideways and masked to one narrow slice of every
// flute, so each flute shows a sweep of the scene around where it sits.
const SLICES = 6

function Flutes({ children }) {
  return (
    <div className="grd-fx-flutes">
      {Array.from({ length: SLICES }, (_, k) => (
        <div key={k} className="grd-fx-slice" style={{ '--k': k }}>
          <div className="grd-fx-slice-in">{children}</div>
        </div>
      ))}
    </div>
  )
}

// Slit-scan columns: three layers of the same colours, each cut into thin columns of its
// own pitch and faded at its own top and bottom, so the streaks differ in length and weight.
const STREAKS = [
  { pitch: '7px', bar: '3px', from: '6%', to: '94%', alpha: 0.95 },
  { pitch: '11px', bar: '2px', from: '22%', to: '100%', alpha: 0.75 },
  { pitch: '17px', bar: '4px', from: '0%', to: '70%', alpha: 0.6 },
]

function Scene({ id }) {
  switch (id) {
    case 'grain':
      return (<><div className="grd-fx-blob" /><div className="grd-fx-grain" /></>)
    case 'fluted':
      return (<><div className="grd-fx-fill" /><Flutes><div className="grd-fx-fill" /></Flutes></>)
    case 'ring':
      return (<Flutes><div className="grd-fx-halo" /><div className="grd-fx-ring" /></Flutes>)
    case 'streak':
      return STREAKS.map((s) => (
        <div key={s.pitch} className="grd-fx-cols" style={{ '--fx-pitch': s.pitch, '--fx-bar': s.bar, '--fx-alpha': s.alpha }}>
          <div className="grd-fx-col-fill" style={{ '--fx-from': s.from, '--fx-to': s.to }} />
        </div>
      ))
    case 'glow':
      return (
        <>
          <div className="grd-fx-orb grd-fx-orb--low" />
          <div className="grd-fx-orb grd-fx-orb--high" />
          <div className="grd-fx-orb grd-fx-orb--heart" />
          <div className="grd-fx-vignette" />
          <div className="grd-fx-grain" />
        </>
      )
    case 'fade':
      return (<><div className="grd-fx-wash" /><div className="grd-fx-grain" /></>)
    case 'poster':
      return (<div className="grd-poster-frame"><div className="grd-fx-grain" /></div>)
    case 'spec':
      // The ground only: the card, its strip and its words are the text layer's (GradientText.jsx).
      return null
    default:
      return null
  }
}

/**
 * One preview style drawn from the stops. `paint` is the canvas's own gradient CSS and
 * `oklch` says whether it blends in OKLCH, so a style reads colour as the canvas does.
 */
export default function GradientFx({ id, stops, paint, oklch }) {
  return (
    <div className="grd-fx" data-fx={id} aria-hidden="true" style={styleVars(id, { stops, paint, oklch })}>
      <Scene id={id} />
    </div>
  )
}
