import { useEffect, useRef, useState } from 'react'
import EdgeScreen, { EdgePill } from '../components/edge/EdgeScreen'
import { clearMaintenanceForTab } from '../config/maintenance'

// Shown in place of the app while UIL4B is switched to maintenance
// (config/maintenance.js). It makes no claims about what happens next: no time,
// no promise about anyone's work. The horizon is grey while the site is
// unavailable and turns to colour when a check gets an answer; a moment later
// the page reloads into the app.
const RELOAD_AFTER_MS = 1500

export default function Maintenance() {
  const [state, setState] = useState('down') // down | checking | up | failed
  const timer = useRef(0)

  useEffect(() => {
    document.title = 'UI L4B | Unavailable'
    return () => clearTimeout(timer.current)
  }, [])

  const check = async () => {
    if (state === 'checking' || state === 'up') return
    setState('checking')
    try {
      const res = await fetch(`${window.location.origin}/`, { method: 'HEAD', cache: 'no-store' })
      if (!res.ok) throw new Error('unavailable')
      setState('up')
      clearMaintenanceForTab()
      timer.current = setTimeout(() => window.location.reload(), RELOAD_AFTER_MS)
    } catch {
      setState('failed')
    }
  }

  const status = {
    down: '',
    checking: 'Checking',
    up: 'UIL4B is reachable again',
    failed: 'Still unavailable',
  }[state]

  return (
    <EdgeScreen
      art={state === 'up' ? 'calm' : 'drain'}
      title="UIL4B is unavailable"
      body="Nothing needs doing on your side."
      status={status}
      actions={<EdgePill onClick={check}>Check again</EdgePill>}
    />
  )
}
