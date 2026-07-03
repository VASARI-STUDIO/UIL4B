import { Link, Navigate, useLocation } from 'react-router-dom'
import PillNav from '../components/PillNav'
import { findCreateGroup, resolveTool } from '../data/toolTree'
import { useAuth } from '../contexts/AuthContext'
import { useSubscription } from '../contexts/SubscriptionContext'

// The in-tool shell for every Create route. Phase 1 is structure-only: each tool
// renders a blank "coming soon" state, but the surrounding chrome — the left rail
// of sibling tools in the same Create group, and the Upgrade / account CTA — is
// real and driven entirely by src/data/toolTree.js, so it can never drift from
// the nav or the router. When the founder builds a real tool, only the content
// panel changes; the rail keeps working untouched.
//
// Auth + subscription are read ONLY, exactly like PillNav — to decide the
// account chip vs. the upgrade box. Nothing here is ever written.

// Initials fallback for the Pro avatar when there's no photo.
function initials(user) {
  const src = user?.displayName || user?.email || ''
  const parts = src.trim().split(/[\s@.]+/).filter(Boolean)
  const first = parts[0]?.[0] || 'U'
  const second = parts.length > 1 ? parts[1][0] : ''
  return (first + second).toUpperCase()
}

export default function CreateTool() {
  const location = useLocation()
  const { user } = useAuth()
  const { isPro } = useSubscription()

  const group = findCreateGroup(location.pathname)
  const { tool, name, isHome } = resolveTool(location.pathname)

  // Impossible in practice — the router only mounts this on resolved Create
  // routes — but keeps the component honest if it's ever reused off-tree.
  if (!group) return <Navigate to="/home" replace />

  const tools = group.tools || []

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

        {/* ── Content: blank "coming soon" state (Phase 1) ── */}
        <main className="rail-content">
          <div className="soon">
            <div className="spec-frame" data-hue={group.hue}>
              <span className="spec-label">{name} · preview</span>
            </div>
            <div className="soon-mark">
              <span className="soon-badge soon-badge-accent">In the workshop</span>
            </div>
            <h1 className="soon-title">{isHome ? group.label : name} is coming soon.</h1>
            <p className="soon-text">
              This is where {isHome ? 'the tools for ' : ''}
              <b>{name}</b> will live. We&rsquo;re rebuilding UIL4B one system at a time —
              {' '}{group.label} is next on the bench, and it switches on here the moment it&rsquo;s ready.
            </p>
            <div className="soon-actions">
              <Link className="ui-pill ui-pill-ink ui-pill-md" to="/home">
                See what&rsquo;s ready
              </Link>
              {!isPro && (
                <Link className="ui-pill ui-pill-out ui-pill-md" to="/checkout">
                  Go Pro
                </Link>
              )}
            </div>
          </div>
        </main>
      </div>
    </>
  )
}
