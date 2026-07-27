import { lazy, Suspense } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import PillNav from '../components/PillNav'
import AppFooter from '../components/AppFooter'
import Toast from '../components/Toast'
import { findCreateGroup, resolveTool } from '../data/toolTree'
import { useSubscription } from '../contexts/SubscriptionContext'
import { useToast } from '../hooks/useToast'
import { useClipboard } from '../hooks/useClipboard'

// The in-tool shell for every Create route. Navigation now lives entirely in the
// top PillNav (the mega-menus own the tool tree), so this shell is a single,
// full-width content column with no left rail — Create tools rely on the top bar.
//
// The content panel is a dispatcher:
//   • a LIVE tool route (mapped in LIVE_TOOLS) lazy-loads and mounts the real
//     library — its copy actions bubble up here as a toast;
//   • anything still in the workshop renders the friendly 🤫 "still building"
//     state, the same look as the standalone ComingSoon page.
//
// Subscription is read ONLY, exactly like PillNav — to tailor the still-building
// state's upgrade prompt. Nothing here is ever written.

// Icons and Emoji share ONE surface: both routes mount the merged wrapper, which
// derives its active tab from the path (so the mega-menu deep-links stay valid)
// and flips between the two libraries via a large segmented pill title.
const IconEmojiLibrary = lazy(() => import('./IconEmojiLibrary'))

// Colour — /color is the colour SALES page (handled upstream in App.jsx, never
// reaches this shell). semantic/ui are the same ColorStudio focused on their
// section (it reads the pathname); gradient is its own dark "Gradient Generator"
// surface. Palette is its own full-bleed workbench, and tint + contrast are light
// standalone pages — all on the same colour maths.
const ColorStudio = lazy(() => import('./ColorStudio'))
const GradientGenerator = lazy(() => import('./GradientGenerator'))
const PaletteBuilder = lazy(() => import('./PaletteBuilder'))
const TintTool = lazy(() => import('./TintTool'))
const ContrastChecker = lazy(() => import('./ContrastChecker'))

// Imagery & Media — client-side asset tools. FileConverter bundles image
// convert/compress + video→GIF/frames (ffmpeg.wasm, loaded on demand);
// RatioCalculator is a light aspect-ratio helper.
const FileConverter = lazy(() => import('./FileConverter'))
const RatioCalculator = lazy(() => import('./RatioCalculator'))

// Route → the component that is actually built. A Create route absent from this
// map still renders the 🤫 state even if its group is flagged live — a safe
// fallback that can never mount a half-finished screen.
const LIVE_TOOLS = {
  '/color/palette': PaletteBuilder,
  '/color/semantic': ColorStudio,
  '/color/gradient': GradientGenerator,
  '/color/tint': TintTool,
  '/color/contrast': ContrastChecker,
  '/icons': IconEmojiLibrary,
  '/emoji': IconEmojiLibrary,
  '/file-converter': FileConverter,
  '/ratio': RatioCalculator,
}

// Match toolTree's own path handling (lowercase, strip query/hash, drop trailing
// slash) so the LIVE_TOOLS lookup never misses on a stray slash or casing.
function normPath(p) {
  const s = (p || '').toLowerCase().replace(/[?#].*$/, '').replace(/\/+$/, '')
  return s || '/'
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
          <Link to="/plans" className="ui-pill ui-pill-out ui-pill-md">Go Pro</Link>
        )}
      </div>
    </div>
  )
}

export default function CreateTool() {
  const location = useLocation()
  const { isPro } = useSubscription()
  const { message, visible, type, toast } = useToast()
  // Live tools that copy values (ColorStudio) call onCopy(value) to WRITE the
  // clipboard + toast; the icon/emoji libraries write the clipboard themselves
  // and use onCopy purely as a notification (harmless idempotent re-write here).
  const copy = useClipboard(toast)

  const group = findCreateGroup(location.pathname)
  const { name, isHome } = resolveTool(location.pathname)

  // Impossible in practice — the router only mounts this on resolved Create
  // routes — but keeps the component honest if it's ever reused off-tree.
  if (!group) return <Navigate to="/home" replace />

  // A live group's category home has no screen of its own — send it to the first
  // real tool (e.g. /icons-emoji → /icons) so visitors never land on an empty home.
  // Skip when the home IS a live screen (/color is the full merged studio, with
  // its tools as sub-routes) or when the first tool is the home itself —
  // redirecting either would lose a real page or loop.
  const firstTool = group.tools?.[0]
  const homeIsLive = !!LIVE_TOOLS[normPath(group.home)]
  if (isHome && !group.soon && !homeIsLive && firstTool && normPath(firstTool.route) !== normPath(group.home)) {
    return <Navigate to={firstTool.route} replace />
  }

  const LiveTool = group.soon ? null : LIVE_TOOLS[normPath(location.pathname)]

  return (
    <>
      <PillNav />

      <div className="rail-shell" data-hue={group.hue}>
        {/* ── Content: the live tool, or the 🤫 still-building state ── */}
        <main id="main" tabIndex={-1} className={LiveTool ? 'rail-content rail-content--live' : 'rail-content'}>
          {LiveTool ? (
            <Suspense fallback={<div className="page-loading"><div className="fg-loader" /></div>}>
              <LiveTool onCopy={copy} toast={toast} />
            </Suspense>
          ) : (
            <SoonState title={isHome ? group.label : name} isPro={isPro} />
          )}
        </main>
      </div>

      <AppFooter compact />
      <Toast message={message} visible={visible} type={type} />
    </>
  )
}
