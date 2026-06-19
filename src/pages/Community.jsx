import { useState, useEffect, useMemo, useCallback } from 'react'

// Community Hub — browse, save, and submit design inspiration. Saves drive the
// ranking. Baseline save counts are illustrative for now; the heart toggle and
// each user's own saves persist locally and layer on top, so the UX is real and
// upgrades cleanly to shared Firestore counts later.

const SAVES_KEY = 'vs-community-saves'
const SUBMISSIONS_KEY = 'vs-community-submissions'

const CATEGORIES = ['All', 'Landing', 'Dashboard', 'Portfolio', 'E-commerce', 'Mobile', 'Branding']

// Curated seed. Thumbnails are generated gradients (no external assets / Storage
// dependency) so the gallery renders instantly and offline.
const SEED = [
  { id: 's1', name: 'Aurora Analytics', author: 'Maya R.', category: 'Dashboard', c1: '#3B82F6', c2: '#8B5CF6', saves: 342, url: 'https://dribbble.com' },
  { id: 's2', name: 'Lumen Studio', author: 'Devon K.', category: 'Landing', c1: '#0EA5E9', c2: '#22D3EE', saves: 318, url: 'https://awwwards.com' },
  { id: 's3', name: 'Folio Noir', author: 'Inès B.', category: 'Portfolio', c1: '#111827', c2: '#374151', saves: 287, url: 'https://behance.net' },
  { id: 's4', name: 'Marketplace Mint', author: 'Theo L.', category: 'E-commerce', c1: '#10B981', c2: '#34D399', saves: 264, url: 'https://dribbble.com' },
  { id: 's5', name: 'Pulse Mobile', author: 'Sara W.', category: 'Mobile', c1: '#F43F5E', c2: '#FB7185', saves: 251, url: 'https://mobbin.com' },
  { id: 's6', name: 'Cobalt Brand Kit', author: 'Nikolai V.', category: 'Branding', c1: '#2563EB', c2: '#60A5FA', saves: 233, url: 'https://behance.net' },
  { id: 's7', name: 'Solaris Landing', author: 'Priya N.', category: 'Landing', c1: '#F59E0B', c2: '#FBBF24', saves: 219, url: 'https://awwwards.com' },
  { id: 's8', name: 'Grid Atlas', author: 'Marco D.', category: 'Dashboard', c1: '#6366F1', c2: '#A5B4FC', saves: 198, url: 'https://dribbble.com' },
  { id: 's9', name: 'Verdant Store', author: 'Lena H.', category: 'E-commerce', c1: '#059669', c2: '#6EE7B7', saves: 176, url: 'https://dribbble.com' },
  { id: 's10', name: 'Monochrome Folio', author: 'Otis P.', category: 'Portfolio', c1: '#27272A', c2: '#52525B', saves: 154, url: 'https://behance.net' },
  { id: 's11', name: 'Glass Wallet', author: 'Amara F.', category: 'Mobile', c1: '#7C3AED', c2: '#C4B5FD', saves: 142, url: 'https://mobbin.com' },
  { id: 's12', name: 'Coral Identity', author: 'Hugo S.', category: 'Branding', c1: '#EC4899', c2: '#F9A8D4', saves: 121, url: 'https://behance.net' },
]

function loadSaves() {
  try { return new Set(JSON.parse(localStorage.getItem(SAVES_KEY) || '[]')) } catch { return new Set() }
}
function loadSubmissions() {
  try { return JSON.parse(localStorage.getItem(SUBMISSIONS_KEY) || '[]') } catch { return [] }
}

function HeartIcon({ filled }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  )
}

function DesignCard({ item, saved, count, onToggle }) {
  return (
    <article className="ch-card">
      <a className="ch-thumb" href={item.url} target="_blank" rel="noopener noreferrer"
        style={{ background: `linear-gradient(135deg, ${item.c1}, ${item.c2})` }} aria-label={`${item.name} — open in new tab`}>
        <span className="ch-thumb-mono">{item.name.split(' ').map(w => w[0]).join('').slice(0, 2)}</span>
      </a>
      <button
        className={`ch-heart${saved ? ' is-saved' : ''}`}
        onClick={() => onToggle(item.id)}
        aria-pressed={saved}
        aria-label={saved ? `Unsave ${item.name}` : `Save ${item.name}`}
        title={saved ? 'Saved' : 'Save'}
      >
        <HeartIcon filled={saved} />
        <span className="ch-heart-count">{count}</span>
      </button>
      <div className="ch-card-body">
        <div className="ch-card-name">{item.name}</div>
        <div className="ch-card-meta">
          <span>{item.author}</span>
          <span className="ch-card-tag">{item.category}</span>
        </div>
      </div>
    </article>
  )
}

