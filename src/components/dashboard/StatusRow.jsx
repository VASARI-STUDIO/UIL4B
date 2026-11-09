import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useLoginPrompt } from '../../contexts/LoginPromptContext'

// The 24px line above the title: the greeting, or the offline note in its place. It reserves its height
// while the account is still resolving, so nothing moves when it fills.
//
//   signed in, a name     Welcome back, Alex.   (Welcome, Alex. in the first ten minutes of the account)
//   signed in, no name    Welcome back.  + Add your name (a small form: saves to the profile; "Not now" hides the
//                         ask for 30 days)
//   signed out            Hey, you look new around here.  + Tell us your name (opens sign-up)
const FIRST_VISIT_MS = 10 * 60_000
const ASKED_KEY = 'uil4b-name-ask-until'
const THIRTY_DAYS = 30 * 86_400_000

function askHidden() {
  try { return Number(localStorage.getItem(ASKED_KEY)) > Date.now() } catch { return false }
}

// The greeting for an account. With no name on the profile it carries "Add your name": a button that opens a
// small form under it (Save writes the profile's name; Escape, a press elsewhere and Tab past it close the form,
// and "Not now" hides the ask for 30 days). After Save or Not now the button is gone, so focus goes to the
// greeting line itself.
function Greeting({ hello, first }) {
  const { profileLoaded, updateProfile } = useAuth()
  const [open, setOpen] = useState(false)
  const [hidden, setHidden] = useState(askHidden)
  const [value, setValue] = useState('')
  const [settled, setSettled] = useState(false)
  const wrapRef = useRef(null)
  const btnRef = useRef(null)
  const inputRef = useRef(null)
  const lineRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    inputRef.current?.focus()
    const onKey = (e) => { if (e.key === 'Escape') { setOpen(false); btnRef.current?.focus() } }
    const onDown = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false) }
    const onFocus = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false) }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('focusin', onFocus)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('focusin', onFocus)
    }
  }, [open])

  useEffect(() => {
    if (!settled) return
    lineRef.current?.focus()
    setSettled(false)
  }, [settled])

  if (first) return <p data-testid="greeting" tabIndex={-1} ref={lineRef}>{`${hello}, ${first}.`}</p>

  const save = (e) => {
    e.preventDefault()
    const name = value.trim()
    if (!name) { inputRef.current?.focus(); return }
    updateProfile({ displayName: name })
    setOpen(false)
    setSettled(true)
  }
  const notNow = () => {
    try { localStorage.setItem(ASKED_KEY, String(Date.now() + THIRTY_DAYS)) } catch { /* private mode */ }
    setHidden(true)
    setOpen(false)
    setSettled(true)
  }

  return (
    <div className="db-greetw" data-testid="greeting" ref={wrapRef}>
      <p tabIndex={-1} ref={lineRef} aria-live="polite">{`${hello}.`}</p>
      {profileLoaded && !hidden && (
        <span className="db-anchor">
          <button type="button" className="db-textbtn" ref={btnRef} aria-haspopup="dialog" aria-expanded={open} aria-controls="db-name-pop" onClick={() => setOpen((v) => !v)}>Add your name</button>
          {open && (
            <form className="db-pop name" id="db-name-pop" role="dialog" aria-labelledby="db-first-l" onSubmit={save}>
              <label id="db-first-l" htmlFor="db-first">Your first name</label>
              <input id="db-first" ref={inputRef} className="db-input" type="text" value={value} maxLength={60} autoComplete="given-name" spellCheck="false" enterKeyHint="done" onChange={(e) => setValue(e.target.value)} />
              <div className="btns">
                <button type="submit" className="db-ghost db-ring">Save</button>
                <button type="button" className="db-textbtn" onClick={notNow}>Not now</button>
              </div>
            </form>
          )}
        </span>
      )}
    </div>
  )
}

export function StatusRow({ resolving, signedOut, offline }) {
  const { profileName, accountCreatedAt } = useAuth()
  const { openLogin } = useLoginPrompt()
  const [now] = useState(() => Date.now())

  let content = null
  if (offline) {
    content = (
      <p className="db-off" role="status">
        <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2 2l20 20M8.5 16.4a5 5 0 0 1 7 0M5 12.9a10 10 0 0 1 5.2-2.6M19 12.9a10 10 0 0 0-2.3-1.7M2 8.8a15 15 0 0 1 4.2-2.4M22 8.8a15 15 0 0 0-8.6-3.7M12 20h.01" /></svg>
        You&apos;re offline. Showing the copy saved in this browser.
      </p>
    )
  } else if (signedOut) {
    content = (
      <div className="db-greetw" data-testid="greeting">
        <p>Hey, you look new around here.</p>
        <button type="button" className="db-textbtn" onClick={() => openLogin({ signup: true })}>Tell us your name</button>
      </div>
    )
  } else if (!resolving) {
    const first = (profileName || '').split(/\s+/)[0]
    const fresh = accountCreatedAt != null && now - accountCreatedAt < FIRST_VISIT_MS && now - accountCreatedAt >= -60_000
    const hello = fresh ? 'Welcome' : 'Welcome back'
    content = <Greeting hello={hello} first={first} />
  }
  return <div className="db-status">{content}</div>
}

// "Sunday 1 November, 9:12 am." then the allowances, in one line. The date is the viewer's own machine's and
// is only set in an effect, so a prerendered shell never carries the build's date.
export function TodayLine({ meters, offline, atCap }) {
  const [now, setNow] = useState(null)
  useEffect(() => {
    setNow(new Date())
    let timer = null
    const first = setTimeout(() => {
      setNow(new Date())
      timer = setInterval(() => setNow(new Date()), 60000)
    }, 60000 - (Date.now() % 60000))
    return () => { clearTimeout(first); if (timer) clearInterval(timer) }
  }, [])

  const parts = []
  if (now) {
    const date = now.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' })
    const time = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    parts.push(<time key="t" className="db-ts" dateTime={now.toISOString()}>{`${date}, ${time}.`}</time>)
  }
  if (meters) {
    const { ai, slots, isPro } = meters
    if (ai && !offline) {
      const month = ai.month ? `, ${ai.month.used} of ${ai.month.limit} this month` : ai.source === 'browser' ? ', counted on this browser' : ''
      parts.push(<span key="ai" className="db-ts" data-testid="ai-meter-note">{`AI generations ${ai.used} of ${ai.limit} today${month}.`}</span>)
    }
    if (isPro) parts.push(<span key="plan" className="db-ts">Pro plan.</span>)
    else if (slots) {
      const text = offline ? `Projects ${slots.used} of ${slots.limit}, as last saved.` : `Projects ${slots.used} of ${slots.limit}${atCap ? ', the Free limit' : ''}.`
      parts.push(<span key="proj" className="db-ts" data-testid="project-quota-note">{text}</span>)
    }
  }
  return (
    <p className="db-today">
      {parts}
      {atCap && !offline && <Link className="db-tl see" to="/plans">See plans</Link>}
    </p>
  )
}
