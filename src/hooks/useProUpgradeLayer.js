import { createElement, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { BILLING_OPTIONS, DEFAULT_BILLING } from '../config/planFacts'
import ProUpgradeLayer from '../components/auth/ProUpgradeLayer'

const FADE_MS = 150

const stepOf = (search) => {
  const n = Number(new URLSearchParams(search).get('up'))
  return n >= 1 && n <= 3 ? n : 0
}
const withUp = (search, n) => {
  const p = new URLSearchParams(search)
  if (n) p.set('up', String(n)); else p.delete('up')
  const s = p.toString()
  return s ? '?' + s : ''
}

/**
 * The full-screen Pro sign-up layer's state, held in the URL (`?up=1..3`).
 * Returns whether it is open, how to open it, and the node to render (a portal
 * to the body).
 */
export default function useProUpgradeLayer({ billing } = {}) {
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const up = stepOf(location.search)
  const depth = Number(location.state?.proDepth) || 0
  const [cadence, setCadence] = useState(billing || DEFAULT_BILLING)
  const [fresh, setFresh] = useState(null)
  // The step shown last, kept for the 150ms fade-out after the entry has gone.
  const [lastUp, setLastUp] = useState(0)
  const prevUp = useRef(up)
  if (up && up !== lastUp) setLastUp(up)
  const leaving = !up && lastUp > 0

  const goUp = (n, opts) => navigate({ pathname: location.pathname, search: withUp(location.search, n), hash: location.hash }, opts)
  const close = () => {
    if (depth > 0) navigate(-depth)
    else goUp(0, { replace: true })
  }
  const openLayer = () => {
    setCadence(BILLING_OPTIONS.some((o) => o.id === billing) ? billing : DEFAULT_BILLING)
    setFresh(null)
    goUp(1, { state: { proDepth: 1 } })
  }
  const onStep = (n) => {
    if (n > up) goUp(n, { state: { proDepth: depth ? depth + 1 : 0 } })
    else if (depth > 1) navigate(-(up - n) || -1)
    else goUp(n, { replace: true })
  }
  const onSignedIn = (signedUser) => {
    setFresh({ email: signedUser?.email || user?.email || '' })
    goUp(3, { state: { proDepth: depth ? depth + 1 : 0 } })
  }

  // Back out of the plan step after signing in here: there is no account step to
  // return to, so the layer closes.
  useEffect(() => {
    if (fresh && up && up < 3 && prevUp.current === 3) close()
    prevUp.current = up
  })

  // The fade-out when the entry goes (Back, Escape, close), 150ms.
  useEffect(() => {
    if (up || !lastUp) return undefined
    const id = setTimeout(() => { setLastUp(0); setFresh(null) }, FADE_MS)
    return () => clearTimeout(id)
  }, [up, lastUp])

  const open = up > 0 || leaving
  const authed = !!user || !!fresh
  const step = authed ? 3 : Math.min(up || lastUp || 1, 2)
  const account = fresh || (user ? { email: user.email || '' } : null)
  const node = open && typeof document !== 'undefined'
    ? createPortal(
      createElement(ProUpgradeLayer, {
        step,
        leaving,
        cadence,
        onCadence: setCadence,
        onStep,
        onClose: close,
        onSignedIn,
        account,
      }),
      document.body,
    )
    : null
  return { open, openLayer, node }
}
