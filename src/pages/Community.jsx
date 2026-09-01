import { useState, useEffect, useMemo, useCallback } from 'react'
import { COMMUNITY_DESIGNS, COMMUNITY_CATEGORIES } from '../data/communityDesigns'
import CommunityCard from '../components/discover/CommunityCard'
import { useAuth } from '../contexts/AuthContext'
import { useLoginPrompt } from '../contexts/LoginPromptContext'
import { getOwnerHandle, PUBLIC_OWNER_ID } from '../utils/constants'
import { readCommunitySubmissions, sanitizeCommunitySubmission, writeCommunitySubmissions } from '../utils/communitySubmissions'
import { COMMUNITY_SUBMIT_REASONS, consumeSubmitIntent, hasSubmitIntent, resetSubmitIntent, setSubmitIntent } from '../utils/submitIntent'
import { buildQueueRecord, mergeSubmissions } from '../utils/communityQueue'
import { listMySubmissions, publishToQueue } from '../utils/communityQueueApi'
import useModalDialog from '../hooks/useModalDialog'

// Community Hub — browse, save, and submit design inspiration. Saves drive the
// ranking. Baseline save counts are illustrative for now; the heart toggle and
// each user's own saves persist locally and layer on top, so the UX is real and
// upgrades cleanly to shared Firestore counts later.
//
// The seed data (COMMUNITY_DESIGNS), the category list (COMMUNITY_CATEGORIES) and
// the card (CommunityCard) now live in shared modules so the Discover surface can
// render the same designs without importing this page.
//
// A SUBMISSION IS A PROPERTY OF THE ACCOUNT, NOT OF THIS BROWSER. It used to be
// written to `vs-community-submissions` and nowhere else, so a design submitted
// on a phone was invisible on a laptop and no reviewer ever saw it. Submitting
// now also publishes to the shared review queue (utils/communityQueue.js) and
// this list merges the account's copy back over the local one.

const SAVES_KEY = 'vs-community-saves'

function loadSaves() {
  try { return new Set(JSON.parse(localStorage.getItem(SAVES_KEY) || '[]')) } catch { return new Set() }
}
function loadSubmissions() {
  return readCommunitySubmissions()
}

