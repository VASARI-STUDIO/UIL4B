import MenuSelect from '../components/tool/MenuSelect'
import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { COMMUNITY_DESIGNS, COMMUNITY_CATEGORIES } from '../data/communityDesigns'
import CommunityCard from '../components/discover/CommunityCard'
import { useAuth } from '../contexts/AuthContext'
import { useLoginPrompt } from '../contexts/LoginPromptContext'
import { getOwnerHandle, PUBLIC_OWNER_ID } from '../utils/constants'
import { readCommunitySubmissions, sanitizeCommunitySubmission, writeCommunitySubmissions } from '../utils/communitySubmissions'
import GalleryCloseCta from '../components/discover/GalleryCloseCta'
import { COMMUNITY_SUBMIT_REASONS, consumeSubmitIntent, hasSubmitIntent, resetSubmitIntent, setSubmitIntent } from '../utils/submitIntent'
import { buildQueueRecord, mergeSubmissions, publicDesignFromDoc, publicDesignsForViewer, submissionStatusLabel } from '../utils/communityQueue'
import { deleteSubmission, listApprovedDesigns, listMySubmissions, publishToQueue } from '../utils/communityQueueApi'
import { isPostLimit } from '../utils/communityLimits'
import { TOAST_ACTION_MIN_MS } from '../utils/toastDuration'
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
// THIS PAGE'S OWN SHEET, AND IT IS IMPORTED LAST ON PURPOSE.
//
// The `.ch-*` family lives in `deferred/account.css` (shared with /settings and
// /projects) and `.ch-filter` / `.ch-sort-btn` live in the render-blocking
// `global.css`. Neither is this lane's to edit. Importing here means Vite emits
// the sheet with this route's own chunk — only a visitor who opens /community
// pays for it, and it arrives after both of the sheets it re-dresses, so the
// rules below win at equal specificity without an `!important` anywhere.
import '../styles/pages/community.css'

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
      <div className="ui-modal ui-modal--form" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Submit a design" tabIndex={-1} ref={submitDialogRef}>
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
              <MenuSelect label="Category" value={form.category} onChange={nextValue => setForm(f => ({ ...f, category: nextValue }))}>
                {COMMUNITY_CATEGORIES.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
              </MenuSelect>
            </label>
            {error && <div className="ui-modal-err">{error}</div>}
            {/* Says where a submission goes: the review queue on the account.
                The grid also lists other members' approved designs
                (listApprovedDesigns), so an approved design does appear for
                everyone; the sentence stays about the queue because that is
                the part the submitter controls. */}
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
// People can submit icons to the community; they only need to be reviewed.
// All submissions of any sort are tied to the account, not the browser.
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
      <div className="ui-modal ui-modal--wide ui-modal--form" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Submit an icon" tabIndex={-1} ref={dialogRef}>
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
  // Approved designs from every account, read for any visitor: signed out, Free
  // or Pro. A page at a time; `cursor` is where the next page starts.
  const [publicDesigns, setPublicDesigns] = useState([])
  const [publicPage, setPublicPage] = useState({ cursor: null, hasMore: false, loading: false })
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
  // The ids of the designs and icons with a publish or a withdrawal in flight.
  // The ids of the two kinds never collide.
  const [busyIds, setBusyIds] = useState(() => new Set())
  const setBusy = useCallback((id, on) => setBusyIds((prev) => {
    if (prev.has(id) === on) return prev
    const next = new Set(prev)
    if (on) next.add(id)
    else next.delete(id)
    return next
  }), [])
  // Entries with a withdrawal waiting out its Undo window: hidden from every
  // list at once, and deleted when the window closes (see `withdraw`).
  const pendingWithdrawals = useRef(new Map())
  const [hiddenIds, setHiddenIds] = useState(() => new Set())
  const unhide = useCallback((id) => setHiddenIds((prev) => {
    if (!prev.has(id)) return prev
    const next = new Set(prev)
    next.delete(id)
    return next
  }), [])

  // Whether each list has been asked of the account yet. A local-only entry is
  // "Not sent" only once the account has had its say; before that it may well
  // be there already, and sending it again would queue it twice.
  const [listsRead, setListsRead] = useState({ design: false, icon: false })
  const markRead = useCallback((kind) => setListsRead(prev => (prev[kind] ? prev : { ...prev, [kind]: true })), [])
  const designsRead = !uid || listsRead.design
  const iconsRead = !uid || listsRead.icon

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
        // `docId` is the Firestore document a withdrawal deletes; `id` is the
        // local id the merge pairs on. A withdrawn document is gone as far as
        // its author is concerned.
        setServerSubmissions(server.filter(s => s.status !== 'withdrawn').map(s => sanitizeCommunitySubmission({
          id: s.localId || s.id,
          name: s.name,
          status: s.status,
          createdAt: s.createdAt,
          saves: 0,
          mine: true,
          c1: '#3B82F6', c2: '#8B5CF6',
          ...(s.payload || {}),
          docId: s.id,
        })).filter(Boolean))
      })
      .catch(() => { /* the local list still stands; nothing is lost */ })
      .finally(() => { if (!cancelled) markRead('design') })
    return () => { cancelled = true }
  }, [uid, markRead])

  // The first page of approved designs. It does not wait for sign-in: the read
  // is open to everyone, and a failure leaves the grid as the starter cards and
  // the viewer's own entries.
  useEffect(() => {
    let cancelled = false
    listApprovedDesigns()
      .then(({ items, cursor, hasMore }) => {
        if (cancelled) return
        setPublicDesigns(items.map(publicDesignFromDoc).filter(Boolean))
        setPublicPage({ cursor, hasMore, loading: false })
      })
      .catch(() => { /* the starter cards and the viewer's own stand */ })
    return () => { cancelled = true }
  }, [])

  const showMorePublic = useCallback(async () => {
    if (publicPage.loading || !publicPage.hasMore) return
    setPublicPage(prev => ({ ...prev, loading: true }))
    try {
      const { items, cursor, hasMore } = await listApprovedDesigns({ after: publicPage.cursor })
      const more = items.map(publicDesignFromDoc).filter(Boolean)
      setPublicDesigns(prev => {
        const seen = new Set(prev.map(i => i.id))
        return [...prev, ...more.filter(i => !seen.has(i.id))]
      })
      setPublicPage({ cursor, hasMore, loading: false })
    } catch {
      setPublicPage(prev => ({ ...prev, loading: false }))
      toast?.('Could not load more designs. Try again.', 'error')
    }
  }, [publicPage, toast])

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
        setServerIcons(server.filter(s => s.status !== 'withdrawn').map(s => ({
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
      .finally(() => { if (!cancelled) markRead('icon') })
    return () => { cancelled = true }
  }, [uid, markRead])

  const myIcons = useMemo(
    () => mergeSubmissions(serverIcons, iconLocal),
    [serverIcons, iconLocal],
  )

  // Saves belong to an account: signed out, a press asks to sign in first. The
  // stored set is read again after the wait, because signing in may have
  // merged the account's saves into it.
  const toggleSave = useCallback(async (id) => {
    if (!await requireLogin('save designs', { free: true, signup: true })) return
    setSaves(() => {
      const next = loadSaves()
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [requireLogin])

  // A saved item gets +1 on its displayed count so the ranking reacts to the
  // user's own save — exactly the "ranking by saves" behaviour, illustratively.
  const effectiveCount = useCallback((item) => item.saves + (saves.has(item.id) ? 1 : 0), [saves])

  // A design a reviewer turned down does not stay among the browsable cards: it
  // is listed under "Your submissions" with its status, where its author can
  // see what happened and withdraw it.
  const rejectedDesigns = useMemo(
    () => mine.filter(s => s.status === 'rejected' && !hiddenIds.has(s.id)),
    [mine, hiddenIds],
  )
  // The viewer's own entries first, then other members' approved designs, then
  // the starter cards: the order the page header describes. The viewer's own
  // approved designs are left out of the public list, as they are already in
  // their own with a status tag.
  const strangers = useMemo(
    () => publicDesignsForViewer(publicDesigns, { own: mine }),
    [publicDesigns, mine],
  )
  const all = useMemo(
    () => [...mine.filter(s => s.status !== 'rejected' && !hiddenIds.has(s.id)), ...strangers, ...COMMUNITY_DESIGNS],
    [mine, hiddenIds, strangers],
  )

  // One list for everything in "Your submissions", newest first.
  const queueRows = useMemo(() => [
    ...myIcons.filter(s => !hiddenIds.has(s.id)).map(s => ({ ...s, kind: 'icon' })),
    ...rejectedDesigns.map(s => ({ ...s, kind: 'design' })),
  ].sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || ''))), [myIcons, rejectedDesigns, hiddenIds])

  // What a card needs to say where one of the viewer's own designs stands.
  const ownControls = (item) => ({
    label: submissionStatusLabel({ status: item.status, synced: item.synced, sending: busyIds.has(item.id) }),
    busy: busyIds.has(item.id),
    ready: designsRead,
    onRetry: item.synced ? undefined : () => retryDesign(item),
    onWithdraw: () => withdraw('design', item),
  })

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
  //
  // publishDesign returns the document id, which the fresh entry is recorded
  // with so it reads as sent (and can be withdrawn) without a reload.
  const publishDesign = useCallback(async (item) => {
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
      return null
    }
    try {
      return await publishToQueue({ ...queued, localId: item.id })
    } catch (err) {
      // Never claim it reached the queue when it did not. The local copy is
      // kept, so nothing the user made is lost, and it is marked "Not sent". A
      // refusal by the post limits gets its own words, because trying again at
      // once cannot work.
      toast?.(isPostLimit(err)
        ? `${err.message} Your design is saved in this browser.`
        : 'Saved locally — we could not reach the review queue. Try again later.')
      return null
    }
  }, [user, toast])

  const recordDesignPublished = useCallback((item, docId) => {
    const entry = sanitizeCommunitySubmission({ ...item, docId, status: 'pending' })
    if (entry) setServerSubmissions(prev => [entry, ...prev.filter(s => s.id !== item.id)])
    toast?.('Design submitted for review')
  }, [toast])

  const handleSubmit = async (draft) => {
    // Defence in depth: the form is only mounted for a signed-in user, but a
    // sign-out mid-flow must not slip a submission through.
    if (!uid) { setSubmitOpen(false); return }
    const item = { ...draft, createdAt: new Date().toISOString() }
    setSubmissions(prev => [item, ...prev])
    setSubmitOpen(false)
    setBusy(item.id, true)
    try {
      const docId = await publishDesign(item)
      if (docId) recordDesignPublished(item, docId)
    } finally {
      setBusy(item.id, false)
    }
  }

  // A design that never reached the queue stays in this browser, marked "Not
  // sent"; this sends it again, the way an icon's Retry does.
  const retryDesign = useCallback(async (item) => {
    setBusy(item.id, true)
    try {
      const docId = await publishDesign(item)
      if (docId) recordDesignPublished(item, docId)
    } finally {
      setBusy(item.id, false)
    }
  }, [publishDesign, recordDesignPublished, setBusy])

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
    } catch (err) {
      // Never claim it reached the queue when it did not. Until
      // firestore.rules learns the 'icon' kind, this is the branch every
      // submission takes.
      // A refusal by the post limits says so instead; the icon stays unsynced
      // and can be sent again once the limit allows.
      toast?.(isPostLimit(err)
        ? `${err.message} Your icon is saved in this browser and can be sent again later.`
        : 'Saved locally — we could not reach the review queue. Try again later.')
      return null
    }
  }, [user, toast])

  /** One place the freshly published entry is recorded, so both callers agree. */
  const recordPublished = useCallback((item, docId) => {
    setServerIcons(prev => [{ ...item, docId }, ...prev.filter(s => s.id !== item.id)])
    toast?.('Icon submitted for review')
  }, [toast])

  // Sends one icon to the account and marks it busy meanwhile, so its tag reads
  // "Sending…" rather than "Not sent". Submit and Retry are the same act.
  const sendIcon = useCallback(async (item) => {
    setBusy(item.id, true)
    try {
      const docId = await publishIcon(item)
      if (docId) recordPublished(item, docId)
    } finally {
      setBusy(item.id, false)
    }
  }, [publishIcon, recordPublished, setBusy])

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
    await sendIcon(item)
  }, [uid, sendIcon])

  const retryIcon = sendIcon

  // The third of COMMUNITY_SUBMIT_REASONS — "You can withdraw anything you have
  // submitted, at any time" — kept for real, for designs and icons alike. The
  // local copy goes either way; the account copy is deleted when there is one,
  // and firestore.rules already allows an owner to delete their own submission.
  //
  // WITHDRAWING IS NOT INSTANT. The entry leaves the page at once and the
  // toast offers Undo; the delete itself waits out the toast's own window, so
  // Undo has nothing to recreate and the account is never asked to take back a
  // document it has already lost. Leaving the page settles whatever is waiting.
  const commitWithdrawal = useCallback(async (kind, item, undo) => {
    pendingWithdrawals.current.delete(item.id)
    // The Undo is spent: take its toast down so it cannot be pressed too late.
    window.dispatchEvent(new CustomEvent('uil4b:toast-dismiss', { detail: { onAction: undo } }))
    setBusy(item.id, true)
    try {
      if (item.docId) await deleteSubmission(item.docId, { kind })
      if (kind === 'icon') {
        setIconLocal(removeIconSubmission(item.id))
        setServerIcons(prev => prev.filter(s => s.id !== item.id))
      } else {
        // Written straight to the store as well as to state: the state effect
        // does not run once this page has been left.
        writeCommunitySubmissions(readCommunitySubmissions().filter(s => s.id !== item.id))
        setSubmissions(prev => prev.filter(s => s.id !== item.id))
        setServerSubmissions(prev => prev.filter(s => s.id !== item.id))
      }
    } catch {
      // The local copy is left alone: removing it while the account still holds
      // the submission would show the user a withdrawal that did not happen.
      toast?.('Could not withdraw that. It is back in your list.', 'error')
    } finally {
      unhide(item.id)
      setBusy(item.id, false)
    }
  }, [toast, setBusy, unhide])

  const withdraw = useCallback((kind, item) => {
    if (pendingWithdrawals.current.has(item.id)) return
    setHiddenIds(prev => new Set(prev).add(item.id))
    const entry = { timer: null }
    const undo = () => {
      if (pendingWithdrawals.current.get(item.id) !== entry) return
      clearTimeout(entry.timer)
      pendingWithdrawals.current.delete(item.id)
      unhide(item.id)
    }
    entry.commit = () => {
      clearTimeout(entry.timer)
      if (pendingWithdrawals.current.get(item.id) === entry) commitWithdrawal(kind, item, undo)
    }
    entry.timer = setTimeout(entry.commit, TOAST_ACTION_MIN_MS)
    pendingWithdrawals.current.set(item.id, entry)
    toast?.('Submission withdrawn', 'success', { action: { label: 'Undo', onAction: undo } })
  }, [toast, commitWithdrawal, unhide])

  useEffect(() => {
    const waiting = pendingWithdrawals.current
    return () => { for (const entry of [...waiting.values()]) entry.commit() }
  }, [])

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
    // `ch-spectrum` is the SCOPE, not a replacement: `.ch-wrap` stays because
    // it is what account.css and the computed-style baseline both know this
    // page by, and every rule in pages/community.css hangs off the co-class so
    // it can never reach the shared `.ch-*` surfaces this lane does not own.
    <div className="ch-wrap ch-spectrum">
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
        {/* TWO ENTRY POINTS, NOT ONE WITH A SWITCH — Mobbin/Wix runs its
            "Create" and "Submit" entries as a filled/outlined pair at the head
            of the showcase for the same reason.

            The three inline layout properties that used to be here are gone.
            They were inline because "every stylesheet that could hold it
            belongs to another stream this week"; pages/community.css is now
            this page's own, so `.ch-head-actions` holds them and the rule can
            be read, themed and made responsive like everything else. */}
        <div className="ch-head-actions">
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
        {/* `aria-pressed` ADDED, and it is a fix rather than a flourish. The
            selected category and the selected sort were carried by `.is-active`
            and by colour alone: a screen-reader user could press "Landing",
            hear the count in the live region change, and never be told which of
            the seven buttons they were now standing in. Nothing about the
            behaviour moves — same handler, same state, same class — the state
            is simply also announced. `type="button"` for the same class of
            reason: neither is inside a form today, and neither should become a
            submit if one ever wraps them. */}
        <div className="ch-filters rail-overflow">
          {COMMUNITY_CATEGORIES.map(c => (
            <button
              key={c}
              type="button"
              className={`ch-filter${filter === c ? ' is-active' : ''}`}
              aria-pressed={filter === c}
              onClick={() => setFilter(c)}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="ch-sort">
          <button type="button" className={`ch-sort-btn${sort === 'popular' ? ' is-active' : ''}`} aria-pressed={sort === 'popular'} onClick={() => setSort('popular')}>Top rated</button>
          <button type="button" className={`ch-sort-btn${sort === 'saved' ? ' is-active' : ''}`} aria-pressed={sort === 'saved'} onClick={() => setSort('saved')}>Saved</button>
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
              <CommunityCard
                key={item.id}
                item={item}
                saved={saves.has(item.id)}
                count={effectiveCount(item)}
                onToggle={toggleSave}
                own={item.mine ? ownControls(item) : undefined}
              />
            ))}
          </div>
        ) : (
          <div className="ch-empty">
            {sort === 'saved'
              ? 'No saved designs yet. Tap the heart on any design to save it here.'
              : 'No designs in this category yet.'}
          </div>
        )}
        {publicPage.hasMore && (
          <div className="ch-more">
            <button
              type="button"
              className="btn"
              onClick={showMorePublic}
              disabled={publicPage.loading}
              aria-busy={publicPage.loading || undefined}
            >
              {publicPage.loading ? 'Loading…' : 'Show more designs'}
            </button>
          </div>
        )}
      </section>

      {/* YOUR SUBMISSIONS — ICONS, AND DESIGNS A REVIEWER TURNED DOWN. NEITHER
          IS IN THE GRID ABOVE.
          Kept out of it on purpose, the same call GradientGallery.jsx makes and
          for the same reason: they are not in any library, and rendering them
          among the browsable cards would imply they had been published. Only
          approved DESIGNS are read for everyone (listApprovedDesigns), so an
          approved icon is shown to nobody but its author — and this section is
          the one place it is shown, labelled with where it stands. A rejected design
          joins it here for the mirror-image reason: it is no longer a card
          worth browsing, but its author should still see what became of it.

          Every string here already existed. The heading and the status come from
          GradientGallery's own queue; the note is the submission form's own
          sentence, which is the accurate one for icons (they DO reach the
          account). */}
      {queueRows.length > 0 && (
        <section aria-labelledby="ch-icons-heading">
          {/* THE THREE INLINE `style` OBJECTS HERE ARE GONE, and the row keeps
              both of the classes it already had. `.ch-toolbar` was doing double
              duty as a generic flex row — the page toolbar's rules, borrowed —
              so restyling the toolbar would have silently restyled this list.
              `.ch-queue-row` gives it rules of its own; `.toggle-row` and
              `.ch-toolbar` stay on the element because 97-community-icons
              reaches this section through it and nothing is renamed out from
              under a spec in a restyle. */}
          <div className="section-h ch-queue-head">
            <h2 id="ch-icons-heading">Your submissions</h2>
            <span className="meta">Queued for review — not published</span>
          </div>
          <p className="ui-modal-note ch-queue-note">Submissions are saved to your account and queued for review, so they follow you across devices.</p>
          <ul className="ch-queue-list">
            {queueRows.map(s => (
              <li key={s.id} className="toggle-row ch-toolbar ch-queue-row">
                {s.kind === 'icon' && <IconSubmissionPreview svg={s.svg} name={s.name} />}
                <span className="toggle-row-info">
                  <span className="toggle-row-label">{s.name}</span>
                  <span className="toggle-row-meta">
                    {s.author ? `${s.author} · ` : ''}
                    {s.kind === 'design' && s.category ? `${s.category} · ` : ''}
                    <span className="mono">{new Date(s.createdAt).toLocaleDateString()}</span>
                  </span>
                </span>
                {/* SYNCED IS THE WHOLE POINT OF THE ROW. An entry the account
                    does not hold is one cache clear from gone, and saying
                    "Pending review" over it would be claiming a reviewer can
                    see something no reviewer can reach. */}
                <span className="ch-card-tag">
                  {submissionStatusLabel({ status: s.status, synced: s.synced, sending: busyIds.has(s.id) })}
                </span>
                {s.kind === 'icon' && !s.synced && (
                  <button
                    type="button"
                    className="btn btn-s"
                    onClick={() => retryIcon(s)}
                    disabled={busyIds.has(s.id) || !iconsRead}
                    aria-busy={busyIds.has(s.id) || undefined}
                  >
                    Retry
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn-s"
                  onClick={() => withdraw(s.kind, s)}
                  disabled={busyIds.has(s.id)}
                  aria-busy={busyIds.has(s.id) || undefined}
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
        // The same three promises sit in COMMUNITY_SUBMIT_REASONS
        // (utils/submitIntent.js).
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
