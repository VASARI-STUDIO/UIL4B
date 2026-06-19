import { useState, useMemo } from 'react'

// Structured-data (JSON-LD) generator. Pick a schema type, fill the fields, and
// get copy-ready <script type="application/ld+json"> markup. Client-side only.

const TYPES = [
  { id: 'WebSite', label: 'Website' },
  { id: 'Organization', label: 'Organisation' },
  { id: 'LocalBusiness', label: 'Local business' },
  { id: 'Article', label: 'Article' },
  { id: 'FAQPage', label: 'FAQ page' },
]

// Recursively drop empty strings / null / undefined and any object/array that
// ends up empty, so the output only contains fields the user actually filled.
function clean(value) {
  if (Array.isArray(value)) {
    const arr = value.map(clean).filter(v => v !== undefined)
    return arr.length ? arr : undefined
  }
  if (value && typeof value === 'object') {
    const out = {}
    for (const [k, v] of Object.entries(value)) {
      const c = clean(v)
      if (c !== undefined) out[k] = c
    }
    // Keep objects that carry real data beyond just @type/@context.
    const meaningful = Object.keys(out).filter(k => k !== '@type' && k !== '@context')
    return meaningful.length ? out : undefined
  }
  if (typeof value === 'string') {
    const t = value.trim()
    return t ? t : undefined
  }
  return value
}

function buildSchema(type, f, faqs) {
  const base = { '@context': 'https://schema.org', '@type': type }
  let obj
  switch (type) {
    case 'WebSite':
      obj = { ...base, name: f.name, url: f.url }
      break
    case 'Organization':
      obj = { ...base, name: f.name, url: f.url, logo: f.logo }
      break
    case 'LocalBusiness':
      obj = {
        ...base, name: f.name, url: f.url, telephone: f.telephone,
        address: { '@type': 'PostalAddress', streetAddress: f.streetAddress, addressLocality: f.addressLocality, addressRegion: f.addressRegion, postalCode: f.postalCode },
      }
      break
    case 'Article':
      obj = {
        ...base, headline: f.name, image: f.image, datePublished: f.datePublished,
        author: f.author ? { '@type': 'Person', name: f.author } : undefined,
      }
      break
    case 'FAQPage':
      obj = {
        ...base,
        mainEntity: faqs
          .filter(x => x.q.trim() && x.a.trim())
          .map(x => ({ '@type': 'Question', name: x.q.trim(), acceptedAnswer: { '@type': 'Answer', text: x.a.trim() } })),
      }
      // FAQ needs its mainEntity preserved even though clean() would keep it.
      return obj.mainEntity.length ? obj : base
    default:
      obj = base
  }
  return { '@context': 'https://schema.org', '@type': type, ...(clean(obj) || {}) }
}

// Module-level so the input keeps focus across keystrokes (a component defined
// inside render would remount on every change).
function Field({ label, value, onChange, placeholder, inputType = 'text' }) {
  return (
    <label className="seo-field">
      <span className="seo-field-label">{label}</span>
      <input type={inputType} value={value} onChange={onChange} placeholder={placeholder} />
    </label>
  )
}

