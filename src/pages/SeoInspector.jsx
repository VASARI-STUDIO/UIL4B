import { useState, useMemo } from 'react'

// SEO Specialist — Meta & SERP Inspector. Fully client-side: type your page
// title, description, URL and target keyword and get a live Google snippet
// preview, a social card preview, and a scored, actionable checklist. No
// backend, no AI — instant feedback as you type.

const TITLE_MIN = 30
const TITLE_MAX = 60
const DESC_MIN = 120
const DESC_MAX = 160

function truncate(str, n) {
  if (!str) return ''
  return str.length > n ? str.slice(0, n - 1).trimEnd() + '…' : str
}

function parseUrl(raw) {
  const fallback = { domain: 'example.com', crumbs: [] }
  if (!raw) return fallback
  let url = raw.trim()
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url
  try {
    const u = new URL(url)
    const crumbs = u.pathname.split('/').filter(Boolean)
    return { domain: u.hostname.replace(/^www\./, ''), crumbs }
  } catch {
    return fallback
  }
}

// Each check returns { id, label, status: 'pass'|'warn'|'fail', detail, weight }.
function runChecks({ title, description, url, keyword }) {
  const checks = []
  const kw = keyword.trim().toLowerCase()

  // Title presence + length
  const tl = title.trim().length
  if (!tl) {
    checks.push({ id: 'title', label: 'Title tag', status: 'fail', detail: 'Add a title — it’s the single biggest on-page SEO signal.', weight: 3 })
  } else if (tl >= TITLE_MIN && tl <= TITLE_MAX) {
    checks.push({ id: 'title', label: 'Title length', status: 'pass', detail: `${tl} characters — in the ideal ${TITLE_MIN}–${TITLE_MAX} range.`, weight: 3 })
  } else if (tl < TITLE_MIN) {
    checks.push({ id: 'title', label: 'Title length', status: 'warn', detail: `${tl} characters — short. Aim for ${TITLE_MIN}–${TITLE_MAX} to use the full SERP width.`, weight: 3 })
  } else {
    checks.push({ id: 'title', label: 'Title length', status: tl > 65 ? 'fail' : 'warn', detail: `${tl} characters — Google will truncate past ~60. Trim it.`, weight: 3 })
  }

  // Description presence + length
  const dl = description.trim().length
  if (!dl) {
    checks.push({ id: 'desc', label: 'Meta description', status: 'fail', detail: 'Add a description — it drives click-through from search.', weight: 2 })
  } else if (dl >= DESC_MIN && dl <= DESC_MAX) {
    checks.push({ id: 'desc', label: 'Description length', status: 'pass', detail: `${dl} characters — in the ideal ${DESC_MIN}–${DESC_MAX} range.`, weight: 2 })
  } else if (dl < DESC_MIN) {
    checks.push({ id: 'desc', label: 'Description length', status: 'warn', detail: `${dl} characters — short. Aim for ${DESC_MIN}–${DESC_MAX}.`, weight: 2 })
  } else {
    checks.push({ id: 'desc', label: 'Description length', status: dl > 170 ? 'fail' : 'warn', detail: `${dl} characters — Google truncates past ~160. Tighten it.`, weight: 2 })
  }

  // URL quality
  const rawUrl = url.trim()
  if (!rawUrl) {
    checks.push({ id: 'url', label: 'Page URL', status: 'warn', detail: 'Add the URL to check slug quality.', weight: 1 })
  } else {
    const slug = rawUrl.replace(/^https?:\/\//i, '').split('?')[0]
    const issues = []
    if (/[A-Z]/.test(slug)) issues.push('uppercase letters')
    if (/_/.test(slug)) issues.push('underscores (use hyphens)')
    if (/\s/.test(slug)) issues.push('spaces')
    if (slug.length > 75) issues.push('it’s long')
    if (issues.length) {
      checks.push({ id: 'url', label: 'URL slug', status: 'warn', detail: `Tidy the slug — ${issues.join(', ')}.`, weight: 1 })
    } else {
      checks.push({ id: 'url', label: 'URL slug', status: 'pass', detail: 'Clean, readable slug.', weight: 1 })
    }
  }

  // Keyword usage (only when a target keyword is supplied)
  if (kw) {
    const inTitle = title.toLowerCase().includes(kw)
    const inDesc = description.toLowerCase().includes(kw)
    const inUrl = url.toLowerCase().includes(kw.replace(/\s+/g, '-')) || url.toLowerCase().includes(kw)
    checks.push({
      id: 'kw-title', label: 'Keyword in title',
      status: inTitle ? (title.toLowerCase().trim().startsWith(kw) ? 'pass' : 'warn') : 'fail',
      detail: inTitle ? (title.toLowerCase().trim().startsWith(kw) ? 'Present and near the front — ideal.' : 'Present. Moving it earlier can help.') : 'Add your target keyword to the title.',
      weight: 2,
    })
    checks.push({ id: 'kw-desc', label: 'Keyword in description', status: inDesc ? 'pass' : 'warn', detail: inDesc ? 'Present in the description.' : 'Work the keyword naturally into the description.', weight: 1 })
    checks.push({ id: 'kw-url', label: 'Keyword in URL', status: inUrl ? 'pass' : 'warn', detail: inUrl ? 'Present in the slug.' : 'A keyword-bearing slug is a small but real signal.', weight: 1 })
  }

  return checks
}

const STATUS_META = {
  pass: { color: 'var(--ok)', score: 1, icon: <polyline points="20 6 9 17 4 12" /> },
  warn: { color: 'var(--warn)', score: 0.5, icon: <><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /></> },
  fail: { color: 'var(--err)', score: 0, icon: <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></> },
}

export default function SeoInspector() {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [url, setUrl] = useState('')
  const [keyword, setKeyword] = useState('')
  const [device, setDevice] = useState('desktop')

  const checks = useMemo(() => runChecks({ title, description, url, keyword }), [title, description, url, keyword])

  const score = useMemo(() => {
    if (!checks.length) return 0
    const total = checks.reduce((s, c) => s + c.weight, 0)
    const got = checks.reduce((s, c) => s + c.weight * STATUS_META[c.status].score, 0)
    return Math.round((got / total) * 100)
  }, [checks])

  const scoreBand = score >= 80 ? { label: 'Strong', color: 'var(--ok)' } : score >= 55 ? { label: 'Needs work', color: 'var(--warn)' } : { label: 'Poor', color: 'var(--err)' }

  const { domain, crumbs } = parseUrl(url)
  const previewTitle = title.trim() || 'Your page title appears here'
  const previewDesc = description.trim() || 'Your meta description appears here. Aim for a compelling, keyword-rich summary that earns the click from the search results.'
  const isMobile = device === 'mobile'

  return (
    <div className="sec seo-wrap">
      <div className="sec-h">
        <div className="sec-h-eyebrow">SEO Specialist</div>
        <h1>Meta &amp; SERP Inspector</h1>
        <p>Preview how your page looks in Google and on social, and get an instant, actionable SEO score. Everything runs in your browser.</p>
      </div>

      <div className="seo-grid">
        {/* Inputs */}
        <div className="seo-inputs">
          <label className="seo-field">
            <span className="seo-field-label">Page title <em>{title.trim().length}/{TITLE_MAX}</em></span>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Free Aspect Ratio Calculator — UIL4B" />
            <span className="seo-meter"><span className="seo-meter-fill" style={{ width: `${Math.min(100, (title.trim().length / TITLE_MAX) * 100)}%`, background: title.trim().length > TITLE_MAX ? 'var(--err)' : title.trim().length >= TITLE_MIN ? 'var(--ok)' : 'var(--warn)' }} /></span>
          </label>

          <label className="seo-field">
            <span className="seo-field-label">Meta description <em>{description.trim().length}/{DESC_MAX}</em></span>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="Lock a ratio, enter one dimension, and get the matching size with a live preview…" />
            <span className="seo-meter"><span className="seo-meter-fill" style={{ width: `${Math.min(100, (description.trim().length / DESC_MAX) * 100)}%`, background: description.trim().length > DESC_MAX ? 'var(--err)' : description.trim().length >= DESC_MIN ? 'var(--ok)' : 'var(--warn)' }} /></span>
          </label>

          <label className="seo-field">
            <span className="seo-field-label">Page URL</span>
            <input type="text" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://www.uil4b.com/ratio" />
          </label>

          <label className="seo-field">
            <span className="seo-field-label">Target keyword <em>optional</em></span>
            <input type="text" value={keyword} onChange={e => setKeyword(e.target.value)} placeholder="aspect ratio calculator" />
          </label>
        </div>

        {/* Previews + score */}
        <div className="seo-preview-col">
          <div className="seo-score" style={{ borderColor: scoreBand.color }}>
            <div className="seo-score-num" style={{ color: scoreBand.color }}>{score}</div>
            <div className="seo-score-meta">
              <div className="seo-score-band" style={{ color: scoreBand.color }}>{scoreBand.label}</div>
              <div className="seo-score-lbl">SEO score</div>
            </div>
            <div className="seo-score-bar"><div className="seo-score-bar-fill" style={{ width: `${score}%`, background: scoreBand.color }} /></div>
          </div>

          <div className="seo-preview">
            <div className="seo-preview-head">
              <span>Search preview</span>
              <div className="seo-seg">
                <button className={device === 'desktop' ? 'is-active' : ''} onClick={() => setDevice('desktop')}>Desktop</button>
                <button className={device === 'mobile' ? 'is-active' : ''} onClick={() => setDevice('mobile')}>Mobile</button>
              </div>
            </div>
            <div className={`seo-serp${isMobile ? ' is-mobile' : ''}`}>
              <div className="seo-serp-url">
                <span className="seo-serp-fav" />
                <span className="seo-serp-domain">{domain}{crumbs.length > 0 && <span className="seo-serp-path"> › {crumbs.join(' › ')}</span>}</span>
              </div>
              <div className="seo-serp-title">{truncate(previewTitle, isMobile ? 55 : 60)}</div>
              <div className="seo-serp-desc">{truncate(previewDesc, isMobile ? 130 : 160)}</div>
            </div>
          </div>

          <div className="seo-preview">
            <div className="seo-preview-head"><span>Social card</span></div>
            <div className="seo-social">
              <div className="seo-social-img"><span>1200 × 630</span></div>
              <div className="seo-social-body">
                <div className="seo-social-domain">{domain.toUpperCase()}</div>
                <div className="seo-social-title">{truncate(previewTitle, 70)}</div>
                <div className="seo-social-desc">{truncate(previewDesc, 120)}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Checklist */}
      <div className="seo-checklist">
        <h2 className="seo-checklist-h">Checklist</h2>
        {checks.map(c => {
          const m = STATUS_META[c.status]
          return (
            <div key={c.id} className="seo-check">
              <span className="seo-check-icon" style={{ color: m.color, borderColor: m.color }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">{m.icon}</svg>
              </span>
              <div className="seo-check-body">
                <div className="seo-check-label">{c.label}</div>
                <div className="seo-check-detail">{c.detail}</div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
