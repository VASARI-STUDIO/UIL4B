import { useRef, useEffect, useMemo, useState } from 'react'
import { useNavigate, Navigate, Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useProject } from '../contexts/ProjectContext'
import { FIRST_WINS, FIRST_WIN_SKIPPED } from '../utils/firstWin'
import { trackFirstWinChoice, startTimeToValue } from '../utils/analytics'
import { onboardingDestination, knownProfile, localOnboardingFlag, SIGNED_IN_HOME } from '../utils/onboardingState'
import { BrandLockup } from '../components/BrandLogo'
import { isLocalPath } from '../utils/localPath'
import { loadFont } from '../utils/googleFonts'
import {
  BRANDS, KERBSIDE, RAIL_SIZES, DEFAULT_PROJECT_NAME,
  brandById, pairsFor, defaultPairId, normHex, fgFor, aaFor, shadeStrip,
  columnsFor, specimenColours, coverSize, rendersFor, kitPatch,
} from '../utils/onboardingKit'
import '../styles/pages/v3-onboarding.css'

// Where a brand-new account lands when it does NOT pick a starting point.
//
// /projects, not /home: Home.jsx is the anonymous sales page and has no auth
// awareness, so someone who had just created an account would be shown a
// "Start building free" CTA that loops back here. /projects has an empty state
// that teaches without being asked.
const FIRST_RUN_DESTINATION = '/projects'

const ONBOARDED_KEY = 'vs-onboarded'
const RESUME_KEY = 'vs-resume-after-onboarding'

const L6 = 'Not now, take me to my projects'
const L6_CHECKOUT = 'Not now, take me to checkout'

// /checkout itself, with or without a plan, but not /checkout/return.
const isCheckoutTarget = (target) => target === '/checkout' || (typeof target === 'string' && target.startsWith('/checkout?'))

// Record completion on the ACCOUNT, with localStorage as a fast local mirror.
// The account copy is what stops onboarding reappearing on a second device.
//
// Module scope, not the component body, because of the Date.now() stamp: the
// timestamp belongs to the moment the person finished, not to whichever render
// built the closure, and the React compiler refuses an impure call in render.
function completeOnboarding(updateProfile, extra = null) {
  try { updateProfile?.({ onboarding: { ...(extra || {}), completedAt: Date.now() } }) } catch { /* ignore */ }
  try { localStorage.setItem(ONBOARDED_KEY, '1') } catch { /* ignore */ }
}

// A stashed destination (a sign-up that began on a Pro button) is read once, on mount.
function stashedTarget() {
  try {
    const t = sessionStorage.getItem(RESUME_KEY)
    return isLocalPath(t) ? t : null
  } catch { return null }
}

const prefersReducedMotion = () => {
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches } catch { return false }
}

const stack = (font) => `"${font.family}", ${font.category === 'serif' ? 'serif' : font.category === 'monospace' ? 'monospace' : 'sans-serif'}`

// Resolves true when both faces of a pair are usable, false when either did not load.
async function pairLoaded(pair) {
  const faces = [pair.heading, pair.body]
  const status = await Promise.all(faces.map((f) => loadFont(f.family, [f.weight]).catch(() => 'error')))
  const specs = faces.map((f) => `${f.weight} 24px "${f.family}"`)
  try { await Promise.all(specs.map((s) => document.fonts.load(s))) } catch { return false }
  return status.every((s) => s !== 'error') && specs.every((s) => document.fonts.check(s))
}

const ARROW_KEYS = ['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp', 'Home', 'End']

// Arrow, Home and End on a radio group: wrap, move focus and select.
function radioKey(event, select) {
  if (!ARROW_KEYS.includes(event.key)) return
  const radios = [...event.currentTarget.querySelectorAll('[role="radio"]')]
  if (!radios.length) return
  event.preventDefault()
  let i = radios.indexOf(document.activeElement)
  if (i < 0) i = Math.max(0, radios.findIndex((r) => r.getAttribute('aria-checked') === 'true'))
  if (event.key === 'ArrowRight' || event.key === 'ArrowDown') i = (i + 1) % radios.length
  else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') i = (i + radios.length - 1) % radios.length
  else if (event.key === 'Home') i = 0
  else i = radios.length - 1
  radios[i].focus()
  select(radios[i])
}

