import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { useI18n } from '../contexts/I18nContext'

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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--t2)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 2 }}>{label}</div>
          <div style={{ fontSize: 14, color: 'var(--t0)' }}>{value || '—'}</div>
        </div>
        <button className="btn btn-s" onClick={() => { setVal(value || ''); setEditing(true) }}>Edit</button>
      </div>
    )
  }

  return (
    <div style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--t2)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 6 }}>{label}</div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          type={type}
          value={val}
          onChange={e => setVal(e.target.value)}
          placeholder={placeholder}
          style={{ flex: 1, padding: '8px 12px', borderRadius: 'var(--radius-s)', border: '1px solid var(--border)', background: 'var(--inp)', color: 'var(--t0)', fontFamily: 'var(--font)', fontSize: 13 }}
          autoFocus
        />
        <button className="btn btn-s" onClick={handleSave}>Save</button>
        <button className="btn btn-s" onClick={() => { setEditing(false); setError('') }}>Cancel</button>
      </div>
      {error && <div style={{ fontSize: 12, color: 'var(--err)', marginTop: 4 }}>{error}</div>}
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--t2)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 2 }}>Password</div>
          <div style={{ fontSize: 14, color: 'var(--t0)' }}>••••••••</div>
        </div>
        <button className="btn btn-s" onClick={() => setOpen(true)}>Change</button>
      </div>
    )
  }

  const inputStyle = { width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-s)', border: '1px solid var(--border)', background: 'var(--inp)', color: 'var(--t0)', fontFamily: 'var(--font)', fontSize: 13, marginBottom: 8 }

  return (
    <div style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--t2)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 8 }}>Change Password</div>
      <input type="password" placeholder="Current password" value={current} onChange={e => setCurrent(e.target.value)} style={inputStyle} autoFocus />
      <input type="password" placeholder="New password (min. 6 characters)" value={next} onChange={e => setNext(e.target.value)} style={inputStyle} />
      <input type="password" placeholder="Confirm new password" value={confirm} onChange={e => setConfirm(e.target.value)} style={inputStyle} />
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn btn-s" onClick={handleSave}>Update Password</button>
        <button className="btn btn-s" onClick={() => { setOpen(false); setError('') }}>Cancel</button>
      </div>
      {error && <div style={{ fontSize: 12, color: 'var(--err)', marginTop: 6 }}>{error}</div>}
      {success && <div style={{ fontSize: 12, color: 'var(--ok)', marginTop: 6 }}>Password updated successfully</div>}
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--t2)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 2 }}>Email Address</div>
          <div style={{ fontSize: 14, color: 'var(--t0)' }}>{value || '—'}</div>
        </div>
        <button className="btn btn-s" onClick={() => { setEmail(value || ''); setEditing(true); setStep('email') }}>Edit</button>
      </div>
    )
  }

  return (
    <div style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--t2)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 6 }}>
        {step === 'email' ? 'Email Address' : 'Confirm Password'}
      </div>
      {step === 'email' ? (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="Enter new email"
            style={{ flex: 1, padding: '8px 12px', borderRadius: 'var(--radius-s)', border: '1px solid var(--border)', background: 'var(--inp)', color: 'var(--t0)', fontFamily: 'var(--font)', fontSize: 13 }}
            autoFocus
          />
          <button className="btn btn-s" onClick={handleNext}>Next</button>
          <button className="btn btn-s" onClick={() => { setEditing(false); setError('') }}>Cancel</button>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Enter your password to confirm"
            style={{ flex: 1, padding: '8px 12px', borderRadius: 'var(--radius-s)', border: '1px solid var(--border)', background: 'var(--inp)', color: 'var(--t0)', fontFamily: 'var(--font)', fontSize: 13 }}
            autoFocus
          />
          <button className="btn btn-s" onClick={handleSave}>Save</button>
          <button className="btn btn-s" onClick={() => { setStep('email'); setPassword(''); setError('') }}>Back</button>
        </div>
      )}
      {error && <div style={{ fontSize: 12, color: 'var(--err)', marginTop: 4 }}>{error}</div>}
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
      <button className="btn" onClick={() => setOpen(true)} style={{ color: 'var(--err)', borderColor: 'var(--err)', marginTop: 8 }}>
        Delete Account
      </button>
    )
  }

  return (
    <div style={{ marginTop: 8, padding: 16, borderRadius: 'var(--radius-s)', border: '1px solid var(--err)', background: 'color-mix(in srgb, var(--err) 4%, transparent)' }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--err)', marginBottom: 8 }}>Delete Account</div>
      <p style={{ fontSize: 13, color: 'var(--t1)', marginBottom: 12, lineHeight: 1.6 }}>
        This action is permanent and cannot be undone. All your data, preferences, and saved content will be removed.
      </p>
      <input
        type="password"
        placeholder="Enter your password to confirm"
        value={password}
        onChange={e => setPassword(e.target.value)}
        style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-s)', border: '1px solid var(--border)', background: 'var(--inp)', color: 'var(--t0)', fontFamily: 'var(--font)', fontSize: 13, marginBottom: 10 }}
      />
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn" onClick={handleDelete} style={{ color: '#fff', background: 'var(--err)', borderColor: 'var(--err)' }}>
          Permanently Delete
        </button>
        <button className="btn btn-s" onClick={() => { setOpen(false); setError('') }}>Cancel</button>
      </div>
      {error && <div style={{ fontSize: 12, color: 'var(--err)', marginTop: 6 }}>{error}</div>}
    </div>
  )
}

