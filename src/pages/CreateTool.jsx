import { lazy, Suspense, useCallback } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import PillNav from '../components/PillNav'
import AppFooter from '../components/AppFooter'
import Toast from '../components/Toast'
import { findCreateGroup, resolveTool } from '../data/toolTree'
import { useSubscription } from '../contexts/SubscriptionContext'
import { useToast } from '../hooks/useToast'
import { useClipboard } from '../hooks/useClipboard'
import { ACTIVATION_EXPORTS } from '../config/activationExports'
import { trackActivation } from '../utils/analytics'
import { EVENTS, sendOnce } from '../utils/productEvents'

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

// Colour — /create/color is the colour SALES page (handled upstream in App.jsx,
// never reaches this shell). Every other colour route is its OWN component:
// gradient is the dark "Gradient Generator" surface, palette is a full-bleed
// workbench, and tint + contrast are light standalone pages — all on the same
// colour maths.
//
// ColorStudio mounts on exactly ONE shipped route, /create/semantic-color, and
// it is now a single-purpose page: the semantic-colour tool, nothing else.
//
// It used to carry four sections (palette, states, systems, gradients) chosen by
// pathname, and a merged-studio mode reached from a category home. Three of the
// four could never render — THERE IS NO /create/ui ROUTE (absent from
// toolTree.js and from LIVE_TOOLS below; /create/ui returns the 404 page), and
// /create/palette and /create/gradient mount their own components. Verify with
//   grep -n "create/ui" src/data/toolTree.js src/pages/CreateTool.jsx
// Those three sections and the merged-studio chrome were deleted, taking the
// file from 4258 lines to ~1230. Closed as [colorstudio-dead-sections].
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
// The 3D Viewer carries no three.js itself: the page chunk is small and
// fetches src/utils/meshEngine.js with a second dynamic import when a model
// arrives. tests/unit/three-d-viewer.test.js proves three.js stays out of the
// entry chunk and out of this page's own chunk.
const ThreeDViewer = lazy(() => import('./ThreeDViewer'))

// Typography — three standalone tools on one Google Fonts catalogue. Gallery
// browses it, Font Pair suggests and previews combinations, Type Scale turns a
// base size and a ratio into shippable tokens. They hand state to each other
// through the versioned in-memory slots in utils/typeHandoff.js, so moving
// between them never opens an empty tool.
const FontGallery = lazy(() => import('./FontGallery'))
const FontMatcher = lazy(() => import('./FontMatcher'))
const TypeScale = lazy(() => import('./TypeScale'))

// AI — Alt Text is the one AI tool that is finished. It gates itself behind
// AuthGate and meters against the shared daily/monthly allowance in
// utils/usageTracker, so mounting it here adds no new entitlement surface.
const AltTextGenerator = lazy(() => import('./AltTextGenerator'))

// Brand Starter is the SECOND live AI tool, and it is the revisit of the item
// src/data/moduleBoard.js filed as 'AI mode deferred to stay under Vercel
// 12-function limit'. It mounts on /create/auto-builder -- the route its
// dormant alpha already held, so no URL changed and no redirect was needed --
// and calls /api/ai as a task rather than as a thirteenth function.
const BrandStarter = lazy(() => import('./BrandStarter'))

// Route → the component that is actually built. A Create route absent from this
// map still renders the 🤫 state even if its group is flagged live — a safe
// fallback that can never mount a half-finished screen.
const LIVE_TOOLS = {
  '/create/palette': PaletteBuilder,
  '/create/semantic-color': ColorStudio,
  '/create/gradient': GradientGenerator,
  '/create/tint': TintTool,
  '/create/contrast': ContrastChecker,
  '/create/icons': IconEmojiLibrary,
  '/create/emoji': IconEmojiLibrary,
  '/create/file-converter': FileConverter,
  '/create/aspect-ratio': RatioCalculator,
  '/create/3d-viewer': ThreeDViewer,
  '/create/font-gallery': FontGallery,
  '/create/font-pair': FontMatcher,
  '/create/type-scale': TypeScale,
  '/create/alt-text': AltTextGenerator,
  '/create/auto-builder': BrandStarter,
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
        <Link to="/home" className="btn btn-inverse coming-act">See what&rsquo;s ready</Link>
        {!isPro && (
          <Link to="/plans" className="btn coming-act">Go Pro</Link>
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

  // P-001 ACTIVATION, export half, for the three workbenches that finish a
  // piece of work by copying it. See src/config/activationExports.js for why
  // the decision is HERE and not at each tool's copy buttons.
  //
  // `onExport` IS the copy — same clipboard write, same toast — so the event
  // cannot drift away from the action it claims to measure. It fires only when
  // the write resolved true: a refused clipboard is not an export, and counting
  // the click would report work that never left the page.
  //
  // A route absent from ACTIVATION_EXPORTS gets a plain copy and no event,
  // rather than an invented one.
  const activationId = ACTIVATION_EXPORTS[normPath(location.pathname)] || null
  const exportCopy = useCallback(async (value) => {
    const ok = await copy(value)
    if (ok === true && activationId) {
      try { trackActivation(activationId, 'export') } catch { /* never break a copy */ }
    }
    return ok
  }, [copy, activationId])

  // The first real interaction inside any tool, once per browser, signed in or
  // not (utils/productEvents.js). A pointer or key press inside the tool's own
  // <main>, not merely arriving on the page: arriving is traffic.
  const toolSlug = normPath(location.pathname).split('/').pop()
  const markToolUsed = useCallback(() => {
    sendOnce(EVENTS.firstToolUsed, { tool: toolSlug })
  }, [toolSlug])

  const group = findCreateGroup(location.pathname)
  const { name, isHome, tool } = resolveTool(location.pathname)

  // Impossible in practice — the router only mounts this on resolved Create
  // routes — but keeps the component honest if it's ever reused off-tree.
  if (!group) return <Navigate to="/home" replace />

  // A live group's category home has no screen of its own — send it to the first
  // real tool (e.g. /create/icons-emoji → /create/icons) so visitors never land on an empty home.
  // Skip when the home IS a live screen or when the first tool is the home itself —
  // redirecting either would lose a real page or loop.
  //
  // /create/color used to be named here as "the full merged studio, with its
  // tools as sub-routes". It is not, and it never reaches this line: App.jsx
  // intercepts it above and renders ColorLanding, the colour SALES page. The
  // merged studio it referred to has been deleted.
  const firstTool = group.tools?.[0]
  const homeIsLive = !!LIVE_TOOLS[normPath(group.home)]
  if (isHome && !group.soon && !homeIsLive && firstTool && normPath(firstTool.route) !== normPath(group.home)) {
    return <Navigate to={firstTool.route} replace />
  }

  // A tool's `views` (toolTree.js) mount the tool's own component.
  const LiveTool = group.soon ? null : (LIVE_TOOLS[normPath(location.pathname)] || (tool && LIVE_TOOLS[normPath(tool.route)]) || null)

  return (
    <>
      <PillNav />

      <div className="rail-shell" data-hue={group.hue}>
        {/* ── Content: the live tool, or the 🤫 still-building state ── */}
        <main
          id="main"
          tabIndex={-1}
          className={LiveTool ? 'rail-content rail-content--live' : 'rail-content'}
          onPointerDownCapture={LiveTool ? markToolUsed : undefined}
          onKeyDownCapture={LiveTool ? markToolUsed : undefined}
        >
          {LiveTool ? (
            <Suspense fallback={<div className="page-loading"><div className="fg-loader" /></div>}>
              <LiveTool onCopy={copy} onExport={exportCopy} toast={toast} />
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