function GoArrow() {
  return (
    <span className="ob-go-well" aria-hidden="true">
      <svg className="ob-go-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12h14M13 6l6 6-6 6" />
      </svg>
    </span>
  )
}

function BackButton({ onBack }) {
  return (
    <button type="button" className="ob-back" data-back="1" onClick={onBack}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M15 6l-6 6 6 6" />
      </svg>
      Back
    </button>
  )
}

export default function Onboarding() {
  const { user, userProfile, profileLoaded, updateProfile, loading, signupVerification, emailVerificationOwed } = useAuth()
  const { saveProject } = useProject()
  const navigate = useNavigate()
  const location = useLocation()
  const headingRef = useRef(null)

  // Set the moment a choice is made, before completion is written to the
  // profile. State rather than a ref because it is READ during render, and it
  // has to reach the render that sees the completed profile: the profile write
  // can paint this page once more at /onboarding before the route changes, and
  // without this flag that paint would redirect to the User Home instead of the
  // place the person chose.
  const [leaving, setLeaving] = useState(false)

  // The three beats and what has been picked on them.
  const [beat, setBeat] = useState(1)
  const [play, setPlay] = useState(false)
  const [exiting, setExiting] = useState(false)
  const [text, setText] = useState('')
  const [touched, setTouched] = useState(false)
  const [col, setCol] = useState(null)
  const [repaint, setRepaint] = useState(false)
  const [start, setStart] = useState(null)
  const [sel, setSel] = useState(null)
  const [shown, setShown] = useState(null)
  const [fontNote, setFontNote] = useState(null)
  const [name, setName] = useState(DEFAULT_PROJECT_NAME)
  const [status, setStatus] = useState('')
  const [resumeTarget] = useState(stashedTarget)
  const checkoutStashed = isCheckoutTarget(resumeTarget)

  const debounceRef = useRef(0)
  const moveRef = useRef(0)
  const focusRef = useRef('[data-h1]')
  const pairToken = useRef(0)

  // New sign-ups reach /onboarding via a `navigate(..., {replace:true})` that
  // manages no focus of its own, so a keyboard or screen reader user would be
  // dropped to <body> with no announcement. Focus the heading on mount; every
  // later beat sets focus in the effect below.
  useEffect(() => {
    headingRef.current?.focus()
    return () => { clearTimeout(debounceRef.current); clearTimeout(moveRef.current) }
  }, [])

  useEffect(() => {
    const target = focusRef.current
    const el = (target && document.querySelector(target)) || document.querySelector('[data-h1]')
    el?.focus({ preventScroll: true })
    if (target === '#onb-name' && el) el.select?.()
  }, [beat])

  // The "check your inbox" line is announced by a status region that is already
  // on the page when the text arrives: a region that mounts holding its text is
  // usually not read, and the heading takes focus on mount.
  const [lineReady, setLineReady] = useState(false)
  useEffect(() => {
    const frame = requestAnimationFrame(() => setLineReady(true))
    return () => cancelAnimationFrame(frame)
  }, [])

  // The pairs on offer: three, plus a sample brand's own first. The first pair's faces load at once
  // (the specimen is set in them); the rest load when the fonts beat opens, so every button shows its own faces.
  const brand = start ? brandById(start) : null
  const pairs = useMemo(() => pairsFor(brand), [brand])
  useEffect(() => {
    const first = pairs[0]
    loadFont(first.heading.family, [first.heading.weight])
    loadFont(first.body.family, [first.body.weight])
  }, [pairs])
  useEffect(() => {
    if (beat < 2) return
    pairs.forEach((p) => {
      loadFont(p.heading.family, [p.heading.weight])
      loadFont(p.body.family, [p.body.weight])
    })
  }, [beat, pairs])

  // Onboarding only makes sense for a signed-in user. While auth is still
  // resolving we show the flow shell; if definitively signed out, go to login.
  if (!loading && !user) return <Navigate to="/login" replace />

  // An account that has already finished — /onboarding typed as a URL, or an
  // old bookmark — would otherwise get the whole flow again, and finishing it a
  // second time overwrote the firstWin the admin table reads. The decision is
  // onboardingDestination(), the same function the router uses for `/`. Two
  // cases are exempt: a person mid-choice (`leaving`) and a brand-new sign-up
  // sent here by App.jsx (`state.fresh`: the mirror is per-browser, so a
  // previous account's flag on this device must not skip a new account's first
  // screen). Until the account has answered, only this browser's own record of
  // finishing can send the visitor away.
  const fresh = location.state?.fresh === true
  const known = knownProfile(userProfile, profileLoaded)
  const settled = known
    ? onboardingDestination(known)
    : (localOnboardingFlag() ? SIGNED_IN_HOME : '/onboarding')
  if (user && userProfile && !leaving && !fresh && settled !== '/onboarding') {
    return <Navigate to={settled} replace />
  }

  const firstName = userProfile?.displayName?.split(' ')[0] || user?.email?.split('@')[0] || 'there'
  // Said only to the account that just signed up with a password and whose
  // address is still unproved; 'pending' reads as sent, as the send is under way.
  const verifyLine = emailVerificationOwed && user?.email && signupVerification
    ? (signupVerification === 'failed'
        ? "Your verification link didn't send. You can resend it from the bar at the top once you've picked."
        : `Check your inbox: we sent a verification link to ${user.email}.`)
    : null

  const persist = (extra = null) => completeOnboarding(updateProfile, extra)

  // The stashed destination is read once on mount and removed when onboarding
  // finishes. Returns null when nothing was stashed or what was stashed is not
  // a path on this origin: the writer checks it, and it is checked again here
  // because storage can hold anything by the time it is read.
  const takeResumeTarget = () => {
    try {
      const t = sessionStorage.getItem(RESUME_KEY)
      sessionStorage.removeItem(RESUME_KEY)
      return isLocalPath(t) ? t : null
    } catch { return null }
  }

  // Analytics for this screen. Always in this order and always wrapped: neither
  // may throw a user out of their own onboarding.
  const recordFirstWin = (choiceId) => {
    try { trackFirstWinChoice(choiceId) } catch { /* metrics never block a flow */ }
    try { startTimeToValue() } catch { /* metrics never block a flow */ }
  }

  // Picked one of the other tools. A stashed checkout wins over the pick:
  // someone who signed up by clicking a Pro button came to pay. Any other
  // stashed target is dropped, because choosing a start here is newer intent.
  const chooseFirstWin = (win) => {
    setLeaving(true)
    persist({ firstWin: win.id })
    recordFirstWin(win.id)
    const resume = takeResumeTarget()
    navigate(isCheckoutTarget(resume) ? resume : win.route)
  }

  // Declined every start. Onboarding is still COMPLETE, and completion goes on
  // the profile, not just localStorage, so a new device does not ask again.
  const skipFirstWin = () => {
    setLeaving(true)
    persist()
    recordFirstWin(FIRST_WIN_SKIPPED)
    navigate(takeResumeTarget() || FIRST_RUN_DESTINATION)
  }

  // ── What is on screen ─────────────────────────────────────────────────────
  const cols = columnsFor({ start, committed: col })
  const { ground, ink, action } = specimenColours(cols)
  const pairId = pairs.some((p) => p.id === sel) ? sel : defaultPairId(brand)
  const shownId = pairs.some((p) => p.id === shown) ? shown : pairId
  const selPair = pairs.find((p) => p.id === pairId) || pairs[0]
  const shownPair = pairs.find((p) => p.id === shownId) || pairs[0]
  const pending = selPair.id !== shownPair.id
  const normalised = normHex(text)
  const bad = touched && !!text.trim() && !normalised
  const sample = brand || (!col && !start ? KERBSIDE : null)
  const projectName = name.trim() || DEFAULT_PROJECT_NAME
  const cover = beat === 3
  const saving = status === 'saving'
  const errored = status === 'error'

  let pairLine = `${shownPair.heading.family} ${shownPair.heading.weight} · ${shownPair.body.family} ${shownPair.body.weight}`
  let pairIsStatus = false
  if (pending) {
    pairLine = `Loading ${selPair.heading.family}…`
    pairIsStatus = true
  } else if (fontNote === shownPair.id) {
    pairLine = `${shownPair.heading.family} didn't load, so it's shown in a fallback font.`
    pairIsStatus = true
  }

  let caption = 'Example: Kerbside, a sample brand'
  if (brand) caption = `${brand.name}, a sample brand`
  else if (col) caption = 'Your colours so far'
  if (cover) caption = `Your kit: ${projectName}${brand ? `, on ${brand.name}’s colours` : col ? '' : ', on Kerbside’s colours'}`

  const exportBrand = brand || KERBSIDE
  const renders = rendersFor(exportBrand)
  const ownKept = !!brand && brand.id !== KERBSIDE.id && pairId === 'own'
  const exportTail = ' Yours exports from Projects once it’s saved.'
  const exportCaption = (brand && brand.id !== KERBSIDE.id
    ? (ownKept ? `Sample export from ${brand.name}, the kit you started from.` : `Sample export from ${brand.name}.`)
    : 'Sample export from Kerbside.') + exportTail

  const pill = beat === 1 ? 'Next: fonts' : beat === 2 ? 'Next: name it' : 'Save to my projects'
  const h1 = beat === 1 ? 'Start with your brand colour' : beat === 2 ? 'Pick your fonts' : 'Name your kit'

  let statusText = ''
  if (saving) statusText = 'Saving your kit…'
  else if (errored) statusText = 'Your kit didn’t save. Check your connection and try again. Everything you picked is still here.'
  else if (checkoutStashed) statusText = 'After this, you’ll go on to checkout.'

  // ── Actions ───────────────────────────────────────────────────────────────
  const focusSoon = (selector) => {
    setTimeout(() => {
      const el = document.querySelector(selector) || document.querySelector('[data-h1]')
      el?.focus({ preventScroll: true })
    }, 0)
  }

  const goTo = (n, back = false) => {
    clearTimeout(moveRef.current)
    focusRef.current = n === 3 && !back ? '#onb-name' : back ? '[data-go]' : '[data-h1]'
    setBeat(n)
    setPlay(!back)
    setExiting(false)
    setRepaint(false)
    setStatus('')
  }

  const setHex = (t) => {
    setText(t)
    setTouched(false)
    setStart(null)
    clearTimeout(debounceRef.current)
    const n = normHex(t)
    // The columns repaint 120ms after the last keystroke, left to right in CSS.
    debounceRef.current = setTimeout(() => {
      if (n) { setRepaint(true); setCol(n) } else if (!t.trim()) setCol(null)
    }, 120)
  }

  const chooseSample = (id, { focus = true } = {}) => {
    clearTimeout(debounceRef.current)
    const b = brandById(id)
    setText(b.action)
    setTouched(false)
    setCol(null)
    setRepaint(false)
    setStart(id)
    setSel(defaultPairId(b))
    setShown(null)
    setFontNote(null)
    if (focus) focusSoon('[data-go]')
  }

  const choosePair = (id) => {
    if (id === pairId) return
    const pair = pairs.find((p) => p.id === id)
    if (!pair) return
    const token = ++pairToken.current
    setSel(id)
    setFontNote(null)
    pairLoaded(pair).then((ok) => {
      if (token !== pairToken.current) return
      setShown(id)
      setFontNote(ok ? null : id)
    })
  }

  const save = () => {
    if (saving) return
    setStatus('saving')
    try {
      saveProject(projectName, { identityName: projectName, patch: kitPatch(cols, shownPair) })
    } catch {
      setStatus('error')
      return
    }
    setLeaving(true)
    persist({ firstWin: 'palette' })
    recordFirstWin('palette')
    const resume = takeResumeTarget()
    navigate(isCheckoutTarget(resume) ? resume : '/create/palette')
  }

  const press = () => {
    if (saving) return
    if (beat === 1) {
      if (text.trim() && !normalised) {
        // Never disabled: an invalid value sends focus to the field and shows the helper line.
        setTouched(true)
        focusSoon('#onb-hex')
        return
      }
      if (!start) {
        clearTimeout(debounceRef.current)
        setCol(normalised)
      }
      if (prefersReducedMotion()) { goTo(2); return }
      setExiting(true)
      clearTimeout(moveRef.current)
      moveRef.current = setTimeout(() => goTo(2), 100)
      return
    }
    if (beat === 2) { goTo(3); return }
    save()
  }

  const back = () => { if (!saving) goTo(Math.max(1, beat - 1), true) }

  const onRootKey = (event) => {
    if (event.key === 'Escape' && beat > 1 && !saving && !event.defaultPrevented) {
      event.preventDefault()
      back()
    }
  }

  const link = (handler) => (event) => {
    // A modified click keeps the browser's own behaviour (new tab, new window).
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    handler()
  }

  const starts = FIRST_WINS.filter((w) => w.id !== 'palette')
  const rootClass = `ob${play ? ' is-play' : ''}${saving ? ' is-saving' : ''}`

  return (
    <div className={rootClass} data-beat={beat} onKeyDown={onRootKey}>
      <header className="ob-bar">
        <span className="ob-lock"><BrandLockup label="UI L4B" /></span>
        <div className="ob-cnt">
          <span className="ob-cnt-t">Step {beat} of 3</span>
          <span className="ob-segs" aria-hidden="true">
            <i className="ob-seg is-on" />
            <i className={`ob-seg${beat >= 2 ? ' is-on' : ''}`} />
            <i className={`ob-seg${beat >= 3 ? ' is-on' : ''}`} />
          </span>
        </div>
        {/* One screen of choices, and one way out. "Not now" does the same as every other leave: onboarding is done, and the person goes on to their projects (or the checkout they came to pay for). */}
        <a
          className={`ob-skip${saving ? ' is-full' : ''}`}
          href={checkoutStashed ? resumeTarget : FIRST_RUN_DESTINATION}
          data-skip="1"
          onClick={link(skipFirstWin)}
        >
          {checkoutStashed ? L6_CHECKOUT : L6}
        </a>
      </header>

      <main className="ob-main" id="main" tabIndex={-1}>
        <div className={`ob-left ob-left--b${beat}${exiting ? ' is-exiting' : ''}`} data-testid="onboarding-first-win">
          {beat === 1 && (
            <>
              <p className="ob-hello">You’re in, <b>{firstName}</b></p>
              <div role="status" className="ob-verify-wrap">
                {lineReady && verifyLine && (
                  <p className={`ob-verify${signupVerification === 'failed' ? ' is-failed' : ''}`} data-testid="onboarding-verify-line">{verifyLine}</p>
                )}
              </div>
              <h1 className="ob-h1" ref={headingRef} tabIndex={-1} data-h1="1">{h1}</h1>
              <p className="ob-lead">Pick a colour or paste a hex code.<span className="ob-lead-x"> You get the shades, text colours and contrast checks, and you can keep it here.</span></p>
              <div className={`ob-fld${saving ? ' is-inert' : ''}`}>
                <label className="ob-lab" htmlFor="onb-hex">Brand colour</label>
                <div className="ob-field">
                  <label className="ob-well" title="Pick a colour">
                    <span className={`ob-well-sw${normalised ? '' : ' is-empty'}`} style={normalised ? { backgroundColor: normalised } : undefined} />
                    <input
                      className="ob-well-in"
                      type="color"
                      value={(normalised || KERBSIDE.action).toLowerCase()}
                      aria-label="Pick a colour"
                      onChange={(e) => setHex(String(e.target.value).toUpperCase())}
                    />
                  </label>
                  <input
                    id="onb-hex"
                    className="ob-hex"
                    type="text"
                    name="brand-colour"
                    aria-label="Brand colour"
                    value={text}
                    placeholder="#FF5A1F"
                    autoComplete="off"
                    autoCapitalize="characters"
                    spellCheck={false}
                    maxLength={7}
                    aria-invalid={bad}
                    aria-describedby="onb-help"
                    onChange={(e) => setHex(e.target.value)}
                    onBlur={() => { if (text.trim()) setTouched(true) }}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); press() } }}
                  />
                </div>
                <p className={`ob-help${bad ? ' is-bad' : ''}`} id="onb-help" aria-live="polite">
                  {bad ? 'Enter 6 hex digits, like #FF5A1F.' : '6 hex digits, like #FF5A1F'}
                </p>
              </div>
              <div className="ob-try">
                <p className="ob-lab2" id="onb-try">Or start from a sample</p>
                <div
                  className="ob-sws"
                  role="radiogroup"
                  aria-labelledby="onb-try"
                  onKeyDown={(e) => radioKey(e, (el) => chooseSample(el.dataset.sw, { focus: false }))}
                >
                  {BRANDS.map((b, i) => (
                    <button
                      key={b.id}
                      type="button"
                      className="ob-sw"
                      role="radio"
                      data-sw={b.id}
                      aria-label={`Use ${b.name}’s colours, a sample brand`}
                      aria-checked={start === b.id}
                      tabIndex={(start ? start === b.id : i === 0) ? 0 : -1}
                      onClick={() => chooseSample(b.id)}
                    >
                      <i style={{ backgroundColor: b.action }} />
                    </button>
                  ))}
                </div>
              </div>
              <div className="ob-foot">
                <button type="button" className="ob-pill" data-go="1" onClick={press}>
                  {pill}
                  <GoArrow />
                </button>
              </div>
              <div className="ob-other">
                <p className="ob-lab2" id="onb-or">Or start with</p>
                <div className="ob-nxs" role="group" aria-labelledby="onb-or">
                  {starts.map((win) => (
                    <a
                      key={win.id}
                      className="ob-nx"
                      href={win.route}
                      data-start={win.id}
                      data-first-win={win.id}
                      onClick={link(() => chooseFirstWin(win))}
                    >
                      {win.label}
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
                    </a>
                  ))}
                </div>
              </div>
              {/* The pricing step is gone; the pricing is not hidden. The tier truth stays as one sentence with a real link. */}
              <p className="ob-free">
                All of this is free. <Link to="/plans">Pro</Link> adds more AI and advanced exports when you want it.
              </p>
            </>
          )}

          {beat === 2 && (
            <>
              <BackButton onBack={back} />
              <h1 className="ob-h1 ob-a" style={{ '--d': '170ms' }} tabIndex={-1} data-h1="1">{h1}</h1>
              <p className="ob-lead ob-a" style={{ '--d': '230ms' }}>One for headings, one for body text.<span className="ob-lead-x"> Every size in your scale comes from these.</span></p>
              <div
                className={`ob-pairs${pairs.length > 3 ? ' is-four' : ''} ob-a`}
                style={{ '--d': '290ms' }}
                role="radiogroup"
                aria-label="Heading and body fonts"
                onKeyDown={(e) => radioKey(e, (el) => choosePair(el.dataset.pair))}
              >
                {pairs.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className="ob-pair"
                    role="radio"
                    data-pair={p.id}
                    aria-checked={p.id === pairId}
                    tabIndex={p.id === pairId ? 0 : -1}
                    onClick={() => choosePair(p.id)}
                  >
                    <span className="ob-pair-n" style={{ fontFamily: stack(p.heading), fontWeight: p.heading.weight }}>{p.name}</span>
                    <span className="ob-pair-d" style={{ fontFamily: stack(p.body), fontWeight: p.body.weight }}>{p.note}</span>
                  </button>
                ))}
              </div>
              <div className="ob-foot ob-a" style={{ '--d': '350ms' }}>
                <button type="button" className="ob-pill" data-go="1" onClick={press}>
                  {pill}
                  <GoArrow />
                </button>
              </div>
            </>
          )}

          {beat === 3 && (
            <>
              <BackButton onBack={back} />
              <h1 className="ob-h1" tabIndex={-1} data-h1="1">{h1}</h1>
              <p className="ob-lead">Your colours and fonts go into one project. You can change any of it later.</p>
              <div className={`ob-fld${saving ? ' is-inert' : ''}`}>
                <label className="ob-lab" htmlFor="onb-name">Project name</label>
                <div className="ob-field is-name">
                  <input
                    id="onb-name"
                    className="ob-hex ob-name"
                    type="text"
                    name="project-name"
                    aria-label="Project name"
                    value={name}
                    autoComplete="off"
                    aria-describedby="onb-nhelp"
                    onChange={(e) => setName(e.target.value)}
                    onFocus={(e) => e.target.select()}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); press() } }}
                  />
                </div>
                <p className="ob-help" id="onb-nhelp">You can rename it later.</p>
              </div>
              <div className="ob-foot">
                <button type="button" className="ob-pill" data-go="1" aria-busy={saving} onClick={press}>
                  {pill}
                  <span className="ob-go-well" aria-hidden="true">
                    {saving ? (
                      <svg className="ob-spin" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle className="ob-spin-track" cx="8" cy="8" r="7" />
                        <path d="M8 1a7 7 0 0 1 7 7" strokeLinecap="round" />
                      </svg>
                    ) : (
                      <svg className="ob-go-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                    )}
                  </span>
                </button>
                {errored && (
                  <p className="ob-status is-err" role="alert">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
                      <circle cx="8" cy="8" r="6.75" /><path d="M8 4.5v4" /><path d="M8 11.25v.01" />
                    </svg>
                    <span>{statusText}</span>
                  </p>
                )}
                {!errored && <p className="ob-status" role="status">{statusText}</p>}
              </div>
            </>
          )}
        </div>

        <div className={`ob-right ob-right--b${beat}`}>
          <p className="ob-cap" aria-live="polite">{caption}</p>
          <div className="ob-sheet">
            <div className={`ob-pal${repaint ? ' is-repaint' : ''}`} role="list" aria-label="Your brand colours">
              {cols.map((c, i) => (
                <div key={i} className="ob-col" role="listitem" style={{ backgroundColor: c.hex, color: fgFor(c.hex), transitionDelay: `${i * 40}ms` }}>
                  <div className="ob-col-t">
                    <p className="ob-col-h">{c.name}</p>
                    <p className="ob-col-x">{c.hex}</p>
                    <span className="ob-chip">{aaFor(c.hex)}</span>
                  </div>
                  <div className="ob-shade" aria-hidden="true">
                    {shadeStrip(c.hex).map((h, k) => <i key={k} style={{ backgroundColor: h }} />)}
                  </div>
                </div>
              ))}
            </div>

            {beat >= 2 && (
              <div
                className="ob-spec ob-pan"
                key={`spec-${beat}`}
                style={{ backgroundColor: cover ? action : ground, color: cover ? fgFor(action) : ink }}
              >
                <div className="ob-spec-in">
                  <span className="ob-spec-rule" style={{ backgroundColor: cover ? fgFor(action) : action }} />
                  <h2
                    className="ob-spec-h ob-a"
                    style={{
                      '--d': '160ms',
                      '--ob-hs': `${cover ? coverSize(projectName) : 61}px`,
                      '--ob-hs-m': `${cover ? 39 : 36}px`,
                      fontFamily: stack(shownPair.heading),
                      fontWeight: shownPair.heading.weight,
                    }}
                  >
                    {cover ? projectName : (sample ? sample.line : 'Headings look like this')}
                  </h2>
                  {!cover && (
                    <p className="ob-spec-b ob-a" style={{ '--d': '220ms', fontFamily: stack(shownPair.body), fontWeight: shownPair.body.weight }}>
                      {sample ? sample.para : 'Body text looks like this, at 16 pixels on a 24 pixel line. Most of your pages will use this size.'}
                    </p>
                  )}
                  <p className={`ob-spec-p ob-a ${pairIsStatus ? 'is-status' : 'is-mono'}`} style={{ '--d': '220ms' }}>{pairLine}</p>
                  <div className="ob-rail-w">
                    <div className="ob-rail" aria-hidden="true">
                      {RAIL_SIZES.map((s, i) => {
                        const face = s >= 25 ? shownPair.heading : shownPair.body
                        return <b key={`g${s}`} className="ob-a ob-rail-g" style={{ '--d': `${280 + i * 20}ms`, fontFamily: stack(face), fontWeight: face.weight, fontSize: `${s}px` }}>Ag</b>
                      })}
                      {RAIL_SIZES.map((s) => <span key={`l${s}`} className="ob-rail-l">{s}</span>)}
                    </div>
                    <p className="ob-rail-c">Major third, 1.25. Change it later in Type Scale.</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {cover && renders.length > 0 && (
            <>
              <p className="ob-exp-c">{exportCaption}</p>
              <div className="ob-exp">
                {renders.map((r, i) => (
                  <img
                    key={r.id}
                    className="ob-a"
                    style={{ '--d': `${i * 70}ms` }}
                    src={r.src}
                    srcSet={r.srcSet}
                    sizes="(max-width: 767px) 45vw, 240px"
                    alt={`${exportBrand.name} ${r.label}, a sample export`}
                    width={r.width}
                    height={r.height}
                    decoding="async"
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