export default function SchemaGenerator({ onCopy, toast }) {
  const [type, setType] = useState('WebSite')
  const [f, setF] = useState({
    name: '', url: '', logo: '', telephone: '',
    streetAddress: '', addressLocality: '', addressRegion: '', postalCode: '',
    author: '', datePublished: '', image: '',
  })
  const [faqs, setFaqs] = useState([{ q: '', a: '' }])

  const set = (key) => (e) => setF(prev => ({ ...prev, [key]: e.target.value }))

  const json = useMemo(() => {
    const obj = buildSchema(type, f, faqs)
    return `<script type="application/ld+json">\n${JSON.stringify(obj, null, 2)}\n</script>`
  }, [type, f, faqs])

  const copy = () => {
    if (onCopy) onCopy(json)
    else if (navigator.clipboard) navigator.clipboard.writeText(json).then(() => toast?.('JSON-LD copied'))
  }

  return (
    <div className="seo-grid">
      <div className="seo-inputs">
        <label className="seo-field">
          <span className="seo-field-label">Schema type</span>
          <select value={type} onChange={e => setType(e.target.value)}>
            {TYPES.map(tp => <option key={tp.id} value={tp.id}>{tp.label}</option>)}
          </select>
        </label>

        {type === 'WebSite' && (
          <>
            <Field label="Site name" value={f.name} onChange={set('name')} placeholder="UIL4B" />
            <Field label="URL" value={f.url} onChange={set('url')} placeholder="https://www.uil4b.com" />
          </>
        )}

        {type === 'Organization' && (
          <>
            <Field label="Organisation name" value={f.name} onChange={set('name')} placeholder="UIL4B" />
            <Field label="URL" value={f.url} onChange={set('url')} placeholder="https://www.uil4b.com" />
            <Field label="Logo URL" value={f.logo} onChange={set('logo')} placeholder="https://www.uil4b.com/logo.png" />
          </>
        )}

        {type === 'LocalBusiness' && (
          <>
            <Field label="Business name" value={f.name} onChange={set('name')} placeholder="Acme Studio" />
            <Field label="URL" value={f.url} onChange={set('url')} placeholder="https://acme.studio" />
            <Field label="Telephone" value={f.telephone} onChange={set('telephone')} placeholder="+61 2 1234 5678" />
            <Field label="Street address" value={f.streetAddress} onChange={set('streetAddress')} placeholder="123 King St" />
            <Field label="Suburb / city" value={f.addressLocality} onChange={set('addressLocality')} placeholder="Sydney" />
            <Field label="State / region" value={f.addressRegion} onChange={set('addressRegion')} placeholder="NSW" />
            <Field label="Postcode" value={f.postalCode} onChange={set('postalCode')} placeholder="2000" />
          </>
        )}

        {type === 'Article' && (
          <>
            <Field label="Headline" value={f.name} onChange={set('name')} placeholder="How to pick a brand palette" />
            <Field label="Author" value={f.author} onChange={set('author')} placeholder="Jane Doe" />
            <Field label="Date published" value={f.datePublished} onChange={set('datePublished')} inputType="date" />
            <Field label="Image URL" value={f.image} onChange={set('image')} placeholder="https://…/cover.jpg" />
          </>
        )}

        {type === 'FAQPage' && (
          <div className="seo-faqs">
            {faqs.map((qa, i) => (
              <div key={i} className="seo-faq">
                <div className="seo-faq-head">
                  <span className="seo-field-label">Question {i + 1}</span>
                  {faqs.length > 1 && (
                    <button type="button" className="seo-faq-del" onClick={() => setFaqs(prev => prev.filter((_, idx) => idx !== i))} aria-label={`Remove question ${i + 1}`}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                    </button>
                  )}
                </div>
                <input type="text" value={qa.q} placeholder="Question" onChange={e => setFaqs(prev => prev.map((x, idx) => idx === i ? { ...x, q: e.target.value } : x))} />
                <textarea rows={2} value={qa.a} placeholder="Answer" onChange={e => setFaqs(prev => prev.map((x, idx) => idx === i ? { ...x, a: e.target.value } : x))} />
              </div>
            ))}
            <button type="button" className="btn btn-s" onClick={() => setFaqs(prev => [...prev, { q: '', a: '' }])}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
              Add question
            </button>
          </div>
        )}
      </div>

      <div className="seo-preview-col">
        <div className="seo-tags" style={{ margin: 0 }}>
          <div className="seo-tags-head">
            <h2 className="seo-checklist-h" style={{ margin: 0 }}>JSON-LD</h2>
            <button className="btn btn-s btn-accent" onClick={copy}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
              </svg>
              Copy
            </button>
          </div>
          <p className="seo-tags-note">Paste into your page&rsquo;s <code>&lt;head&gt;</code>. Validate with Google&rsquo;s Rich Results Test.</p>
          <pre className="seo-tags-code">{json}</pre>
        </div>
      </div>
    </div>
  )
}
