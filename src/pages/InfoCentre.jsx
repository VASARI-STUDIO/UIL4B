import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
// The stylesheet families this surface needs, split out of the one
// render-blocking global sheet (see src/styles/deferred/). They ride this
// route's own lazy chunk, so they arrive with it and never with the homepage.
import '../styles/deferred/reading.css'
// The keys the app actually binds. Printed from here so this page cannot
// document a chord the handlers ignore — which is exactly what it did.
import { SEARCH_KEY, DOCUMENTED_SHORTCUTS } from '../config/shortcuts'
// The guides that exist and the one Discover group that is external resources,
// read from the registries so this page cannot name a guide that is still a
// roadmap row — which is exactly what it did (see the docs section).
import { LEARN_ARTICLES, TOPICS } from '../data/learnIndex'
import { DISCOVER_GROUPS, toolRoute } from '../data/toolTree'

// Information Centre — a single, fully indexable knowledge hub. Everything lives
// on one page (good for search + AI citation), with a sticky table of contents,
// interactive accordions, and a live screen-stats panel.

const INTRO_KEY = 'vs-info-intro'

// App breakpoints mirror the CSS: 768 tablet, 480 phone, 380 tiny.
function classifyWidth(w) {
  if (w >= 1280) return { label: 'Large desktop', emoji: '🖥️' }
  if (w >= 1024) return { label: 'Desktop', emoji: '💻' }
  if (w >= 768) return { label: 'Tablet / small laptop', emoji: '📱' }
  if (w >= 480) return { label: 'Large phone', emoji: '📱' }
  if (w >= 380) return { label: 'Phone', emoji: '📱' }
  return { label: 'Small phone', emoji: '📱' }
}

const BREAKPOINTS = [
  { label: 'Tiny', px: 380 },
  { label: 'Phone', px: 480 },
  { label: 'Tablet', px: 768 },
  { label: 'Desktop', px: 1024 },
]