function SubmitModal({ onClose, onSubmit }) {
  const [form, setForm] = useState({ name: '', author: '', url: '', category: 'Landing' })
  const [error, setError] = useState('')

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const submit = () => {
    if (!form.name.trim()) return setError('Give your design a name.')
    let url = form.url.trim()
    if (url && !/^https?:\/\//i.test(url)) url = 'https://' + url
    if (url && !/^https?:\/\/[^\s.]+\.[^\s]+/i.test(url)) return setError('That URL doesn’t look right.')
    onSubmit({
      id: 'u' + Date.now(),
      name: form.name.trim(),
      author: form.author.trim() || 'You',
      category: form.category,
      url: url || '#',
      c1: '#3B82F6', c2: '#8B5CF6',
      saves: 0,
      mine: true,
    })
  }

  return (
    <div className="ch-modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="Submit a design">
      <div className="ch-modal" onClick={e => e.stopPropagation()}>
        <div className="ch-modal-head">
          <h2>Submit a design</h2>
          <button className="ch-modal-close" onClick={onClose} aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>
        <div className="ch-modal-body">
          <label className="ch-field">
            <span>Name</span>
            <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Aurora Analytics" maxLength={60} />
          </label>
          <label className="ch-field">
            <span>Author</span>
            <input type="text" value={form.author} onChange={e => setForm(f => ({ ...f, author: e.target.value }))} placeholder="Your name (optional)" maxLength={40} />
          </label>
          <label className="ch-field">
            <span>Link</span>
            <input type="text" value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} placeholder="https://… (optional)" />
          </label>
          <label className="ch-field">
            <span>Category</span>
            <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
              {CATEGORIES.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          {error && <div className="ch-error">{error}</div>}
          <p className="ch-modal-note">Submissions are saved to this browser for now. Shared community publishing is coming soon.</p>
        </div>
        <div className="ch-modal-foot">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-accent" onClick={submit}>Submit design</button>
        </div>
      </div>
    </div>
  )
}

export default function Community({ toast }) {
  const [saves, setSaves] = useState(loadSaves)
  const [submissions, setSubmissions] = useState(loadSubmissions)
  const [filter, setFilter] = useState('All')
  const [sort, setSort] = useState('popular')
  const [submitOpen, setSubmitOpen] = useState(false)

  useEffect(() => {
    try { localStorage.setItem(SAVES_KEY, JSON.stringify([...saves])) } catch { /* quota */ }
  }, [saves])
  useEffect(() => {
    try { localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify(submissions)) } catch { /* quota */ }
  }, [submissions])

  const toggleSave = useCallback((id) => {
    setSaves(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  // A saved item gets +1 on its displayed count so the ranking reacts to the
  // user's own save — exactly the "ranking by saves" behaviour, illustratively.
  const effectiveCount = useCallback((item) => item.saves + (saves.has(item.id) ? 1 : 0), [saves])

  const all = useMemo(() => [...submissions, ...SEED], [submissions])

  const visible = useMemo(() => {
    let list = filter === 'All' ? all : all.filter(i => i.category === filter)
    list = [...list]
    if (sort === 'popular') list.sort((a, b) => effectiveCount(b) - effectiveCount(a))
    else if (sort === 'saved') list = list.filter(i => saves.has(i.id))
    return list
  }, [all, filter, sort, effectiveCount, saves])

  const handleSubmit = (item) => {
    setSubmissions(prev => [item, ...prev])
    setSubmitOpen(false)
    if (toast) toast('Design submitted')
  }

  return (
    <div className="ch-wrap">
      <header className="ch-head">
        <div>
          <h1 className="ch-title">Community Hub</h1>
          <p className="ch-sub">Browse design inspiration from the community, save your favourites, and submit your own. Ranked by saves.</p>
        </div>
        <button className="btn btn-accent ch-submit-btn" onClick={() => setSubmitOpen(true)}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          Submit design
        </button>
      </header>

      <div className="ch-toolbar">
        <div className="ch-filters">
          {CATEGORIES.map(c => (
            <button key={c} className={`ch-filter${filter === c ? ' is-active' : ''}`} onClick={() => setFilter(c)}>{c}</button>
          ))}
        </div>
        <div className="ch-sort">
          <button className={`ch-sort-btn${sort === 'popular' ? ' is-active' : ''}`} onClick={() => setSort('popular')}>Top rated</button>
          <button className={`ch-sort-btn${sort === 'saved' ? ' is-active' : ''}`} onClick={() => setSort('saved')}>Saved</button>
        </div>
      </div>

      {visible.length > 0 ? (
        <div className="ch-grid">
          {visible.map(item => (
            <DesignCard key={item.id} item={item} saved={saves.has(item.id)} count={effectiveCount(item)} onToggle={toggleSave} />
          ))}
        </div>
      ) : (
        <div className="ch-empty">
          {sort === 'saved'
            ? 'No saved designs yet. Tap the heart on any design to save it here.'
            : 'No designs in this category yet.'}
        </div>
      )}

      {submitOpen && <SubmitModal onClose={() => setSubmitOpen(false)} onSubmit={handleSubmit} />}
    </div>
  )
}
