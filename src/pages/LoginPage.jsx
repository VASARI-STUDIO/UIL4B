import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useI18n } from '../contexts/I18nContext'
import { stashResumeTarget } from '../contexts/LoginPromptContext'
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
  const from = location.state?.from || '/home'
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
  // there, and a second navigation here would win the race and undo it.
  const pendingRef = useRef(pendingOnboarding)
  useEffect(() => { pendingRef.current = pendingOnboarding }, [pendingOnboarding])
  const leave = useCallback(() => {
    if (!pendingRef.current) navigate(from, { replace: true })
  }, [navigate, from])
  useEffect(() => {
    if (!loading && user) leave()
  }, [loading, user, leave])

  // Log in and sign up are two URLs for one page; reset and sent are not.
  const changeMode = useCallback((next) => {
    setMode(next)
    if (next !== 'login' && next !== 'signup') return
    const params = new URLSearchParams(location.search)
    if (next === 'signup') params.set('signup', '1'); else params.delete('signup')
    const search = params.toString()
    navigate({ search: search ? '?' + search : '' }, { replace: true, state: location.state })
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
          <AuthForm mode={mode} onModeChange={changeMode} onSuccess={leave} headingLevel={1} />
        )}
      </section>
      <AuthWall variant={wide ? 'page' : 'band'} still={stillBand} />
    </main>
  )
}
