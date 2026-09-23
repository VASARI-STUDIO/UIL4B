import { lazy, Suspense, useCallback, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import useOnline from '../hooks/useOnline'
import { useI18n } from '../contexts/I18nContext'
import DiscoverGalleryHero from '../components/discover/DiscoverGalleryHero'
// The stylesheet families this surface needs, split out of the one
// render-blocking global sheet (see src/styles/deferred/). They ride this
// route's own lazy chunk, so they arrive with it and never with the homepage.
import '../styles/deferred/library.css'
import '../styles/deferred/tool-shell.css'
// This page's own sheet — every selector rooted at `.iel-page`, so it wins on
// specificity rather than on whichever chunk the bundler emits last.
import '../styles/pages/icon-emoji-library.css'

const IconLibrary = lazy(() => import('./IconLibrary'))
const EmojiLibrary = lazy(() => import('./EmojiLibrary'))

// Merged Icon + Emoji surface. Both /create/icons and /create/emoji mount THIS component, so the
// mega-menu deep-links stay valid; the active tab is derived from the path and the
// large segmented pill (styled as the page title) flips between the two libraries.
// Neither child renders a masthead of its own — this wrapper owns the title —
// while copy actions still bubble up through onCopy unchanged. Both used to
// carry one behind an `embedded` prop this file always passed, so the prop
// selected between one live branch and one unreachable one; it is gone with the
// branch, and each child's own file says why.
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
  // What the icon grid is actually showing: 'live' (the Iconify catalogue) or
  // 'fallback' (the built-in set, because every host refused). Reported by
  // IconLibrary from the same flag that renders its "Couldn't reach the icon
  // service" notice. The pill below used to read navigator.onLine ALONE, so
  // during the 2026-09-08 outage (429 from api.iconify.design, 403 from both
  // fallbacks, browser online throughout) it said "Live library connected" in
  // green directly above that notice. The browser's connection is not the
  // catalogue's state; the pill now reflects the thing it is standing above.
  const [catalogue, setCatalogue] = useState('live')
  const onCatalogue = useCallback((state) => setCatalogue(state), [])
  // The fallback reading belongs to the ICON grid only: the emoji library is
  // built in and never asks the catalogue for anything.
  const iconFallback = tab === 'icon' && catalogue === 'fallback'
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
    <div className="sec lib-surface iel-page">
      {/* THE SHARED LIBRARY MASTHEAD. #292 moved this surface's browse language
          onto the Palette/Gradient components; the hero was not part of that,
          so it stayed on a bespoke `.lib-head` — light, flush, 56px/720-weight
          — next to two galleries wearing a 110px serif on a dark band. Founder
          request: match the feeling of the other gallery pages. Same direction
          of travel as #292: this page joins the existing pattern.

          THE HEADLINE IS NOW THE LIBRARY'S NAME. The galleries' agreed
          vocabulary is title case with no trailing full stop ("Palette
          Library"), which tests/user-sim/15-discover-library-parity.spec.js
          already pins for them. "Icons for every interface." was a sentence, so
          it sat outside that vocabulary AND disagreed with the <title> the same
          route ships ("UI L4B | Icon Library"). The two tabs still differ from
          each other, which is the constraint that matters: /create/icons and
          /create/emoji are two indexable URLs and must not share an h1. */}
      <DiscoverGalleryHero
        title={tab === 'icon' ? 'Icon Library' : 'Emoji Library'}
        description={tab === 'icon' ? t('iconLibrary.subtitle') : t('emojiLibrary.subtitle')}
        aside={(
          <>
            {/* The galleries put a decorative count in this column. This surface
                puts the control that says WHICH library you are in — so it goes
                through `aside`, not `mark`: never aria-hidden, and never
                dropped on a narrow screen the way the count is. */}
            <div className="lib-switch" role="tablist" aria-label="Choose asset library">
              <button
                id="lib-tab-icon"
                type="button"
                role="tab"
                aria-selected={tab === 'icon'}
                aria-controls="lib-panel-icon"
                tabIndex={tab === 'icon' ? 0 : -1}
                className={`lib-switch-btn${tab === 'icon' ? ' is-active' : ''}`}
                title="Icons — SVG and JSX"
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
                title="Emoji — Unicode, copy-ready"
                ref={(node) => { if (node) tabRefs.current.emoji = node }}
                onClick={() => activateTab('emoji')}
                onKeyDown={(event) => onTabKeyDown(event, 'emoji')}
              >
                <span className="lib-switch-emoji" aria-hidden="true">🙂</span>
                <span><strong>Emoji</strong><small>Unicode, copy-ready</small></span>
              </button>
            </div>
            <div className="lib-head-status">
              {/* Three readings, one truth each. "Built-in icons" is the grid's own
                  status line for this state (IconLibrary's `mode`), reused rather
                  than a new sentence; the notice above the grid says why.

                  AND IT IS NOT SHOWN ON THE EMOJI TAB WHILE ONLINE, because
                  there is no library to be connected to. #435 fixed the icon
                  half of this reading — the pill said "Live library connected"
                  in green above the notice saying the icon service could not be
                  reached — and left the emoji half standing, with the reason
                  recorded: no existing sentence fits an emoji set that is
                  compiled into the bundle, and none was invented. Measured
                  again 2026-09-11 at 1280: `.lib-net is-online "Live library
                  connected"` on /create/emoji, whose 1,655 emoji are a local
                  module and which asks the network for nothing.

                  Omitting the claim needs no sentence, and that is the whole
                  reason it is the fix: a status that cannot be stated truthfully
                  from the words this product already owns should not be stated.
                  The OFFLINE reading stays on both tabs and is true on both —
                  the emoji set is exactly the "built-in assets" it promises
                  remain available. A truthful online reading for the emoji tab
                  is the founder's sentence to write. */}
              {(!online || tab === 'icon') && (
                <span className={!online ? 'lib-net is-offline' : iconFallback ? 'lib-net is-fallback' : 'lib-net is-online'}>
                  <i aria-hidden="true" />
                  {!online ? 'Offline · built-in assets remain available' : iconFallback ? 'Built-in icons' : 'Live library connected'}
                </span>
              )}
              <span className="lib-keyhint">Use ← → to switch</span>
            </div>
          </>
        )}
      />

      {/* Both panels stay mounted once visited; only the active one is shown. */}
      <div
        id="lib-panel-icon"
        role="tabpanel"
        aria-labelledby="lib-tab-icon"
        hidden={tab !== 'icon'}
      >
        {mounted.has('icon') && (
          <Suspense fallback={fallback}>
            <IconLibrary onCopy={onCopy} onCatalogue={onCatalogue} />
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
            <EmojiLibrary onCopy={onCopy} />
          </Suspense>
        )}
      </div>
    </div>
    </>
  )
}