// "colour, typography and accessibility" — the topics the published guides
// declare, assembled from learnIndex.js rather than typed. The typed version
// listed five topics and three of them (design principles, SEO, marketing) are
// `soon: true` rows in LEARN_GROUPS with no guide behind them.
const LEARN_TOPICS = (() => {
  const names = TOPICS.map((t) => t.toLowerCase())
  return names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}` : names.join('')
})()

// The Discover group that IS external resources. Its label and route are the
// ones /discover and /sitemap render; the old link here went to /resources,
// which legacyRoutes.js answers with a 301 to /discover — the landing, not
// the resources page.
const CURATED = DISCOVER_GROUPS.find((g) => g.id === 'curated')

const SECTIONS = [
  {
    id: 'getting-started',
    emoji: '🚀',
    title: 'Getting started',
    body: (
      <>
        {/* "Every tool runs client-side, so your work never leaves your
            device unless you choose to sign in and sync." is deleted from
            this paragraph. AltTextGenerator.jsx posts the image itself to
            /api/ai (`body: JSON.stringify({ task: 'alt-text', image:
            item.base64, … })`) and Brand Starter posts the brief the same
            way; both run on a server, through Gemini or OpenRouter. A
            privacy assurance that is false for the two tools that handle
            the most personal input is the one sentence on this page that
            must not be approximately true. The rest of the paragraph is
            what the product is. */}
        <p>UIL4B is a free, browser-based design toolkit.</p>
        <ul>
          {/* "only" is deleted from the second sentence. Since e2309608
              taking a FILE away — the export panel, the icon SVG, the
              converter's downloads, the palette PNG — needs a free account
              (src/hooks/useExportGate.js), so saving and syncing are no
              longer the only things sign-in is for. Opening and using a tool,
              and copying a value, still need nothing. */}
          <li><strong>No account needed</strong> — open any tool and start working. Sign in with Google if you want saved projects and synced settings.</li>
          {/* THE PIN BULLET IS GONE, NOT REWORDED. It read "drag any tool from
              the sidebar onto the dashboard, or right-click it to pin", and the
              product has no sidebar, no dashboard and no pin control:
              WorkspaceContext exports pinned/togglePinned/addPinned/
              reorderPinned and nothing under src/pages or src/components calls
              any of them. Three instructions in one sentence, none performable.
              Rewording it would need a feature to describe. */}
          <li><strong>Command palette</strong> — press <kbd>{SEARCH_KEY}</kbd> to jump to any tool instantly.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'colour',
    emoji: '🎨',
    title: 'Colour Studio',
    body: (
      <>
        {/* "— then export to CSS, Tailwind, PNG, or SVG" is deleted from the
            end of this sentence. exportFormats.js marks `css`, `tailwind` and
            `assets` (the only SVG) as not live — each is a Soon badge over a
            disabled button — so the page was telling a visitor to export three
            files the panel cannot make. routeMetaMap.js deleted the identical
            clause from /create/color's description on the same day and for
            the same reason; tests/unit/surface-claims-truth.test.js holds
            both to the flags. */}
        <p>Build a complete colour system: generate palettes and harmonies, produce tint/shade scales, design gradients, and verify WCAG contrast.</p>
        {/* The Preview link went to /create/color, which is ColorLanding —
            a page of links with no preview control on it. The control this
            sentence describes is PaletteBuilder's (`aria-label="Preview"`,
            "Preview the palette on a UI mockup"), on the same page as the
            Space shortcut the sentence opens with. The route is read from
            the tool tree, as the shortcut's file is read from shortcuts.js. */}
        <p>Press <kbd>Space</kbd> on the palette to roll a fresh random set. Use the live <Link to={toolRoute('palette')}>Preview</Link> to see your colours on real UI.</p>
      </>
    ),
  },
  {
    id: 'typography',
    emoji: '🔤',
    title: 'Typography',
    body: (
      <>
        <p>Pair fonts for headings and body, browse 1,200+ Google Fonts in the gallery, and build a modular type scale with copy-ready CSS custom properties.</p>
      </>
    ),
  },
  {
    id: 'imagery',
    emoji: '🖼️',
    title: 'Imagery, Icons & Emoji',
    body: (
      <>
        <p><strong>Imagery</strong> covers image conversion/compression, video-frame extraction, and an aspect-ratio calculator. <strong>Icons &amp; Emoji</strong> lets you search 200,000+ icons and copy any emoji by category.</p>
        <p>Everything is processed in your browser — no uploads, no waiting.</p>
      </>
    ),
  },
  // THE "UI BUILDER" SECTION IS GONE, NOT REWORDED. It read "Design dashboard
  // components — buttons, cards, tables, inputs — with live previews, and
  // craft layered CSS box-shadows. Export production-ready CSS in a click."
  // In toolTree.js the `component` group is `soon: true` and both of its tools
  // (component-designer, box-shadow) are `soon: true`: the nav badges them
  // Soon, the site map badges them Soon, route-matrix.mjs refuses to prerender
  // them, and llms.txt lists them under "Not yet built". This was the one
  // surface describing the group as a tool you could open. Rewording it would
  // need a feature to describe; the section comes back with the tools.
  {
    id: 'docs',
    emoji: '📚',
    title: 'Documentation & Resources',
    body: (
      <>
        {/* DERIVED, NOT TYPED. This read "Reference guides on design
            principles, UI themes, brand colour, SEO, and marketing. The
            Resources directory curates the best external fonts, colour tools,
            and inspiration galleries." Three of the five topics are roadmap
            rows (LEARN_GROUPS: principles, seo and marketing all soon:true);
            the link went to a retired URL; and "the best" is the superlative
            the /discover description deleted by name. What is left is the
            frame of the sentence with every noun read from the registry:
            the topics from TOPICS, the guides from LEARN_ARTICLES, the
            resources page from DISCOVER_GROUPS. */}
        <p>Reference guides on {LEARN_TOPICS}, and <Link to={CURATED.route}>{CURATED.label}</Link>.</p>
        <ul>
          {LEARN_ARTICLES.map((a) => (
            <li key={a.slug}><Link to={`/learn/${a.slug}`}>{a.title}</Link></li>
          ))}
        </ul>
      </>
    ),
  },
  {
    id: 'accounts',
    emoji: '👤',
    title: 'Accounts & sign-in',
    body: (
      <>
        {/* "is optional —" is deleted: the same e2309608 export gate as the
            getting-started bullet above. Using a tool needs no account;
            taking a file out of one does. */}
        <p>You can use every core tool without an account. Signing in (Google or email) saves your projects and syncs your preferences across devices.</p>
        <p>Sign in from the top-right, or wherever you see a prompt. Manage your profile, email and password in <Link to="/settings">Settings → Account</Link>.</p>
      </>
    ),
  },
  {
    id: 'saving',
    emoji: '💾',
    title: 'Saving & syncing your work',
    body: (
      <>
        <p>Your active palette, fonts and type scale are kept in your browser automatically — close the tab and they&rsquo;ll be waiting. Sign in to save named projects and have them follow you to any device.</p>
        <p>Find everything you&rsquo;ve saved under <Link to="/projects">Projects</Link> (also in the profile menu).</p>
      </>
    ),
  },
  {
    id: 'pro',
    emoji: '✨',
    title: 'Free vs Pro',
    body: (
      <>
        {/* ", and advanced previews" is deleted from the end of the first
            sentence. Nothing in the product gates a preview on Pro: the Pro
            deltas /plans derives are AI capacity, the two Pro export
            documents, the colour systems and HCT editing, the brand palettes
            and unlimited saves. The phrase appeared nowhere else in src/.

            "Settings → Support" is corrected to "Settings → Subscription",
            which is the label Settings.jsx gives that tab (`{ id: 'support',
            label: 'Subscription' }`) — a visitor looking for "Support" would
            not find it. And "or cancel" is deleted from the second sentence
            on the same evidence /plans used to delete "cancel any time": the
            Stripe portal has no cancellation flow enabled until the
            [stripe-retention-config] owner action is done (pipeline.js,
            status 'blocked'), so the Cancel plan button opens a portal with
            nothing to cancel in it. The guard test reads that row's status,
            so finishing the dashboard work retires the check. */}
        <p>Everything you reach for day-to-day is free — building palettes, type scales, browsing icons, and saving projects. Pro unlocks higher AI limits and premium exports.</p>
        <p>Compare the plans and upgrade whenever you&rsquo;re ready from <Link to="/settings">Settings → Subscription</Link>; manage from the same place.</p>
      </>
    ),
  },
  {
    id: 'troubleshooting',
    emoji: '🛟',
    title: 'Troubleshooting',
    body: (
      <ul>
        <li><strong>An AI tool isn&rsquo;t responding?</strong> AI features need you to be signed in. If it keeps failing, the service may be briefly busy — give it a moment and try again.</li>
        <li><strong>Something looks off?</strong> A hard refresh (<kbd>Ctrl</kbd>/<kbd>⌘</kbd> + <kbd>Shift</kbd> + <kbd>R</kbd>) clears most glitches.</li>
        <li><strong>Working offline?</strong> Core tools run entirely in your browser and keep going; sign-in, sync and AI need a connection.</li>
        <li><strong>Lost something?</strong> Saved projects live in <Link to="/projects">Projects</Link>, and you can export a full backup any time from <Link to="/settings">Settings → Your data</Link>.</li>
      </ul>
    ),
  },
  {
    id: 'shortcuts',
    emoji: '⌨️',
    title: 'Keyboard shortcuts',
    // RENDERED FROM THE BINDINGS, NOT TYPED BESIDE THEM.
    //
    // This list said Ctrl/⌘ + K for the command palette when the key is `/` —
    // which PillNav.jsx does not merely ignore but explicitly excludes, guarding
    // the handler with `!e.metaKey && !e.ctrlKey` — and promised `?` would "show
    // all shortcuts" when `?` is bound nowhere in src/. Two of the four rows
    // were instructions that did nothing, on the page a visitor opens precisely
    // because something did not work.
    //
    // The `?` row is deleted rather than corrected: there is no shortcut overlay
    // for it to open. The three descriptions are the ones already here.
    body: (
      <ul className="ic-kbd-list">
        {DOCUMENTED_SHORTCUTS.map(({ keys, what }) => (
          <li key={what}>
            {keys.map((k) => <kbd key={k}>{k}</kbd>)} — {what}
          </li>
        ))}
      </ul>
    ),
  },
  {
    id: 'privacy',
    emoji: '🔒',
    title: 'Privacy & your data',
    body: (
      <>
        <p>UIL4B stores preferences and projects in your browser&rsquo;s localStorage. When you sign in, data syncs securely through Firebase. You can export or delete everything from <Link to="/settings">Settings → Your data</Link>.</p>
      </>
    ),
  },
]

function ScreenStats() {
  const read = useCallback(() => ({
    w: window.innerWidth,
    h: window.innerHeight,
    dpr: Math.round((window.devicePixelRatio || 1) * 100) / 100,
    orientation: window.innerWidth >= window.innerHeight ? 'Landscape' : 'Portrait',
  }), [])

  const [stats, setStats] = useState(read)

  useEffect(() => {
    const onResize = () => setStats(read())
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [read])

  const cls = classifyWidth(stats.w)
  // Position the marker along the breakpoint ruler (cap the scale at 1280).
  const markerPct = Math.min(100, (stats.w / 1280) * 100)

  return (
    <section id="screen-stats" className="ic-stats">
      <div className="ic-stats-head">
        <h2><span aria-hidden="true">📐</span> Screen stats &amp; resize tool</h2>
        <p>Resize your browser window and watch these update live — a quick way to see which breakpoint your design lands on.</p>
      </div>
      <div className="ic-stats-grid">
        <div className="ic-stat"><div className="ic-stat-num">{stats.w}<span>px</span></div><div className="ic-stat-lbl">Viewport width</div></div>
        <div className="ic-stat"><div className="ic-stat-num">{stats.h}<span>px</span></div><div className="ic-stat-lbl">Viewport height</div></div>
        <div className="ic-stat"><div className="ic-stat-num">{stats.dpr}<span>×</span></div><div className="ic-stat-lbl">Pixel ratio</div></div>
        <div className="ic-stat"><div className="ic-stat-num ic-stat-sm">{stats.orientation}</div><div className="ic-stat-lbl">Orientation</div></div>
      </div>
      <div className="ic-bp">
        <div className="ic-bp-current"><span aria-hidden="true">{cls.emoji}</span> {cls.label}</div>
        <div className="ic-bp-ruler">
          <div className="ic-bp-marker" style={{ left: `${markerPct}%` }} />
          {BREAKPOINTS.map(bp => (
            <div key={bp.px} className="ic-bp-tick" style={{ left: `${Math.min(100, (bp.px / 1280) * 100)}%` }}>
              <span className="ic-bp-tick-lbl">{bp.label}</span>
              <span className="ic-bp-tick-px">{bp.px}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default function InfoCentre() {
  const [open, setOpen] = useState(() => ({ 'getting-started': true }))
  const [introDismissed, setIntroDismissed] = useState(() => {
    try { return localStorage.getItem(INTRO_KEY) === '1' } catch { return false }
  })

  const toggle = (id) => setOpen(prev => ({ ...prev, [id]: !prev[id] }))

  const dismissIntro = () => {
    setIntroDismissed(true)
    try { localStorage.setItem(INTRO_KEY, '1') } catch { /* quota */ }
  }

  return (
    <div className="ic-wrap">
      <header className="ic-head">
        <div className="ic-head-eyebrow"><span aria-hidden="true">📖</span> Information Centre</div>
        <h1 className="ic-head-title">Everything you need to know about UIL4B</h1>
        <p className="ic-head-sub">One page, fully searchable. Learn what each tool does, pick up shortcuts, and check how your screen measures up.</p>
      </header>

      {!introDismissed && (
        <div className="ic-intro" role="note">
          <span className="ic-intro-emoji" aria-hidden="true">👋</span>
          <div className="ic-intro-body">
            <strong>New here?</strong> Start with “Getting started” below, then explore the tools. You can open any section by clicking its header.
          </div>
          <button className="ic-intro-close" onClick={dismissIntro} aria-label="Dismiss intro">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>
      )}

      <nav className="ic-toc" aria-label="On this page">
        {SECTIONS.map(s => (
          <a key={s.id} href={`#${s.id}`} className="ic-toc-link"><span aria-hidden="true">{s.emoji}</span> {s.title}</a>
        ))}
        <a href="#screen-stats" className="ic-toc-link"><span aria-hidden="true">📐</span> Screen stats</a>
      </nav>

      <div className="ic-sections">
        {SECTIONS.map(s => (
          <section key={s.id} id={s.id} className="ic-acc">
            <h2 className="ic-acc-h">
              <button
                id={`ic-head-${s.id}`}
                className={`ic-acc-head${open[s.id] ? ' is-open' : ''}`}
                onClick={() => toggle(s.id)}
                aria-expanded={!!open[s.id]}
                aria-controls={`ic-body-${s.id}`}
              >
                <span className="ic-acc-emoji" aria-hidden="true">{s.emoji}</span>
                <span className="ic-acc-title">{s.title}</span>
                <svg className="ic-acc-chevron" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
              </button>
            </h2>
            {/* `inert` on the collapsed panel, and it has to be an attribute
                rather than CSS. The panel collapses with grid-template-rows
                0fr -> 1fr, which animates cleanly and is why it was chosen, but
                unlike display:none it leaves every descendant focusable: tabbing
                /info landed on 8 links inside collapsed panels, each in a box
                measured at ZERO height with overflow:hidden, so the focus ring
                was invisible (S9, mobile-audit-2026-08). visibility:hidden would
                also fix the tab order, but it would have to flip the instant the
                panel starts closing - the content would vanish and then an empty
                box would animate shut - and putting `visibility` in the
                transition to delay it is the exact discrete-property trap S13
                records. `inert` removes the subtree from the tab order AND the
                accessibility tree with no paint of its own, so the collapse
                animation is untouched. */}
            {/* aria-labelledby points at the HEADER BUTTON, not at this panel.
                It used to name `ic-body-${s.id}` — the panel's own id — so the
                region was labelled by itself and had no accessible name at all.
                A screen-reader user landing in an opened panel heard "region"
                with nothing to say which of the twelve it was. The button is
                what carries the section title, which is what an accordion
                region is supposed to be named by. */}
            <div id={`ic-body-${s.id}`} className={`ic-acc-body${open[s.id] ? ' is-open' : ''}`} role="region" aria-labelledby={`ic-head-${s.id}`} inert={!open[s.id]}>
              <div className="ic-acc-body-inner">{s.body}</div>
            </div>
          </section>
        ))}
      </div>

      <ScreenStats />
    </div>
  )
}
