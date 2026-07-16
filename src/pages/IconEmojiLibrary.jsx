import { lazy, Suspense, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useI18n } from '../contexts/I18nContext'
import AppFooter from '../components/AppFooter'

const IconLibrary = lazy(() => import('./IconLibrary'))
const EmojiLibrary = lazy(() => import('./EmojiLibrary'))

// Merged Icon + Emoji surface. Both /icons and /emoji mount THIS component, so the
// mega-menu deep-links stay valid; the active tab is derived from the path and the
// large segmented pill (styled as the page title) flips between the two libraries.
// Each child renders `embedded` so it drops its own <h1> — this wrapper owns the
// title — while copy actions still bubble up through onCopy unchanged.
//
// PERF — keep-alive tabs: the two libraries are DIFFERENT component types, so the
// old `tab === 'icon' ? <IconLibrary/> : <EmojiLibrary/>` unmounted one and mounted
// the other on every switch. That re-fired IconLibrary's whole CDN /collection
// waterfall (and threw away EmojiLibrary's parsed grid) each time — the tab-switch
// freeze. Now each library mounts on FIRST visit and stays mounted; switching just
// toggles `hidden` (display:none), so state, scroll and fetched data survive and
// the switch is instant. The inactive panel's IntersectionObservers idle while
// hidden, so there's no background cost either.
export default function IconEmojiLibrary({ onCopy }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { t } = useI18n()
  const tab = location.pathname.toLowerCase().includes('emoji') ? 'emoji' : 'icon'

  // Track which tabs have ever been shown — mount lazily on first visit, then
  // keep alive. The initial tab is seeded so it mounts on first paint; a newly
  // visited tab is folded in via React's derive-state-during-render pattern (no
  // effect, so no cascading-render lint warning and no extra commit).
  const [mounted, setMounted] = useState(() => new Set([tab]))
  if (!mounted.has(tab)) setMounted(new Set(mounted).add(tab))

  const fallback = <div className="page-loading"><div className="fg-loader" /></div>

  return (
    <>
    <div className="sec">
      <div className="sec-h lib-head">
        <div className="lib-switch" role="tablist" aria-label="Library">
          <button
            id="lib-tab-icon"
            type="button"
            role="tab"
            aria-selected={tab === 'icon'}
            aria-controls="lib-panel-icon"
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
            aria-controls="lib-panel-emoji"
            tabIndex={tab === 'emoji' ? 0 : -1}
            className={`lib-switch-btn${tab === 'emoji' ? ' is-active' : ''}`}
            onClick={() => { if (tab !== 'emoji') navigate('/emoji') }}
          >
            Emoji
          </button>
        </div>
        <p>{tab === 'icon' ? t('iconLibrary.subtitle') : t('emojiLibrary.subtitle')}</p>
      </div>

      {/* Both panels stay mounted once visited; only the active one is shown. */}
      <div
        id="lib-panel-icon"
        role="tabpanel"
        aria-labelledby="lib-tab-icon"
        hidden={tab !== 'icon'}
      >
        {mounted.has('icon') && (
          <Suspense fallback={fallback}>
            <IconLibrary embedded onCopy={onCopy} />
          </Suspense>
        )}
      </div>

      <div
        id="lib-panel-emoji"
        role="tabpanel"
        aria-labelledby="lib-tab-emoji"
        hidden={tab !== 'emoji'}
      >
        {mounted.has('emoji') && (
          <Suspense fallback={fallback}>
            <EmojiLibrary embedded onCopy={onCopy} />
          </Suspense>
        )}
      </div>
    </div>
    {/* Chromeless Create surface — mount the shared system footer here so the
        icon/emoji library closes with the same footer as the rest of the app. */}
    <AppFooter />
    </>
  )
}