export default function Settings({ toast }) {
  const { user, userProfile, logout, updateProfile, updateEmail, updatePassword, deleteAccount } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const { t, lang, setLang, languages } = useI18n()
  const [confirmClear, setConfirmClear] = useState(false)

  const exportData = () => {
    const data = {
      prompts: JSON.parse(localStorage.getItem('vs-prompts') || '[]'),
      theme: localStorage.getItem('vs-t'),
      exportDate: new Date().toISOString()
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'uil4b-export.json'
    a.click()
    URL.revokeObjectURL(a.href)
    toast(t('settings.dataExported'))
  }

  const deleteAllData = () => {
    localStorage.removeItem('vs-prompts')
    setConfirmClear(false)
    toast(t('settings.dataCleared'))
  }

  return (
    <div className="sec">
      <div className="sec-h">
        <h1>{t('settings.title')}</h1>
        <p>{t('settings.subtitle')}</p>
      </div>

      {/* Subscription Plans */}
      <div className="sub">
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>{t('settings.subscription')}</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(280px, 100%), 1fr))', gap: 14 }}>
          {[
            {
              id: 'free',
              name: t('settings.plans.free.name'),
              price: t('settings.plans.free.price'),
              features: [
                t('settings.plans.free.f1'),
                t('settings.plans.free.f2'),
                t('settings.plans.free.f3'),
                t('settings.plans.free.f4'),
              ],
            },
            {
              id: 'pro',
              name: t('settings.plans.pro.name'),
              price: t('settings.plans.pro.price'),
              period: t('settings.plans.pro.period'),
              features: [
                t('settings.plans.pro.f1'),
                t('settings.plans.pro.f2'),
                t('settings.plans.pro.f3'),
                t('settings.plans.pro.f4'),
                t('settings.plans.pro.f5'),
              ],
              accent: true,
            },
          ].map(plan => {
            const isCurrent = (userProfile?.tier || 'free') === plan.id
            return (
              <div key={plan.id} className="card" style={{
                padding: 0, overflow: 'hidden',
                border: plan.accent ? '2px solid var(--accent)' : undefined,
              }}>
                <div style={{ padding: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <div style={{ fontSize: 18, fontWeight: 700 }}>{plan.name}</div>
                    {plan.accent && (
                      <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--accent)', padding: '3px 8px', background: 'var(--accent-bg)', borderRadius: 'var(--radius-s)' }}>
                        {t('settings.plans.recommended')}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 16 }}>
                    <span style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-.02em' }}>{plan.price}</span>
                    {plan.period && <span style={{ fontSize: 13, color: 'var(--t2)' }}>{plan.period}</span>}
                  </div>
                  <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {plan.features.map((f, i) => (
                      <li key={i} style={{ fontSize: 13, color: 'var(--t1)', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={plan.accent ? 'var(--accent)' : 'var(--ok)'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        {f}
                      </li>
                    ))}
                  </ul>
                  {isCurrent ? (
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)', textAlign: 'center', padding: '10px 0', border: '1px solid var(--accent)', borderRadius: 'var(--radius-s)' }}>
                      {t('settings.plans.currentPlan')}
                    </div>
                  ) : (
                    <button className={plan.accent ? 'btn btn-accent' : 'btn'} style={{ width: '100%', justifyContent: 'center' }} onClick={() => {
                      if (user) { updateProfile({ tier: plan.id }); toast(t('settings.plans.switched', { plan: plan.name })) }
                      else toast(t('settings.plans.signInRequired'))
                    }}>
                      {t('settings.plans.switchTo', { plan: plan.name })}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Appearance */}
      <div className="sub">
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>{t('settings.appearance')}</h2>
        <div className="card">
          <div className="toggle-row">
            <span>{t('settings.theme')}: {theme === 'dark' ? t('settings.dark') : t('settings.light')}</span>
            <button className={`toggle-switch${theme === 'light' ? ' on' : ''}`} onClick={toggleTheme} aria-label={t('settings.theme')} />
          </div>
        </div>
      </div>

      {/* Language */}
      <div className="sub">
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>{t('settings.language')}</h2>
        <div className="card">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 8 }}>
            {languages.map(l => (
              <button
                key={l.code}
                className={`pt-t${lang === l.code ? ' on' : ''}`}
                onClick={() => setLang(l.code)}
                style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-start' }}
              >
                <span>{l.flag}</span> {l.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Account Management */}
      {user && (
        <div className="sub">
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>{t('settings.account')}</h2>
          <div className="card">
            {/* Profile header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid var(--border)' }}>
              <div className="avatar-circle" style={{ width: 56, height: 56, fontSize: 20 }}>
                {userProfile?.photoURL ? (
                  <img src={userProfile.photoURL} alt="" referrerPolicy="no-referrer" />
                ) : (
                  <span>{(userProfile?.displayName || user.email || 'U')[0].toUpperCase()}</span>
                )}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{userProfile?.displayName || 'User'}</div>
                <div style={{ fontSize: 12, color: 'var(--t2)', marginTop: 2 }}>{user.email}</div>
                <div style={{ fontSize: 10, color: 'var(--accent)', fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', marginTop: 4 }}>
                  {userProfile?.tier === 'pro' ? t('nav.proPlan') : t('nav.freePlan')}
                </div>
              </div>
              <button className="btn btn-s" onClick={logout}>{t('common.signOut')}</button>
            </div>

            {/* Profile fields */}
            <EditField
              label="Display Name"
              value={userProfile?.displayName}
              onSave={(v) => { updateProfile({ displayName: v }); toast('Display name updated') }}
              placeholder="Enter your display name"
            />

            <EmailEditField
              value={user.email}
              onSave={(email, pw) => { updateEmail(email, pw); toast('Email updated') }}
            />

            <EditField
              label="Location"
              value={userProfile?.location}
              onSave={(v) => { updateProfile({ location: v }); toast('Location updated') }}
              placeholder="e.g. Melbourne, Australia"
            />

            <EditField
              label="Company / Studio"
              value={userProfile?.company}
              onSave={(v) => { updateProfile({ company: v }); toast('Company updated') }}
              placeholder="e.g. Acme Design"
            />

            <EditField
              label="Website"
              value={userProfile?.website}
              type="url"
              onSave={(v) => { updateProfile({ website: v }); toast('Website updated') }}
              placeholder="https://yoursite.com"
            />

            <EditField
              label="Bio"
              value={userProfile?.bio}
              onSave={(v) => { updateProfile({ bio: v }); toast('Bio updated') }}
              placeholder="A short bio about yourself"
            />

            <PasswordChange onSave={(current, next) => updatePassword(current, next)} />

            {/* Danger zone */}
            <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--t2)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 4 }}>Danger Zone</div>
              <DeleteAccount onDelete={(pw) => deleteAccount(pw)} />
            </div>
          </div>
        </div>
      )}

      {/* Data Management */}
      <div className="sub">
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>{t('settings.dataManagement')}</h2>
        <div className="card">
          <p style={{ fontSize: 13, color: 'var(--t1)', marginBottom: 14, lineHeight: 1.6 }}>
            {t('settings.dataInfo')}
          </p>
          <div className="row" style={{ gap: 8 }}>
            <button className="btn" onClick={exportData}>{t('settings.exportData')}</button>
            {confirmClear ? (
              <>
                <button className="btn" onClick={deleteAllData} style={{ color: '#fff', background: 'var(--err)', borderColor: 'var(--err)' }}>{t('settings.confirmClear')}</button>
                <button className="btn" onClick={() => setConfirmClear(false)}>{t('common.cancel')}</button>
              </>
            ) : (
              <button className="btn" onClick={() => setConfirmClear(true)} style={{ color: 'var(--err)', borderColor: 'var(--err)' }}>{t('settings.clearData')}</button>
            )}
          </div>
        </div>
      </div>

      {/* Privacy & Legal */}
      <div className="sub">
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>{t('settings.privacyLegal')}</h2>
        <div className="card">
          <p style={{ fontSize: 13, color: 'var(--t1)', lineHeight: 1.6, marginBottom: 12 }}>
            {t('settings.privacyInfo')}
          </p>
          <ul style={{ fontSize: 13, color: 'var(--t1)', lineHeight: 1.8, paddingLeft: 20, marginBottom: 14 }}>
            <li>{t('settings.privacyPoints.collect')}</li>
            <li>{t('settings.privacyPoints.use')}</li>
            <li>{t('settings.privacyPoints.access')}</li>
            <li>{t('settings.privacyPoints.security')}</li>
          </ul>
          <div className="row" style={{ gap: 8 }}>
            <a href="/privacy" className="btn" target="_blank">{t('settings.privacyPolicy')}</a>
            <a href="/terms" className="btn" target="_blank">{t('settings.termsOfService')}</a>
          </div>
        </div>
      </div>
    </div>
  )
}
