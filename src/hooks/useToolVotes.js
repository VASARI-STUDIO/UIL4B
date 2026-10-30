import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useLoginPrompt } from '../contexts/LoginPromptContext'
import { loadFirestore, whenFirestore } from '../utils/firebaseAccess'
import { classifyFailure, readCounts, readVoted, setVote } from '../utils/toolVotesApi'
import { orderIds } from '../utils/roadmapItems'

// A vote pressed while signed out waits here until sign-in finishes, including
// the trip through onboarding for a new account.
export const PENDING_KEY = 'uil4b.pendingVote'
export const PENDING_MS = 30 * 60 * 1000

const readPending = () => {
  try { return JSON.parse(sessionStorage.getItem(PENDING_KEY) || 'null') } catch { return null }
}
const clearPending = () => { try { sessionStorage.removeItem(PENDING_KEY) } catch { /* storage off */ } }
const focusVote = (id) => requestAnimationFrame(() => document.querySelector(`#vote-${id} .vote`)?.focus())

/**
 * Counts, the visitor's own votes and the actions on them.
 * @param {{open: object[], shipped: object[]}} list from listTools()
 */
export function useToolVotes(list) {
  const { user, loading: authLoading } = useAuth()
  const { requireLogin, openLogin } = useLoginPrompt()
  const uid = user?.uid || null
  const [phase, setPhase] = useState('loading')
  const [loadFailed, setLoadFailed] = useState(false) // stays true through a retry, until the counts arrive
  const [counts, setCounts] = useState({})
  const [voted, setVoted] = useState(null)
  const [order, setOrder] = useState(null)
  const [asOf, setAsOf] = useState('')
  const [status, setStatus] = useState({})
  const [busy, setBusy] = useState({})
  const [bumps, setBumps] = useState({})
  const [attempt, setAttempt] = useState(0)
  const busyRef = useRef(new Set())
  const loadedCounts = useRef(false)
  const openIds = list.open.map((t) => t.id).join(',')

  useEffect(() => {
    let live = true
    setVoted(null)
    ;(async () => {
      try {
        const fs = await whenFirestore()
        const [c, v] = await Promise.all([
          loadedCounts.current ? null : readCounts(fs),
          uid ? readVoted(fs, uid, openIds.split(',').filter(Boolean)) : null,
        ])
        if (!live) return
        if (c) {
          loadedCounts.current = true
          setCounts(c)
          setOrder((prev) => prev || orderIds(list.open, Object.fromEntries(Object.entries(c).map(([k, x]) => [k, x.count]))))
          setAsOf(new Date().toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' }))
        }
        if (v) setVoted(v)
        setLoadFailed(false)
        setPhase('ready')
      } catch {
        if (live) { setLoadFailed(true); setPhase('error') }
      }
    })()
    return () => { live = false }
    // The list is static per page; its ids are the dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, attempt, openIds])

  const retryLoad = useCallback(() => { setPhase('loading'); setAttempt((n) => n + 1) }, [])

  const write = useCallback(async (id, want) => {
    if (busyRef.current.has(id)) return false
    busyRef.current.add(id)
    setBusy((b) => ({ ...b, [id]: true }))
    const retry = want ? 'vote' : 'takeback'
    const step = want ? 1 : -1
    setVoted((v) => ({ ...v, [id]: want }))
    setCounts((c) => ({ ...c, [id]: { open: true, ...c[id], count: Math.max(0, (c[id]?.count || 0) + step) } }))
    setStatus((s) => ({ ...s, [id]: null }))
    let saved = false
    const rollback = (kind) => {
      setVoted((v) => ({ ...v, [id]: !want }))
      setCounts((c) => ({ ...c, [id]: { ...c[id], count: Math.max(0, (c[id]?.count || 0) - step) } }))
      setStatus((s) => ({ ...s, [id]: { kind, retry } }))
    }
    try {
      if (typeof navigator !== 'undefined' && navigator.onLine === false) { rollback('offline'); return false }
      const fs = await loadFirestore()
      try {
        const next = await setVote(fs, uid, id, want)
        setCounts((c) => ({ ...c, [id]: { open: true, ...c[id], count: next } }))
        setBumps((b) => ({ ...b, [id]: (b[id] || 0) + 1 }))
        setStatus((s) => ({ ...s, [id]: { kind: want ? 'saved' : 'undone' } }))
        saved = true
      } catch (err) {
        rollback(await classifyFailure(fs, id, err))
      }
    } catch {
      rollback('failed')
    } finally {
      busyRef.current.delete(id)
      setBusy((b) => ({ ...b, [id]: false }))
    }
    return saved
  }, [uid])

  const press = useCallback((id) => {
    if (authLoading) return
    const item = list.open.find((t) => t.id === id)
    if (!item) return
    if (!uid) {
      try { sessionStorage.setItem(PENDING_KEY, JSON.stringify({ id, at: Date.now() })) } catch { /* storage off */ }
      requireLogin(`Sign in to vote for ${item.label}. Your vote is added as soon as you're in.`, {
        from: `${window.location.pathname}#vote-${id}`, free: true, signup: true,
      }).then((u) => { if (!u) clearPending(); focusVote(id) })
      return
    }
    if (phase !== 'ready' || !voted || busyRef.current.has(id)) return
    write(id, !voted[id])
  }, [authLoading, list, uid, requireLogin, phase, voted, write])

  // Once the account's own votes are known, apply a vote pressed before sign-in.
  useEffect(() => {
    if (!uid || phase !== 'ready' || !voted) return
    const pending = readPending()
    if (!pending) return
    clearPending()
    const item = list.open.find((t) => t.id === pending.id)
    if (!item || Date.now() - pending.at > PENDING_MS) return
    if (voted[item.id]) setStatus((s) => ({ ...s, [item.id]: { kind: 'already' } }))
    else write(item.id, true)
    focusVote(item.id)
  }, [uid, phase, voted, list, write])

  const ready = phase === 'ready'
  const view = (t) => ({
    ...t,
    count: ready ? (counts[t.id]?.count ?? 0) : null,
    voted: uid && voted ? !!voted[t.id] : null,
    status: status[t.id] || null,
    busy: !!busy[t.id],
    bump: bumps[t.id] || 0,
  })
  const byId = new Map(list.open.map((t) => [t.id, t]))
  const open = (order || list.open.map((t) => t.id)).filter((id) => byId.has(id)).map((id) => view(byId.get(id)))
  const total = open.reduce((n, t) => n + (t.count || 0), 0)
  return {
    items: open,
    shipped: list.shipped.map(view),
    phase, loadFailed, total, asOf, press, retryLoad,
    authKnown: !authLoading,
    signedIn: !!uid,
    votesKnown: !uid || !!voted,
    signIn: () => { clearPending(); openLogin({ from: window.location.pathname }) },
    // The Try again button unmounts as the retry starts, so focus would fall to <body>:
    // put it on the row's Vote button when the retry lands, or on the new Try again (or Open link) if it fails.
    retryRow: async (id) => {
      const s = status[id]
      if (!s?.retry) return
      if (await write(id, s.retry === 'vote')) focusVote(id)
      else requestAnimationFrame(() => document.querySelector(`#vote-${id} .vr-status :is(button, a)`)?.focus())
    },
  }
}
