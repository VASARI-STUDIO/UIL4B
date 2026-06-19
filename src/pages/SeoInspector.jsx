import { useState } from 'react'
import MetaInspector from '../components/seo/MetaInspector'
import SchemaGenerator from '../components/seo/SchemaGenerator'

// SEO Specialist — a small workspace of client-side SEO tools. Tab one is the
// Meta & SERP Inspector; tab two generates structured-data (JSON-LD).
const TABS = [
  { id: 'meta', label: 'Meta & SERP' },
  { id: 'schema', label: 'Structured data' },
]

export default function SeoInspector({ onCopy, toast }) {
  const [tab, setTab] = useState('meta')

  return (
    <div className="sec seo-wrap">
      <div className="sec-h">
        <div className="sec-h-eyebrow">SEO Specialist</div>
        <h1>{tab === 'meta' ? 'Meta & SERP Inspector' : 'Structured Data Generator'}</h1>
        <p>
          {tab === 'meta'
            ? 'Preview how your page looks in Google and on social, and get an instant, actionable SEO score. Everything runs in your browser.'
            : 'Generate valid JSON-LD structured data so search engines understand your page. Copy it straight into your <head>.'}
        </p>
      </div>

      <div className="seo-tabs">
        {TABS.map(tp => (
          <button
            key={tp.id}
            className={`seo-tab${tab === tp.id ? ' is-active' : ''}`}
            onClick={() => setTab(tp.id)}
            aria-pressed={tab === tp.id}
          >{tp.label}</button>
        ))}
      </div>

      {tab === 'meta'
        ? <MetaInspector onCopy={onCopy} toast={toast} />
        : <SchemaGenerator onCopy={onCopy} toast={toast} />}
    </div>
  )
}
