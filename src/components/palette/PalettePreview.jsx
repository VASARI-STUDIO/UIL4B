// The Palette Builder's preview scenes: one palette, rendered into eighteen
// real design contexts, so "will this actually ship?" is answered by looking
// rather than by imagining.
//
// ── Why this is its own file ──────────────────────────────────────────────
//
// src/pages/PaletteBuilder.jsx was 3,528 lines. This block was the largest
// piece of it that could leave WITHOUT CHANGING A RENDERED PIXEL, which is
// the only kind of move worth making on a file that size in one step. Every
// component below is pure: it takes `colors` and `scene` and nothing else,
// holds no hook, reads no state, no context and no ref belonging to the
// page, and returns the same markup for the same props. Its entire contract
// with the rest of the builder is the three imports at the top of this file
// and the one component exported from the bottom of it.
//
// `pvRef` came with it because PreviewScene is its only caller. It had been
// sitting beside `ctxPosRef`, which belongs to the right-click menu and
// stays behind. Nothing else moved: the icon set, the HCT picker and the
// board are all still in the page, because each of them either is used by
// the page directly or reads its state.
//
// EQUIVALENCE IS ASSERTED, NOT CLAIMED.
// tests/user-sim/64-computed-style-snapshot.spec.js passes on /create/palette
// against the same baseline as before the move — that file was NOT
// regenerated for this change — and
// tests/user-sim/50-palette-preview-ink.spec.js still reads the --pv-*
// custom properties `pvRef` writes below.
import { derivePreviewRoles } from '../../utils/colors'
import { barRef } from '../../utils/paletteBoard'
import { PREVIEW_SCENES } from '../../data/palettePreviewScenes'

// Preview scene roles → --pv-* custom props on the scene root.
function pvRef(roles) {
  return (el) => {
    if (!el) return
    el.style.setProperty('--pv-bg', roles.bg)
    el.style.setProperty('--pv-surface', roles.surface)
    el.style.setProperty('--pv-primary', roles.primary)
    el.style.setProperty('--pv-onprimary', roles.onPrimary)
    el.style.setProperty('--pv-accent', roles.accent)
    el.style.setProperty('--pv-text', roles.text)
    el.style.setProperty('--pv-muted', roles.muted)
    el.style.setProperty('--pv-border', roles.border)
    el.style.setProperty('--pv-pborder', roles.primaryBorder)
    // The READABLE halves of the two fill roles. Separate properties, not
    // replacements: --pv-accent and --pv-primary still paint every fill, and
    // only the five rules that set TEXT in them read these
    // (#preview-accent-ink-unmeasured). Dropping either hand-off leaves the
    // rules resolving var() to nothing, which is a visible failure rather than
    // a silent one — asserted in tests/unit/preview-roles-contrast.test.js.
    el.style.setProperty('--pv-accent-ink', roles.accentInk)
    el.style.setProperty('--pv-primary-ink', roles.primaryInk)
  }
}

