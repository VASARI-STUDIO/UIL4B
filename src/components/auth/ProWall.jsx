import { AUTH_WALL } from '../../data/authWall.js'
import { AUTH_WALL_GENERATED as G } from '../../data/authWall.generated.js'
import { useI18n } from '../../contexts/I18nContext'
import { Art } from './AuthWall.jsx'
import '../../styles/pages/auth.css'
import '../../styles/pages/auth-page.css'
import '../../styles/v3-pro-auth.css'

// The wall of sample exports beside the sign-up and sign-in forms: image-only
// tiles in tilted columns. It is decoration, so it is hidden from assistive
// tech; the labels name it as samples. Text-only tiles (code excerpts) are left
// out so every tile reads as a picture of a file.
const ROWS = AUTH_WALL.filter((r) => r.kind !== 'scale')
const COLUMNS = { wall: 7, strip: 5 }
const capital = (s) => s.charAt(0).toUpperCase() + s.slice(1)

function columnRows(col, perColumn) {
  const out = []
  for (let i = 0; i < perColumn; i += 1) out.push(ROWS[(col * 3 + i * 2) % ROWS.length])
  return out
}

// One copy of a column's tiles. The wall draws each column twice so the loop
// has no seam; the second copy is hidden from assistive tech and the keyboard.
function TileSet({ rows, copy = false }) {
  return (
    <div className="pw-set" aria-hidden={copy || undefined} inert={copy || undefined}>
      {rows.map((row, i) => (
        <div className={'pw-tile pw-tile--' + row.kind} key={row.id + i}>
          <Art row={row} />
          {row.kind === 'icons' && (
            <span className="pw-cap">{capital(G.icons[row.id].group)} · {capital(G.icons[row.id].pack)} · SVG</span>
          )}
        </div>
      ))}
    </div>
  )
}

/**
 * variant "wall": the tilted wall that fills a half or a pane. It drifts, is
 * paused by hover and is still under reduced motion.
 * variant "strip": the short still strip under the top bar on a phone.
 */
export default function ProWall({ variant = 'wall', label = true }) {
  const { t } = useI18n()
  const strip = variant === 'strip'
  const perColumn = strip ? 3 : 7
  return (
    <div className={'pw pw--' + variant} aria-hidden="true" data-pro-wall>
      <div className="pw-tilt">
        {Array.from({ length: COLUMNS[variant] ?? COLUMNS.wall }, (_, c) => {
          const rows = columnRows(c, perColumn)
          return (
            <div className="pw-col" key={c}>
              <TileSet rows={rows} />
              {!strip && <TileSet rows={rows} copy />}
            </div>
          )
        })}
      </div>
      {label && variant === 'wall' && <span className="pw-label">{t('auth.wall.sampleNote')}</span>}
    </div>
  )
}
