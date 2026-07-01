import { useState, useEffect, useMemo, useCallback } from 'react'
import { COMMUNITY_DESIGNS, COMMUNITY_CATEGORIES } from '../data/communityDesigns'
import CommunityCard from '../components/discover/CommunityCard'

// Community Hub — browse, save, and submit design inspiration. Saves drive the
// ranking. Baseline save counts are illustrative for now; the heart toggle and
// each user's own saves persist locally and layer on top, so the UX is real and
// upgrades cleanly to shared Firestore counts later.
//
// The seed data (COMMUNITY_DESIGNS), the category list (COMMUNITY_CATEGORIES) and
// the card (CommunityCard) now live in shared modules so the Discover surface can
// render the same designs without importing this page. Submission stays a
// local-only placeholder here (no shared publishing pipeline yet).

const SAVES_KEY = 'vs-community-saves'
const SUBMISSIONS_KEY = 'vs-community-submissions'

function loadSaves() {
  try { return new Set(JSON.parse(localStorage.getItem(SAVES_KEY) || '[]')) } catch { return new Set() }
}
function loadSubmissions() {
  try { return JSON.parse(localStorage.getItem(SUBMISSIONS_KEY) || '[]') } catch { return [] }
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
    <div className="ch-modal-overlay" onClick={onClose} role="presentation">
      <div className="ch-modal" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Submit a design">
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
              {COMMUNITY_CATEGORIES.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
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

  const all = useMemo(() => [...submissions, ...COMMUNITY_DESIGNS], [submissions])

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
          {COMMUNITY_CATEGORIES.map(c => (
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
            <CommunityCard key={item.id} item={item} saved={saves.has(item.id)} count={effectiveCount(item)} onToggle={toggleSave} />
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
