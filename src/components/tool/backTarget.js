// Where a tool's back arrow goes. One place, so the arrow's fallback and the
// "Go to dashboard" row of its right-click menu can never drift apart.
import { useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { SIGNED_IN_HOME } from '../../utils/onboardingState'

// The signed-in home: the project dashboard.
export const DASHBOARD_PATH = SIGNED_IN_HOME

// React Router writes an `idx` into history.state: 0 for the entry a tab first
// loads on, one higher for every in-app push. A replace keeps the idx, so a
// redirect landing is still 0 and has nothing in the app behind it. So idx > 0
// means the page before this one is inside the app.
export function hasAppHistory(state = typeof window !== 'undefined' ? window.history.state : null) {
  return (state?.idx ?? 0) > 0
}

// What a plain click on the arrow does: step back when there is an app page
// behind, otherwise go to `fallback` (the dashboard unless a tool names another).
export function backAction({ state, fallback = DASHBOARD_PATH } = {}) {
  return hasAppHistory(state) ? { kind: 'history' } : { kind: 'route', to: fallback }
}

// What the arrow shows and does, for a tool that lists it as an item of its own
// (the palette's Extra tools row): `name` is its accessible name, `go` runs it.
export function useToolBack({ to = DASHBOARD_PATH, label = 'Back to dashboard', history = true } = {}) {
  const navigate = useNavigate()
  // history.state is read on every render; subscribing to the location makes
  // each navigation render this again.
  useLocation()
  const stepBack = history && hasAppHistory()
  const go = useCallback(() => {
    if (stepBack) navigate(-1)
    else navigate(to)
  }, [stepBack, navigate, to])
  return { stepBack, name: stepBack ? 'Back to previous page' : label, go }
}
