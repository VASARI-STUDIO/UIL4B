import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { useI18n } from '../contexts/I18nContext'

const STORAGE_DISCLOSURE = [
  { key: 'vs-lang', purpose: 'Selected interface language', pii: 'no' },
  { key: 'vs-t', purpose: 'Theme preference (light/dark)', pii: 'no' },
  { key: 'vs-nav-open', purpose: 'Sidebar category state', pii: 'no' },
  { key: 'vs-pinned-tools', purpose: 'Tools you pinned for quick access', pii: 'no' },
  { key: 'vs-recent-tools', purpose: 'Recently used tools list', pii: 'no' },
  { key: 'vs-current-design', purpose: 'Active palette, fonts, type scale', pii: 'no' },
  { key: 'vs-projects', purpose: 'Saved design projects (per account)', pii: 'local' },
  { key: 'vs-prompts', purpose: 'Your AI prompt library', pii: 'local' },
  { key: 'vs-state-shades', purpose: 'Cached state colour shades', pii: 'no' },
  { key: 'vs-users', purpose: 'Account credentials (hashed password)', pii: 'yes' },
  { key: 'vs-session', purpose: 'Active session (no password stored)', pii: 'yes' },
  { key: 'vs-admin-unlocked', purpose: 'Admin panel access flag', pii: 'no' },
]

function EditField({ label, value, onSave, type = 'text', placeholder }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(value || '')
  const [error, setError] = useState('')

  const handleSave = () => {
    try {
      onSave(val)
      setEditing(false)
      setError('')
    } catch (e) {
      setError(e.message || 'Failed to save')
    }
  }

  if (!editing) {
    return (
      <div className="settings-row">
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="settings-row-label">{label}</div>
          <div className="settings-row-value">{value || <span style={{ color: 'var(--t3)' }}>—</span>}</div>
        </div>
        <button className="btn btn-s" onClick={() => { setVal(value || ''); setEditing(true) }}>Edit</button>
      </div>
    )
  }

  return (
    <div className="settings-row" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
      <div className="settings-row-label" style={{ marginBottom: 8 }}>{label}</div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          type={type}
          value={val}
          onChange={e => setVal(e.target.value)}
          placeholder={placeholder}
          style={{ flex: 1 }}
          autoFocus
        />
        <button className="btn btn-accent btn-s" onClick={handleSave}>Save</button>
        <button className="btn btn-s" onClick={() => { setEditing(false); setError('') }}>Cancel</button>
      </div>
      {error && <div style={{ fontSize: 12, color: 'var(--err)', marginTop: 6 }}>{error}</div>}
    </div>
  )
}

function PasswordChange({ onSave }) {
  const [open, setOpen] = useState(false)
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSave = () => {
    setError('')
    if (next.length < 6) { setError('New password must be at least 6 characters'); return }
    if (next !== confirm) { setError('Passwords do not match'); return }
    try {
      onSave(current, next)
      setSuccess(true)
      setCurrent(''); setNext(''); setConfirm('')
      setTimeout(() => { setSuccess(false); setOpen(false) }, 1500)
    } catch (e) {
      if (e.code === 'auth/wrong-password') setError('Current password is incorrect')
      else setError(e.message || 'Failed to update password')
    }
  }

  if (!open) {
    return (
      <div className="settings-row">
        <div style={{ flex: 1 }}>
          <div className="settings-row-label">Password</div>
          <div className="settings-row-value">••••••••</div>
        </div>
        <button className="btn btn-s" onClick={() => setOpen(true)}>Change</button>
      </div>
    )
  }

  return (
    <div className="settings-row" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
      <div className="settings-row-label" style={{ marginBottom: 10 }}>Change password</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <input type="password" placeholder="Current password" value={current} onChange={e => setCurrent(e.target.value)} autoFocus />
        <input type="password" placeholder="New password (min. 6 characters)" value={next} onChange={e => setNext(e.target.value)} />
        <input type="password" placeholder="Confirm new password" value={confirm} onChange={e => setConfirm(e.target.value)} />
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        <button className="btn btn-accent btn-s" onClick={handleSave}>Update password</button>
        <button className="btn btn-s" onClick={() => { setOpen(false); setError('') }}>Cancel</button>
      </div>
      {error && <div style={{ fontSize: 12, color: 'var(--err)', marginTop: 8 }}>{error}</div>}
      {success && <div style={{ fontSize: 12, color: 'var(--ok)', marginTop: 8 }}>Password updated successfully</div>}
    </div>
  )
}

