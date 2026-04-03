import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'

export default function Settings({ toast }) {
  const { user, userProfile, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()

  const exportData = () => {
    const data = {
      prompts: JSON.parse(localStorage.getItem('vs-prompts') || '[]'),
      theme: localStorage.getItem('vs-t'),
      exportDate: new Date().toISOString()
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'visari-studio-export.json'
    a.click()
    URL.revokeObjectURL(a.href)
    toast('Data exported')
  }

  const deleteAllData = () => {
    if (confirm('Are you sure? This will delete all locally saved data.')) {
      localStorage.removeItem('vs-prompts')
      toast('Local data cleared')
    }
  }

  return (
    <div className="sec">
      <div className="sec-h">
        <h1>Settings</h1>
        <p>Manage your preferences, account, and data.</p>
      </div>

      <div className="sub">
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Appearance</h2>
        <div className="card">
          <div className="toggle-row">
            <span>Theme: {theme === 'dark' ? 'Dark' : 'Light'}</span>
            <button className={`toggle-switch${theme === 'light' ? ' on' : ''}`} onClick={toggleTheme} aria-label="Toggle theme" />
          </div>
        </div>
      </div>

      {user && (
        <div className="sub">
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Account</h2>
          <div className="card" style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
              <div className="avatar-circle" style={{ width: 48, height: 48, fontSize: 18 }}>
                {userProfile?.photoURL ? (
                  <img src={userProfile.photoURL} alt="" referrerPolicy="no-referrer" />
                ) : (
                  <span>{(userProfile?.displayName || user.email || 'U')[0].toUpperCase()}</span>
                )}
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{userProfile?.displayName || 'User'}</div>
                <div style={{ fontSize: 12, color: 'var(--t2)' }}>{user.email}</div>
                <div style={{ fontSize: 10, color: 'var(--accent)', fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', marginTop: 2 }}>
                  {userProfile?.tier === 'pro' ? 'PRO PLAN' : 'FREE PLAN'}
                </div>
              </div>
            </div>
            <button className="btn" onClick={logout}>Sign Out</button>
          </div>
        </div>
      )}

      <div className="sub">
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Data Management</h2>
        <div className="card">
          <p style={{ fontSize: 13, color: 'var(--t1)', marginBottom: 14, lineHeight: 1.6 }}>
            Your data is stored locally in your browser. Export your data to back it up, or clear it to start fresh.
          </p>
          <div className="row" style={{ gap: 8 }}>
            <button className="btn" onClick={exportData}>Export My Data</button>
            <button className="btn" onClick={deleteAllData} style={{ color: '#ef4444', borderColor: '#ef4444' }}>Clear Local Data</button>
          </div>
        </div>
      </div>

      <div className="sub">
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Privacy & Legal</h2>
        <div className="card">
          <p style={{ fontSize: 13, color: 'var(--t1)', lineHeight: 1.6, marginBottom: 12 }}>
            Visari Studio complies with the Australian Privacy Act 1988 and Australian Privacy Principles (APPs).
            Your data is processed in Australia (Sydney region) where applicable.
          </p>
          <ul style={{ fontSize: 13, color: 'var(--t1)', lineHeight: 1.8, paddingLeft: 20, marginBottom: 14 }}>
            <li>We only collect data necessary for the service (APP 3)</li>
            <li>Your data is used solely for providing toolkit features (APP 6)</li>
            <li>You can access, correct, or delete your data at any time (APP 12 & 13)</li>
            <li>Data is protected with industry-standard security measures (APP 11)</li>
          </ul>
          <div className="row" style={{ gap: 8 }}>
            <a href="/privacy" className="btn" target="_blank">Privacy Policy</a>
            <a href="/terms" className="btn" target="_blank">Terms of Service</a>
          </div>
        </div>
      </div>
    </div>
  )
}
