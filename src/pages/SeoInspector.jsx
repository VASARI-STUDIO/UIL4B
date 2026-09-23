import { useState } from 'react'
import MetaInspector from '../components/seo/MetaInspector'
import SchemaGenerator from '../components/seo/SchemaGenerator'
import ContentAnalyzer from '../components/seo/ContentAnalyzer'
// The `seo-inspector` page stylesheet. Imported here rather than from global.css so
// Vite emits it as this lazy route's own chunk stylesheet — only a visitor who
// opens this page downloads it, and it arrives with the chunk, before paint.
// The stylesheet families this surface needs, split out of the one
// render-blocking global sheet (see src/styles/deferred/). They ride this
// route's own lazy chunk, so they arrive with it and never with the homepage.
import '../styles/deferred/studio.css'
import '../styles/deferred/tool-shell.css'
import '../styles/pages/seo-inspector.css'

// SEO Specialist — a small workspace of client-side SEO tools.
const TABS = [
  { id: 'meta', label: 'Meta & SERP', title: 'Meta & SERP Inspector', desc: 'Preview how your page looks in Google and on social, and get an instant, actionable SEO score. Everything runs in your browser.' },
  { id: 'schema', label: 'Structured data', title: 'Structured Data Generator', desc: 'Generate valid JSON-LD structured data so search engines understand your page. Copy it straight into your <head>.' },
  { id: 'content', label: 'Content analysis', title: 'Content Analyzer', desc: 'Paste your page copy for readability scores, keyword density, and the phrases you repeat most — all in your browser.' },
]

export default function SeoInspector({ onCopy, toast }) {
  const [tab, setTab] = useState('meta')
  const active = TABS.find(tp => tp.id === tab) || TABS[0]

  // THE TABLIST KEYBOARD CONTRACT, which `role="tablist"` PROMISES.
  //
  // These three carried role=tab/tablist and nothing else: all three sat at
  // tabIndex 0, and ArrowRight from "Meta & SERP" moved nothing (measured
  // 2026-09-11 at 1280 in light — focus stayed on button#seo-tab-meta). A
  // screen reader announces "tab, 1 of 3", so the first thing a keyboard user
  // does is press an arrow key; here that did nothing, and the only way across
  // was Tab — three stops through a strip the pattern says is one stop.
  //
  // The app already answers this twice: TypeScale's `.tsc-view-switch`
  // (handleAudienceKeyDown) and the icon/emoji `.lib-switch` (onTabKeyDown),
  // both a roving tabIndex plus Arrow/Home/End. This is the same answer a
  // third time, wrapping because there are three tabs here rather than two.
  const onTabKeyDown = (event) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    const i = TABS.findIndex(tp => tp.id === tab)
    const at = event.key === 'Home' ? 0
      : event.key === 'End' ? TABS.length - 1
        : event.key === 'ArrowLeft' ? (i - 1 + TABS.length) % TABS.length
          : (i + 1) % TABS.length
    setTab(TABS[at].id)
    requestAnimationFrame(() => document.getElementById(`seo-tab-${TABS[at].id}`)?.focus())
  }

  return (
    <div className="sec seo-wrap seo-page">
      <header className="seo-hero">
        {/* NO TAXONOMY EYEBROW. Founder, 2026-09-14: "remove this text its such a
            common AI trait, scan the whole site and remove alot of them where
            applied." This continues #382 and #386, where he marked this exact
            element "AI" and it was deleted from the Font Gallery, Font Pair,
            the Type Scale and the Tint tool. A 10px mono-caps label restating
            the page's own section, directly above an h1 that names the page,
            on a route the nav already has lit. Hierarchy is a control, not a
            label. */}
        <h1>{active.title}</h1>
        <p>{active.desc}</p>
      </header>

      <div className="seo-tabs" role="tablist" aria-label="SEO tools">
        {TABS.map(tp => (
          <button
            key={tp.id}
            id={`seo-tab-${tp.id}`}
            type="button"
            role="tab"
            aria-selected={tab === tp.id}
            /* Only the SELECTED tab names a panel. This router renders ONE
               panel, so `aria-controls={`seo-panel-${tp.id}`}` on all three
               pointed two of them at an id the document does not carry. An
               IDREF that resolves to nothing is worse than no IDREF: it tells
               assistive technology there is somewhere to go and then has
               nowhere to go. APG allows omitting it for a panel that is not in
               the DOM, which is exactly this case. */
            aria-controls={tab === tp.id ? `seo-panel-${tp.id}` : undefined}
            tabIndex={tab === tp.id ? 0 : -1}
            className={`seo-tab${tab === tp.id ? ' is-active' : ''}`}
            onClick={() => setTab(tp.id)}
            onKeyDown={onTabKeyDown}
          >{tp.label}</button>
        ))}
      </div>

      <div role="tabpanel" id={`seo-panel-${tab}`} aria-labelledby={`seo-tab-${tab}`}>
        {tab === 'meta' && <MetaInspector onCopy={onCopy} toast={toast} />}
        {tab === 'schema' && <SchemaGenerator onCopy={onCopy} toast={toast} />}
        {tab === 'content' && <ContentAnalyzer />}
      </div>
    </div>
  )
}
