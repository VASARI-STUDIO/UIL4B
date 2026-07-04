import { lazy, Suspense } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import PillNav from '../components/PillNav'
import Toast from '../components/Toast'
import { findCreateGroup, resolveTool } from '../data/toolTree'
import { useAuth } from '../contexts/AuthContext'
import { useSubscription } from '../contexts/SubscriptionContext'
import { useToast } from '../hooks/useToast'

// The in-tool shell for every Create route. The surrounding chrome — the left
// rail of sibling tools in the same Create group, and the Upgrade / account CTA —
// is real and driven entirely by src/data/toolTree.js, so it can never drift from
// the nav or the router.
//
// The content panel is a dispatcher:
//   • a LIVE tool route (mapped in LIVE_TOOLS) lazy-loads and mounts the real
//     library — its copy actions bubble up here as a toast;
//   • anything still in the workshop renders the friendly 🤫 "still building"
//     state, the same look as the standalone ComingSoon page.
//
// Auth + subscription are read ONLY, exactly like PillNav — to decide the
// account chip vs. the upgrade box. Nothing here is ever written.

const IconLibrary = lazy(() => import('./IconLibrary'))
const EmojiLibrary = lazy(() => import('./EmojiLibrary'))

// Route → the component that is actually built. A Create route absent from this
// map still renders the 🤫 state even if its group is flagged live — a safe
// fallback that can never mount a half-finished screen.
const LIVE_TOOLS = {
  '/icons': IconLibrary,
  '/emoji': EmojiLibrary,
}

// Match toolTree's own path handling (lowercase, strip query/hash, drop trailing
// slash) so the LIVE_TOOLS lookup never misses on a stray slash or casing.
function normPath(p) {
  const s = (p || '').toLowerCase().replace(/[?#].*$/, '').replace(/\/+$/, '')
  return s || '/'
}

// Initials fallback for the Pro avatar when there's no photo.
function initials(user) {
  const src = user?.displayName || user?.email || ''
  const parts = src.trim().split(/[\s@.]+/).filter(Boolean)
  const first = parts[0]?.[0] || 'U'
  const second = parts.length > 1 ? parts[1][0] : ''
  return (first + second).toUpperCase()
}

// The 🤫 "still in the workshop" state — the same friendly, playful look as the
// standalone ComingSoon page, but named for the tool the visitor actually reached.
function SoonState({ title, isPro }) {
  return (
    <div className="coming-wrap">
      <div className="coming-emoji" aria-hidden="true">🤫</div>
      <div className="coming-eyebrow">Shhh&hellip;</div>
      <h1 className="coming-title">{title} is still in the workshop.</h1>
      <p className="coming-sub">
        This one isn&rsquo;t quite ready for the world yet &mdash; we&rsquo;re switching UIL4B
        on one system at a time, and it&rsquo;ll light up right here the moment it&rsquo;s done.
        Thanks for being curious.
      </p>
      <div className="coming-actions">
        <Link to="/home" className="ui-pill ui-pill-ink ui-pill-md">See what&rsquo;s ready</Link>
        {!isPro && (
          <Link to="/checkout" className="ui-pill ui-pill-out ui-pill-md">Go Pro</Link>
        )}
      </div>
    </div>
  )
}

export default function CreateTool() {
  const location = useLocation()
  const { user } = useAuth()
  const { isPro } = useSubscription()
  const { message, visible, toast } = useToast()

  const group = findCreateGroup(location.pathname)
  const { tool, name, isHome } = resolveTool(location.pathname)

  // Impossible in practice — the router only mounts this on resolved Create
  // routes — but keeps the component honest if it's ever reused off-tree.
  if (!group) return <Navigate to="/home" replace />

  // A live group's category home has no screen of its own — send it to the first
  // real tool (e.g. /icons-emoji → /icons) so visitors never land on an empty home.
  const firstTool = group.tools?.[0]
  if (isHome && !group.soon && firstTool) {
    return <Navigate to={firstTool.route} replace />
  }

  const tools = group.tools || []
  const LiveTool = group.soon ? null : LIVE_TOOLS[normPath(location.pathname)]

  return (
    <>
      <PillNav />

      <div className="rail-shell" data-hue={group.hue}>
        {/* ── Desktop rail: sibling tools in this Create group ── */}
        <aside className="rail" aria-label={`${group.label} tools`}>
          <Link className="rail-cat" to={group.home}>
            <span className="fx-dot" aria-hidden="true" />
            {group.label}
          </Link>

          <ul className="rail-list">
            {tools.map((t) => {
              const active = t.id === tool?.id
              return (
                <li key={t.id}>
                  <Link
                    className={active ? 'rail-item is-active' : 'rail-item'}
                    to={t.route}
                    aria-current={active ? 'page' : undefined}
                  >
                    <span>{t.label}</span>
                    {t.soon && <span className="rail-item-soon">Soon</span>}
                  </Link>
                </li>
              )
            })}
          </ul>

          <div className="rail-spacer" />

          {isPro ? (
            <Link className="rail-profile" to="/settings">
              {user?.photoURL ? (
                <img className="rail-avatar" src={user.photoURL} alt="" referrerPolicy="no-referrer" />
              ) : (
                <span className="rail-avatar" aria-hidden="true">{initials(user)}</span>
              )}
              <span className="rail-profile-body">
                <span className="rail-profile-name">{user?.displayName || 'Your account'}</span>
                <span className="rail-pro">Pro</span>
              </span>
            </Link>
          ) : (
            <div className="rail-cta">
              <p className="rail-cta-title">Go Pro</p>
              <p className="rail-cta-desc">Every system, higher AI limits and synced projects.</p>
              <Link className="ui-pill ui-pill-accent ui-pill-sm ui-pill-block" to="/checkout">
                Upgrade
              </Link>
            </div>
          )}
        </aside>

        {/* ── Mobile chips (rail collapses ≤1024px) ── */}
        <div className="rail-chips" aria-label={`${group.label} tools`}>
          {tools.map((t) => {
            const active = t.id === tool?.id
            return (
              <Link
                key={t.id}
                className={active ? 'rail-chip is-active' : 'rail-chip'}
                to={t.route}
                aria-current={active ? 'page' : undefined}
              >
                {t.label}
              </Link>
            )
          })}
          {!isPro && (
            <Link className="rail-chip rail-chip-up" to="/checkout">
              Upgrade
            </Link>
          )}
        </div>

        {/* ── Content: the live tool, or the 🤫 still-building state ── */}
        <main className={LiveTool ? 'rail-content rail-content--live' : 'rail-content'}>
          {LiveTool ? (
            <Suspense fallback={<div className="page-loading"><div className="fg-loader" /></div>}>
              <LiveTool onCopy={() => toast('Copied to clipboard')} />
            </Suspense>
          ) : (
            <SoonState title={isHome ? group.label : name} isPro={isPro} />
          )}
        </main>
      </div>

      <Toast message={message} visible={visible} />
    </>
  )
}