// UI — a product dashboard (nav, KPI cards, data bars, CTA).
function PreviewUI({ colors, scene }) {
  if (scene.name === 'Commerce checkout') {
    return (
      <div className="plb-pv-authored plb-pv-checkout">
        <main><small>Payment</small><div className="plb-pv-h">{scene.head}</div><div className="plb-pv-field">Card number <b>•••• 4242</b></div><div className="plb-pv-field">Delivery <b>Standard · $8</b></div></main>
        <aside><strong>Order summary</strong><p>Canvas field bag <b>$84</b></p><p>Studio notebook <b>$18</b></p><dl><dt>Total</dt><dd>$110</dd></dl><span className="plb-pv-cta">Pay securely</span></aside>
      </div>
    )
  }
  if (scene.name === 'Project workspace') {
    return (
      <div className="plb-pv-authored plb-pv-workspace">
        <header><div><small>Project workspace</small><div className="plb-pv-h">{scene.head}</div></div><span className="plb-pv-cta">Add task</span></header>
        <div className="plb-pv-board-cols"><section><strong>To do · 3</strong><p>Audit empty states</p><p>Write release notes</p></section><section><strong>In progress · 2</strong><p>Token migration</p><p>Mobile QA</p></section><section><strong>Review · 4</strong><p>Checkout states</p><p>Contrast pass</p></section></div>
      </div>
    )
  }
  if (scene.name === 'Account settings') {
    return (
      <div className="plb-pv-authored plb-pv-settings">
        <nav><strong>Settings</strong><span className="is-active">Profile</span><span>Security</span><span>Notifications</span></nav>
        <form><small>Account settings</small><div className="plb-pv-h">{scene.head}</div><label>Display name <i>Maya Chen</i></label><label>Email address <i>maya@example.com</i></label><label className="plb-pv-toggle">Weekly summary <b /></label><span className="plb-pv-cta">Save changes</span></form>
      </div>
    )
  }
  if (scene.name === 'Support inbox') {
    return (
      <div className="plb-pv-authored plb-pv-inbox">
        <aside><strong>Inbox <b>12</b></strong><p className="is-active">Unable to export tokens<small>Jamie · 4m</small></p><p>Billing receipt<small>Amir · 22m</small></p><p>Team invitation<small>Rina · 1h</small></p></aside>
        <main><small>Customer inbox</small><div className="plb-pv-h">Unable to export tokens</div><p className="plb-pv-message">The JSON export is not reaching my clipboard. Can you help me recover it?</p><div className="plb-pv-reply">Write a reply… <span>Send</span></div></main>
      </div>
    )
  }
  if (scene.name === 'Finance overview') {
    return (
      <div className="plb-pv-authored plb-pv-finance">
        <header><div><small>Available balance</small><div className="plb-pv-h">$24,840.60</div></div><span className="plb-pv-cta">Transfer</span></header>
        <div className="plb-pv-finance-chart">{colors.slice(0, 7).map((color, index) => <i key={color + index} ref={barRef(color)} />)}</div>
        <section><strong>Recent transactions</strong><p><span>UIL4B Pro</span><b>−$24.00</b></p><p><span>Client deposit</span><b>+$4,800.00</b></p><p><span>Cloud hosting</span><b>−$86.40</b></p></section>
      </div>
    )
  }
  return (
    <>
      <aside className="plb-pv-side">
        <span className="plb-pv-logo" />
        <span className="plb-pv-navline plb-pv-navline--on" />
        <span className="plb-pv-navline" />
        <span className="plb-pv-navline" />
        <span className="plb-pv-navline" />
      </aside>
      <div className="plb-pv-main">
        <div className="plb-pv-h">{scene.head}</div>
        <div className="plb-pv-p">{scene.sub}</div>
        <div className="plb-pv-cards">
          <div className="plb-pv-card"><span className="plb-pv-k">Views</span><span className="plb-pv-n">4,821</span></div>
          <div className="plb-pv-card"><span className="plb-pv-k">Saves</span><span className="plb-pv-n plb-pv-n--accent">312</span></div>
          <div className="plb-pv-card"><span className="plb-pv-k">Shares</span><span className="plb-pv-n">96</span></div>
        </div>
        <div className="plb-pv-bars">
          {colors.slice(0, 8).map((c, i) => (
            <span key={i} className={`plb-pv-bar plb-pv-bar--${(i % 5) + 1}`} ref={barRef(c)} />
          ))}
        </div>
        <span className="plb-pv-cta">Primary action</span>
      </div>
    </>
  )
}

