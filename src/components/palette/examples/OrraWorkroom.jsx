// Orra Workroom: a product page for one overshirt, painted with the user's
// palette. The garment is the brand field (primary); the colourway picker shows
// all five slots as named swatches, so the palette reads as a product range.
//
// The garment is drawn inline by <Garment view>, once per place it appears (the
// stage and each thumbnail), never cloned with <use>: the legend finds a role
// by querying real elements, and a <use> clone has none to find.
//
// Pure: no state, no effects. Colours arrive as --pv-* custom properties from
// the dialog; the ones this scene works out itself are set on its root.
import { useMemo } from 'react'
import { PRODUCT, SWATCH_ROLES, orraVars, swatchName } from './OrraWorkroom.data.js'
import './OrraWorkroom.css'

// One shirt, 400 x 480. The pocket view is the front, reframed on the left
// chest pocket.
const VIEWBOX = { front: '0 0 400 480', back: '0 0 400 480', pocket: '112 144 92 104' }

const BODY_FRONT = 'M164 46 L118 60 C96 66 78 76 70 92 L30 292 L78 304 L106 172 L108 452 C160 462 240 462 292 452 L294 172 L322 304 L370 292 L330 92 C322 76 304 66 282 60 L236 46 C224 62 176 62 164 46 Z'
const BODY_BACK = 'M164 46 L118 60 C96 66 78 76 70 92 L30 292 L78 304 L106 172 L108 452 C160 462 240 462 292 452 L294 172 L322 304 L370 292 L330 92 C322 76 304 66 282 60 L236 46 C224 52 176 52 164 46 Z'
const BUTTONS = [100, 152, 204, 256, 308, 360, 412]

// Seams common to both sides: armholes, cuffs, hem.
const SEAMS = 'M118 60 C112 100 108 140 106 172 M282 60 C288 100 292 140 294 172 M37 262 L84 274 M363 262 L316 274 M110 440 C160 449 240 449 290 440'

function Pocket({ x }) {
  const c = x + 26
  return (
    <g>
      <path className="or-body" d={`M${x} 168 H${x + 52} V230 Q${c} 240 ${x} 230 Z`} data-role="primary" />
      <path className="or-seam" d={`M${x + 4} 172 V228 M${x + 48} 172 V228 M${c} 192 V236`} data-role="deep" />
      <path className="or-body" d={`M${x - 4} 160 H${x + 56} V184 Q${c} 192 ${x - 4} 184 Z`} data-role="primary" />
      <path className="or-seam" d={`M${x} 180 Q${c} 187 ${x + 48} 180`} data-role="deep" />
      <circle className="or-btn" cx={c} cy="180" r="4.5" data-role="subtle" />
    </g>
  )
}

function Garment({ view }) {
  const back = view === 'back'
  return (
    <svg className="or-garment" viewBox={VIEWBOX[view]} preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      <path className="or-body or-body--outline" d={back ? BODY_BACK : BODY_FRONT} data-role="primary" />
      <path className="or-seam" d={SEAMS} data-role="deep" />
      {back ? (
        <>
          <path className="or-body" d="M164 46 C176 30 224 30 236 46 C224 52 176 52 164 46 Z" data-role="primary" />
          <path className="or-seam" d="M112 128 C170 142 230 142 288 128 M188 136 V214 M212 136 V214 M168 41 C182 34 218 34 232 41" data-role="deep" />
          <path className="or-tab" d="M194 52 Q200 68 206 52" data-role="accent" />
        </>
      ) : (
        <>
          <path className="or-lining" d="M164 46 C178 38 222 38 236 46 C224 60 176 60 164 46 Z" data-role="secondary" />
          <path className="or-body" d="M192 74 H208 V456 H192 Z" data-role="primary" />
          <path className="or-seam" d="M195 78 V452 M205 78 V452" data-role="deep" />
          <path className="or-body" d="M164 46 L146 56 L170 106 L200 76 Z M236 46 L254 56 L230 106 L200 76 Z" data-role="primary" />
          <path className="or-seam" d="M151 57 L171 99 M249 57 L229 99" data-role="deep" />
          {BUTTONS.map((y) => <circle key={y} className="or-btn" cx="200" cy={y} r="5" data-role="subtle" />)}
          <Pocket x={128} />
          <Pocket x={220} />
          <rect className="or-tabfill" x="180" y="196" width="8" height="18" rx="1.5" data-role="accent" />
        </>
      )}
    </svg>
  )
}

