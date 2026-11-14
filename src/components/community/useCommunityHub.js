import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useLoginPrompt } from '../../contexts/LoginPromptContext'
import { getOwnerHandle } from '../../utils/constants'
import { readCommunitySubmissions, sanitizeCommunitySubmission, writeCommunitySubmissions } from '../../utils/communitySubmissions'
import { COMMUNITY_SUBMIT_REASONS, consumeSubmitIntent, hasSubmitIntent, resetSubmitIntent, setSubmitIntent } from '../../utils/submitIntent'
import { buildQueueRecord, mergeSubmissions, submissionStatusLabel } from '../../utils/communityQueue'
import { deleteSubmission, listMySubmissions, publishToQueue } from '../../utils/communityQueueApi'
import { isPostLimit } from '../../utils/communityLimits'
import { handleProblem, readStoredHandle } from '../../utils/communityHandle'
import { TOAST_ACTION_MIN_MS } from '../../utils/toastDuration'
import { appendIconSubmission, buildIconPayload, readIconSubmissions, removeIconSubmission } from '../../utils/iconSubmission'

const SAVES_KEY = 'vs-community-saves'
const SURFACES = { design: 'community', icon: 'community-icon' }
const GATE_WORDS = { upload: 'upload inspiration to the community', design: 'submit a design to the community', icon: 'submit an icon to the community', project: 'share your work with the community' }

function loadSaves() {
  try { return new Set(JSON.parse(localStorage.getItem(SAVES_KEY) || '[]')) } catch { return new Set() }
}

/** The saved piece ids, kept in this browser. Saving asks a signed-out visitor to sign in first. */
export function useSaves() {
  const { requireLogin } = useLoginPrompt()
  const [saves, setSaves] = useState(loadSaves)
  useEffect(() => {
    try { localStorage.setItem(SAVES_KEY, JSON.stringify([...saves])) } catch { /* storage full or blocked */ }
  }, [saves])
  // The stored set is read again after the sign-in wait, because signing in
  // may have merged the account's saves into it.
  const toggleSave = useCallback(async (id) => {
    if (!await requireLogin('save pieces', { free: true, signup: true })) return null
    let now = false
    setSaves(() => {
      const next = loadSaves()
      if (next.has(id)) next.delete(id)
      else next.add(id)
      now = next.has(id)
      return next
    })
    return now
  }, [requireLogin])
  return { saves, toggleSave }
}

/**
 * Everything a person can send to the community and everything they have
 * sent: the same queue, the same local copies and the same withdraw-with-undo
 * the page has always used. Pieces never appear on the showcase from here;
 * the account's own list is where a submission shows.
 */
// Inspiration uploads live in this tab only: there is nowhere to send an
// image yet, so they are validated, listed as not sent and never stored.
// One list for the tab, so the profile page shows what the hub added.
let uploadsStore = []
const uploadListeners = new Set()
const subscribeUploads = (fn) => { uploadListeners.add(fn); return () => uploadListeners.delete(fn) }
const readUploads = () => uploadsStore
function setUploads(update) {
  uploadsStore = typeof update === 'function' ? update(uploadsStore) : update
  uploadListeners.forEach((fn) => fn())
}

