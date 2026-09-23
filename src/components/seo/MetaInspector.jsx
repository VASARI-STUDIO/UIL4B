import { useState, useMemo } from 'react'

// Meta & SERP Inspector — live Google snippet + social preview, a scored
// checklist, and copy-ready meta tags. Fully client-side.

const TITLE_MIN = 30
const TITLE_MAX = 60
const DESC_MIN = 120
const DESC_MAX = 160

function truncate(str, n) {
  if (!str) return ''
  return str.length > n ? str.slice(0, n - 1).trimEnd() + '…' : str
}

// Escape a string for safe use inside an HTML attribute value.
function escapeAttr(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

// Build the copy-ready <head> meta tags from the current inputs.
function buildTags({ title, description, url }) {
  const t = title.trim()
  const d = description.trim()
  const u = url.trim()
  const lines = []
  if (t) lines.push(`<title>${escapeAttr(t)}</title>`)
  if (d) lines.push(`<meta name="description" content="${escapeAttr(d)}">`)
  if (u) lines.push(`<link rel="canonical" href="${escapeAttr(u)}">`)
  lines.push('')
  lines.push('<!-- Open Graph -->')
  if (t) lines.push(`<meta property="og:title" content="${escapeAttr(t)}">`)
  if (d) lines.push(`<meta property="og:description" content="${escapeAttr(d)}">`)
  if (u) lines.push(`<meta property="og:url" content="${escapeAttr(u)}">`)
  lines.push('<meta property="og:type" content="website">')
  lines.push('')
  lines.push('<!-- Twitter -->')
  lines.push('<meta name="twitter:card" content="summary_large_image">')
  if (t) lines.push(`<meta name="twitter:title" content="${escapeAttr(t)}">`)
  if (d) lines.push(`<meta name="twitter:description" content="${escapeAttr(d)}">`)
  return lines.join('\n')
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
  pass: { tone: 'ok', score: 1, icon: <polyline points="20 6 9 17 4 12" /> },
  warn: { tone: 'warn', score: 0.5, icon: <><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /></> },
  fail: { tone: 'err', score: 0, icon: <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></> },
}

export default function MetaInspector({ onCopy, toast }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [url, setUrl] = useState('')
  const [keyword, setKeyword] = useState('')
  const [device, setDevice] = useState('desktop')

  const checks = useMemo(() => runChecks({ title, description, url, keyword }), [title, description, url, keyword])
  const tags = useMemo(() => buildTags({ title, description, url }), [title, description, url])

  const copyTags = () => {
    if (onCopy) onCopy(tags)
    else if (navigator.clipboard) navigator.clipboard.writeText(tags).then(() => toast?.('Meta tags copied'))
  }

  const score = useMemo(() => {
    if (!checks.length) return 0
    const total = checks.reduce((s, c) => s + c.weight, 0)
    const got = checks.reduce((s, c) => s + c.weight * STATUS_META[c.status].score, 0)
    return Math.round((got / total) * 100)
  }, [checks])

  // A TONE, not a colour. These were inline `var(--ok)` / `var(--warn)` /
  // `var(--err)` on TEXT — the band label, the score and the checklist glyphs —
  // and the raw state colours are not text-grade: --warn on the white card is
  // under 3:1 in light. seo-inspector.css maps each tone to the -strong ink
  // for text and glyphs, and the raw colour only for bars and borders.
  const scoreBand = score >= 80 ? { label: 'Strong', tone: 'ok' } : score >= 55 ? { label: 'Needs work', tone: 'warn' } : { label: 'Poor', tone: 'err' }
  const meterTone = (len, min, max) => (len > max ? 'err' : len >= min ? 'ok' : 'warn')

  const { domain, crumbs } = parseUrl(url)
  const previewTitle = title.trim() || 'Your page title appears here'
  const previewDesc = description.trim() || 'Your meta description appears here. Aim for a compelling, keyword-rich summary that earns the click from the search results.'
  const isMobile = device === 'mobile'

  return (
    <>
      <div className="seo-grid">
        {/* Inputs */}
        <div className="seo-inputs">
          <label className="seo-field">
            <span className="seo-field-label">Page title <em>{title.trim().length}/{TITLE_MAX}</em></span>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Free Aspect Ratio Calculator — UIL4B" />
            <span className="seo-meter"><span className={`seo-meter-fill seo-tone--${meterTone(title.trim().length, TITLE_MIN, TITLE_MAX)}`} style={{ width: `${Math.min(100, (title.trim().length / TITLE_MAX) * 100)}%` }} /></span>
          </label>

          <label className="seo-field">
            <span className="seo-field-label">Meta description <em>{description.trim().length}/{DESC_MAX}</em></span>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="Lock a ratio, enter one dimension, and get the matching size with a live preview…" />
            <span className="seo-meter"><span className={`seo-meter-fill seo-tone--${meterTone(description.trim().length, DESC_MIN, DESC_MAX)}`} style={{ width: `${Math.min(100, (description.trim().length / DESC_MAX) * 100)}%` }} /></span>
          </label>

          <label className="seo-field">
            <span className="seo-field-label">Page URL</span>
            <input type="text" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://uil4b.com/create/aspect-ratio" />
          </label>

          <label className="seo-field">
            <span className="seo-field-label">Target keyword <em>optional</em></span>
            <input type="text" value={keyword} onChange={e => setKeyword(e.target.value)} placeholder="aspect ratio calculator" />
          </label>
        </div>

        {/* Previews + score */}
        <div className="seo-preview-col">
          <div className={`seo-score seo-tone--${scoreBand.tone}`}>
            <div className="seo-score-num">{score}</div>
            <div className="seo-score-meta">
              <div className="seo-score-band">{scoreBand.label}</div>
              <div className="seo-score-lbl">SEO score</div>
            </div>
            <div className="seo-score-bar"><div className="seo-score-bar-fill" style={{ width: `${score}%` }} /></div>
          </div>

          <div className="seo-preview">
            <div className="seo-preview-head">
              <span>Search preview</span>
              <div className="seo-seg">
                <button type="button" className={device === 'desktop' ? 'is-active' : ''} aria-pressed={device === 'desktop'} onClick={() => setDevice('desktop')}>Desktop</button>
                <button type="button" className={device === 'mobile' ? 'is-active' : ''} aria-pressed={device === 'mobile'} onClick={() => setDevice('mobile')}>Mobile</button>
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
              <span className={`seo-check-icon seo-tone--${m.tone}`}>
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

      {/* Copy-ready meta tags */}
      <div className="seo-tags">
        <div className="seo-tags-head">
          <h2 className="seo-checklist-h seo-checklist-h--flush">Meta tags</h2>
          <button type="button" className="seo-btn seo-btn--primary" onClick={copyTags}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
            </svg>
            Copy tags
          </button>
        </div>
        <p className="seo-tags-note">Paste these into your page&rsquo;s <code>&lt;head&gt;</code>. They update live as you type above.</p>
        <pre className="seo-tags-code">{tags}</pre>
      </div>
    </>
  )
}
