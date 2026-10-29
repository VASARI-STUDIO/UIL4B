import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useI18n } from '../contexts/I18nContext'
import { stashResumeTarget } from '../contexts/LoginPromptContext'
import { isLocalPath } from '../utils/localPath'
import { openFirebaseGate } from '../utils/firebaseAccess'
import { LOGIN_SIGNUP_TITLE, PAGE_TITLES } from '../data/routeMetaMap'
import useMediaQuery from '../hooks/useMediaQuery'
import { BrandLockup } from '../components/BrandLogo'
import AuthForm from '../components/auth/AuthForm'
import AuthWall from '../components/auth/AuthWall'
import '../styles/pages/auth.css'

// The full-screen /login page: the same form the sign-in modal shows, beside
// (or, on a phone, under) the wall of real exports. A real route so bookmarks,
// RequireAuth redirects and Checkout's `state.from` hand-off keep working. The
// nav opens the modal in place and never comes here.
export default function LoginPage() {
  const { user, loading, pendingOnboarding } = useAuth()
  const { t } = useI18n()
  const location = useLocation()
  const navigate = useNavigate()
  // A hand-built link can put anything in state, so only a path on this origin counts.
  // /login itself is not somewhere to be sent on to: it would leave a
  // signed-in visitor on this page.
  const sent = location.state?.from
  const from = isLocalPath(sent) && sent.split('?')[0].replace(/\/+$/, '') !== '/login' ? sent : '/home'
  // `/login?signup=1` (or `state.signup`) opens the sign-up form. The hero's
  // "Start building free" is a real link, so the intent has to survive a full
  // navigation.
  const wantsSignup = location.state?.signup === true
    || new URLSearchParams(location.search).get('signup') === '1'
  const [mode, setMode] = useState(wantsSignup ? 'signup' : 'login')
  const phone = useMediaQuery('(max-width:767px)')
  const wide = useMediaQuery('(min-width:1024px)')

  useEffect(() => { openFirebaseGate() }, [])

  // A brand-new sign-up is intercepted into /onboarding by AppInner, which
  // would discard where the visitor was headed; onboarding reads this stash.
  useEffect(() => { stashResumeTarget(from) }, [from])

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

  // Below 768 the sign-up form has to fit a 390x844 screen without scrolling,
  // so its band shrinks to a still strip.
  const stillBand = phone && mode === 'signup'

  return (
    <main id="main" className="auth-page" data-mode={mode} tabIndex={-1}>
      <header className="auth-page-top">
        <Link to="/" className="auth-wordmark" aria-label={t('auth.wordmarkLabel')}>
          <BrandLockup />
        </Link>
      </header>
      <section className="auth-page-form">
        {loading ? (
          <p className="auth-checking" role="status">{t('auth.checking')}</p>
        ) : (
          <AuthForm mode={mode} onModeChange={changeMode} onSuccess={finished} onBusyChange={setFormBusy} headingLevel={1} showLoginSub showReport />
        )}
      </section>
      <AuthWall variant={wide ? 'page' : 'band'} still={stillBand} />
    </main>
  )
}