// Brand — a marketing landing hero (wordmark, headline, primary + ghost CTAs,
// brand-colour chip row).
function PreviewBrand({ colors, scene }) {
  if (scene.name === 'Architecture studio') {
    return (
      <div className="plb-pvb plb-pvb-architecture">
        <header><strong>ATELIER 07</strong><span>Work · Practice · Contact</span></header>
        <main><div><span className="plb-pvb-eyebrow">{scene.kicker}</span><div className="plb-pvb-head">Courtyard House</div><p>{scene.sub}</p></div><figure><i ref={barRef(colors[1] || colors[0])} /><figcaption>Brisbane · 2026</figcaption></figure></main>
      </div>
    )
  }
  if (scene.name === 'Creative portfolio') {
    return (
      <div className="plb-pvb plb-pvb-portfolio">
        <header><strong>NOA / DESIGN</strong><span>Selected work 2024–26</span></header>
        <div><aside><span className="plb-pvb-eyebrow">{scene.kicker}</span><div className="plb-pvb-head">{scene.head.replace('\n', ' ')}</div></aside><ol><li><b>01</b> Field Supply <small>Identity</small></li><li><b>02</b> Common Ground <small>Digital</small></li><li><b>03</b> Form Journal <small>Editorial</small></li></ol></div>
      </div>
    )
  }
  if (scene.name === 'Conference') {
    return (
      <div className="plb-pvb plb-pvb-conference">
        <header><strong>UIL4B / LIVE</strong><span>{scene.kicker}</span></header>
        <main><div className="plb-pvb-head">{scene.head.replace('\n', ' ')}</div><p>{scene.sub}</p><div className="plb-pvb-schedule"><span><b>09:00</b> Opening keynote</span><span><b>11:30</b> Colour systems</span><span><b>14:00</b> Shipping critique</span></div><span className="plb-pvb-btn plb-pvb-btn--primary">Register</span></main>
      </div>
    )
  }
  if (scene.name === 'Independent journal') {
    return (
      <div className="plb-pvb plb-pvb-journal">
        <header><strong>FORM / JOURNAL</strong><span>{scene.kicker}</span></header>
        <main><article><span className="plb-pvb-eyebrow">Cover story</span><div className="plb-pvb-head">{scene.head.replace('\n', ' ')}</div><p>{scene.sub}</p></article><aside><strong>Inside this issue</strong><p>01 · Designing for repair</p><p>02 · The patient interface</p><p>03 · Tools that last</p></aside></main>
      </div>
    )
  }
  if (scene.name === 'Hospitality') {
    return (
      <div className="plb-pvb plb-pvb-hospitality">
        <header><strong>TIDELINE HOUSE</strong><span>Stay · Dine · Explore</span></header>
        <main><span className="plb-pvb-eyebrow">{scene.kicker}</span><div className="plb-pvb-head">{scene.head.replace('\n', ' ')}</div><p>{scene.sub}</p><div className="plb-pvb-booking"><span>Check in <b>14 Aug</b></span><span>Guests <b>2 adults</b></span><span className="plb-pvb-btn plb-pvb-btn--primary">Check rooms</span></div></main>
      </div>
    )
  }
  return (
    <div className="plb-pvb">
      <div className="plb-pvb-nav">
        <span className="plb-pvb-mark" />
        <span className="plb-pvb-navlinks">
          <span className="plb-pvb-navlink" />
          <span className="plb-pvb-navlink" />
          <span className="plb-pvb-navlink" />
        </span>
        <span className="plb-pvb-navcta">Sign up</span>
      </div>
      <div className="plb-pvb-hero">
        <span className="plb-pvb-eyebrow">{scene.kicker}</span>
        <div className="plb-pvb-head">{scene.head.split('\n').map((line, i) => <span key={line}>{i > 0 && <br />}{line}</span>)}</div>
        <div className="plb-pvb-sub">{scene.sub}</div>
        <div className="plb-pvb-btns">
          <span className="plb-pvb-btn plb-pvb-btn--primary">Get started</span>
          <span className="plb-pvb-btn plb-pvb-btn--ghost">Learn more</span>
        </div>
        <div className="plb-pvb-chips">
          {colors.slice(0, 6).map((c, i) => (
            <span key={i} className="plb-pvb-chip" ref={barRef(c)} />
          ))}
        </div>
      </div>
    </div>
  )
}

