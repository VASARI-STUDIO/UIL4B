import { VERIFY_RESEND_COOLDOWN_S, verifyErrorText, verifyResendBlocked } from './emailVerification.js'

// One "send the verification link" state for the whole page.
//
// The reminder bar (NoticeStack) and the AI tools' verify prompt both offer
// "Resend link". Each kept its own state and cooldown, so pressing it in one
// left the other offering a second link at once. They now read this store:
// whichever sends, both show the same label and the same seconds left.
//
// The state is keyed on the uid it belongs to. A different account reads as
// idle, so signing out and in as someone else never inherits a cooldown.
// DOM-free: the clock and the interval are injectable.

const IDLE = Object.freeze({ uid: null, state: 'idle', prior: 'idle', error: '', left: 0 })

export function secondsLeft(until, nowMs) {
  return Math.max(0, Math.ceil((until - nowMs) / 1000))
}

export function createResendStore({
  now = Date.now,
  every = (fn, ms) => setInterval(fn, ms),
  stop = (id) => clearInterval(id),
} = {}) {
  let snap = IDLE
  let until = 0
  let timer = null
  const listeners = new Set()

  const set = (next) => {
    snap = Object.freeze(next)
    listeners.forEach((fn) => fn())
  }

  const halt = () => {
    if (timer !== null) stop(timer)
    timer = null
    until = 0
  }

  const tick = () => {
    const left = secondsLeft(until, now())
    // When the cooldown ends the send is no longer news: back to idle, so a
    // prompt opened minutes later does not say "New link sent.". `prior`
    // keeps the bar's wording.
    if (left <= 0) {
      halt()
      set({ ...snap, state: snap.state === 'sent' ? 'idle' : snap.state, left: 0 })
    } else if (left !== snap.left) set({ ...snap, left })
  }

  // What `uid` sees: its own state, or idle when the store holds someone else's.
  const view = (uid) => (uid && snap.uid === uid ? snap : IDLE)

  /**
   * Send a link for `uid`. Ignored while a send is in flight or the cooldown
   * has seconds left. `send` rejects with the SDK's error; the store keeps its
   * wording, not the error object.
   */
  const resend = async (uid, send) => {
    if (!uid || typeof send !== 'function') return
    const current = view(uid)
    if (verifyResendBlocked(current.state, current.left)) return
    halt()
    set({ uid, state: 'sending', prior: current.state, error: '', left: 0 })
    try {
      await send()
    } catch (e) {
      if (snap.uid === uid) set({ uid, state: 'failed', prior: 'failed', error: verifyErrorText(e), left: 0 })
      return
    }
    if (snap.uid !== uid) return
    until = now() + VERIFY_RESEND_COOLDOWN_S * 1000
    set({ uid, state: 'sent', prior: 'sent', error: '', left: VERIFY_RESEND_COOLDOWN_S })
    timer = every(tick, 1000)
  }

  return {
    view,
    resend,
    getSnapshot: () => snap,
    subscribe: (fn) => {
      listeners.add(fn)
      return () => { listeners.delete(fn) }
    },
    reset: () => { halt(); set(IDLE) },
  }
}

// The instance the bar and the prompt share.
export const verifyResendStore = createResendStore()
