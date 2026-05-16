import { useState, useEffect, useCallback } from 'react'
import { getAnalyticsSummary, getFeedback, updateFeedbackStatus, updateFeedbackNotes, deleteFeedback } from '../utils/analytics'

const ADMIN_CODE = 'uil4b-dev-2026'
const ADMIN_KEY = 'vs-admin-unlocked'
const STATUSES = ['new', 'in-progress', 'done']
const STATUS_LABELS = { new: 'New', 'in-progress': 'In Progress', done: 'Done' }
const STATUS_COLORS = { new: 'var(--warn)', 'in-progress': 'var(--accent)', done: 'var(--ok)' }
const STATUS_BGS = { new: 'rgba(245,158,11,.1)', 'in-progress': 'var(--accent-bg)', done: 'rgba(16,185,129,.1)' }
const TYPE_COLORS = { bug: 'var(--err)', feature: 'var(--accent)', general: 'var(--t2)', help: '#a855f7' }
const TYPE_BGS = { bug: 'rgba(239,68,68,.1)', feature: 'var(--accent-bg)', general: 'var(--bg-2)', help: 'rgba(168,85,247,.1)' }

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
  const cols = headers.map(h => h.width || 'minmax(120px, 1fr)').join(' ')
  return (
    <div style={{ borderRadius: 'var(--radius-s)', border: '1px solid var(--border)', overflow: 'hidden' }}>
      <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <div style={{ minWidth: 'fit-content' }}>
          <div style={{ display: 'grid', gridTemplateColumns: cols, background: 'var(--bg-2)', borderBottom: '1px solid var(--border)', padding: '10px 14px', gap: 12 }}>
            {headers.map(h => (
              <div key={h.key} style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--t2)' }}>{h.label}</div>
            ))}
          </div>
          {rows.length === 0 && (
            <div style={{ padding: '20px 14px', fontSize: 12, color: 'var(--t2)', textAlign: 'center' }}>No data yet</div>
          )}
          {rows.map((row, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: cols, padding: '10px 14px', gap: 12, borderBottom: i < rows.length - 1 ? '1px solid var(--border)' : 'none', background: i % 2 === 0 ? 'transparent' : 'var(--bg-1)', fontSize: 12, alignItems: 'center' }}>
              {headers.map(h => (
                <div key={h.key} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: h.mono ? 'var(--t1)' : 'var(--t0)', fontFamily: h.mono ? 'var(--mono)' : 'inherit', fontWeight: h.bold ? 600 : 400 }}>
                  {typeof row[h.key] === 'function' ? row[h.key]() : row[h.key]}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function Section({ title, right, children }) {
  return (
    <div style={{ marginBottom: 36 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 24, height: 2, background: 'var(--accent)', borderRadius: 1 }} />
          <h2 style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-.02em' }}>{title}</h2>
        </div>
        {right}
      </div>
      {children}
    </div>
  )
}

function Badge({ color, bg, children }) {
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase',
      padding: '2px 8px', borderRadius: 4, background: bg, color, whiteSpace: 'nowrap',
    }}>
      {children}
    </span>
  )
}

