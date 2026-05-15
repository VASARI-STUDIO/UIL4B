import { useState, useEffect, useCallback } from 'react'
import { getAnalyticsSummary, getFeedback, updateFeedbackStatus, deleteFeedback } from '../utils/analytics'

const ADMIN_CODE = 'uil4b-dev-2026'
const ADMIN_KEY = 'vs-admin-unlocked'

function StatCard({ value, label, sub }) {
  return (
    <div style={{ padding: '18px 20px', borderRadius: 'var(--radius)', background: 'var(--bg-1)', border: '1px solid var(--border)', flex: '1 1 160px', minWidth: 140 }}>
      <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--accent)', letterSpacing: '-.02em', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--t0)', marginTop: 8 }}>{label}</div>
      {sub && <div style={{ fontSize: 10, color: 'var(--t2)', marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

function DataTable({ headers, rows }) {
  return (
    <div style={{ borderRadius: 'var(--radius-s)', border: '1px solid var(--border)', overflow: 'hidden' }}>
      <div style={{ display: 'grid', gridTemplateColumns: headers.map(h => h.width || '1fr').join(' '), background: 'var(--bg-2)', borderBottom: '1px solid var(--border)', padding: '8px 14px', gap: 8 }}>
        {headers.map(h => (
          <div key={h.key} style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--t2)' }}>{h.label}</div>
        ))}
      </div>
      {rows.length === 0 && (
        <div style={{ padding: '20px 14px', fontSize: 12, color: 'var(--t2)', textAlign: 'center' }}>No data yet</div>
      )}
      {rows.map((row, i) => (
        <div key={i} style={{ display: 'grid', gridTemplateColumns: headers.map(h => h.width || '1fr').join(' '), padding: '8px 14px', gap: 8, borderBottom: i < rows.length - 1 ? '1px solid var(--border)' : 'none', background: i % 2 === 0 ? 'transparent' : 'var(--bg-1)', fontSize: 12, alignItems: 'center' }}>
          {headers.map(h => (
            <div key={h.key} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: h.mono ? 'var(--t1)' : 'var(--t0)', fontFamily: h.mono ? 'var(--mono)' : 'inherit', fontWeight: h.bold ? 600 : 400 }}>
              {typeof row[h.key] === 'function' ? row[h.key]() : row[h.key]}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 36 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <div style={{ width: 24, height: 2, background: 'var(--accent)', borderRadius: 1 }} />
        <h2 style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-.02em' }}>{title}</h2>
      </div>
      {children}
    </div>
  )
}

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'pages', label: 'Pages' },
  { id: 'users', label: 'Users' },
  { id: 'feedback', label: 'Feedback' },
]

export default function Admin({ toast }) {
  const [unlocked, setUnlocked] = useState(() => localStorage.getItem(ADMIN_KEY) === 'true')
  const [code, setCode] = useState('')
  const [tab, setTab] = useState('overview')
  const [data, setData] = useState(null)
  const [feedback, setFeedback] = useState([])

  const refresh = useCallback(() => {
    setData(getAnalyticsSummary())
    setFeedback(getFeedback())
  }, [])

  useEffect(() => {
    if (unlocked) refresh()
  }, [unlocked, refresh])

  const handleUnlock = (e) => {
    e.preventDefault()
    if (code.trim() === ADMIN_CODE) {
      localStorage.setItem(ADMIN_KEY, 'true')
      setUnlocked(true)
      toast('Admin access granted')
    } else {
      toast('Invalid code')
    }
    setCode('')
  }

  const handleLock = () => {
    localStorage.removeItem(ADMIN_KEY)
    setUnlocked(false)
    toast('Admin access revoked')
  }

  const toggleFeedbackStatus = (id) => {
    const item = feedback.find(f => f.id === id)
    const newStatus = item?.status === 'done' ? 'new' : 'done'
    const updated = updateFeedbackStatus(id, newStatus)
    setFeedback(updated)
  }

  const removeFeedback = (id) => {
    const updated = deleteFeedback(id)
    setFeedback(updated)
    toast('Feedback removed')
  }

  const fmtDuration = (s) => {
    if (s < 60) return `${s}s`
    return `${Math.floor(s / 60)}m ${s % 60}s`
  }

  const fmtDate = (iso) => {
    if (!iso) return '—'
    return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
  }

  if (!unlocked) {
    return (
      <div className="sec">
        <div style={{ maxWidth: 400, margin: '80px auto', textAlign: 'center' }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 16, fontFamily: 'var(--mono)' }}>Admin Access</div>
          <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-.03em', marginBottom: 8 }}>Developer Dashboard</h1>
          <p style={{ fontSize: 14, color: 'var(--t1)', marginBottom: 24 }}>Enter the admin code to access analytics and management tools.</p>
          <form onSubmit={handleUnlock} style={{ display: 'flex', gap: 8 }}>
            <input
              type="password"
              value={code}
              onChange={e => setCode(e.target.value)}
              placeholder="Enter admin code"
              style={{ flex: 1, textAlign: 'center', fontSize: 14, letterSpacing: '.04em' }}
              autoFocus
            />
            <button className="btn btn-accent" type="submit">Unlock</button>
          </form>
        </div>
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="sec">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--ok)', boxShadow: '0 0 8px var(--ok)' }} />
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--ok)', fontFamily: 'var(--mono)' }}>Admin Mode</span>
          </div>
          <h1 style={{ fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 800, letterSpacing: '-.03em' }}>Dashboard</h1>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-s" onClick={refresh}>Refresh</button>
          <button className="btn btn-s" onClick={handleLock} style={{ color: 'var(--err)' }}>Lock</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, flexWrap: 'wrap' }}>
        {TABS.map(t => (
          <button
            key={t.id}
            className={`pt-t${tab === t.id ? ' on' : ''}`}
            onClick={() => setTab(t.id)}
            style={{ padding: '7px 14px', fontSize: 12, fontWeight: 600 }}
          >
            {t.label}
            {t.id === 'feedback' && feedback.filter(f => f.status === 'new').length > 0 && (
              <span style={{ marginLeft: 6, background: 'var(--accent)', color: '#fff', borderRadius: 10, padding: '1px 7px', fontSize: 10, fontWeight: 700 }}>
                {feedback.filter(f => f.status === 'new').length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* OVERVIEW TAB */}
      {tab === 'overview' && (
        <>
          <Section title="Key Metrics">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
              <StatCard value={data.totalViews} label="Total Page Views" sub="All time" />
              <StatCard value={data.viewsToday} label="Views Today" />
              <StatCard value={data.viewsWeek} label="Views This Week" />
              <StatCard value={data.totalSessions} label="Sessions" sub="All time" />
              <StatCard value={`${data.bounceRate}%`} label="Bounce Rate" sub="Single-page sessions" />
              <StatCard value={fmtDuration(data.avgDuration)} label="Avg Session" sub="Duration" />
            </div>
          </Section>

          <Section title="Quick Summary">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(300px,100%), 1fr))', gap: 14 }}>
              <div className="card" style={{ padding: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 10 }}>Registered Users</div>
                <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--accent)' }}>{data.users.length}</div>
                <div style={{ fontSize: 11, color: 'var(--t2)', marginTop: 4 }}>
                  {data.users.filter(u => u.tier === 'pro').length} Pro · {data.users.filter(u => u.tier !== 'pro').length} Free
                </div>
              </div>
              <div className="card" style={{ padding: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 10 }}>Feedback</div>
                <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--accent)' }}>{feedback.length}</div>
                <div style={{ fontSize: 11, color: 'var(--t2)', marginTop: 4 }}>
                  {feedback.filter(f => f.status === 'new').length} new · {feedback.filter(f => f.status === 'done').length} resolved
                </div>
              </div>
            </div>
          </Section>
        </>
      )}

      {/* PAGES TAB */}
      {tab === 'pages' && (
        <>
          <Section title="Most Visited Pages">
            <DataTable
              headers={[
                { key: 'page', label: 'Page', mono: true, bold: true },
                { key: 'views', label: 'Views', width: '80px' },
                { key: 'pct', label: '% of Total', width: '100px' },
              ]}
              rows={data.topPages.map(([page, count]) => ({
                page: page || '/',
                views: count,
                pct: data.totalViews > 0 ? `${Math.round((count / data.totalViews) * 100)}%` : '0%',
              }))}
            />
          </Section>

          <Section title="Bounce Rate by Entry Page">
            <DataTable
              headers={[
                { key: 'page', label: 'Entry Page', mono: true, bold: true },
                { key: 'entries', label: 'Entries', width: '80px' },
                { key: 'bounces', label: 'Bounces', width: '80px' },
                { key: 'rate', label: 'Bounce Rate', width: '100px' },
              ]}
              rows={data.bounceByPage.map(b => ({
                page: b.page || '/',
                entries: b.total,
                bounces: b.bounces,
                rate: `${b.rate}%`,
              }))}
            />
          </Section>

          <Section title="Top Exit Pages (Last Action Before Leaving)">
            <DataTable
              headers={[
                { key: 'page', label: 'Exit Page', mono: true, bold: true },
                { key: 'exits', label: 'Exits', width: '80px' },
                { key: 'pct', label: '% of Exits', width: '100px' },
              ]}
              rows={data.topExitPages.map(([page, count]) => ({
                page: page || '/',
                exits: count,
                pct: data.totalSessions > 0 ? `${Math.round((count / data.totalSessions) * 100)}%` : '0%',
              }))}
            />
          </Section>

          <Section title="Top Entry Pages">
            <DataTable
              headers={[
                { key: 'page', label: 'Entry Page', mono: true, bold: true },
                { key: 'entries', label: 'Entries', width: '80px' },
              ]}
              rows={data.topEntryPages.map(([page, count]) => ({
                page: page || '/',
                entries: count,
              }))}
            />
          </Section>
        </>
      )}

      {/* USERS TAB */}
      {tab === 'users' && (
        <Section title={`Registered Users (${data.users.length})`}>
          <DataTable
            headers={[
              { key: 'email', label: 'Email', mono: true, bold: true },
              { key: 'name', label: 'Name' },
              { key: 'tier', label: 'Tier', width: '80px' },
              { key: 'provider', label: 'Provider', width: '80px' },
              { key: 'joined', label: 'Joined', width: '120px' },
            ]}
            rows={data.users.map(u => ({
              email: u.email,
              name: u.displayName || '—',
              tier: u.tier || 'free',
              provider: u.provider || 'email',
              joined: fmtDate(u.createdAt),
            }))}
          />
        </Section>
      )}

      {/* FEEDBACK TAB */}
      {tab === 'feedback' && (
        <Section title={`Feedback Submissions (${feedback.length})`}>
          {feedback.length === 0 && (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--t2)', fontSize: 13 }}>No feedback submissions yet.</div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[...feedback].reverse().map(item => (
              <div key={item.id} className="card" style={{ padding: 16, opacity: item.status === 'done' ? 0.6 : 1, transition: 'opacity .2s' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <span style={{
                        fontSize: 10, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase',
                        padding: '2px 8px', borderRadius: 4,
                        background: item.type === 'bug' ? 'rgba(239,68,68,.1)' : item.type === 'feature' ? 'var(--accent-bg)' : 'var(--bg-2)',
                        color: item.type === 'bug' ? 'var(--err)' : item.type === 'feature' ? 'var(--accent)' : 'var(--t2)',
                      }}>
                        {item.type}
                      </span>
                      <span style={{
                        fontSize: 10, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase',
                        padding: '2px 8px', borderRadius: 4,
                        background: item.status === 'done' ? 'rgba(16,185,129,.1)' : 'rgba(245,158,11,.1)',
                        color: item.status === 'done' ? 'var(--ok)' : 'var(--warn)',
                      }}>
                        {item.status === 'done' ? 'Resolved' : 'New'}
                      </span>
                      <span style={{ fontSize: 10, color: 'var(--t2)' }}>{fmtDate(item.createdAt)}</span>
                    </div>
                    <p style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--t0)' }}>{item.message}</p>
                    {item.email && <p style={{ fontSize: 11, color: 'var(--t2)', marginTop: 4 }}>From: {item.email}</p>}
                  </div>
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                    <button
                      className="btn btn-s"
                      onClick={() => toggleFeedbackStatus(item.id)}
                      style={{ fontSize: 10, color: item.status === 'done' ? 'var(--warn)' : 'var(--ok)' }}
                    >
                      {item.status === 'done' ? 'Reopen' : 'Done'}
                    </button>
                    <button
                      className="btn btn-s"
                      onClick={() => removeFeedback(item.id)}
                      style={{ fontSize: 10, color: 'var(--err)' }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  )
}