export default function useCommunityHub(toast) {
  const { user, profileName, loading: authLoading } = useAuth()
  const { requireLogin } = useLoginPrompt()
  const owner = getOwnerHandle(user?.email)
  const ownerPublicHandle = owner?.publicHandle
  const uid = user?.uid || null

  // The name a queued record is credited to: the fixed public handle, else the
  // handle chosen on this device (checked again, as storage can be edited
  // outside the dialog that validated it), else the profile name. The email is
  // never used.
  const queueAuthorName = useCallback(() => {
    if (ownerPublicHandle) return ownerPublicHandle
    const handle = readStoredHandle()
    return handle && !handleProblem(handle) ? `@${handle}` : profileName
  }, [ownerPublicHandle, profileName])

  const { saves, toggleSave } = useSaves()
  const ownHandle = (ownerPublicHandle || readStoredHandle() || 'me').replace(/^@/, '')
  const [designLocal, setDesignLocal] = useState(readCommunitySubmissions)
  const [designServer, setDesignServer] = useState([])
  const [iconLocal, setIconLocal] = useState(readIconSubmissions)
  const [iconServer, setIconServer] = useState([])
  const uploads = useSyncExternalStore(subscribeUploads, readUploads, readUploads)
  const [busyIds, setBusyIds] = useState(() => new Set())
  const [hiddenIds, setHiddenIds] = useState(() => new Set())
  const [listsRead, setListsRead] = useState({ design: false, icon: false })
  const pending = useRef(new Map())

  const setBusy = useCallback((id, on) => setBusyIds((prev) => {
    if (prev.has(id) === on) return prev
    const next = new Set(prev)
    if (on) next.add(id)
    else next.delete(id)
    return next
  }), [])
  const unhide = useCallback((id) => setHiddenIds((prev) => {
    if (!prev.has(id)) return prev
    const next = new Set(prev)
    next.delete(id)
    return next
  }), [])
  const markRead = useCallback((kind) => setListsRead((prev) => (prev[kind] ? prev : { ...prev, [kind]: true })), [])

  useEffect(() => { writeCommunitySubmissions(designLocal) }, [designLocal])

  // The account's copies. They arrive after the local ones render, and win on
  // conflict, because they are what a reviewer acts on.
  useEffect(() => {
    let cancelled = false
    if (!uid) return undefined
    listMySubmissions(uid, 'design')
      .then((server) => {
        if (cancelled) return
        setDesignServer(server.filter((s) => s.status !== 'withdrawn').map((s) => sanitizeCommunitySubmission({
          id: s.localId || s.id, name: s.name, status: s.status, createdAt: s.createdAt,
          saves: 0, mine: true, c1: '#1A1A1A', c2: '#E6E4DE', ...(s.payload || {}), docId: s.id,
        })).filter(Boolean))
      })
      .catch(() => { /* the local list still stands */ })
      .finally(() => { if (!cancelled) markRead('design') })
    listMySubmissions(uid, 'icon')
      .then((server) => {
        if (cancelled) return
        setIconServer(server.filter((s) => s.status !== 'withdrawn').map((s) => ({
          id: s.localId || s.id, docId: s.id, name: s.name, status: s.status, createdAt: s.createdAt,
          author: s.payload?.author || s.authorName || '', svg: s.payload?.svg || '',
        })).filter((s) => s.svg))
      })
      .catch(() => { /* the local list still stands */ })
      .finally(() => { if (!cancelled) markRead('icon') })
    return () => { cancelled = true }
  }, [uid, markRead])

  const designs = useMemo(() => mergeSubmissions(designServer, designLocal), [designServer, designLocal])
  const icons = useMemo(() => mergeSubmissions(iconServer, iconLocal), [iconServer, iconLocal])
  const designsRead = !uid || listsRead.design
  const iconsRead = !uid || listsRead.icon

  /** One list for Your submissions, newest first. */
  const rows = useMemo(() => [
    ...icons.map((s) => ({ ...s, kind: 'icon' })),
    ...designs.map((s) => ({ ...s, kind: 'design' })),
    ...uploads.map((s) => ({ ...s, kind: 'image', synced: false })),
  ].filter((s) => !hiddenIds.has(s.id))
    .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || ''))), [icons, designs, uploads, hiddenIds])

  const statusOf = useCallback((row) => (
    row.kind === 'image' ? 'Not sent' : submissionStatusLabel({ status: row.status, synced: row.synced, sending: busyIds.has(row.id) })
  ), [busyIds])

  // ── Publishing ───────────────────────────────────────────────────────────
  // Local first, so sending works offline and the list updates at once; then the
  // shared queue, which is what makes a submission follow the account and reach
  // a reviewer. publishToQueue returns the document id, which a fresh entry is
  // recorded with so it can be withdrawn without a reload.
  const publish = useCallback(async (kind, item, payload) => {
    const queued = payload && buildQueueRecord({ kind, name: item.name, user, authorName: queueAuthorName(), payload })
    if (!queued) {
      toast?.('Saved to this browser. Sign in to submit it for review.')
      return null
    }
    try {
      return await publishToQueue({ ...queued, localId: item.id })
    } catch (err) {
      toast?.(isPostLimit(err)
        ? `${err.message} It is saved in this browser and can be sent again later.`
        : 'Saved in this browser, but we could not reach the review queue. Try again later.', 'error')
      return null
    }
  }, [user, toast, queueAuthorName])

  const designPayload = (item) => ({ author: item.author, category: item.category, url: item.url, c1: item.c1, c2: item.c2 })

  const sendDesign = useCallback(async (item) => {
    setBusy(item.id, true)
    try {
      const docId = await publish('design', item, designPayload(item))
      if (docId) {
        const entry = sanitizeCommunitySubmission({ ...item, docId, status: 'pending' })
        if (entry) setDesignServer((prev) => [entry, ...prev.filter((s) => s.id !== item.id)])
        toast?.('Sent for review')
      }
      return !!docId
    } finally {
      setBusy(item.id, false)
    }
  }, [publish, toast, setBusy])

  const sendIcon = useCallback(async (item) => {
    setBusy(item.id, true)
    try {
      const docId = await publish('icon', item, buildIconPayload({ svg: item.svg, author: item.author }))
      if (docId) {
        setIconServer((prev) => [{ ...item, docId }, ...prev.filter((s) => s.id !== item.id)])
        toast?.('Sent for review')
      }
      return !!docId
    } finally {
      setBusy(item.id, false)
    }
  }, [publish, toast, setBusy])

  /** A link or a project: both are a design record. Resolves true once it is on the account. */
  const submitDesign = useCallback(async (draft) => {
    if (!uid) return false
    const item = { ...draft, id: `u${Date.now()}`, createdAt: new Date().toISOString(), saves: 0, mine: true, ownerId: uid }
    setDesignLocal((prev) => [item, ...prev])
    return sendDesign(item)
  }, [uid, sendDesign])

  const submitIcon = useCallback(async (draft) => {
    if (!uid) return false
    const item = { id: `i${Date.now()}`, name: draft.name, author: draft.author, svg: draft.svg, status: 'pending', createdAt: new Date().toISOString() }
    setIconLocal(appendIconSubmission(item))
    return sendIcon(item)
  }, [uid, sendIcon])

  const addUpload = useCallback((draft) => {
    const item = { id: `m${Date.now()}`, createdAt: new Date().toISOString(), ...draft }
    setUploads((prev) => [item, ...prev])
    return item
  }, [])

  const retry = useCallback((row) => (row.kind === 'icon' ? sendIcon(row) : sendDesign(row)), [sendIcon, sendDesign])

  // ── Withdrawing ──────────────────────────────────────────────────────────
  // The entry leaves the page at once and the toast offers Undo; the delete
  // itself waits out the toast's own window, so Undo has nothing to recreate.
  // Leaving the page settles whatever is waiting.
  const commit = useCallback(async (row, undo) => {
    pending.current.delete(row.id)
    window.dispatchEvent(new CustomEvent('uil4b:toast-dismiss', { detail: { onAction: undo } }))
    setBusy(row.id, true)
    try {
      if (row.docId) await deleteSubmission(row.docId)
      if (row.kind === 'icon') {
        setIconLocal(removeIconSubmission(row.id))
        setIconServer((prev) => prev.filter((s) => s.id !== row.id))
      } else if (row.kind === 'image') {
        setUploads((prev) => prev.filter((s) => s.id !== row.id))
      } else {
        writeCommunitySubmissions(readCommunitySubmissions().filter((s) => s.id !== row.id))
        setDesignLocal((prev) => prev.filter((s) => s.id !== row.id))
        setDesignServer((prev) => prev.filter((s) => s.id !== row.id))
      }
    } catch {
      // The local copy is left alone: removing it while the account still holds
      // the submission would show a withdrawal that did not happen.
      toast?.('Could not withdraw that. It is back in your list.', 'error')
    } finally {
      unhide(row.id)
      setBusy(row.id, false)
    }
  }, [toast, setBusy, unhide])

  const withdraw = useCallback((row) => {
    if (pending.current.has(row.id)) return
    setHiddenIds((prev) => new Set(prev).add(row.id))
    const entry = { timer: null }
    const undo = () => {
      if (pending.current.get(row.id) !== entry) return
      clearTimeout(entry.timer)
      pending.current.delete(row.id)
      unhide(row.id)
    }
    entry.commit = () => {
      clearTimeout(entry.timer)
      if (pending.current.get(row.id) === entry) commit(row, undo)
    }
    entry.timer = setTimeout(entry.commit, TOAST_ACTION_MIN_MS)
    pending.current.set(row.id, entry)
    toast?.('Submission withdrawn', 'success', { action: { label: 'Undo', onAction: undo } })
  }, [toast, commit, unhide])

  useEffect(() => {
    const waiting = pending.current
    return () => { for (const entry of [...waiting.values()]) entry.commit() }
  }, [])

  // ── The sign-in gate ─────────────────────────────────────────────────────
  // A signed-out visitor is asked to sign in BEFORE any form exists, so nobody
  // fills one in and then finds they need an account. `open` is the form the
  // person asked for; after a sign-in that remounts the page, the saved intent
  // opens it again.
  const [open, setOpen] = useState(null)
  const ask = useCallback(async (what) => {
    if (authLoading) return
    const surface = SURFACES[what] || SURFACES.design
    if (!uid) {
      setSubmitIntent(surface)
      const signedIn = await requireLogin(GATE_WORDS[what] || GATE_WORDS.project, { free: true, signup: true, reasons: COMMUNITY_SUBMIT_REASONS })
      if (!signedIn) { resetSubmitIntent(); return }
    }
    consumeSubmitIntent()
    setOpen(what)
  }, [authLoading, uid, requireLogin])

  useEffect(() => {
    if (authLoading || !uid) return
    const what = Object.keys(SURFACES).find((k) => hasSubmitIntent(SURFACES[k]))
    if (!what) return
    consumeSubmitIntent()
    // eslint-disable-next-line react-hooks/set-state-in-effect -- resumes the share flow once sign-in settles
    setOpen(what === 'design' ? 'pick' : what)
  }, [authLoading, uid])

  return {
    uid, authLoading, user, ownHandle, saves, toggleSave, rows, statusOf, busyIds, designsRead, iconsRead,
    submitDesign, submitIcon, addUpload, retry, withdraw, open, setOpen, ask, queueAuthorName,
  }
}
