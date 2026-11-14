import { AUTH_WALL } from '../../data/authWall.js'
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
const COLUMNS = 5

function columnRows(col, perColumn) {
  const out = []
  for (let i = 0; i < perColumn; i += 1) out.push(ROWS[(col * 3 + i * 2) % ROWS.length])
  return out
}

/**
 * variant "wall": the tilted wall that fills a half or a pane.
 * variant "strip": the short still strip under the top bar on a phone.
 * `fade` is the wall's opacity in the popup's left pane.
 */
export default function ProWall({ variant = 'wall', label = true }) {
  const { t } = useI18n()
  const perColumn = variant === 'strip' ? 3 : 7
  return (
    <div className={'pw pw--' + variant} aria-hidden="true" data-pro-wall>
      <div className="pw-tilt">
        {Array.from({ length: COLUMNS }, (_, c) => (
          <div className="pw-col" key={c}>
            {columnRows(c, perColumn).map((row, i) => (
              <div className={'pw-tile pw-tile--' + row.kind} key={row.id + i}>
                <Art row={row} />
              </div>
            ))}
          </div>
        ))}
      </div>
      {label && variant === 'wall' && <span className="pw-label">{t('auth.wall.sampleNote')}</span>}
    </div>
  )
}
