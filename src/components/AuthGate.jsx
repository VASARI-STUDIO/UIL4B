import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import AuthForm from './auth/AuthForm'

// A tool that needs an account shows this in place of its body when signed out.
// The form is the shared AuthForm, so the words, the error messages and the
// sign-up path match the log-in page and the log-in popup.
export default function AuthGate({ children, featureLabel }) {
  const { user, loading } = useAuth()
  const [mode, setMode] = useState('login')

  if (user) return children

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div className="fg-loader" /></div>

  return (
    <section className="auth-gate-prompt" aria-labelledby="auth-gate-title">
      <p className="auth-gate-text">Log in to {featureLabel || 'use this feature'}</p>
      <div className="auth-gate-form">
        <AuthForm mode={mode} onModeChange={setMode} headingLevel={2} headingId="auth-gate-title" />
      </div>
    </section>
  )
}
