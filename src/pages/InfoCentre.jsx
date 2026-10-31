import { useState, useEffect, useLayoutEffect, useCallback } from 'react'
import { flushSync } from 'react-dom'
import { Link } from 'react-router-dom'
// THIS PAGE NO LONGER IMPORTS styles/deferred/reading.css. Its `.ic-*` rules
// are replaced wholesale by info.css, and loading both would leave two sets of
// rules for the same class names cascading by file order. The dead block over
// there is a follow-up for whoever owns that file next; it is shared with
// /learn/:slug, /404 and /sitemap, and three other lanes are writing to this
// tree.
import '../styles/pages/content.css'
import '../styles/pages/info.css'
// The front door's own glyph set. Inline SVG in the NavIcon idiom, already in
// the entry chunk because Spectrum is a static import in App.jsx.
import SpectrumIcon from '../components/spectrum/SpectrumIcon'
// The keys the app actually binds. Printed from here so this page cannot
// document a chord the handlers ignore — which is exactly what it did.
import { SEARCH_KEY, DOCUMENTED_SHORTCUTS } from '../config/shortcuts'
// Read published guides and topics from the registry.
import { LEARN_ARTICLES, TOPICS } from '../data/learnIndex'
import { toolRoute } from '../data/toolTree'
import { infoToolGroup } from '../data/infoTools'
// Where an image goes in an AI tool, and where the Terms say what the
// providers may do with it. One copy of each, shared with the tool itself.
import { AI_IMAGE_SENT, AI_TERMS_PATH } from '../config/aiImageConsent'

// Information Centre — a single, fully indexable knowledge hub. Everything lives
// on one page (good for search + AI citation), with a sticky table of contents,
// interactive accordions, and a live screen-stats panel.

const INTRO_KEY = 'vs-info-intro'

