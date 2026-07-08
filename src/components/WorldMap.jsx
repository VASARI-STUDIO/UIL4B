import { useMemo, useState } from 'react'

// Stylized dotted world map — decorative social proof for the sales surfaces.
//
// PRIVACY: this is purely illustrative. It shows a fixed set of named design
// hubs and a home pin on Brisbane; it never reads, stores, derives or displays
// any real user location or data. The honest caption below says as much.
//
// Build: continents are deliberately-simplified polygons in a 1000×500
// equirectangular frame (x = (lon+180)/360·1000, y = (90−lat)/180·500). A hex
// grid of candidate points is filtered with point-in-polygon, so the dot fill
// forms a recognisable, fully-controlled silhouette — no external map asset.

const VB_W = 1000
const VB_H = 500

const LAND = [
  // North America
  [[115, 80], [215, 68], [296, 86], [293, 140], [258, 190], [251, 212], [224, 205], [190, 165], [150, 140], [128, 108]],
  // Greenland
  [[300, 58], [340, 52], [352, 80], [330, 100], [305, 86]],
  // South America
  [[300, 236], [346, 232], [381, 256], [378, 300], [360, 346], [341, 402], [321, 388], [318, 330], [300, 281]],
  // Europe
  [[470, 96], [512, 72], [556, 66], [576, 96], [574, 120], [548, 150], [505, 150], [478, 128]],
  // Africa
  [[478, 150], [560, 150], [602, 176], [618, 220], [590, 290], [560, 346], [534, 352], [520, 300], [500, 240], [482, 190]],
  // Asia
  [[560, 80], [640, 58], [782, 60], [900, 90], [942, 120], [905, 160], [860, 176], [800, 210], [760, 250], [716, 236], [680, 200], [640, 170], [600, 150], [576, 110]],
  // Indonesia / SE-Asia isles
  [[770, 250], [832, 256], [862, 272], [820, 286], [786, 278]],
  // Australia
  [[858, 305], [916, 300], [958, 318], [945, 352], [900, 363], [865, 340]],
]

function inPoly(x, y, poly) {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], yi = poly[i][1]
    const xj = poly[j][0], yj = poly[j][1]
    const hit = (yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi
    if (hit) inside = !inside
  }
  return inside
}

const REGIONS = {
  americas: 'The Americas',
  europe: 'Europe',
  emea: 'Africa & Middle East',
  apac: 'Asia–Pacific',
}

// Named design hubs — illustrative, not user data. Brisbane is the UIL4B home pin.
const HUBS = [
  { id: 'sf', city: 'San Francisco', region: 'americas', x: 160, y: 145 },
  { id: 'tor', city: 'Toronto', region: 'americas', x: 280, y: 129 },
  { id: 'nyc', city: 'New York', region: 'americas', x: 291, y: 138 },
  { id: 'mex', city: 'Mexico City', region: 'americas', x: 225, y: 196 },
  { id: 'sao', city: 'São Paulo', region: 'americas', x: 370, y: 315 },
  { id: 'sto', city: 'Stockholm', region: 'europe', x: 551, y: 85 },
  { id: 'lon', city: 'London', region: 'europe', x: 500, y: 107 },
  { id: 'ber', city: 'Berlin', region: 'europe', x: 537, y: 104 },
  { id: 'lag', city: 'Lagos', region: 'emea', x: 509, y: 232 },
  { id: 'cpt', city: 'Cape Town', region: 'emea', x: 551, y: 344 },
  { id: 'dxb', city: 'Dubai', region: 'emea', x: 672, y: 176 },
  { id: 'blr', city: 'Bangalore', region: 'apac', x: 715, y: 214 },
  { id: 'sin', city: 'Singapore', region: 'apac', x: 790, y: 256 },
  { id: 'tyo', city: 'Tokyo', region: 'apac', x: 888, y: 151 },
  { id: 'bne', city: 'Brisbane', region: 'apac', x: 925, y: 326, home: true },
]

export default function WorldMap() {
  const [selected, setSelected] = useState(null)

  const dots = useMemo(() => {
    const step = 14
    const out = []
    let row = 0
    for (let y = step; y < VB_H; y += step, row++) {
      const xOff = row % 2 ? step / 2 : 0
      for (let x = step + xOff; x < VB_W; x += step) {
        if (LAND.some((p) => inPoly(x, y, p))) out.push([x, y])
      }
    }
    return out
  }, [])

  const region = selected ? REGIONS[selected] : null
  const regionCities = selected ? HUBS.filter((h) => h.region === selected).map((h) => h.city) : []

  return (
    <figure className="wmap" data-region={selected || undefined}>
      <div className="wmap-frame">
        <svg
          className="wmap-svg"
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          preserveAspectRatio="xMidYMid meet"
          aria-hidden="true"
          focusable="false"
        >
          {dots.map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="2.3" className="wmap-dot" />
          ))}
        </svg>

        <div
          className="wmap-hubs"
          onKeyDown={(e) => { if (e.key === 'Escape' && selected) setSelected(null) }}
        >
          {HUBS.map((h) => {
            const on = selected === h.region
            const dim = selected && h.region !== selected
            return (
              <button
                key={h.id}
                type="button"
                className={`wmap-blip${h.home ? ' is-home' : ''}${on ? ' is-on' : ''}`}
                style={{ left: `${h.x / 10}%`, top: `${h.y / 5}%` }}
                data-dim={dim ? 'true' : undefined}
                aria-pressed={on}
                aria-label={`${h.city}, ${REGIONS[h.region]}${h.home ? ' — UIL4B home' : ''}`}
                onClick={() => setSelected((s) => (s === h.region ? null : h.region))}
              >
                {h.home ? (
                  <span className="wmap-pin"><span className="wmap-pin-word">UIL4B</span></span>
                ) : (
                  <span className="wmap-blip-dot" aria-hidden="true" />
                )}
                <span className="wmap-tip" role="tooltip">{h.city}{h.home ? ' · HQ' : ''}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="wmap-foot">
        {region ? (
          <div className="wmap-callout" role="status">
            <span className="wmap-callout-region">{region}</span>
            <span className="wmap-callout-cities">{regionCities.join(' · ')}</span>
            <button type="button" className="wmap-callout-clear" onClick={() => setSelected(null)}>Clear</button>
          </div>
        ) : (
          <figcaption className="wmap-cap">
            Illustrative — a nod to the design community worldwide. Tap a city to explore a region. No user data is shown.
          </figcaption>
        )}
      </div>
    </figure>
  )
}