function EmailEditField({ value, onSave }) {
  const [editing, setEditing] = useState(false)
  const [email, setEmail] = useState(value || '')
  const [password, setPassword] = useState('')
  const [step, setStep] = useState('email')
  const [error, setError] = useState('')

  const handleNext = () => {
    if (!email || email === value) { setError('Enter a new email address'); return }
    setStep('confirm')
    setError('')
  }

  const handleSave = () => {
    if (!password) { setError('Password is required'); return }
    try {
      onSave(email, password)
      setEditing(false)
      setStep('email')
      setPassword('')
      setError('')
    } catch (e) {
      if (e.code === 'auth/wrong-password') setError('Password is incorrect')
      else setError(e.message || 'Failed to update email')
    }
  }

  if (!editing) {
    return (
      <div className="settings-row">
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="settings-row-label">Email address</div>
          <div className="settings-row-value">{value || '—'}</div>
        </div>
        <button className="btn btn-s" onClick={() => { setEmail(value || ''); setEditing(true); setStep('email') }}>Edit</button>
      </div>
    )
  }

  return (
    <div className="settings-row" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
      <div className="settings-row-label" style={{ marginBottom: 8 }}>
        {step === 'email' ? 'Email address' : 'Confirm password'}
      </div>
      {step === 'email' ? (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Enter new email" style={{ flex: 1 }} autoFocus />
          <button className="btn btn-accent btn-s" onClick={handleNext}>Next</button>
          <button className="btn btn-s" onClick={() => { setEditing(false); setError('') }}>Cancel</button>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your password to confirm" style={{ flex: 1 }} autoFocus />
          <button className="btn btn-accent btn-s" onClick={handleSave}>Save</button>
          <button className="btn btn-s" onClick={() => { setStep('email'); setPassword(''); setError('') }}>Back</button>
        </div>
      )}
      {error && <div style={{ fontSize: 12, color: 'var(--err)', marginTop: 6 }}>{error}</div>}
    </div>
  )
}

function DeleteAccount({ onDelete }) {
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleDelete = () => {
    try {
      onDelete(password)
    } catch (e) {
      if (e.code === 'auth/wrong-password') setError('Password is incorrect')
      else setError(e.message || 'Failed to delete account')
    }
  }

  if (!open) {
    return (
      <button className="btn" onClick={() => setOpen(true)} style={{ color: 'var(--err)', borderColor: 'var(--err)' }}>
        Delete account
      </button>
    )
  }

  return (
    <div style={{ marginTop: 12 }}>
      <input type="password" placeholder="Enter your password to confirm" value={password} onChange={e => setPassword(e.target.value)} style={{ width: '100%', marginBottom: 10 }} />
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn btn-accent" onClick={handleDelete} style={{ background: 'var(--err)', color: '#fff', borderColor: 'var(--err)' }}>
          Permanently delete
        </button>
        <button className="btn btn-s" onClick={() => { setOpen(false); setError('') }}>Cancel</button>
      </div>
      {error && <div style={{ fontSize: 12, color: 'var(--err)', marginTop: 6 }}>{error}</div>}
    </div>
  )
}

function NavIcon({ id }) {
  const sw = 1.6
  const props = { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: sw, strokeLinecap: 'round', strokeLinejoin: 'round' }
  switch (id) {
    case 'subscription': return <svg {...props}><path d="M20 12V8H6a2 2 0 1 1 0-4h12v4"/><path d="M4 6v12a2 2 0 0 0 2 2h14v-4"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></svg>
    case 'appearance': return <svg {...props}><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>
    case 'language': return <svg {...props}><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
    case 'account': return <svg {...props}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
    case 'data': return <svg {...props}><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14a9 3 0 0 0 18 0V5"/><path d="M3 12a9 3 0 0 0 18 0"/></svg>
    case 'privacy': return <svg {...props}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
    default: return null
  }
}