// App breakpoints mirror the CSS: 768 tablet, 480 phone, 380 tiny.
// EVERY EMOJI ON THIS PAGE IS GONE, and this function is where the last of
// them lived. There were fourteen: one per accordion section, one in each of
// those sections' index links, one on the dismissible note, one on the screen
// -stats heading, one in the page's own eyebrow, and five here.
//
// They are not replaced with icons. An emoji beside a heading is the cheapest
// available signal that a page was generated rather than designed, and the
// founder has been deleting that family of tell by name since 2026-09-14
// ("remove this text its such a common AI trait, scan the whole site and
// remove alot of them where applied"). Beyond the taste argument they are
// measurably worse than nothing here: an emoji cannot be themed, cannot be
// measured for contrast, renders as a different picture on every platform,
// and five of these fourteen were the same phone glyph standing for five
// different things. The sections are a reference to look things up in, not a
// sequence, so they carry no numerals either.
function classifyWidth(w) {
  if (w >= 1280) return { label: 'Large desktop' }
  if (w >= 1024) return { label: 'Desktop' }
  if (w >= 768) return { label: 'Tablet / small laptop' }
  if (w >= 480) return { label: 'Large phone' }
  if (w >= 380) return { label: 'Phone' }
  return { label: 'Small phone' }
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

// A tool section's title and tool list, read from the Create tree.
const GROUP = {
  colour: infoToolGroup('colour'),
  type: infoToolGroup('type'),
  imagery: infoToolGroup('imagery'),
  icons: infoToolGroup('icons'),
  ai: infoToolGroup('ai'),
}

function ToolLinks({ group }) {
  return (
    <ul>
      {group.tools.map((t) => (
        <li key={t.id}><Link to={t.route}>{t.label}</Link></li>
      ))}
    </ul>
  )
}

const SECTIONS = [
  {
    id: 'getting-started',
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
          <li><strong>No account needed:</strong> open any tool and start working. Sign in with Google if you want saved projects and synced settings.</li>
          {/* THE PIN BULLET IS GONE, NOT REWORDED. It read "drag any tool from
              the sidebar onto the dashboard, or right-click it to pin", and the
              product has no sidebar, no dashboard and no pin control:
              WorkspaceContext exports pinned/togglePinned/addPinned/
              reorderPinned and nothing under src/pages or src/components calls
              any of them. Three instructions in one sentence, none performable.
              Rewording it would need a feature to describe. */}
          <li><strong>Command palette:</strong> press <kbd>{SEARCH_KEY}</kbd> to jump to any tool instantly.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'colour',
    title: GROUP.colour.label,
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
        <ToolLinks group={GROUP.colour} />
      </>
    ),
  },
  {
    id: 'typography',
    title: GROUP.type.label,
    body: (
      <>
        <p>Pair fonts for headings and body, browse 1,200+ Google Fonts in the gallery, and build a modular type scale with copy-ready CSS custom properties.</p>
        <ToolLinks group={GROUP.type} />
      </>
    ),
  },
  {
    id: 'imagery',
    title: GROUP.imagery.label,
    body: (
      <>
        <p>Convert and compress images, pull frames out of video, and work out aspect ratios.</p>
        <p>Everything is processed in your browser — no uploads, no waiting.</p>
        <ToolLinks group={GROUP.imagery} />
      </>
    ),
  },
  {
    id: 'icons',
    title: GROUP.icons.label,
    body: (
      <>
        <p>Search icons and copy any emoji by category.</p>
        <ToolLinks group={GROUP.icons} />
      </>
    ),
  },
  {
    id: 'ai',
    title: GROUP.ai.label,
    body: (
      <>
        <p>AI tools need you to be signed in.</p>
        <ToolLinks group={GROUP.ai} />
        {/* The one group that sends an image to a server, so the page that
            explains the tools says where it goes. */}
        <p>{AI_IMAGE_SENT} <Link to={AI_TERMS_PATH}>How providers may use them</Link></p>
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
    title: 'Documentation',
    body: (
      <>
        <p>Reference guides on {LEARN_TOPICS}.</p>
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
    title: 'Accounts and sign-in',
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
    title: 'Saving and syncing your work',
    body: (
      <>
        <p>Your active palette, fonts and type scale are kept in your browser automatically — close the tab and they&rsquo;ll be waiting. Sign in to save named projects and have them follow you to any device.</p>
        <p>Find everything you&rsquo;ve saved under <Link to="/projects">Projects</Link> (also in the profile menu).</p>
      </>
    ),
  },
  {
    id: 'pro',
    title: 'Free and Pro',
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
        <p>Compare Free and Pro on the <Link to="/plans">Plans</Link> page. Once you&rsquo;re on Pro, manage billing in <Link to="/settings" state={{ section: 'support' }}>Settings</Link>.</p>
      </>
    ),
  },
  {
    id: 'troubleshooting',
    title: 'Troubleshooting',
    body: (
      <ul>
        <li><strong>An AI tool isn&rsquo;t responding?</strong> AI features need you to be signed in. If it keeps failing, the service may be briefly busy. Give it a moment and try again.</li>
        <li><strong>Something looks off?</strong> A hard refresh (<kbd>Ctrl</kbd>/<kbd>⌘</kbd> + <kbd>Shift</kbd> + <kbd>R</kbd>) clears most glitches.</li>
        <li><strong>Working offline?</strong> Core tools run entirely in your browser and keep going; sign-in, sync and AI need a connection.</li>
        <li><strong>Lost something?</strong> Saved projects live in <Link to="/projects">Projects</Link>, and you can export a full backup any time from <Link to="/settings">Settings → Your data</Link>.</li>
      </ul>
    ),
  },
  {
    id: 'shortcuts',
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
            {keys.map((k) => <kbd key={k}>{k}</kbd>)}: {what}
          </li>
        ))}
      </ul>
    ),
  },
  {
    id: 'privacy',
    title: 'Privacy and your data',
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
        <h2 className="ic-stats-h">Screen stats &amp; resize tool</h2>
        <p>Resize your browser window and watch these update live — a quick way to see which breakpoint your design lands on.</p>
      </div>
      <div className="ic-stats-grid">
        <div className="ic-stat"><div className="ic-stat-num">{stats.w}<span>px</span></div><div className="ic-stat-lbl">Viewport width</div></div>
        <div className="ic-stat"><div className="ic-stat-num">{stats.h}<span>px</span></div><div className="ic-stat-lbl">Viewport height</div></div>
        <div className="ic-stat"><div className="ic-stat-num">{stats.dpr}<span>×</span></div><div className="ic-stat-lbl">Pixel ratio</div></div>
        <div className="ic-stat"><div className="ic-stat-num ic-stat-sm">{stats.orientation}</div><div className="ic-stat-lbl">Orientation</div></div>
      </div>
      <div className="ic-bp">
        <div className="ic-bp-current">{cls.label}</div>
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

const SECTION_IDS = SECTIONS.map((s) => s.id)

// The section a URL fragment names, or null.
const hashSection = () => {
  if (typeof window === 'undefined') return null
  const id = decodeURIComponent(window.location.hash.slice(1))
  return SECTION_IDS.includes(id) ? id : null
}

// `hidden="until-found"` keeps a collapsed panel out of the tab order and the
// accessibility tree while leaving its text searchable: the browser opens the
// panel when find-in-page lands inside it. React renders `hidden` as a plain
// boolean attribute and drops the string, so it is set on the element
// directly. A browser without the feature gets plain `hidden` (the
// `onbeforematch` event is how the feature is detected), which still removes
// the panel from the tab order.
const supportsUntilFound = () => typeof document !== 'undefined' && 'onbeforematch' in document.body

export default function InfoCentre() {
  const [open, setOpen] = useState(() => {
    const named = hashSection()
    return { 'getting-started': true, ...(named ? { [named]: true } : {}) }
  })
  const [introDismissed, setIntroDismissed] = useState(() => {
    try { return localStorage.getItem(INTRO_KEY) === '1' } catch { return false }
  })

  const toggle = (id) => setOpen(prev => ({ ...prev, [id]: !prev[id] }))
  // Jumping to a section from the index OPENS it. It always should have:
  // the index linked to eleven anchors, ten of which land on a collapsed
  // panel, so the common path through this page was "click the thing you
  // want, arrive at a closed box, click again". Opening is additive —
  // nothing closes, and the anchor still does its own jump — so a deep
  // link, the back button and a mid-page refresh all behave as before.
  const openSection = (id) => setOpen(prev => (prev[id] ? prev : { ...prev, [id]: true }))

  // A fragment that names a section opens it, on arrival and when the fragment
  // changes under a mounted page. The browser's own jump to the anchor follows
  // once the panel has height.
  useEffect(() => {
    const onHash = () => {
      const named = hashSection()
      if (!named) return
      openSection(named)
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  // Collapsed panels carry `hidden`; open ones do not.
  useLayoutEffect(() => {
    const untilFound = supportsUntilFound()
    for (const id of SECTION_IDS) {
      const panel = document.getElementById(`ic-body-${id}`)
      if (!panel) continue
      if (open[id]) panel.removeAttribute('hidden')
      else panel.setAttribute('hidden', untilFound ? 'until-found' : '')
    }
  }, [open])

  // Find-in-page, or a link to text inside a collapsed panel, fires
  // `beforematch` on it: open the section before the browser reveals the match.
  useEffect(() => {
    const panels = SECTION_IDS.map((id) => [id, document.getElementById(`ic-body-${id}`)])
    const handlers = panels.map(([id, el]) => {
      const onMatch = () => flushSync(() => openSection(id))
      el?.addEventListener('beforematch', onMatch)
      return () => el?.removeEventListener('beforematch', onMatch)
    })
    return () => handlers.forEach((off) => off())
  }, [])

  const dismissIntro = () => {
    setIntroDismissed(true)
    try { localStorage.setItem(INTRO_KEY, '1') } catch { /* quota */ }
  }

  return (
    <div className="sec cpg ic-wrap">
      <header className="ic-head">
        {/* NO TAXONOMY EYEBROW. It read "Information Centre" behind an open-book
            glyph — a 10px mono-caps label, in --accent-strong, restating the
            page's own name directly above an h1 that names it, on a route the
            nav already has lit. The founder has marked this exact element "AI"
            and had it deleted from the Font Gallery, Font Pair, the Type Scale,
            the Tint tool (#382, #386) and /privacy. Hierarchy is a control, not
            a label. */}
        <h1 className="ic-head-title">Everything you need to know about UIL4B</h1>
        <p className="ic-head-sub">What each tool does, the keyboard shortcuts, and how your screen measures up, all on one page.</p>
      </header>

      {!introDismissed && (
        <div className="ic-intro" role="note">
          <div className="ic-intro-body">
            <strong>New here?</strong> Start with Getting started below. Select a heading to open its section.
          </div>
          {/* The dismissal and its localStorage key are untouched. It is a
              control a visitor has already used on some devices, and a note
              that stops staying dismissed is a capability lost. */}
          <button className="ic-intro-close" onClick={dismissIntro} aria-label="Dismiss intro">
            <SpectrumIcon name="close" size={16} />
          </button>
        </div>
      )}

      {/* THE INDEX IS A STICKY RAIL, not a wrapped row of pills above the
          content. This page is one long document — eleven collapsible sections
          and a live panel — and a reader who had scrolled to "Troubleshooting"
          had no way back to the list without scrolling to the top. Every
          documentation surface in the Mobbin corpus that handles a page this
          long holds the index open beside it:
            https://mobbin.com/sites/sections/b8a96a18-f6d3-427c-a319-4c0eae8702c1  Steep
            https://mobbin.com/sites/sections/d367b862-f8ac-44e5-b6c7-140cae9f2c2e  Better Stack
            https://mobbin.com/sites/sections/29328957-8bef-4ee5-ac7a-e6cef73db235  Dub
          and it is the same rail the front door already runs beside its bench,
          so this is the product's own pattern rather than a new one. */}
      <div className="cpg-split">
        <div className="cpg-rail-col">
          <nav className="cpg-rail ic-toc" aria-label="On this page">
            <ol>
              {SECTIONS.map(s => (
                <li key={s.id}>
                  {/* `is-on` is the OPEN state, not a scroll position. It is
                      read straight off the state the accordion already keeps,
                      so the rail cannot disagree with the page, and it answers
                      the question the rail is actually asked here — which of
                      these is showing. */}
                  <a
                    className={`cpg-rail-row${open[s.id] ? ' is-on' : ''}`}
                    href={`#${s.id}`}
                    onClick={() => openSection(s.id)}
                  >
                    <span className="cpg-rail-label">{s.title}</span>
                  </a>
                </li>
              ))}
              <li>
                <a className="cpg-rail-row" href="#screen-stats">
                  <span className="cpg-rail-label">Screen stats</span>
                </a>
              </li>
            </ol>
          </nav>
        </div>

        <div className="ic-main">
          <div className="ic-sections">
            {SECTIONS.map(s => (
              <section key={s.id} id={s.id} className={`ic-acc${open[s.id] ? ' is-open' : ''}`}>
                <h2 className="ic-acc-h">
                  <button
                    id={`ic-head-${s.id}`}
                    className={`ic-acc-head${open[s.id] ? ' is-open' : ''}`}
                    onClick={() => toggle(s.id)}
                    aria-expanded={!!open[s.id]}
                    aria-controls={`ic-body-${s.id}`}
                  >
                    {/* The button's accessible name is exactly the section
                        title, which is what the panel's own region name is
                        matched against. */}
                    <span className="ic-acc-title">{s.title}</span>
                    <span className="ic-acc-chevron" aria-hidden="true">
                      <SpectrumIcon name="caret" size={16} />
                    </span>
                  </button>
                </h2>
                {/* A collapsed panel carries `hidden="until-found"` (set on the
                    element by the layout effect above, since React does not
                    pass the string through). Unlike a zero-height grid row, it
                    takes the panel's links out of the tab order and the
                    accessibility tree, and unlike `inert` it leaves the text
                    findable. */}
                {/* aria-labelledby points at the HEADER BUTTON, not at this panel.
                    It used to name the panel's own id — so the region was labelled
                    by itself and had no accessible name at all. A screen-reader
                    user landing in an opened panel heard "region" with nothing to
                    say which of the eleven it was. The button is what carries the
                    section title, which is what an accordion region is supposed to
                    be named by. */}
                <div id={`ic-body-${s.id}`} className={`ic-acc-body${open[s.id] ? ' is-open' : ''}`} role="region" aria-labelledby={`ic-head-${s.id}`}>
                  <div className="ic-acc-body-inner">{s.body}</div>
                </div>
              </section>
            ))}
          </div>

          <ScreenStats />
        </div>
      </div>
    </div>
  )
}
