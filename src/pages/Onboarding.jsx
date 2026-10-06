import { useRef, useEffect, useState } from 'react'
import { useNavigate, Navigate, Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { FIRST_WINS, FIRST_WIN_SKIPPED } from '../utils/firstWin'
import { trackFirstWinChoice, startTimeToValue } from '../utils/analytics'
import { onboardingDestination, knownProfile, localOnboardingFlag, SIGNED_IN_HOME } from '../utils/onboardingState'

// Where a brand-new account lands when it does NOT pick a starting point.
//
// Was '/home' — the ANONYMOUS SALES PAGE. Home.jsx has no auth awareness at all
// (it does not import useAuth), so someone who had just created an account was
// shown "No more tab hoarding", a "Start building free" CTA and "No credit card
// · No setup". That CTA then loops: App.jsx bounces a signed-in user from
// /login straight back to /home.
//
// /projects instead, because its empty state is the one surface that teaches
// without being asked — it names the tools to start with and offers the action.
const FIRST_RUN_DESTINATION = '/projects'

const ONBOARDED_KEY = 'vs-onboarded'
const RESUME_KEY = 'vs-resume-after-onboarding'

// ─────────────────────────────────────────────────────────────────────────────
// WHAT HAPPENED TO THE SURVEY
// ─────────────────────────────────────────────────────────────────────────────
// There were three questions here — source, use and role — and the COMPLETE
// list of things that read the answers was: the admin user table, for `use` and
// `role`. `source` ("How did you hear about us?") was read by nothing at all.
// No personalisation, no tool ordering, no copy variation, nothing the person
// answering could ever feel. Three screens of friction in front of a brand-new
// account, delivering value only to an internal table.
//
// The routing test that settles it: which screen, content, default or
// recommendation changes because of this answer? For all three, nothing did.
// So they are gone rather than kept and quietly ignored — asking a question you
// do not use costs the user time and costs you the trust that they are being
// asked for a reason.
//
// What remains is ONE question that routes: which of three things do you want
// to make? The answer picks the next screen, opens that tool, and is recorded
// as `onboarding.firstWin` — which the admin table reads, so the persisted
// field has a consumer rather than repeating the defect this removed.
//
// If attribution is wanted back, the honest place for it is AFTER the first
// win, not in front of it, and it is one entry in a list — not a fourth
// question in front of someone who has not yet been shown anything.

// Record completion on the ACCOUNT, with localStorage as a fast local mirror.
// The account copy is the one that matters: it is what stops onboarding
// reappearing on a second device.
//
// Module scope, not the component body, because of the Date.now() stamp. The
// React compiler refuses an impure call made during render, and it is right to:
// the timestamp belongs to the moment the user actually finished, not to
// whichever render happened to construct the closure.
function completeOnboarding(updateProfile, extra = null) {
  try { updateProfile?.({ onboarding: { ...(extra || {}), completedAt: Date.now() } }) } catch { /* ignore */ }
  try { localStorage.setItem(ONBOARDED_KEY, '1') } catch { /* ignore */ }
}

function ArrowIcon() {
  return (
    <svg className="onb-option-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
    </svg>
  )
}

export default function Onboarding() {
  const { user, userProfile, profileLoaded, updateProfile, loading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const headingRef = useRef(null)
  // Set the moment a choice is made, before completion is written to the
  // profile. State rather than a ref because it is READ during render, and
  // because it has to reach the render that sees the completed profile:
  // react-router wraps navigate() in a transition, so the profile write (a
  // plain state update) can paint this page once more, at /onboarding, before
  // the route changes — and without this flag that paint would redirect to
  // the User Home instead of the tool the person just chose.
  const [leaving, setLeaving] = useState(false)

  // New sign-ups reach /onboarding via a `navigate(..., {replace:true})` that
  // manages no focus of its own (App.jsx), so a keyboard/AT user would be
  // dropped to <body> with no announcement. Move focus to the heading on mount
  // so the screen is announced (audit C5 / QA Q3). The heading carries
  // tabIndex={-1} to be programmatically focusable without becoming a tab stop.
  useEffect(() => {
    headingRef.current?.focus()
  }, [])

  // Onboarding only makes sense for a signed-in user. While auth is still
  // resolving we show the flow shell; if definitively signed out, go to login.
  if (!loading && !user) return <Navigate to="/login" replace />

  // An account that has already finished — /onboarding typed as a URL, or an
  // old bookmark — used to get the whole flow again, and finishing it a second
  // time overwrote the firstWin the admin table reads (#436, flow 6). The
  // decision is onboardingDestination(), the same function the router uses
  // for `/`, so the two cannot disagree: the account's record when the
  // profile carries it, else the local mirror AuthContext syncs from the
  // account on load. Two cases are exempt — a person mid-choice (`leaving`:
  // their own completion write must not bounce them off the tool they picked)
  // and a brand-new sign-up sent here by App.jsx (`state.fresh`: the mirror is
  // per-browser, so a previous account's flag on this device must not skip a
  // new account's first screen).
  const fresh = location.state?.fresh === true
  // Until the account has answered, only this browser's own record of
  // finishing can send the visitor away; otherwise the flow stays on screen.
  const known = knownProfile(userProfile, profileLoaded)
  const settled = known
    ? onboardingDestination(known)
    : (localOnboardingFlag() ? SIGNED_IN_HOME : '/onboarding')
  if (user && userProfile && !leaving && !fresh && settled !== '/onboarding') {
    return <Navigate to={settled} replace />
  }

  const firstName = userProfile?.displayName?.split(' ')[0] || user?.email?.split('@')[0] || 'there'

  const markOnboardingComplete = (extra = null) => completeOnboarding(updateProfile, extra)

  const persist = (extra = null) => markOnboardingComplete(extra)

  // A mid-action sign-up (e.g. clicked "Upgrade to Pro" → created an account)
  // is intercepted into onboarding by App.jsx, which would otherwise silently
  // drop the user's original destination (QA Q1). The call site stashes that
  // destination in sessionStorage; read + clear it here so a finishing user
  // resumes there instead of the generic /home. Returns null when nothing was
  // stashed (the common, unprompted-onboarding case).
  const takeResumeTarget = () => {
    try {
      const t = sessionStorage.getItem(RESUME_KEY)
      sessionStorage.removeItem(RESUME_KEY)
      return t || null
    } catch { return null }
  }

  // Analytics for this screen. Always in this order and always wrapped: the
  // counter records WHICH start was chosen, and the clock is what
  // utils/timeToValue.js later measures the gap from. Neither may throw a user
  // out of their own onboarding, so a broken metric is swallowed and the
  // navigation below happens regardless.
  const recordFirstWin = (choiceId) => {
    try { trackFirstWinChoice(choiceId) } catch { /* metrics never block a flow */ }
    try { startTimeToValue() } catch { /* metrics never block a flow */ }
  }

  // Picked a starting point. The next thing they see is the real tool, open, on
  // the artefact the sign-up dialog promised them ("your palettes, type scales
  // and gradients, kept").
  //
  // The stashed resume target is DROPPED, exactly as the old pricing step's
  // Free button dropped a stashed checkout intent: choosing a start here is a
  // newer and more specific statement of intent than whatever they clicked
  // before the account existed.
  const chooseFirstWin = (win) => {
    setLeaving(true)
    persist({ firstWin: win.id })
    recordFirstWin(win.id)
    takeResumeTarget()
    navigate(win.route)
  }

  // Declined all three. Onboarding is still COMPLETE — the screen was answered
  // and the answer was "none of these".
  //
  // Completion is recorded on the PROFILE, not just localStorage. This used to
  // be the skip path's bug: it wrote localStorage only, so the account never
  // learned it had happened and onboarding reappeared on every new browser,
  // device or cleared cache, forever, for anyone who skipped.
  //
  // `firstWin` is deliberately not persisted: nothing was chosen, and writing
  // "skipped" onto the profile would put a non-answer in the admin table.
  const skipFirstWin = () => {
    setLeaving(true)
    persist()
    recordFirstWin(FIRST_WIN_SKIPPED)
    // Declining a starting point shouldn't discard why they signed up — resume
    // to the stashed destination (e.g. /checkout) when there is one.
    navigate(takeResumeTarget() || FIRST_RUN_DESTINATION)
  }

  return (
    <div className="onb">
      <div className="onb-card" id="main" tabIndex={-1}>
        <div className="onb-top">
          <div className="onb-brand">UIL4B</div>
        </div>

        {/* One screen, so there is no progress bar and no corner Skip: a row of
            dots that is always full says nothing, and a "Skip" beside a "Not
            now" that does the identical thing is two names for one action. */}
        <div className="onb-step onb-firstwin-step" data-testid="onboarding-first-win">
          <div className="onb-greeting">You're in, <em>{firstName}</em> <span aria-hidden="true">👋</span></div>
          <h1 className="onb-q" ref={headingRef} tabIndex={-1}>What do you want to make first?</h1>
          <p className="onb-sub">
            Whichever you pick opens next. You can switch at any time — nothing here is locked in.
          </p>

          <div className="onb-options onb-firstwin-options">
            {FIRST_WINS.map(win => (
              <button
                key={win.id}
                type="button"
                className="onb-option onb-firstwin-option"
                data-first-win={win.id}
                onClick={() => chooseFirstWin(win)}
              >
                <span className="onb-firstwin-text">
                  <span className="onb-firstwin-label">{win.label}</span>
                  <span className="onb-firstwin-blurb">{win.blurb}</span>
                </span>
                <ArrowIcon />
              </button>
            ))}
          </div>

          <button type="button" className="onb-back" onClick={skipFirstWin}>
            Not now — take me to my projects
          </button>

          {/* The pricing STEP is gone; the pricing is not hidden. Shortening the
              path by concealing a cost the user meets later buys an easy finish
              with distrust, so the tier truth stays as one sentence with a real
              link, instead of a two-column table and a Stripe button in front of
              someone who has not yet made anything. What Pro costs and contains
              is unchanged. */}
          <p className="onb-sub onb-firstwin-foot">
            All of this is free. <Link to="/plans">Pro</Link> adds more AI and advanced exports when you want it.
          </p>
        </div>
      </div>
    </div>
  )
}
