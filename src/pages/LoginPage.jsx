import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useI18n } from '../contexts/I18nContext'
import { stashResumeTarget } from '../contexts/LoginPromptContext'
import { isLocalPath } from '../utils/localPath'
import { knownProfile, onboardingDestination } from '../utils/onboardingState'
import { openFirebaseGate } from '../utils/firebaseAccess'
import { LOGIN_SIGNUP_TITLE, PAGE_TITLES } from '../data/routeMetaMap'
import { BrandLockup } from '../components/BrandLogo'
import AuthForm from '../components/auth/AuthForm'
import ProWall from '../components/auth/ProWall'
import '../styles/pages/auth.css'
import '../styles/v3-pro-auth.css'

// The full-screen /login page: the same form the sign-in modal shows, beside
// (or, on a phone, under a short strip of) the wall of real exports. A real route so bookmarks,
// RequireAuth redirects and Checkout's `state.from` hand-off keep working. The
// nav opens the modal in place and never comes here.
export default function LoginPage() {
  const { user, loading, pendingOnboarding, userProfile, profileLoaded } = useAuth()
  const { t } = useI18n()
  const location = useLocation()
  const navigate = useNavigate()
  // A hand-built link can put anything in state, so only a path on this origin counts.
  // /login itself is not somewhere to be sent on to: it would leave a
  // signed-in visitor on this page. With nowhere to resume, a signed-in visitor
  // belongs in the workspace, or in onboarding while their account still owes it.
  const sent = location.state?.from
  const sentFrom = isLocalPath(sent) && sent.split('?')[0].replace(/\/+$/, '') !== '/login' ? sent : null
  const from = sentFrom || onboardingDestination(knownProfile(userProfile, profileLoaded))
  // `/login?signup=1` (or `state.signup`) opens the sign-up form. The hero's
  // "Start building free" is a real link, so the intent has to survive a full
  // navigation.
  const wantsSignup = location.state?.signup === true
    || new URLSearchParams(location.search).get('signup') === '1'
  const [mode, setMode] = useState(wantsSignup ? 'signup' : 'login')

  useEffect(() => { openFirebaseGate() }, [])

  // A brand-new sign-up is intercepted into /onboarding by AppInner, which
  // would discard where the visitor was headed; onboarding reads this stash.
  // The workspace is no resume target: a bare visit stashes '/', which clears it.
  useEffect(() => { stashResumeTarget(sentFrom || '/') }, [sentFrom])

  // Leaving is skipped while onboarding is owed: AppInner sends a new account
  // there, and a second navigation here would win the race and undo it. Only
  // this effect navigates, because it reads `pendingOnboarding` from the render
  // it runs in. The form's own `onSuccess` fires before that render, so a
  // navigation from there would still see the old value and show `from` first.
  // `formBusy` holds the effect back while the form is still working: sign-up
  // sets the user, then waits on the profile name before it raises
  // `pendingOnboarding`. The form stays busy after a success (the page leaves),
  // so `done` marks the attempt as finished; a sign-in that did not come from
  // the form (One Tap) leaves as soon as the user appears.
  const [formBusy, setFormBusy] = useState(false)
  const [done, setDone] = useState(false)
  const finished = useCallback(() => setDone(true), [])
  useEffect(() => {
    if (loading || !user || pendingOnboarding) return
    if (formBusy && !done) return
    navigate(from, { replace: true })
  }, [loading, user, pendingOnboarding, formBusy, done, navigate, from])

  // Log in and sign up are two URLs for one page; reset and sent are not. The
  // query carries the mode from here on, so a stale `state.signup` is cleared
  // (App.jsx reads it for the tab title and would otherwise disagree).
  const changeMode = useCallback((next) => {
    setMode(next)
    if (next !== 'login' && next !== 'signup') return
    const params = new URLSearchParams(location.search)
    if (next === 'signup') params.set('signup', '1'); else params.delete('signup')
    const search = params.toString()
    navigate({ search: search ? '?' + search : '' }, { replace: true, state: { ...location.state, signup: undefined } })
    document.title = next === 'signup' ? LOGIN_SIGNUP_TITLE : PAGE_TITLES['/login']
  }, [navigate, location.search, location.state])

  // A signed-in visitor is already on the way out (the effect above); say so
  // instead of flashing the form, and move focus to the line.
  const signedIn = !loading && !!user && (!formBusy || done)
  const statusRef = useRef(null)
  useEffect(() => { if (signedIn) statusRef.current?.focus() }, [signedIn])

  // With the on-screen keyboard open the strip would push the form off the
  // visible area, so it folds away while the visual viewport is much shorter
  // than the window.
  const [fold, setFold] = useState(false)
  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return undefined
    const check = () => setFold(window.innerHeight - vv.height >= 120)
    check()
    vv.addEventListener('resize', check)
    return () => vv.removeEventListener('resize', check)
  }, [])

  return (
    <main id="main" className="pf" data-mode={mode} data-fold={fold ? 'true' : 'false'} tabIndex={-1}>
      <header className="pf-bar">
        <Link to="/" className="pf-wordmark" aria-label={t('auth.wordmarkLabel')}>
          <BrandLockup />
        </Link>
        <Link to="/plans" className="pf-back">{t('auth.backToPlans')}</Link>
      </header>
      <div className="pf-strip"><ProWall variant="strip" /></div>
      <div className="pf-main">
        <div className="pf-col">
          {loading ? (
            <p className="pf-checking" role="status">{t('auth.checking')}</p>
          ) : signedIn ? (
            <p className="pf-status" role="status" tabIndex={-1} ref={statusRef}>{t('auth.loggedIn')}</p>
          ) : (
            <AuthForm mode={mode} onModeChange={changeMode} onSuccess={finished} onBusyChange={setFormBusy} headingLevel={1} showLoginSub showReport />
          )}
        </div>
      </div>
      <aside className="pf-wall"><ProWall /></aside>
    </main>
  )
}
