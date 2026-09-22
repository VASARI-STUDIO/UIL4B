import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { COMMUNITY_DESIGNS, COMMUNITY_CATEGORIES } from '../data/communityDesigns'
import CommunityCard from '../components/discover/CommunityCard'
import { useAuth } from '../contexts/AuthContext'
import { useLoginPrompt } from '../contexts/LoginPromptContext'
import { getOwnerHandle, PUBLIC_OWNER_ID } from '../utils/constants'
import { readCommunitySubmissions, sanitizeCommunitySubmission, writeCommunitySubmissions } from '../utils/communitySubmissions'
import GalleryCloseCta from '../components/discover/GalleryCloseCta'
import { COMMUNITY_SUBMIT_REASONS, consumeSubmitIntent, hasSubmitIntent, resetSubmitIntent, setSubmitIntent } from '../utils/submitIntent'
import { buildQueueRecord, mergeSubmissions } from '../utils/communityQueue'
import { deleteSubmission, listMySubmissions, publishToQueue } from '../utils/communityQueueApi'
import {
  ICON_ACCEPT_ATTR, ICON_ACCEPT_LABEL, ICON_MAX_LABEL,
  appendIconSubmission, buildIconPayload, normaliseIconSvg,
  readIconSubmissions, removeIconSubmission,
} from '../utils/iconSubmission'
import IconSubmissionPreview from '../components/discover/IconSubmissionPreview'
import useModalDialog from '../hooks/useModalDialog'
// The stylesheet families this surface needs, split out of the one
// render-blocking global sheet (see src/styles/deferred/). They ride this
// route's own lazy chunk, so they arrive with it and never with the homepage.
import '../styles/deferred/account.css'
import '../styles/deferred/tool-shell.css'

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
                it says what actually happens.

                A SECOND SENTENCE IS DELETED: "Nothing appears publicly until
                it has been reviewed." Review is real — CommunityQueue.jsx in
                the admin approves and rejects — but APPEARING is not: this
                page renders [...mine, ...COMMUNITY_DESIGNS], listQueue() is
                called from the admin queue and nowhere else, and pipeline.js
                records that community publishing is deliberately unbuilt
                (#377). "Until" promised an after that no code delivers. */}
            <p className="ui-modal-note">Submissions are saved to your account and queued for review, so they follow you across devices.</p>
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

// THE ICON FORM — the second thing this page takes.
//
// Founder, 2026-09-18: "people can submit icons to the community they just need
// to be reviewed - all submissions of any sorts are tied to the account not
// browser."
//
// It is a SEPARATE modal behind a SEPARATE button rather than a type switch
// inside the design form, for the reason Behance's "New Asset" is its own entry
// beside "Share Your Work": the two submissions have nothing in common. A design
// is a name and a link to somewhere else; an icon is a file that lands here and
// has to be checked before anybody sees it. One form that changed four of its
// five fields when you flipped a segment would be one form pretending to be two.
// https://mobbin.com/screens/feb60d74-2868-4c17-9abb-fbe15ac6b52d
//
// WHAT IS NOT HERE, deliberately: a "your icon will appear in the library"
// promise. Nothing outside src/components/admin reads the approved queue, so
// approval shows an icon to nobody but its author — the state
// surface-claims-truth.test.js pins by name. The form says it is queued for
// review, which is exactly and only what happens.
function IconSubmitModal({ onClose, onSubmit, authorName }) {
  const fileRef = useRef(null)
  const [name, setName] = useState('')
  const [author, setAuthor] = useState(authorName || '')
  const [markup, setMarkup] = useState('')
  const [filename, setFilename] = useState('')
  const [error, setError] = useState('')

  const dialogRef = useModalDialog(onClose)

  // Validated on every keystroke rather than on submit, so the preview below is
  // either the real artwork or the real reason there isn't any. A refusal that
  // waits for the submit press is a refusal the user meets after they thought
  // they were finished.
  const checked = markup.trim() ? normaliseIconSvg(markup) : null
  const preview = checked && !checked.error ? checked.svg : ''

  const readFile = (file) => {
    if (!file) return
    setFilename(file.name)
    const reader = new FileReader()
    reader.onload = () => {
      setMarkup(String(reader.result || ''))
      setError('')
    }
    reader.onerror = () => setError('That file does not look like an SVG.')
    reader.readAsText(file)
  }

  const submit = () => {
    if (!name.trim()) return setError('Give your icon a name.')
    const result = normaliseIconSvg(markup)
    if (result.error) return setError(result.error)
    onSubmit({ name: name.trim(), author: author.trim(), svg: result.svg })
  }

  return (
    <div className="ui-modal-overlay" onClick={onClose} role="presentation">
      <div className="ui-modal ui-modal--wide" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Submit an icon" tabIndex={-1} ref={dialogRef}>
        <div className="ui-modal-head">
          <h2 className="ui-modal-title">Submit an icon</h2>
          <button className="ui-modal-x" onClick={onClose} aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>
        <div className="ui-modal-body">
          <div className="ui-form">
            <label className="ui-field">
              <span>Name</span>
              <input type="text" value={name} onChange={e => setName(e.target.value)} maxLength={80} />
            </label>
            <label className="ui-field">
              <span>Author</span>
              <input type="text" value={author} onChange={e => setAuthor(e.target.value)} placeholder="Your name (optional)" maxLength={40} />
            </label>
            {/* WHAT IT TAKES AND HOW BIG, BEFORE THE PICKER — never sprung as an
                error afterwards. Mobbin, Coda "Upload an icon": the
                recommendation sits under the drop zone before anything is
                chosen (https://mobbin.com/screens/70345eb7-519e-46cc-a4e7-0d81d42f3c2f).
                Both values come from utils/iconSubmission.js, so this line
                cannot state a limit the module does not enforce. */}
            {/* THE PICKER IS A BUTTON, AND THE INPUT IS HIDDEN BEHIND IT.
                A bare <input type="file"> renders the operating system's own
                grey "Choose File / No file chosen" control, which followed
                neither theme and sat in the middle of a designed modal looking
                bolted on. It was rendered at 390 and 1440 in both themes before
                this was changed, which is the only way that gets noticed.

                The pattern is components/BrandLogoField.jsx's, unchanged: the
                input is sr-only, aria-hidden and out of the tab order, and a
                real button opens it — so the keyboard path is the button, and
                there is exactly one control here rather than two. */}
            <div className="ui-field">
              <span>{`${ICON_ACCEPT_LABEL} file · up to ${ICON_MAX_LABEL}`}</span>
              <span>
                <button type="button" className="btn btn-s" onClick={() => fileRef.current?.click()}>
                  {filename ? 'Replace file' : 'Choose file'}
                </button>
              </span>
              <input
                ref={fileRef}
                type="file"
                accept={ICON_ACCEPT_ATTR}
                className="sr-only"
                aria-hidden="true"
                tabIndex={-1}
                onChange={e => { readFile(e.target.files?.[0]); e.target.value = '' }}
              />
            </div>
            {/* The same field twice is not a duplicate: an icon is as often
                copied out of a code editor as it is exported to a file, and the
                app's own icon pages hand you SVG on a Copy button. Whichever
                route it arrives by, the textarea is what was actually read —
                Behance shows the resolved file back for the same reason. */}
            <label className="ui-field">
              <span>{filename ? `SVG markup · ${filename}` : 'SVG markup'}</span>
              <textarea
                rows={5}
                value={markup}
                onChange={e => { setMarkup(e.target.value); setError('') }}
                spellCheck={false}
              />
            </label>

            {preview && (
              <div className="ui-field">
                <span>Preview</span>
                <IconSubmissionPreview svg={preview} name={name.trim()} size={56} />
              </div>
            )}

            {/* TWO ERRORS, ONE ELEMENT, AND ONLY ONE OF THEM INTERRUPTS.
                The markup is validated on every keystroke so the preview is
                either the real artwork or the real reason there isn't any — but
                a role="alert" on that would announce a refusal after every
                character of a pasted SVG, which is the interrupting live region
                the review bar forbids. So the typed hint is silent and the
                SUBMIT refusal, which is a thing the user just asked for an
                answer to, is the one that speaks. */}
            {error
              ? <div className="ui-modal-err" role="alert">{error}</div>
              : checked?.error
                ? <div className="ui-modal-err">{checked.error}</div>
                : null}

            {/* The identical sentence the design form carries, because it is the
                identical promise: the account, and a review. Nothing about
                appearing. */}
            <p className="ui-modal-note">Submissions are saved to your account and queued for review, so they follow you across devices.</p>
          </div>
          <div className="ui-modal-actions ui-modal-actions--row">
            <button className="btn" onClick={onClose}>Cancel</button>
            <button className="btn btn-accent" onClick={submit}>Submit icon</button>
          </div>
        </div>
      </div>
    </div>
  )
}

const SUBMIT_SURFACE = 'community'
const ICON_SUBMIT_SURFACE = 'community-icon'

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
  // ICONS. Same two-source shape as the designs above and as GradientGallery:
  // this browser's copy renders instantly and offline, the account's copy
  // arrives and wins. They are kept in their own state rather than folded into
  // `submissions` because they must never reach the browse grid — see the
  // section that renders them.
  const [iconOpen, setIconOpen] = useState(false)
  const [iconLocal, setIconLocal] = useState(readIconSubmissions)
  const [serverIcons, setServerIcons] = useState([])
  const [iconBusyId, setIconBusyId] = useState(null)

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

  // The account's icon submissions. `docId` is carried through the merge
  // deliberately: withdrawing one is a write against the Firestore DOCUMENT, and
  // `id` at this point is the LOCAL id the merge pairs on, which Firestore has
  // never heard of.
  useEffect(() => {
    let cancelled = false
    if (!uid) return undefined
    listMySubmissions(uid, 'icon')
      .then((server) => {
        if (cancelled) return
        setServerIcons(server.map(s => ({
          id: s.localId || s.id,
          docId: s.id,
          name: s.name,
          status: s.status,
          createdAt: s.createdAt,
          author: s.payload?.author || s.authorName || '',
          svg: s.payload?.svg || '',
        })).filter(s => s.svg))
      })
      .catch(() => { /* the local list still stands; nothing is lost */ })
    return () => { cancelled = true }
  }, [uid])

  const myIcons = useMemo(
    () => mergeSubmissions(serverIcons, iconLocal),
    [serverIcons, iconLocal],
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

  // ── Icons ────────────────────────────────────────────────────────────────
  //
  // publishToQueue is the ACCOUNT copy and it is the one that matters: it is
  // keyed by authorUid, it survives a cache clear, and it is what a reviewer
  // opens. The local write before it is a buffer, not the record.
  //
  // THE THING THE THREE OLDER FLOWS DO NOT DO. Gradients, palettes and designs
  // all keep a local copy when the publish fails and then offer no way to ever
  // get it to the account — the submission sits in one browser forever, which is
  // the exact bug the queue was built to end, re-entered through the error path.
  // An icon that failed to publish is marked unsynced and carries `retryIcon`.
  //
  // IT RETURNS THE DOCUMENT ID, and that is not bookkeeping. The first draft
  // returned a boolean and recorded the fresh entry with `docId: null`, so
  // submitting an icon and then withdrawing it IN THE SAME SESSION deleted the
  // local copy, said "Submission withdrawn", and left the account's copy sitting
  // in the reviewer's queue. The user would have been told a thing had been
  // taken back that had not been. Found by rendering the flow, not by a test —
  // and there is now a test.
  const publishIcon = useCallback(async (item) => {
    const payload = buildIconPayload({ svg: item.svg, author: item.author })
    const queued = payload && buildQueueRecord({ kind: 'icon', name: item.name, user, payload })
    if (!queued) {
      toast?.('Saved to this browser. Sign in to submit it for review.')
      return null
    }
    try {
      return await publishToQueue({ ...queued, localId: item.id })
    } catch {
      // Never claim it reached the queue when it did not. Until the founder
      // publishes docs/design/community-icon-rules.patch, firestore.rules does
      // not know the 'icon' kind and this is the branch every submission takes.
      toast?.('Saved locally — we could not reach the review queue. Try again later.')
      return null
    }
  }, [user, toast])

  /** One place the freshly published entry is recorded, so both callers agree. */
  const recordPublished = useCallback((item, docId) => {
    setServerIcons(prev => [{ ...item, docId }, ...prev.filter(s => s.id !== item.id)])
    toast?.('Icon submitted for review')
  }, [toast])

  const handleIconSubmit = useCallback(async (draft) => {
    if (!uid) { setIconOpen(false); return }
    const item = {
      id: 'i' + Date.now(),
      name: draft.name,
      author: draft.author,
      svg: draft.svg,
      status: 'pending',
      createdAt: new Date().toISOString(),
    }
    // Local FIRST, exactly as the design flow does: submitting works offline and
    // the list updates without waiting on a round trip.
    setIconLocal(appendIconSubmission(item))
    setIconOpen(false)
    const docId = await publishIcon(item)
    if (docId) recordPublished(item, docId)
  }, [uid, publishIcon, recordPublished])

  const retryIcon = useCallback(async (item) => {
    setIconBusyId(item.id)
    try {
      const docId = await publishIcon(item)
      if (docId) recordPublished(item, docId)
    } finally {
      setIconBusyId(null)
    }
  }, [publishIcon, recordPublished])

  // The third of COMMUNITY_SUBMIT_REASONS — "You can withdraw anything you have
  // submitted, at any time" — kept for real. The local copy goes either way; the
  // account copy is deleted when there is one, and firestore.rules already allows
  // an owner to delete their own submission.
  const withdrawIcon = useCallback(async (item) => {
    setIconBusyId(item.id)
    try {
      if (item.docId) await deleteSubmission(item.docId)
      setIconLocal(removeIconSubmission(item.id))
      setServerIcons(prev => prev.filter(s => s.id !== item.id))
      toast?.('Submission withdrawn')
    } catch {
      // The local copy is left alone: removing it while the account still holds
      // the submission would show the user a withdrawal that did not happen.
      toast?.('Could not delete that.')
    } finally {
      setIconBusyId(null)
    }
  }, [toast])

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
      // `signup: true` — the third of the three, and the one the 2026-09-16
      // audit did not list. It named Type Scale's save and Gradient's submit;
      // this gate has the identical shape (only reached when `uid` is absent,
      // so everybody who meets it has no account) and was greeting them with
      // "Log in to continue" all the same. Fixing two of three would have left
      // the product doing the same thing two ways, which is the split this
      // branch keeps closing elsewhere.
      const signedIn = await requireLogin('submit a design to the community', {
        free: true,
        signup: true,
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

  // The icon gate, the same shape and the same three promises. `signup: true`
  // for the same reason the design gate carries it: this branch is only reached
  // when `uid` is absent, so everybody who meets it has no account and being
  // greeted with "Log in to continue" is the product disagreeing with itself.
  const openIconForm = useCallback(() => {
    consumeSubmitIntent()
    setIconOpen(true)
  }, [])

  const openIconSubmit = useCallback(async () => {
    if (authLoading) return
    if (!uid) {
      setSubmitIntent(ICON_SUBMIT_SURFACE)
      const signedIn = await requireLogin('submit an icon to the community', {
        free: true,
        signup: true,
        reasons: COMMUNITY_SUBMIT_REASONS,
      })
      if (!signedIn) { resetSubmitIntent(); return }
    }
    openIconForm()
  }, [authLoading, uid, requireLogin, openIconForm])

  useEffect(() => {
    if (authLoading || !uid) return
    if (!hasSubmitIntent(ICON_SUBMIT_SURFACE)) return
    openIconForm()
  }, [authLoading, uid, openIconForm])

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
        {/* TWO ENTRY POINTS, NOT ONE WITH A SWITCH. The flex wrapper is three
            inline properties rather than a new class because every stylesheet
            that could hold it belongs to another stream this week; it is on the
            list for whoever next owns account.css. */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
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
          <button
            className="btn ch-submit-btn"
            onClick={openIconSubmit}
            disabled={authLoading}
            aria-busy={authLoading || undefined}
            title={authLoading ? 'Checking your account…' : 'Submit an icon to the community'}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            Submit icon
          </button>
        </div>
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

      {/* THE CARDS ARE WHAT THIS PAGE IS FOR, AND THEY SAT IN NO LANDMARK.
          The grid was a bare <div className="ch-grid">, so a reader navigating
          by region found the header and the footer and nothing naming the
          twelve designs between them — and the seven category filters above
          could take the count from twelve to zero without announcing it.

          Same shape and same fix as the Prompt Library beside it: a labelled
          section, named by the filter the visitor is standing in, with the
          count in a polite live region. The name is their own selection, which
          the filter button already renders, and the count is counted — nothing
          here is a written sentence, and nothing moves on screen. */}
      <section aria-labelledby="ch-results-heading">
        <h2 className="sr-only" id="ch-results-heading">
          {filter === 'All' ? 'Community designs' : `${filter} designs`}
        </h2>
        <p className="sr-only" aria-live="polite">
          {visible.length} {visible.length === 1 ? 'design' : 'designs'}
        </p>
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
      </section>

      {/* YOUR ICON SUBMISSIONS — AND THEY ARE NOT IN THE GRID ABOVE.
          Kept out of it on purpose, the same call GradientGallery.jsx makes and
          for the same reason: they are not in any library, and rendering them
          among the browsable cards would imply they had been published. Nothing
          outside src/components/admin reads the approved queue, so an approved
          icon is shown to nobody but its author — and this section is the one
          place it is shown, labelled as queued.

          Every string here already existed. The heading and the status come from
          GradientGallery's own queue; the note is the submission form's own
          sentence, which is the accurate one for icons (they DO reach the
          account, which is what the founder asked for). */}
      {myIcons.length > 0 && (
        <section aria-labelledby="ch-icons-heading">
          <div className="section-h">
            <h2 id="ch-icons-heading">Your submissions</h2>
            <span className="meta">Queued for review — not published</span>
          </div>
          <p className="ui-modal-note">Submissions are saved to your account and queued for review, so they follow you across devices.</p>
          <ul style={{ listStyle: 'none', margin: '12px 0 0', padding: 0 }}>
            {myIcons.map(s => (
              <li key={s.id} className="toggle-row ch-toolbar">
                <IconSubmissionPreview svg={s.svg} name={s.name} />
                <span className="toggle-row-info" style={{ flex: '1 1 140px', minWidth: 0 }}>
                  <span className="toggle-row-label">{s.name}</span>
                  <span className="toggle-row-meta">
                    {s.author ? `${s.author} · ` : ''}
                    <span className="mono">{new Date(s.createdAt).toLocaleDateString()}</span>
                  </span>
                </span>
                {/* SYNCED IS THE WHOLE POINT OF THE ROW. An entry the account
                    does not hold is one cache clear from gone, and saying
                    "Pending review" over it would be claiming a reviewer can
                    see something no reviewer can reach. */}
                <span className="ch-card-tag">{s.synced ? 'Pending review' : 'Not sent'}</span>
                {!s.synced && (
                  <button
                    type="button"
                    className="btn btn-s"
                    onClick={() => retryIcon(s)}
                    disabled={iconBusyId === s.id}
                    aria-busy={iconBusyId === s.id || undefined}
                  >
                    Retry
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn-s"
                  onClick={() => withdrawIcon(s)}
                  disabled={iconBusyId === s.id}
                  aria-busy={iconBusyId === s.id || undefined}
                >
                  Withdraw
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* The closing line, below the last card. The submission entry is on this
          page, so the CTA calls `openSubmit` itself — the same function the
          masthead's Submit design button uses, so a signed-out visitor meets
          the identical requireLogin gate and reasons rather than a copy of
          them. No scroll handling here, unlike /discover/prompts: what opens is
          a MODAL, which arrives where the user already is. */}
      <GalleryCloseCta
        className="ch-cta"
        // ", and reviewed before it appears" is deleted — see the note in
        // SubmitModal: nothing outside the admin reads the reviewed queue, so
        // "appears" is a step with no code behind it. The same three promises
        // still sit in COMMUNITY_SUBMIT_REASONS (utils/submitIntent.js), which
        // is outside this lane and is filed in pipeline.js.
        detail="Submit a design of your own — it is credited to you."
        action="Create and submit your own"
        onAction={openSubmit}
        busy={authLoading}
      />

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

      {/* Same rule as the design form: only ever mounted for a signed-in user,
          so a sign-out mid-flow closes it rather than leaving a form nobody can
          submit. */}
      {iconOpen && uid && (
        <IconSubmitModal
          onClose={() => setIconOpen(false)}
          onSubmit={handleIconSubmit}
          authorName={owner?.publicHandle || userProfile?.displayName || user?.displayName || ''}
        />
      )}
    </div>
  )
}