const Plus = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true"><path d="M8 3v10M3 8h10" /></svg>
)
const Heart = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" aria-hidden="true"><path d="M8 13.5S2 10 2 5.8A3 3 0 0 1 8 4.5a3 3 0 0 1 6 1.3C14 10 8 13.5 8 13.5Z" /></svg>
)

/**
 * @param {{roles: object, labels?: string[]}} props roles: derivePaletteRoles();
 *   labels: the five slot names, in slot order
 */
export default function OrraWorkroom({ roles, labels = [] }) {
  const vars = useMemo(() => orraVars(roles), [roles])
  const names = SWATCH_ROLES.map((_, i) => swatchName(labels[i], i))
  const price = `$${PRODUCT.price}`
  return (
    <div className="or" style={vars}>
      <header className="or-top" data-role="neutral">
        <span className="or-mark">Orra Workroom</span>
        <nav className="or-nav"><span className="is-on">Shirts</span><span>Trousers</span><span>Workroom</span></nav>
        <span className="or-bag">Bag <b>0</b></span>
      </header>

      <p className="or-crumb">Shirts <span aria-hidden="true">/</span> Overshirts <span aria-hidden="true">/</span> <b>{PRODUCT.name}</b></p>

      <div className="or-main">
        <section className="or-stage" data-role="neutral">
          <div className="or-figure"><Garment view="front" /></div>
          <div className="or-thumbs">
            {PRODUCT.views.map((v, i) => (
              <span key={v.id} className={i === 0 ? 'or-thumb is-on' : 'or-thumb'} style={{ '--i': i }}>
                <Garment view={v.id} />
                <span className="or-thumb-t">{v.name}</span>
              </span>
            ))}
          </div>
          <p className="or-shown">Shown in {names[0]}, size M</p>
        </section>

        <section className="or-buy">
          <p className="or-maker">{PRODUCT.maker}</p>
          <h3 className="or-title">{PRODUCT.name}</h3>
          <p className="or-price">{price}<span>{PRODUCT.terms}</span></p>
          <p className="or-body-t">{PRODUCT.body}</p>

          <div className="or-opt">
            <p className="or-opt-l">Colourway <b>{names[0]}</b></p>
            <div className="or-swatches">
              {SWATCH_ROLES.map((role, i) => (
                <span key={role} className={i === 0 ? 'or-sw is-on' : 'or-sw'} title={names[i]}>
                  <i data-role={role} style={{ background: `var(--pv-${role})`, borderColor: `var(--or-sw-${role})` }} />
                  <span className="or-sw-t">{names[i]}</span>
                </span>
              ))}
            </div>
          </div>

          <div className="or-opt">
            <p className="or-opt-l">Size <b>M</b><span className="or-guide">Size guide</span></p>
            <div className="or-sizes">
              {PRODUCT.sizes.map((s) => (
                <span key={s.id} className={`or-size${s.on ? ' is-on' : ''}${s.off ? ' is-off' : ''}`} aria-disabled={s.off ? 'true' : undefined}>{s.id}</span>
              ))}
            </div>
            <p className="or-help">{PRODUCT.sizeHelp}</p>
          </div>

          <p className="or-stock" data-role="success"><i aria-hidden="true" />{PRODUCT.stock}</p>

          <div className="or-ctas">
            <span className="or-cta" data-role="primary">Add to bag · {price}</span>
            <span className="or-save" data-role="neutral"><Heart /> Save</span>
          </div>

          <ul className="or-details" data-role="neutral">
            {PRODUCT.details.map((d) => <li key={d}>{d}<Plus /></li>)}
          </ul>
        </section>
      </div>
    </div>
  )
}
