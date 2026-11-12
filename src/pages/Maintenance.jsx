import { useEffect, useRef, useState } from 'react'
import EdgeScreen, { EdgePill } from '../components/edge/EdgeScreen'

// Shown in place of the app while UIL4B is switched to maintenance
// (config/maintenance.js). It makes no claims about what happens next: no time,
// no promise about anyone's work. The horizon is grey while the site is
// unavailable and turns to colour when a check finds a new deploy; a moment
// later the page reloads into it.
//
// The check fetches the page and compares its entry script with this page's. A
// reply that is the same build means the site is still in maintenance, however
// quickly it answered.
const RELOAD_AFTER_MS = 1500
const ENTRY = 'script[type="module"][src]'

function entrySrc(root) {
  return root.querySelector(ENTRY)?.getAttribute('src') || ''
}

async function newDeployLive(signal) {
  const res = await fetch('/', { cache: 'no-store', signal })
  if (!res.ok) return false
  const html = await res.text()
  const next = entrySrc(new DOMParser().parseFromString(html, 'text/html'))
  const current = entrySrc(document)
  return !!next && !!current && next !== current
}

// Kept out of search results while the switch is on. The page already carries a
// robots tag, so that one is changed rather than a second added.
function useNoindex() {
  useEffect(() => {
    let tag = document.querySelector('meta[name="robots"]')
    const created = !tag
    const before = tag?.getAttribute('content') ?? null
    if (!tag) {
      tag = document.createElement('meta')
      tag.setAttribute('name', 'robots')
      document.head.appendChild(tag)
    }
    tag.setAttribute('content', 'noindex')
    return () => {
      if (created) tag.remove()
      else if (before !== null) tag.setAttribute('content', before)
    }
  }, [])
}

export default function Maintenance() {
  const [state, setState] = useState('down') // down | checking | up | failed
  const timer = useRef(0)
  const abort = useRef(null)

  useNoindex()

  useEffect(() => {
    document.title = 'UI L4B | Unavailable'
    return () => {
      clearTimeout(timer.current)
      abort.current?.abort()
    }
  }, [])

  const check = async () => {
    if (state === 'checking' || state === 'up') return
    setState('checking')
    const controller = new AbortController()
    abort.current = controller
    const live = await newDeployLive(controller.signal).catch(() => false)
    if (controller.signal.aborted) return
    if (live) {
      setState('up')
      timer.current = setTimeout(() => window.location.reload(), RELOAD_AFTER_MS)
    } else {
      setState('failed')
    }
  }

  const checking = state === 'checking'
  const status = {
    down: '',
    checking: 'Checking…',
    up: 'UIL4B is reachable again',
    failed: 'Still unavailable',
  }[state]

  return (
    <EdgeScreen
      art={state === 'up' ? 'calm' : 'drain'}
      title="UIL4B is unavailable"
      body="Nothing needs doing on your side."
      status={status}
      actions={<EdgePill onClick={check} disabled={checking} aria-busy={checking || undefined}>Check again</EdgePill>}
    />
  )
}
