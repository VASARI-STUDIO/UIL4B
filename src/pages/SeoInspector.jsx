import { useState } from 'react'
import MetaInspector from '../components/seo/MetaInspector'
import SchemaGenerator from '../components/seo/SchemaGenerator'
import ContentAnalyzer from '../components/seo/ContentAnalyzer'

// SEO Specialist — a small workspace of client-side SEO tools.
const TABS = [
  { id: 'meta', label: 'Meta & SERP', title: 'Meta & SERP Inspector', desc: 'Preview how your page looks in Google and on social, and get an instant, actionable SEO score. Everything runs in your browser.' },
  { id: 'schema', label: 'Structured data', title: 'Structured Data Generator', desc: 'Generate valid JSON-LD structured data so search engines understand your page. Copy it straight into your <head>.' },
  { id: 'content', label: 'Content analysis', title: 'Content Analyzer', desc: 'Paste your page copy for readability scores, keyword density, and the phrases you repeat most — all in your browser.' },
]

export default function SeoInspector({ onCopy, toast }) {
  const [tab, setTab] = useState('meta')
  const active = TABS.find(tp => tp.id === tab) || TABS[0]

  return (
    <div className="sec seo-wrap">
      <div className="sec-h">
        <div className="sec-h-eyebrow">SEO Specialist</div>
        <h1>{active.title}</h1>
        <p>{active.desc}</p>
      </div>

      <div className="seo-tabs" role="tablist" aria-label="SEO tools">
        {TABS.map(tp => (
          <button
            key={tp.id}
            id={`seo-tab-${tp.id}`}
            role="tab"
            aria-selected={tab === tp.id}
            aria-controls={`seo-panel-${tp.id}`}
            className={`seo-tab${tab === tp.id ? ' is-active' : ''}`}
            onClick={() => setTab(tp.id)}
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