function SubmitModal({ onClose, onSubmit, authorName, ownerId }) {
  const [form, setForm] = useState({ name: '', author: authorName || '', url: '', category: 'Landing' })
  const [error, setError] = useState('')

  const submitDialogRef = useModalDialog(onClose)

  const submit = () => {
    if (!form.name.trim()) return setError('Give your design a name.')
    let url = form.url.trim()
    if (url && !/^https?:\/\//i.test(url)) url = 'https://' + url
    if (url && !/^https?:\/\/[^\s.]+\.[^\s]+/i.test(url)) return setError('That URL doesn’t look right.')
    onSubmit({
      id: 'u' + Date.now(),
      name: form.name.trim(),
      author: form.author.trim() || 'You',
      ownerId: ownerId || undefined,
      category: form.category,
      url: url || '#',
      c1: '#3B82F6', c2: '#8B5CF6',
      saves: 0,
      mine: true,
    })
  }

  return (
    <div className="ui-modal-overlay" onClick={onClose} role="presentation">
      <div className="ui-modal" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Submit a design" tabIndex={-1} ref={submitDialogRef}>
        <div className="ui-modal-head">
          <h2 className="ui-modal-title">Submit a design</h2>
          <button className="ui-modal-x" onClick={onClose} aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>
        <div className="ui-modal-body">
          <div className="ui-form">
            <label className="ui-field">
              <span>Name</span>
              <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Aurora Analytics" maxLength={60} />
            </label>
            <label className="ui-field">
              <span>Author</span>
              <input type="text" value={form.author} onChange={e => setForm(f => ({ ...f, author: e.target.value }))} placeholder="Your name (optional)" maxLength={40} />
            </label>
            <label className="ui-field">
              <span>Link</span>
              <input type="text" value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} placeholder="https://… (optional)" />
            </label>
            <label className="ui-field">
              <span>Category</span>
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                {COMMUNITY_CATEGORIES.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            {error && <div className="ui-modal-err">{error}</div>}
            {/* This note used to say submissions were saved to this browser
                "for now". They now go to the review queue on your account, so
                it says what actually happens — including that nothing appears
                in the public library until a reviewer approves it. */}
            <p className="ui-modal-note">Submissions are saved to your account and queued for review, so they follow you across devices. Nothing appears publicly until it has been reviewed.</p>
          </div>
          <div className="ui-modal-actions ui-modal-actions--row">
            <button className="btn" onClick={onClose}>Cancel</button>
            <button className="btn btn-accent" onClick={submit}>Submit design</button>
          </div>
        </div>
      </div>
    </div>
  )
}

const SUBMIT_SURFACE = 'community'

export default function Community({ toast }) {
  const { user, userProfile, loading: authLoading } = useAuth()
  const { requireLogin } = useLoginPrompt()
  const owner = getOwnerHandle(user?.email)
  // A stable primitive, so the gate effects below don't re-run on every render
  // of AuthContext (which rebuilds the `user` object each time).
  const uid = user?.uid || null
  const [saves, setSaves] = useState(loadSaves)
  // The LOCAL store only. It is what gets written back to localStorage below,
  // so the account's copy is deliberately kept out of it: round-tripping server
  // documents through this browser's store would grow it without bound and
  // blur which entries this device actually owns.
  const [submissions, setSubmissions] = useState(loadSubmissions)
  // The account's copy, mapped into the card shape. Empty until it arrives (or
  // for good, when signed out or offline) — the local list renders either way.
  const [serverSubmissions, setServerSubmissions] = useState([])
  const [filter, setFilter] = useState('All')
  const [sort, setSort] = useState('popular')
  const [submitOpen, setSubmitOpen] = useState(false)

  useEffect(() => {
    try { localStorage.setItem(SAVES_KEY, JSON.stringify([...saves])) } catch { /* quota */ }
  }, [saves])
  useEffect(() => {
    writeCommunitySubmissions(submissions)
  }, [submissions])

  // "My submissions" is a property of the ACCOUNT, not of this browser.
  //
  // This list used to come from localStorage alone, so a design submitted on a
  // phone was invisible on a laptop and vice versa. They were never lost; they
  // were simply only ever in one browser's storage, and no reviewer could see
  // them either.
  //
  // The local list still renders first (instant, works offline); the account's
  // copy merges in when it arrives. Local-only entries are KEPT and marked
  // unsynced rather than dropped — they are real submissions that have not
  // reached the queue yet, and hiding them would look exactly like the bug.
  useEffect(() => {
    let cancelled = false
    if (!uid) return undefined
    listMySubmissions(uid, 'design')
      .then((server) => {
        if (cancelled) return
        // Through the SAME sanitiser the local store uses. A card rendered from
        // the wire must not be handed a `javascript:` href just because the
        // document came back from Firestore instead of localStorage —
        // safeHttpUrl is the only thing that has ever guaranteed that.
        setServerSubmissions(server.map(s => sanitizeCommunitySubmission({
          id: s.localId || s.id,
          name: s.name,
          status: s.status,
          createdAt: s.createdAt,
          saves: 0,
          mine: true,
          c1: '#3B82F6', c2: '#8B5CF6',
          ...(s.payload || {}),
        })).filter(Boolean))
      })
      .catch(() => { /* the local list still stands; nothing is lost */ })
    return () => { cancelled = true }
  }, [uid])

  // Server wins on conflict — it is the copy a reviewer acts on — and the local
  // entry it replaces is matched on `localId`. See utils/communityQueue.js.
  const mine = useMemo(
    () => mergeSubmissions(serverSubmissions, submissions),
    [serverSubmissions, submissions],
  )

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

  const all = useMemo(() => [...mine, ...COMMUNITY_DESIGNS], [mine])

  const visible = useMemo(() => {
    let list = filter === 'All' ? all : all.filter(i => i.category === filter)
    list = [...list]
    if (sort === 'popular') list.sort((a, b) => effectiveCount(b) - effectiveCount(a))
    else if (sort === 'saved') list = list.filter(i => saves.has(i.id))
    return list
  }, [all, filter, sort, effectiveCount, saves])

  // Local first — submitting works offline and the list updates without
  // waiting on a round trip — then the shared queue, which is what makes the
  // submission follow the account and reach a reviewer at all.
  const handleSubmit = async (item) => {
    // Defence in depth: the form is only mounted for a signed-in user, but a
    // sign-out mid-flow must not slip a submission through.
    if (!uid) { setSubmitOpen(false); return }
    setSubmissions(prev => [item, ...prev])
    setSubmitOpen(false)

    const queued = buildQueueRecord({
      kind: 'design',
      name: item.name,
      user,
      payload: {
        author: item.author, category: item.category, url: item.url,
        c1: item.c1, c2: item.c2,
      },
    })
    if (!queued) {
      // No signed-in user — the local copy stands, and the message says so
      // rather than claiming it reached a reviewer.
      toast?.('Saved to this browser. Sign in to submit it for review.')
      return
    }
    try {
      await publishToQueue({ ...queued, localId: item.id })
      toast?.('Design submitted for review')
    } catch {
      // Never claim it reached the queue when it did not. The local copy is
      // kept, so nothing the user made is lost.
      toast?.('Saved locally — we could not reach the review queue. Try again later.')
    }
  }

  // Ask a signed-out user to sign in BEFORE the submission form exists — the
  // form is never mounted for them, so nobody fills one in and only then
  // discovers they need an account.
  //
  // While auth is still resolving we know neither answer, so we show neither:
  // the trigger stays disabled rather than flashing a sign-in dialog at someone
  // who turns out to be signed in already.
  // The single place the submission form is opened. Both the gate below and the
  // post-sign-in resume go through it, so there is exactly one path to a form.
  const openSubmitForm = useCallback(() => {
    consumeSubmitIntent()
    setSubmitOpen(true)
  }, [])

  const openSubmit = useCallback(async () => {
    if (authLoading) return
    if (!uid) {
      setSubmitIntent(SUBMIT_SURFACE)
      const signedIn = await requireLogin('submit a design to the community', {
        free: true,
        reasons: COMMUNITY_SUBMIT_REASONS,
      })
      if (!signedIn) { resetSubmitIntent(); return }
    }
    openSubmitForm()
  }, [authLoading, uid, requireLogin, openSubmitForm])

  // Resume the intent when signing in remounted this surface — the awaited
  // handler above would have been discarded with the old tree. In-memory only:
  // a full page reload finds nothing and the page just opens normally.
  useEffect(() => {
    if (authLoading || !uid) return
    if (!hasSubmitIntent(SUBMIT_SURFACE)) return
    openSubmitForm()
  }, [authLoading, uid, openSubmitForm])

  return (
    <div className="ch-wrap">
      <header className="ch-head">
        <div>
          <h1 className="ch-title">Community Hub</h1>
          {/* Says what these cards ARE. The twelve seeded entries carry names
              and authors but link to four bare stock-site homepages, because
              they are examples of the shape, not real submissions — the sweep
              clicked "Aurora Analytics" and landed on Dribbble's front page.
              Presenting seed data as a community is the kind of thing a visitor
              only has to catch once. Real submissions sit above them and are
              indistinguishable from the user's side, so this line is how you
              can tell. */}
          <p className="ch-sub">
            Browse design inspiration, save your favourites, and submit your own. Ranked by saves.
            <br />
            <small>The starter cards below are example entries showing the format — submissions from the community appear above them.</small>
          </p>
        </div>
        <button
          className="btn btn-accent ch-submit-btn"
          onClick={openSubmit}
          disabled={authLoading}
          aria-busy={authLoading || undefined}
          title={authLoading ? 'Checking your account…' : 'Submit a design to the community'}
        >
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

      {/* Only ever mounted for a signed-in user — a sign-out mid-flow closes it
          rather than leaving a form nobody can submit. */}
      {submitOpen && uid && (
        <SubmitModal
          onClose={() => setSubmitOpen(false)}
          onSubmit={handleSubmit}
          authorName={owner?.publicHandle || userProfile?.displayName || user?.displayName || ''}
          ownerId={owner ? PUBLIC_OWNER_ID : undefined}
        />
      )}
    </div>
  )
}
