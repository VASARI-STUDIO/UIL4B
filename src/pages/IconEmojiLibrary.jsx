import { lazy, Suspense } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useI18n } from '../contexts/I18nContext'

const IconLibrary = lazy(() => import('./IconLibrary'))
const EmojiLibrary = lazy(() => import('./EmojiLibrary'))

// Merged Icon + Emoji surface. Both /icons and /emoji mount THIS component, so the
// mega-menu deep-links stay valid; the active tab is derived from the path and the
// large segmented pill (styled as the page title) flips between the two libraries.
// Each child renders `embedded` so it drops its own <h1> — this wrapper owns the
// title — while copy actions still bubble up through onCopy unchanged.
export default function IconEmojiLibrary({ onCopy }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { t } = useI18n()
  const tab = location.pathname.toLowerCase().includes('emoji') ? 'emoji' : 'icon'

  return (
    <div className="sec">
      <div className="sec-h lib-head">
        <div className="lib-switch" role="tablist" aria-label="Library">
          <button
            id="lib-tab-icon"
            type="button"
            role="tab"
            aria-selected={tab === 'icon'}
            aria-controls="lib-panel"
            tabIndex={tab === 'icon' ? 0 : -1}
            className={`lib-switch-btn${tab === 'icon' ? ' is-active' : ''}`}
            onClick={() => { if (tab !== 'icon') navigate('/icons') }}
          >
            Icons
          </button>
          <button
            id="lib-tab-emoji"
            type="button"
            role="tab"
            aria-selected={tab === 'emoji'}
            aria-controls="lib-panel"
            tabIndex={tab === 'emoji' ? 0 : -1}
            className={`lib-switch-btn${tab === 'emoji' ? ' is-active' : ''}`}
            onClick={() => { if (tab !== 'emoji') navigate('/emoji') }}
          >
            Emoji
          </button>
        </div>
        <p>{tab === 'icon' ? t('iconLibrary.subtitle') : t('emojiLibrary.subtitle')}</p>
      </div>

      <div
        id="lib-panel"
        role="tabpanel"
        aria-labelledby={tab === 'icon' ? 'lib-tab-icon' : 'lib-tab-emoji'}
      >
        <Suspense fallback={<div className="page-loading"><div className="fg-loader" /></div>}>
          {tab === 'icon'
            ? <IconLibrary embedded onCopy={onCopy} />
            : <EmojiLibrary embedded onCopy={onCopy} />}
        </Suspense>
      </div>
    </div>
  )
}
