import { useState, useRef, useEffect } from 'react'
import { useNavigate, Navigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { FIRST_WINS, FIRST_WIN_SKIPPED, FIRST_WIN_EXITED } from '../utils/firstWin'
import { trackFirstWinChoice, startTimeToValue } from '../utils/analytics'

// Where a brand-new account lands.
//
// Was '/home' — the ANONYMOUS SALES PAGE. Home.jsx has no auth awareness at all
// (it does not import useAuth), so someone who had just created an account was
// shown "No more tab hoarding", a "Start building free" CTA and "No credit card
// · No setup". That CTA then loops: App.jsx bounces a signed-in user from
// /login straight back to /home.
//
// /projects instead, because that is where the first real win lives — the first
// saved project is the first thing that requires an account and survives the
// session — and because its empty state already names the two tools to start
// with and offers the action. That teaching state existed and was simply not on
// the path anyone actually walked.
const FIRST_RUN_DESTINATION = '/projects'

const ONBOARDED_KEY = 'vs-onboarded'
const RESUME_KEY = 'vs-resume-after-onboarding'

// Record completion on the ACCOUNT, with localStorage as a fast local mirror.
// The account copy is the one that matters: it is what stops onboarding
// reappearing on a second device.
//
// Module scope, not the component body, because of the Date.now() stamp. The
// React compiler refuses an impure call made during render, and it is right to:
// the timestamp belongs to the moment the user actually finished, not to
// whichever render happened to construct the closure. (The rule only started
// firing here once the pricing step's async checkout handler was removed and
// the component became simple enough for the compiler to analyse at all.)
function completeOnboarding(updateProfile, extra = null) {
  try { updateProfile?.({ onboarding: { ...(extra || {}), completedAt: Date.now() } }) } catch { /* ignore */ }
  try { localStorage.setItem(ONBOARDED_KEY, '1') } catch { /* ignore */ }
}

const QUESTIONS = [
  {
    id: 'source',
    q: 'How did you hear about us?',
    options: ['Search engine', 'Social media', 'Friend or colleague', 'YouTube / video', 'Somewhere else'],
  },
  {
    id: 'use',
    q: 'What will you mainly use UIL4B for?',
    options: ['Web design', 'Branding & identity', 'UI / UX work', 'Marketing & social', 'Just exploring'],
  },
  {
    id: 'role',
    q: 'What best describes you?',
    options: ['Designer', 'Developer', 'Founder / entrepreneur', 'Student', 'Hobbyist'],
  },
]

function ArrowIcon() {
  return (
    <svg className="onb-option-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
    </svg>
  )
}

export default function Onboarding() {
  const { user, userProfile, updateProfile, loading } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState({})
  const headingRef = useRef(null)

  // New sign-ups now reach /onboarding via a `navigate(..., {replace:true})` that
  // manages no focus of its own (App.jsx), so a keyboard/AT user would be dropped
  // to <body> with no announcement. Move focus to the step heading on mount and on
  // every step change so the flow is keyboard-navigable and screen-reader-announced
  // (audit C5 / QA Q3). The heading carries tabIndex={-1} to be programmatically
  // focusable without becoming a tab stop.
  useEffect(() => {
    headingRef.current?.focus()
  }, [step])

  // Onboarding only makes sense for a signed-in user. While auth is still
  // resolving we show the flow shell; if definitively signed out, go to login.
  if (!loading && !user) return <Navigate to="/login" replace />

  const total = QUESTIONS.length
  const onFirstWin = step >= total
  const firstName = userProfile?.displayName?.split(' ')[0] || user?.email?.split('@')[0] || 'there'

  const markOnboardingComplete = (extra = null) => completeOnboarding(updateProfile, extra)

  const persist = (extra = null) => markOnboardingComplete({ ...answers, ...(extra || {}) })

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

  const choose = (qid, value) => {
    setAnswers(prev => ({ ...prev, [qid]: value }))
    setTimeout(() => setStep(s => s + 1), 160)
  }

  const back = () => setStep(s => Math.max(0, s - 1))

  // Analytics for the first-win screen. Always in this order and always
  // wrapped: the counter records WHICH start was chosen, and the clock is what
  // utils/timeToValue.js later measures the gap from. Neither may throw a user
  // out of their own onboarding, so a broken metric is swallowed and the
  // navigation below happens regardless.
  const recordFirstWin = (choiceId) => {
    try { trackFirstWinChoice(choiceId) } catch { /* metrics never block a flow */ }
    try { startTimeToValue() } catch { /* metrics never block a flow */ }
  }

  // Picked a starting point. This is the whole point of the screen: the next
  // thing they see is the real tool, open, on the artefact the sign-up dialog
  // promised them ("your palettes, type scales and gradients, kept").
  //
  // The stashed resume target is DROPPED, exactly as the old Free button
  // dropped a stashed checkout intent: choosing a start here is a newer and
  // more specific statement of what they want to do than whatever they clicked
  // before the account existed.
  const chooseFirstWin = (win) => {
    persist({ firstWin: win.id })
    recordFirstWin(win.id)
    takeResumeTarget()
    navigate(win.route)
  }

  // Declined all three. Onboarding is still COMPLETE — the screen was answered
  // and the answer was "none of these" — and /projects is the right landing
  // because its empty state is the one surface that teaches without being asked.
  //
  // `firstWin` is deliberately not persisted: nothing was chosen, and writing
  // "skipped" onto the profile would put a non-answer in the admin table, which
  // is the same objection skip() has always had to persisting blank answers.
  const skipFirstWin = () => {
    persist()
    recordFirstWin(FIRST_WIN_SKIPPED)
    navigate(takeResumeTarget() || FIRST_RUN_DESTINATION)
  }

  const skip = () => {
    // Skipping still COMPLETES onboarding — it just declines the survey.
    //
    // This used to write localStorage only, so the account never learned it had
    // happened. Onboarding then reappeared on the next browser, device or
    // cleared cache, forever, for anyone who skipped. Recording it on the
    // profile is what makes "seen once" true of the person rather than of one
    // browser. `answers` is deliberately not persisted here: they did not
    // answer, and inventing blanks would put empty values in the admin table.
    markOnboardingComplete()
    // Counted as 'exited', not 'skipped': this Skip is reachable from the very
    // first screen, so it means "left before the starting points", which is a
    // different problem from "saw them and wanted none". The clock still starts
    // — someone who skipped everything and then built something anyway is the
    // control group that says whether this flow helps at all.
    recordFirstWin(FIRST_WIN_EXITED)
    // Skipping the survey shouldn't discard why they signed up — resume to the
    // stashed destination (e.g. /checkout) when there is one.
    navigate(takeResumeTarget() || FIRST_RUN_DESTINATION)
  }

  return (
    <div className="onb">
      <div className="onb-card" id="main" tabIndex={-1}>
        <div className="onb-top">
          <div className="onb-brand">UIL4B</div>
          <button type="button" className="onb-skip" onClick={skip}>Skip</button>
        </div>

        <div className="onb-progress">
          {QUESTIONS.map((_, i) => (
            <span key={i} className={`onb-dot${i < step ? ' done' : ''}${i === step ? ' active' : ''}`} />
          ))}
          <span className={`onb-dot${onFirstWin ? ' active' : ''}`} />
        </div>

        {!onFirstWin ? (
          <div className="onb-step" key={step}>
            {step === 0 && (
              <div className="onb-greeting">Welcome, <em>{firstName}</em> <span aria-hidden="true">👋</span></div>
            )}
            <h1 className="onb-q" ref={headingRef} tabIndex={-1}>{QUESTIONS[step].q}</h1>
            <p className="onb-sub">Quick question {step + 1} of {total} — this helps us improve UIL4B.</p>
            <div className="onb-options">
              {QUESTIONS[step].options.map(opt => (
                <button
                  key={opt}
                  type="button"
                  className={`onb-option${answers[QUESTIONS[step].id] === opt ? ' selected' : ''}`}
                  onClick={() => choose(QUESTIONS[step].id, opt)}
                >
                  <span>{opt}</span>
                  <ArrowIcon />
                </button>
              ))}
            </div>
            {step > 0 && (
              <button type="button" className="onb-back" onClick={back}>← Back</button>
            )}
          </div>
        ) : (
          /* THE FIRST WIN, where the pricing table used to be.
             Each card is a live tool, not a description of one — picking it
             ends onboarding and opens that tool. See utils/firstWin.js for why
             these three, and for what actually counts as the win. */
          <div className="onb-step onb-firstwin-step" data-testid="onboarding-first-win">
            <div className="onb-greeting">You're in, <em>{firstName}</em>.</div>
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

            {/* The pricing STEP is gone; the pricing is not hidden. Shortening
                the path by concealing a cost the user meets later buys an easy
                finish with distrust, so the tier truth stays on the screen as
                one sentence with a real link, instead of a two-column table and
                a Stripe button in front of someone who has not yet made
                anything. What Pro costs and contains is unchanged. */}
            <p className="onb-sub onb-firstwin-foot">
              All of this is free. <Link to="/plans">Pro</Link> adds more AI and advanced exports when you want it.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
