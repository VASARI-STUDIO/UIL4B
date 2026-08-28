import { lazy, Suspense, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import useOnline from '../hooks/useOnline'
import { useI18n } from '../contexts/I18nContext'

const IconLibrary = lazy(() => import('./IconLibrary'))
const EmojiLibrary = lazy(() => import('./EmojiLibrary'))

// Merged Icon + Emoji surface. Both /create/icons and /create/emoji mount THIS component, so the
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
  const online = useOnline()   // the shared signal; see src/hooks/useOnline.js
  const tabRefs = useRef({})
  if (!mounted.has(tab)) setMounted(new Set(mounted).add(tab))

  const activateTab = (next) => navigate(next === 'icon' ? '/create/icons' : '/create/emoji')
  const onTabKeyDown = (event, current) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    const next = event.key === 'ArrowLeft' || event.key === 'Home'
      ? 'icon'
      : event.key === 'ArrowRight' || event.key === 'End' ? 'emoji' : current
    activateTab(next)
    requestAnimationFrame(() => tabRefs.current[next]?.focus())
  }

  const fallback = (
    <div className="lib-loading" role="status" aria-live="polite">
      <div className="fg-loader" />
      <strong>Opening the {tab === 'icon' ? 'icon' : 'emoji'} library</strong>
      <span>Your search and filters will stay in place when you switch libraries.</span>
    </div>
  )

  return (
    <>
    <div className="sec">
      <header className="lib-head">
        <div className="lib-head-copy">
          <span className="lib-eyebrow">Asset library</span>
          {/* /create/icons and /create/emoji are two separate indexable URLs sharing this
              component, and they shared this headline verbatim — so both pages
              announced "Find the right symbol. Keep building." to a crawler and
              to anyone navigating by heading. The subtitle below already
              differed per tab; the h1 is the one that matters most and did not. */}
          <h1>{tab === 'icon' ? 'Icons for every interface.' : 'Every emoji, one tap away.'}</h1>
          <p>{tab === 'icon' ? t('iconLibrary.subtitle') : t('emojiLibrary.subtitle')}</p>
        </div>
        <div className="lib-switch" role="tablist" aria-label="Choose asset library">
          <button
            id="lib-tab-icon"
            type="button"
            role="tab"
            aria-selected={tab === 'icon'}
            aria-controls="lib-panel-icon"
            tabIndex={tab === 'icon' ? 0 : -1}
            className={`lib-switch-btn${tab === 'icon' ? ' is-active' : ''}`}
            ref={(node) => { if (node) tabRefs.current.icon = node }}
            onClick={() => activateTab('icon')}
            onKeyDown={(event) => onTabKeyDown(event, 'icon')}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="6" height="6" rx="1.5" /><circle cx="17" cy="7" r="3" /><path d="m7 14-3 6h6zM14 14h6v6h-6z" /></svg>
            <span><strong>Icons</strong><small>SVG and JSX</small></span>
          </button>
          <button
            id="lib-tab-emoji"
            type="button"
            role="tab"
            aria-selected={tab === 'emoji'}
            aria-controls="lib-panel-emoji"
            tabIndex={tab === 'emoji' ? 0 : -1}
            className={`lib-switch-btn${tab === 'emoji' ? ' is-active' : ''}`}
            ref={(node) => { if (node) tabRefs.current.emoji = node }}
            onClick={() => activateTab('emoji')}
            onKeyDown={(event) => onTabKeyDown(event, 'emoji')}
          >
            <span className="lib-switch-emoji" aria-hidden="true">🙂</span>
            <span><strong>Emoji</strong><small>Unicode, copy-ready</small></span>
          </button>
        </div>
        <div className="lib-head-status">
          <span className={online ? 'lib-net is-online' : 'lib-net is-offline'}>
            <i aria-hidden="true" />
            {online ? 'Live library connected' : 'Offline · built-in assets remain available'}
          </span>
          <span className="lib-keyhint">Use ← → to switch</span>
        </div>
      </header>

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
    </>
  )
}