// Graphic Design — an editorial poster (display type, geometric shapes, a full
// palette gradient bar, swatch caption).
function PreviewGraphic({ colors, scene }) {
  if (scene.name === 'Album cover') {
    return (
      <div className="plb-pvg plb-pvg-album">
        <div className="plb-pvg-disc" ref={barRef(colors[1] || colors[0])}><i /></div>
        <div><span className="plb-pvg-kicker">{scene.kicker}</span><div className="plb-pvg-title">{scene.head.replace('\n', ' ')}</div><ol><li>Signal One <b>03:42</b></li><li>Afterimage <b>04:18</b></li><li>Night Drive <b>05:01</b></li></ol></div>
      </div>
    )
  }
  if (scene.name === 'Campaign') {
    return (
      <div className="plb-pvg plb-pvg-campaign">
        <header><span>{scene.kicker}</span><b>PUBLIC MOTION</b></header>
        <div className="plb-pvg-title">{scene.head.replace('\n', ' ')}</div><p>{scene.sub}</p>
        <footer><strong>FORTITUDE VALLEY → WEST END</strong><span>Every 12 minutes · 06:00–23:30</span></footer>
      </div>
    )
  }
  if (scene.name === 'Packaging') {
    return (
      <div className="plb-pvg plb-pvg-package">
        <div className="plb-pvg-pack-face"><span>{scene.kicker}</span><div className="plb-pvg-title">{scene.head.replace('\n', ' ')}</div><p>Native botanical infusion</p><b>80 g / 24 serves</b></div>
        <aside><strong>ORIGIN</strong><p>Grown and packed on Yugambeh Country.</p><strong>NOTES</strong><p>Lemon myrtle · roasted wattleseed</p></aside>
      </div>
    )
  }
  if (scene.name === 'Magazine cover') {
    return (
      <div className="plb-pvg plb-pvg-magazine">
        <header><strong>GROUND</strong><span>{scene.kicker}</span></header>
        <div className="plb-pvg-title">{scene.head.replace('\n', ' ')}</div>
        <aside><p>How smaller studios are reshaping public space</p><p>Materials with a second life</p><p>Brisbane’s quiet architecture</p></aside>
      </div>
    )
  }
  if (scene.name === 'Social launch') {
    return (
      <div className="plb-pvg plb-pvg-social">
        <header><strong>@uil4b</strong><span>1 / 3</span></header>
        <main><span className="plb-pvg-kicker">{scene.kicker}</span><div className="plb-pvg-title">{scene.head.replace('\n', ' ')}</div><p>{scene.sub}</p></main>
        <footer><span>#designsystems #colour</span><strong>Save for Friday →</strong></footer>
      </div>
    )
  }
  return (
    <div className="plb-pvg">
      <div className="plb-pvg-shapes" aria-hidden="true">
        <span className="plb-pvg-circle" ref={barRef(colors[1] || colors[0])} />
        <span className="plb-pvg-square" ref={barRef(colors[2] || colors[0])} />
        <span className="plb-pvg-tri" ref={barRef(colors[3] || colors[0])} />
      </div>
      <div className="plb-pvg-body">
        <span className="plb-pvg-kicker">{scene.kicker}</span>
        <div className="plb-pvg-title">{scene.head.split('\n').map((line, i) => <span key={line}>{i > 0 && <br />}{line}</span>)}</div>
        <div className="plb-pvg-lead">{scene.sub}</div>
      </div>
      <div className="plb-pvg-swatches">
        {colors.slice(0, 8).map((c, i) => (
          <span key={i} className="plb-pvg-sw" ref={barRef(c)} />
        ))}
      </div>
    </div>
  )
}

export default function PreviewScene({ colors, mode, title, tab = 'ui', scene = PREVIEW_SCENES[tab][0], variant = 0 }) {
  const roles = derivePreviewRoles(colors, { mode })
  return (
    <div className="plb-pvwrap">
      {title && <div className="plb-pv-name">{title}</div>}
      <div className={`plb-pv plb-pv--${tab} plb-pv--v${variant}`} ref={pvRef(roles)} role="group" aria-label={`${scene.name} palette preview`} data-preview-scene={scene.name}>
        {tab === 'brand' ? <PreviewBrand colors={colors} scene={scene} />
          : tab === 'graphic' ? <PreviewGraphic colors={colors} scene={scene} />
            : <PreviewUI colors={colors} scene={scene} />}
      </div>
    </div>
  )
}
