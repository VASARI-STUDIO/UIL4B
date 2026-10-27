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
//
// On a phone the form is a bottom sheet (projects.css) with a scrim behind it. While it is open the
// keyboard is tracked through window.visualViewport: the sheet is lifted by the part of the layout
// viewport the keyboard covers (--uh-kb), so Save stays above it. A tap on the scrim, like Escape,
// closes the sheet and puts focus back on the button that opened it.
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
  const [settled, setSettled] = useState(false)
  const wrapRef = useRef(null)
  const btnRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    inputRef.current?.focus()
    const onKey = (e) => { if (e.key === 'Escape') { setOpen(false); btnRef.current?.focus() } }
    const onDown = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false) }
    // Tab past the sheet closes it, the same as a press outside, so focus never
    // sits on the dimmed page behind the scrim while the sheet is still open.
    const onFocus = (e) => {
      const pop = wrapRef.current?.querySelector('.uh-pop')
      if (pop && !pop.contains(e.target) && e.target !== btnRef.current) setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('focusin', onFocus)
    // The keyboard covers the bottom of the layout viewport on iOS and on Android with the default
    // resize behaviour, and fixed elements do not move for it. The visual viewport is what is left, so
    // the covered part is the layout height less the visual viewport's height and its offset.
    const vv = window.visualViewport
    const wrap = wrapRef.current
    const lift = () => {
      if (!vv || !wrap) return
      wrap.style.setProperty('--uh-kb', `${Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop))}px`)
      wrap.style.setProperty('--uh-vvh', `${Math.round(vv.height)}px`)
    }
    lift()
    vv?.addEventListener('resize', lift)
    vv?.addEventListener('scroll', lift)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('focusin', onFocus)
      document.removeEventListener('pointerdown', onDown)
      vv?.removeEventListener('resize', lift)
      vv?.removeEventListener('scroll', lift)
      wrap?.style.removeProperty('--uh-kb')
      wrap?.style.removeProperty('--uh-vvh')
    }
  }, [open])

  // After Save or Not now the button that opened the form is gone (the name is set, or the ask is
  // hidden), so focus goes to the greeting line itself rather than back to the page's start.
  useEffect(() => {
    if (!settled) return
    wrapRef.current?.focus()
    setSettled(false)
  }, [settled, profileName, hidden])

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

  if (first) return <p className="uh-greet" data-testid="greeting" ref={wrapRef} tabIndex={-1}>{hello}, {first}.</p>

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
    <div className="uh-greet" data-testid="greeting" ref={wrapRef} tabIndex={-1}>
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
          {open && <div className="uh-scrim" aria-hidden="true" onClick={() => { setOpen(false); btnRef.current?.focus() }} />}
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
