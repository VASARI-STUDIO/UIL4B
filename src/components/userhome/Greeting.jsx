import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useLoginPrompt } from '../../contexts/LoginPromptContext'

// The line above "Your workspace". It is text, not a heading.
//
//   signed in, a name on the profile   Welcome back, Dylan.   (Welcome, Dylan. in the first ten minutes)
//   signed in, no name                 Welcome back.  + Add your name (asks, saves to the profile)
//   signed out                         Hey, you look new around here.  + Tell us your name (opens sign-up)
//   still resolving                    nothing, with its height kept, so no one is told the wrong thing
//
// The name is the profile's own, never the email prefix or "User" that userProfile.displayName
// falls back to. "Not now" hides the ask for 30 days.
const ASKED_KEY = 'uil4b-name-ask-until'
const THIRTY_DAYS = 30 * 86_400_000
const FIRST_VISIT_MS = 10 * 60_000

function askHidden() {
  try { return Number(localStorage.getItem(ASKED_KEY)) > Date.now() } catch { return false }
}

export default function Greeting({ resolving, signedOut }) {
  const { profileName, accountCreatedAt, profileLoaded, updateProfile } = useAuth()
  const { openLogin } = useLoginPrompt()
  const [open, setOpen] = useState(false)
  const [hidden, setHidden] = useState(askHidden)
  const [value, setValue] = useState('')
  const [now] = useState(() => Date.now())
  const wrapRef = useRef(null)
  const btnRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    inputRef.current?.focus()
    const onKey = (e) => { if (e.key === 'Escape') { setOpen(false); btnRef.current?.focus() } }
    const onDown = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false) }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onDown)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onDown)
    }
  }, [open])

  if (resolving) return <div className="uh-greet" aria-hidden="true" />

  if (signedOut) {
    return (
      <p className="uh-greet" data-testid="greeting">
        <span>Hey, you look new around here.</span>
        <button type="button" className="uh-textbtn" onClick={() => openLogin({ signup: true })}>Tell us your name</button>
      </p>
    )
  }

  const first = profileName.split(/\s+/)[0]
  const fresh = accountCreatedAt != null && now - accountCreatedAt < FIRST_VISIT_MS && now - accountCreatedAt >= -60_000
  const hello = fresh ? 'Welcome' : 'Welcome back'

  if (first) return <p className="uh-greet" data-testid="greeting">{hello}, {first}.</p>

  const save = (e) => {
    e.preventDefault()
    const name = value.trim()
    if (!name) { inputRef.current?.focus(); return }
    updateProfile({ displayName: name })
    setOpen(false)
  }
  const notNow = () => {
    try { localStorage.setItem(ASKED_KEY, String(Date.now() + THIRTY_DAYS)) } catch { /* private mode */ }
    setHidden(true)
    setOpen(false)
  }

  return (
    <div className="uh-greet" data-testid="greeting" ref={wrapRef}>
      <span>{hello}.</span>
      {profileLoaded && !hidden && (
        <span className="uh-ask">
          <button
            type="button"
            ref={btnRef}
            className="uh-textbtn"
            aria-expanded={open}
            aria-controls="uh-name-form"
            onClick={() => setOpen((v) => !v)}
          >
            Add your name
          </button>
          {open && (
            <div className="uh-pop" role="group" aria-label="Your name">
              <form id="uh-name-form" onSubmit={save}>
                <label htmlFor="uh-name-input">Your first name</label>
                <input
                  id="uh-name-input"
                  ref={inputRef}
                  value={value}
                  maxLength={60}
                  autoComplete="given-name"
                  autoCapitalize="words"
                  enterKeyHint="done"
                  onChange={(e) => setValue(e.target.value)}
                />
                <span className="uh-pop-actions">
                  <button type="submit" className="uh-cta uh-cta-sm">Save</button>
                  <button type="button" className="uh-ghost uh-cta-sm" onClick={notNow}>Not now</button>
                </span>
              </form>
            </div>
          )}
        </span>
      )}
    </div>
  )
}
