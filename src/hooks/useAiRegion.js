import { useState, useEffect, useCallback } from 'react'
import { REGION_ENDPOINT, regionFromReply } from '../utils/aiRegion'

// One answer per page load, shared by every tool that asks. `known` is null
// until the server has replied, then 'open' or 'blocked'.
let known = null
let pending = null
const listeners = new Set()

function settle(next) {
  if (known !== null) return
  known = next
  listeners.forEach(fn => fn(known))
}

function check() {
  if (known !== null) return Promise.resolve(known)
  if (import.meta.env.DEV) {
    // Dev only: simulate a region from the console, no server header needed.
    //   localStorage.setItem('uil4b:ai-region', 'blocked')  then reload
    try {
      const forced = localStorage.getItem('uil4b:ai-region')
      if (forced === 'blocked' || forced === 'open') {
        settle(forced)
        return Promise.resolve(known)
      }
    } catch { /* storage unavailable: fall through to the real check */ }
  }
  if (!pending) {
    pending = fetch(REGION_ENDPOINT, { cache: 'no-store' })
      .then(async (r) => regionFromReply(r.ok, await r.json().catch(() => null)))
      .catch(() => 'open')
      .then((answer) => { settle(answer); return known })
  }
  return pending
}

// A refused request is proof enough, whatever the check said.
export function markRegionBlocked() {
  if (known === 'blocked') return
  known = 'blocked'
  listeners.forEach(fn => fn(known))
}

export function regionBlockedNow() {
  return known === 'blocked'
}

// 'checking' renders the normal UI, so prerender and hydration are unchanged.
export default function useAiRegion() {
  const [status, setStatus] = useState(known || 'checking')
  useEffect(() => {
    listeners.add(setStatus)
    // The answer may have landed between the first render and this effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (known) setStatus(known)
    check()
    return () => { listeners.delete(setStatus) }
  }, [])
  const markBlocked = useCallback(() => markRegionBlocked(), [])
  return { status, blocked: status === 'blocked', markBlocked }
}
