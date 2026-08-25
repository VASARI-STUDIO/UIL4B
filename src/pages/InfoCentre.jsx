import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'

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

const SECTIONS = [
  {
    id: 'getting-started',
    emoji: '🚀',
    title: 'Getting started',
    body: (
      <>
        <p>UIL4B is a free, browser-based design toolkit. Every tool runs client-side, so your work never leaves your device unless you choose to sign in and sync.</p>
        <ul>
          <li><strong>No account needed</strong> — open any tool and start working. Sign in with Google only if you want saved projects and synced settings.</li>
          <li><strong>Pin your favourites</strong> — drag any tool from the sidebar onto the dashboard, or right-click it to pin.</li>
          <li><strong>Command palette</strong> — press <kbd>Ctrl</kbd>/<kbd>⌘</kbd> + <kbd>K</kbd> to jump to any tool instantly.</li>
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
        <p>Build a complete colour system: generate palettes and harmonies, produce tint/shade scales, design gradients, and verify WCAG contrast — then export to CSS, Tailwind, PNG, or SVG.</p>
        <p>Press <kbd>Space</kbd> on the palette to roll a fresh random set. Use the live <Link to="/create/color">Preview</Link> to see your colours on real UI.</p>
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
  {
    id: 'ui-builder',
    emoji: '🧩',
    title: 'UI Builder',
    body: (
      <>
        <p>Design dashboard components — buttons, cards, tables, inputs — with live previews, and craft layered CSS box-shadows. Export production-ready CSS in a click.</p>
      </>
    ),
  },
  {
    id: 'docs',
    emoji: '📚',
    title: 'Documentation & Resources',
    body: (
      <>
        <p>Reference guides on design principles, UI themes, brand colour, SEO, and marketing. The <Link to="/resources">Resources</Link> directory curates the best external fonts, colour tools, and inspiration galleries.</p>
      </>
    ),
  },
  {
    id: 'accounts',
    emoji: '👤',
    title: 'Accounts & sign-in',
    body: (
      <>
        <p>You can use every core tool without an account. Signing in (Google or email) is optional — it saves your projects and syncs your preferences across devices.</p>
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
        <p>Everything you reach for day-to-day is free — building palettes, type scales, browsing icons, and saving projects. Pro unlocks higher AI limits, premium exports, and advanced previews.</p>
        <p>Compare the plans and upgrade whenever you&rsquo;re ready from <Link to="/settings">Settings → Support</Link>; manage or cancel from the same place.</p>
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
    body: (
      <ul className="ic-kbd-list">
        <li><kbd>Ctrl</kbd>/<kbd>⌘</kbd> + <kbd>K</kbd> — command palette</li>
        <li><kbd>Space</kbd> — random palette (Colour Studio)</li>
        <li><kbd>?</kbd> — show all shortcuts</li>
        <li><kbd>Esc</kbd> — close any modal or popup</li>
      </ul>
    ),
  },
  {
    id: 'privacy',
    emoji: '🔒',
    title: 'Privacy & your data',
    body: (
      <>
        <p>UIL4B stores preferences and projects in your browser&rsquo;s localStorage. There are no third-party trackers or ad networks. When you sign in, data syncs securely through Firebase. You can export or delete everything from <Link to="/settings">Settings → Your data</Link>.</p>
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