function SubmissionCard({ item, onStatusChange, onNotesChange, onDelete, expanded, onToggle }) {
  const [notes, setNotes] = useState(item.adminNotes || '')
  const [editingNotes, setEditingNotes] = useState(false)

  const nextStatus = () => {
    const idx = STATUSES.indexOf(item.status)
    return STATUSES[(idx + 1) % STATUSES.length]
  }

  const saveNotes = () => {
    onNotesChange(item.id, notes)
    setEditingNotes(false)
  }

  return (
    <div className="card" style={{
      padding: 0, overflow: 'hidden',
      opacity: item.status === 'done' ? 0.7 : 1,
      borderLeft: `3px solid ${STATUS_COLORS[item.status] || 'var(--border)'}`,
      transition: 'opacity .2s',
    }}>
      <div
        style={{ padding: '14px 16px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}
        onClick={onToggle}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
            <Badge color={TYPE_COLORS[item.type] || 'var(--t2)'} bg={TYPE_BGS[item.type] || 'var(--bg-2)'}>{item.type}</Badge>
            <Badge color={STATUS_COLORS[item.status]} bg={STATUS_BGS[item.status]}>{STATUS_LABELS[item.status] || item.status}</Badge>
            {item.source && <Badge color="var(--t3)" bg="var(--bg-2)">{item.source}</Badge>}
            <span style={{ fontSize: 10, color: 'var(--t3)' }}>{fmtDateTime(item.createdAt)}</span>
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--t0)', marginBottom: 2 }}>
            {item.subject || `[${item.type}] Submission`}
          </div>
          <p style={{ fontSize: 12, color: 'var(--t1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: expanded ? 'normal' : 'nowrap' }}>
            {item.message}
          </p>
          {!expanded && item.adminNotes && (
            <div style={{ fontSize: 10, color: 'var(--accent)', marginTop: 4 }}>Has admin notes</div>
          )}
        </div>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--t3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, transition: 'transform .2s', transform: expanded ? 'rotate(180deg)' : 'none', marginTop: 4 }}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>

      {expanded && (
        <div style={{ padding: '0 16px 16px', borderTop: '1px solid var(--border)', paddingTop: 14 }}>
          <div style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--t0)', marginBottom: 12, whiteSpace: 'pre-wrap' }}>
            {item.message}
          </div>

          {item.email && (
            <div style={{ fontSize: 11, color: 'var(--t2)', marginBottom: 12 }}>
              From: <strong>{item.email}</strong>
            </div>
          )}

          {/* Admin notes */}
          <div style={{ background: 'var(--bg-2)', borderRadius: 'var(--radius-s)', padding: 12, marginBottom: 12 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--t2)', marginBottom: 8 }}>Admin Notes</div>
            {editingNotes ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Add internal notes, action items, or a reply draft..."
                  style={{ width: '100%', minHeight: 80, resize: 'vertical', fontSize: 12 }}
                  autoFocus
                />
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn btn-s" onClick={saveNotes}>Save</button>
                  <button className="btn btn-s" onClick={() => { setNotes(item.adminNotes || ''); setEditingNotes(false) }}>Cancel</button>
                </div>
              </div>
            ) : (
              <div>
                {item.adminNotes ? (
                  <p style={{ fontSize: 12, color: 'var(--t0)', whiteSpace: 'pre-wrap', lineHeight: 1.6, marginBottom: 8 }}>{item.adminNotes}</p>
                ) : (
                  <p style={{ fontSize: 12, color: 'var(--t3)', fontStyle: 'italic', marginBottom: 8 }}>No notes yet</p>
                )}
                <button className="btn btn-s" onClick={() => setEditingNotes(true)} style={{ fontSize: 10 }}>
                  {item.adminNotes ? 'Edit notes' : 'Add notes'}
                </button>
              </div>
            )}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button
              className="btn btn-s"
              onClick={() => onStatusChange(item.id, nextStatus())}
              style={{ fontSize: 10, color: STATUS_COLORS[nextStatus()] }}
            >
              Mark as {STATUS_LABELS[nextStatus()]}
            </button>
            {STATUSES.filter(s => s !== item.status && s !== nextStatus()).map(s => (
              <button
                key={s}
                className="btn btn-s"
                onClick={() => onStatusChange(item.id, s)}
                style={{ fontSize: 10, color: STATUS_COLORS[s] }}
              >
                {STATUS_LABELS[s]}
              </button>
            ))}
            <button
              className="btn btn-s"
              onClick={() => onDelete(item.id)}
              style={{ fontSize: 10, color: 'var(--err)', marginLeft: 'auto' }}
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function fmtDuration(s) {
  if (s < 60) return `${s}s`
  return `${Math.floor(s / 60)}m ${s % 60}s`
}

function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
}

function fmtDateTime(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'submissions', label: 'Submissions' },
  { id: 'pages', label: 'Pages' },
  { id: 'users', label: 'Users' },
]

export default function Admin({ toast }) {
  const [unlocked, setUnlocked] = useState(() => localStorage.getItem(ADMIN_KEY) === 'true')
  const [code, setCode] = useState('')
  const [tab, setTab] = useState('overview')
  const [data, setData] = useState(null)
  const [feedback, setFeedback] = useState([])
  const [filterType, setFilterType] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [expandedId, setExpandedId] = useState(null)

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

  const handleStatusChange = (id, status) => {
    const updated = updateFeedbackStatus(id, status)
    setFeedback(updated)
    toast(`Marked as ${STATUS_LABELS[status]}`)
  }

  const handleNotesChange = (id, notes) => {
    const updated = updateFeedbackNotes(id, notes)
    setFeedback(updated)
    toast('Notes saved')
  }

  const handleDelete = (id) => {
    const updated = deleteFeedback(id)
    setFeedback(updated)
    setExpandedId(null)
    toast('Submission deleted')
  }

  const filteredFeedback = [...feedback].reverse().filter(item => {
    if (filterType !== 'all' && item.type !== filterType) return false
    if (filterStatus !== 'all' && item.status !== filterStatus) return false
    return true
  })

  const newCount = feedback.filter(f => f.status === 'new').length
  const inProgressCount = feedback.filter(f => f.status === 'in-progress').length

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
      <div className="sec-h" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div className="sec-h-eyebrow" style={{ color: 'var(--ok)' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--ok)', display: 'inline-block', marginRight: 0 }} />
            Admin Mode
          </div>
          <h1>Dashboard</h1>
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
            {t.id === 'submissions' && (newCount + inProgressCount) > 0 && (
              <span style={{ marginLeft: 6, background: 'var(--accent)', color: '#fff', borderRadius: 10, padding: '1px 7px', fontSize: 10, fontWeight: 700 }}>
                {newCount + inProgressCount}
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(280px,100%), 1fr))', gap: 14 }}>
              <div className="card" style={{ padding: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 10 }}>Registered Users</div>
                <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--accent)' }}>{data.users.length}</div>
                <div style={{ fontSize: 11, color: 'var(--t2)', marginTop: 4 }}>
                  {data.users.filter(u => u.tier === 'pro').length} Pro · {data.users.filter(u => u.tier !== 'pro').length} Free
                </div>
              </div>
              <div
                className="card"
                style={{ padding: 16, cursor: 'pointer', transition: 'border-color .2s' }}
                onClick={() => setTab('submissions')}
              >
                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 10 }}>Submissions</div>
                <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--accent)' }}>{feedback.length}</div>
                <div style={{ fontSize: 11, color: 'var(--t2)', marginTop: 4 }}>
                  <span style={{ color: 'var(--warn)' }}>{newCount} new</span>
                  {' · '}
                  <span style={{ color: 'var(--accent)' }}>{inProgressCount} in progress</span>
                  {' · '}
                  {feedback.filter(f => f.status === 'done').length} done
                </div>
              </div>
              <div className="card" style={{ padding: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 10 }}>By Type</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                  {['bug', 'feature', 'general', 'help'].map(type => {
                    const count = feedback.filter(f => f.type === type).length
                    if (!count) return null
                    return (
                      <Badge key={type} color={TYPE_COLORS[type]} bg={TYPE_BGS[type]}>
                        {type}: {count}
                      </Badge>
                    )
                  })}
                </div>
              </div>
            </div>
          </Section>
        </>
      )}

      {/* SUBMISSIONS TAB */}
      {tab === 'submissions' && (
        <Section
          title={`Submissions (${filteredFeedback.length})`}
          right={
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {/* Type filter */}
              {['all', 'bug', 'feature', 'general', 'help'].map(t => (
                <button
                  key={t}
                  className={`pt-t${filterType === t ? ' on' : ''}`}
                  onClick={() => setFilterType(t)}
                  style={{ padding: '4px 10px', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em' }}
                >
                  {t === 'all' ? 'All Types' : t}
                </button>
              ))}
              <span style={{ width: 1, background: 'var(--border)', margin: '0 4px' }} />
              {/* Status filter */}
              {['all', ...STATUSES].map(s => (
                <button
                  key={s}
                  className={`pt-t${filterStatus === s ? ' on' : ''}`}
                  onClick={() => setFilterStatus(s)}
                  style={{ padding: '4px 10px', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em' }}
                >
                  {s === 'all' ? 'All' : STATUS_LABELS[s]}
                </button>
              ))}
            </div>
          }
        >
          {filteredFeedback.length === 0 && (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--t2)', fontSize: 13 }}>
              {feedback.length === 0 ? 'No submissions yet.' : 'No submissions match filters.'}
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filteredFeedback.map(item => (
              <SubmissionCard
                key={item.id}
                item={item}
                expanded={expandedId === item.id}
                onToggle={() => setExpandedId(expandedId === item.id ? null : item.id)}
                onStatusChange={handleStatusChange}
                onNotesChange={handleNotesChange}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </Section>
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

          <Section title="Top Exit Pages">
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
    </div>
  )
}