export default function Settings({ toast }) {
  const { user, userProfile, logout, updateProfile, updateEmail, updatePassword, deleteAccount } = useAuth()
  const { theme, setTheme } = useTheme()
  const { t, lang, setLang, languages } = useI18n()
  const [active, setActive] = useState('subscription')
  const [confirmClear, setConfirmClear] = useState(false)

  const exportData = () => {
    const data = {}
    STORAGE_DISCLOSURE.forEach(({ key }) => {
      const raw = localStorage.getItem(key)
      if (raw) {
        try { data[key] = JSON.parse(raw) } catch { data[key] = raw }
      }
    })
    data.exportedAt = new Date().toISOString()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `uil4b-export-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(a.href)
    toast(t('settings.dataExported') || 'Data exported')
  }

  const deleteAllData = () => {
    ['vs-prompts', 'vs-pinned-tools', 'vs-recent-tools', 'vs-current-design', 'vs-state-shades', 'vs-nav-open'].forEach(k => localStorage.removeItem(k))
    setConfirmClear(false)
    toast(t('settings.dataCleared') || 'Local data cleared')
  }

  const sections = [
    { id: 'subscription', label: t('settings.subscription') || 'Subscription' },
    { id: 'appearance', label: t('settings.appearance') || 'Appearance' },
    { id: 'language', label: t('settings.language') || 'Language' },
    ...(user ? [{ id: 'account', label: t('settings.account') || 'Account' }] : []),
    { id: 'data', label: t('settings.dataManagement') || 'Data' },
    { id: 'privacy', label: t('settings.privacyLegal') || 'Privacy' },
  ]

  return (
    <div className="sec">
      <div className="sec-h">
        <div className="sec-h-eyebrow">Settings</div>
        <h1>Make it <em>yours</em>.</h1>
        <p>Customise appearance, manage your account, and control how your data is stored.</p>
      </div>

      <div className="settings-grid">
        <nav className="settings-nav">
          {sections.map(s => (
            <button
              key={s.id}
              className={`settings-nav-item${active === s.id ? ' active' : ''}`}
              onClick={() => {
                setActive(s.id)
                document.getElementById(`set-${s.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }}
            >
              <NavIcon id={s.id} />
              <span>{s.label}</span>
            </button>
          ))}
        </nav>

        <div className="settings-content">

          {/* Subscription */}
          <section id="set-subscription" className="settings-section">
            <div className="settings-section-h">
              <h2>Subscription</h2>
              <p>Choose the plan that suits how you work.</p>
            </div>
            <div className="plan-grid">
              {[
                {
                  id: 'free',
                  name: t('settings.plans.free.name') || 'Free',
                  desc: 'Everything you need to get started.',
                  price: t('settings.plans.free.price') || '$0',
                  period: 'forever',
                  features: [
                    t('settings.plans.free.f1'),
                    t('settings.plans.free.f2'),
                    t('settings.plans.free.f3'),
                    t('settings.plans.free.f4'),
                  ],
                },
                {
                  id: 'pro',
                  name: t('settings.plans.pro.name') || 'Pro',
                  desc: 'Power tools for professional designers.',
                  price: t('settings.plans.pro.price') || '$9',
                  period: t('settings.plans.pro.period') || '/month',
                  features: [
                    t('settings.plans.pro.f1'),
                    t('settings.plans.pro.f2'),
                    t('settings.plans.pro.f3'),
                    t('settings.plans.pro.f4'),
                    t('settings.plans.pro.f5'),
                  ],
                  featured: true,
                },
              ].map(plan => {
                const isCurrent = (userProfile?.tier || 'free') === plan.id
                return (
                  <div key={plan.id} className={`plan-card${plan.featured ? ' featured' : ''}`}>
                    {plan.featured && <span className="plan-card-badge">Recommended</span>}
                    <div className="plan-card-name">{plan.name}</div>
                    <div className="plan-card-desc">{plan.desc}</div>
                    <div className="plan-card-price">
                      <span className="plan-card-price-num">{plan.price}</span>
                      {plan.period && <span className="plan-card-price-period">{plan.period}</span>}
                    </div>
                    <ul className="plan-card-features">
                      {plan.features.filter(Boolean).map((f, i) => (
                        <li key={i}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                          {f}
                        </li>
                      ))}
                    </ul>
                    {isCurrent ? (
                      <div className="plan-card-current">Current plan</div>
                    ) : (
                      <button
                        className={plan.featured ? 'btn btn-accent' : 'btn'}
                        style={{ width: '100%', justifyContent: 'center' }}
                        onClick={() => {
                          if (user) { updateProfile({ tier: plan.id }); toast(`Switched to ${plan.name}`) }
                          else toast('Sign in to change plan')
                        }}
                      >
                        Switch to {plan.name}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </section>

          {/* Appearance */}
          <section id="set-appearance" className="settings-section">
            <div className="settings-section-h">
              <h2>Appearance</h2>
              <p>Switch between light and dark themes.</p>
            </div>
            <div className="settings-card">
              <div className="settings-card-body">
                <div className="settings-row">
                  <div>
                    <div className="settings-row-label">Theme</div>
                    <div className="settings-row-meta">Currently using {theme}</div>
                  </div>
                  <div className="theme-pill">
                    <button className={`theme-pill-opt${theme === 'light' ? ' active' : ''}`} onClick={() => setTheme && setTheme('light')}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>
                      Light
                    </button>
                    <button className={`theme-pill-opt${theme === 'dark' ? ' active' : ''}`} onClick={() => setTheme && setTheme('dark')}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
                      Dark
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Language */}
          <section id="set-language" className="settings-section">
            <div className="settings-section-h">
              <h2>Language</h2>
              <p>Choose the interface language. Affects all menus, labels, and copy.</p>
            </div>
            <div className="settings-card">
              <div className="settings-card-body" style={{ padding: '16px' }}>
                <div className="lang-grid">
                  {languages.map(l => (
                    <button
                      key={l.code}
                      className={`lang-tile${lang === l.code ? ' active' : ''}`}
                      onClick={() => { setLang(l.code); toast(`Language: ${l.native}`) }}
                    >
                      <span className="lang-flag">{l.flag}</span>
                      <div className="lang-tile-info">
                        <span className="lang-tile-label">{l.native}</span>
                        <span className="lang-tile-code">{l.code} · {l.region}</span>
                      </div>
                      {lang === l.code && (
                        <svg className="lang-tile-check" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Account */}
          {user && (
            <section id="set-account" className="settings-section">
              <div className="settings-section-h">
                <h2>Account</h2>
                <p>Manage your profile, email, and password.</p>
              </div>
              <div className="settings-card">
                <div className="settings-profile">
                  <div className="settings-profile-avatar">
                    {userProfile?.photoURL ? (
                      <img src={userProfile.photoURL} alt="" referrerPolicy="no-referrer" />
                    ) : (
                      <span>{(userProfile?.displayName || user.email || 'U')[0].toUpperCase()}</span>
                    )}
                  </div>
                  <div className="settings-profile-info">
                    <div className="settings-profile-name">{userProfile?.displayName || 'Welcome'}</div>
                    <div className="settings-profile-email">{user.email}</div>
                    <div className={`settings-profile-tier${userProfile?.tier === 'pro' ? ' pro' : ''}`}>
                      {userProfile?.tier === 'pro' ? '✦ Pro' : 'Free plan'}
                    </div>
                  </div>
                  <button className="btn btn-s" onClick={logout}>Sign out</button>
                </div>
                <div className="settings-card-body">
                  <EditField label="Display name" value={userProfile?.displayName} onSave={(v) => { updateProfile({ displayName: v }); toast('Display name updated') }} placeholder="Enter your display name" />
                  <EmailEditField value={user.email} onSave={(email, pw) => { updateEmail(email, pw); toast('Email updated') }} />
                  <EditField label="Location" value={userProfile?.location} onSave={(v) => { updateProfile({ location: v }); toast('Location updated') }} placeholder="e.g. Melbourne, Australia" />
                  <EditField label="Company / studio" value={userProfile?.company} onSave={(v) => { updateProfile({ company: v }); toast('Company updated') }} placeholder="e.g. Acme Design" />
                  <EditField label="Website" value={userProfile?.website} type="url" onSave={(v) => { updateProfile({ website: v }); toast('Website updated') }} placeholder="https://yoursite.com" />
                  <EditField label="Bio" value={userProfile?.bio} onSave={(v) => { updateProfile({ bio: v }); toast('Bio updated') }} placeholder="A short bio about yourself" />
                  <PasswordChange onSave={(current, next) => updatePassword(current, next)} />

                  <div className="danger-zone">
                    <div className="danger-zone-h">Danger zone</div>
                    <p>Permanently delete your account and all associated data. This cannot be undone.</p>
                    <DeleteAccount onDelete={(pw) => deleteAccount(pw)} />
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Data */}
          <section id="set-data" className="settings-section">
            <div className="settings-section-h">
              <h2>Your data</h2>
              <p>Everything UIL4B stores lives in your browser. You own it.</p>
            </div>
            <div className="settings-card">
              <div className="settings-card-h">
                <div>
                  <h3>Stored on this device</h3>
                  <p>{STORAGE_DISCLOSURE.length} items in browser localStorage</p>
                </div>
                <NavLink to="/privacy" className="btn btn-s">Full disclosure</NavLink>
              </div>
              <div className="settings-card-body">
                <p style={{ fontSize: 13, color: 'var(--t1)', lineHeight: 1.65, padding: '12px 0' }}>
                  We don't run a backend, don't track you, and don't sell your data. All preferences, projects, and account info live only in this browser unless you export them.
                </p>
                <div className="settings-row" style={{ paddingTop: 16, paddingBottom: 16 }}>
                  <div>
                    <div className="settings-row-label">Export</div>
                    <div className="settings-row-meta">Download a JSON copy of every key stored in this browser</div>
                  </div>
                  <button className="btn btn-accent btn-s" onClick={exportData}>Export JSON</button>
                </div>
                <div className="settings-row">
                  <div>
                    <div className="settings-row-label">Clear local data</div>
                    <div className="settings-row-meta">Remove pinned tools, prompts, current design, and recents. Account data preserved.</div>
                  </div>
                  {confirmClear ? (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-s" onClick={deleteAllData} style={{ color: '#fff', background: 'var(--err)', borderColor: 'var(--err)' }}>Confirm clear</button>
                      <button className="btn btn-s" onClick={() => setConfirmClear(false)}>Cancel</button>
                    </div>
                  ) : (
                    <button className="btn btn-s" onClick={() => setConfirmClear(true)} style={{ color: 'var(--err)', borderColor: 'var(--err)' }}>Clear data</button>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Privacy */}
          <section id="set-privacy" className="settings-section">
            <div className="settings-section-h">
              <h2>Privacy &amp; legal</h2>
              <p>How we handle (and don't handle) your information.</p>
            </div>
            <div className="settings-card">
              <div className="settings-card-body">
                <ul style={{ listStyle: 'none', padding: '14px 0', margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[
                    'No analytics, no third-party trackers, no cookies for tracking.',
                    'No backend — your data stays in your browser unless you export it.',
                    'Account passwords are hashed before being stored locally.',
                    'You can export or delete your data at any time, with no requests.',
                  ].map((line, i) => (
                    <li key={i} style={{ display: 'flex', gap: 10, fontSize: 13.5, color: 'var(--t1)', lineHeight: 1.55 }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 2 }}>
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      {line}
                    </li>
                  ))}
                </ul>
                <div style={{ display: 'flex', gap: 8, paddingTop: 14, borderTop: '1px solid var(--border)', marginTop: 6 }}>
                  <NavLink to="/privacy" className="btn">Privacy policy</NavLink>
                  <NavLink to="/terms" className="btn">Terms of service</NavLink>
                </div>
              </div>
            </div>
          </section>

        </div>
      </div>
    </div>
  )
}
