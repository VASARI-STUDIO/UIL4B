import { useState, useEffect, useCallback } from 'react'
import { getAnalyticsSummary, getFeedback, updateFeedbackStatus, updateFeedbackNotes, deleteFeedback, getDesignAnalytics } from '../utils/analytics'
import { collection, getDocs, doc, updateDoc, deleteDoc, query, orderBy } from 'firebase/firestore'
import { db } from '../utils/firebase'
import { useAuth } from '../contexts/AuthContext'
import { ADMIN_EMAILS } from '../utils/constants'

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

function PromptAdminCard({ prompt, setPendingPrompts, toast }) {
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(prompt.title || '')
  const [text, setText] = useState(prompt.text || '')
  const [tags, setTags] = useState((prompt.tags || []).join(', '))
  const [busy, setBusy] = useState(false)

  const updatePrompt = async (updates) => {
    setBusy(true)
    try {
      await updateDoc(doc(db, 'community-prompts', prompt.id), { ...updates, updatedAt: new Date().toISOString() })
      setPendingPrompts(prev => prev.map(p => p.id === prompt.id ? { ...p, ...updates } : p))
      toast('Prompt updated')
    } catch { toast('Update failed') }
    setBusy(false)
  }

  const handleSave = () => {
    const parsedTags = tags.split(',').map(t => t.trim()).filter(Boolean)
    updatePrompt({ title, text, tags: parsedTags })
    setEditing(false)
  }

  const handleApprove = () => updatePrompt({ status: 'approved' })
  const handleReject = () => updatePrompt({ status: 'rejected' })

  const handleDelete = async () => {
    setBusy(true)
    try {
      await deleteDoc(doc(db, 'community-prompts', prompt.id))
      setPendingPrompts(prev => prev.filter(p => p.id !== prompt.id))
      toast('Prompt deleted')
    } catch { toast('Delete failed') }
    setBusy(false)
  }

  const statusColor = { pending: 'var(--warn)', approved: 'var(--ok)', rejected: 'var(--err)' }[prompt.status] || 'var(--t2)'
  const statusBg = { pending: 'rgba(245,158,11,.1)', approved: 'rgba(16,185,129,.1)', rejected: 'rgba(239,68,68,.1)' }[prompt.status] || 'var(--bg-2)'

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden', borderLeft: `3px solid ${statusColor}`, marginBottom: 8 }}>
      <div style={{ padding: '14px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
          <Badge color={statusColor} bg={statusBg}>{prompt.status}</Badge>
          {prompt.authorName && <span style={{ fontSize: 11, color: 'var(--t2)' }}>by {prompt.authorName}</span>}
          {prompt.authorEmail && <span style={{ fontSize: 10, color: 'var(--t3)' }}>({prompt.authorEmail})</span>}
          <span style={{ fontSize: 10, color: 'var(--t3)', marginLeft: 'auto' }}>{fmtDateTime(prompt.createdAt)}</span>
        </div>

        {editing ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div>
              <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--t2)', textTransform: 'uppercase', letterSpacing: '.06em', display: 'block', marginBottom: 4 }}>Title</label>
              <input value={title} onChange={e => setTitle(e.target.value)} style={{ width: '100%', fontSize: 13 }} />
            </div>
            <div>
              <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--t2)', textTransform: 'uppercase', letterSpacing: '.06em', display: 'block', marginBottom: 4 }}>Prompt Text</label>
              <textarea value={text} onChange={e => setText(e.target.value)} style={{ width: '100%', minHeight: 100, resize: 'vertical', fontSize: 12 }} />
            </div>
            <div>
              <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--t2)', textTransform: 'uppercase', letterSpacing: '.06em', display: 'block', marginBottom: 4 }}>Tags (comma-separated)</label>
              <input value={tags} onChange={e => setTags(e.target.value)} style={{ width: '100%', fontSize: 12 }} placeholder="e.g. landing-page, hero, modern" />
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="btn btn-s btn-accent" onClick={handleSave} disabled={busy}>Save</button>
              <button className="btn btn-s" onClick={() => { setTitle(prompt.title || ''); setText(prompt.text || ''); setTags((prompt.tags || []).join(', ')); setEditing(false) }}>Cancel</button>
            </div>
          </div>
        ) : (
          <>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--t0)', marginBottom: 4 }}>{prompt.title || 'Untitled'}</div>
            <p style={{ fontSize: 12, color: 'var(--t1)', lineHeight: 1.6, whiteSpace: 'pre-wrap', marginBottom: 8 }}>{prompt.text}</p>
            {(prompt.tags || []).length > 0 && (
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
                {prompt.tags.map(tag => (
                  <span key={tag} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, background: 'var(--bg-2)', color: 'var(--t2)', fontWeight: 600 }}>{tag}</span>
                ))}
              </div>
            )}
            {prompt.profileLink && (
              <div style={{ fontSize: 11, color: 'var(--t2)', marginBottom: 8 }}>
                Profile: <a href={prompt.profileLink} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>{prompt.profileLink}</a>
              </div>
            )}
          </>
        )}

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8, borderTop: '1px solid var(--border)', paddingTop: 10 }}>
          {!editing && <button className="btn btn-s" onClick={() => setEditing(true)} disabled={busy} style={{ fontSize: 10 }}>Edit</button>}
          {prompt.status !== 'approved' && <button className="btn btn-s" onClick={handleApprove} disabled={busy} style={{ fontSize: 10, color: 'var(--ok)' }}>Approve</button>}
          {prompt.status !== 'rejected' && <button className="btn btn-s" onClick={handleReject} disabled={busy} style={{ fontSize: 10, color: 'var(--warn)' }}>Reject</button>}
          <button className="btn btn-s" onClick={handleDelete} disabled={busy} style={{ fontSize: 10, color: 'var(--err)', marginLeft: 'auto' }}>Delete</button>
        </div>
      </div>
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
  { id: 'design', label: 'Design Analytics' },
  { id: 'submissions', label: 'Submissions' },
  { id: 'prompts', label: 'Prompts' },
  { id: 'pages', label: 'Pages' },
  { id: 'users', label: 'Users' },
]

export default function Admin({ toast }) {
  const { user } = useAuth()
  const isAdminUser = !!user?.email && ADMIN_EMAILS.includes(user.email.toLowerCase())
  const [unlocked, setUnlocked] = useState(() => localStorage.getItem(ADMIN_KEY) === 'true')
  const [code, setCode] = useState('')
  const [tab, setTab] = useState('overview')
  const [data, setData] = useState(null)
  const [feedback, setFeedback] = useState([])
  const [filterType, setFilterType] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [expandedId, setExpandedId] = useState(null)
  const [pendingPrompts, setPendingPrompts] = useState([])
  const [promptFilter, setPromptFilter] = useState('pending')

  const [designData, setDesignData] = useState(null)

  const refresh = useCallback(async () => {
    setData(getAnalyticsSummary())
    setDesignData(getDesignAnalytics())
    const localFeedback = getFeedback()
    let merged = [...localFeedback]
    try {
      const q2 = query(collection(db, 'feedback'), orderBy('createdAt', 'desc'))
      const snap = await getDocs(q2)
      const fsFeedback = snap.docs.map(d => ({ ...d.data(), id: d.id, _fs: true, source: d.data().source || 'firestore' }))
      const localIds = new Set(localFeedback.map(f => f.id))
      fsFeedback.forEach(f => { if (!localIds.has(f.id)) merged.push(f) })
    } catch { /* firestore unavailable — fall back to local feedback */ }
    setFeedback(merged)
    try {
      const promptSnap = await getDocs(query(collection(db, 'community-prompts'), orderBy('createdAt', 'desc')))
      setPendingPrompts(promptSnap.docs.map(d => ({ ...d.data(), id: d.id })))
    } catch { /* firestore unavailable */ }
  }, [])

  const [serverVerified, setServerVerified] = useState(false)

  useEffect(() => {
    if (!isAdminUser || serverVerified) return
    const verify = async () => {
      try {
        const { auth: fbAuth } = await import('../utils/firebase')
        const token = await fbAuth.currentUser?.getIdToken()
        if (!token) return
        const res = await fetch('/api/verify-admin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        })
        const data = await res.json()
        if (data.isAdmin) setServerVerified(true)
        else { setServerVerified(false); toast?.('Admin verification failed') }
      } catch { /* offline — trust client-side for now */ }
    }
    verify()
  }, [isAdminUser, serverVerified]) // eslint-disable-line react-hooks/exhaustive-deps

  const effectiveUnlocked = unlocked || isAdminUser

  useEffect(() => {
    if (effectiveUnlocked) refresh()
  }, [effectiveUnlocked, refresh])

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

  const handleStatusChange = async (id, status) => {
    const item = feedback.find(f => f.id === id)
    if (item?._fs) {
      setFeedback(prev => prev.map(f => f.id === id ? { ...f, status, updatedAt: new Date().toISOString() } : f))
      try { await updateDoc(doc(db, 'feedback', id), { status, updatedAt: new Date().toISOString() }) } catch { /* offline */ }
    } else {
      setFeedback(updateFeedbackStatus(id, status))
    }
    toast(`Marked as ${STATUS_LABELS[status]}`)
  }

  const handleNotesChange = async (id, notes) => {
    const item = feedback.find(f => f.id === id)
    if (item?._fs) {
      setFeedback(prev => prev.map(f => f.id === id ? { ...f, adminNotes: notes, updatedAt: new Date().toISOString() } : f))
      try { await updateDoc(doc(db, 'feedback', id), { adminNotes: notes, updatedAt: new Date().toISOString() }) } catch { /* offline */ }
    } else {
      setFeedback(updateFeedbackNotes(id, notes))
    }
    toast('Notes saved')
  }

  const handleDelete = async (id) => {
    const item = feedback.find(f => f.id === id)
    if (item?._fs) {
      setFeedback(prev => prev.filter(f => f.id !== id))
      try { await deleteDoc(doc(db, 'feedback', id)) } catch { /* offline */ }
    } else {
      setFeedback(deleteFeedback(id))
    }
    setExpandedId(null)
    toast('Submission deleted')
  }

  const exportCSV = () => {
    const cols = ['createdAt', 'type', 'status', 'subject', 'message', 'email', 'source', 'adminNotes']
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
    const rows = [...feedback].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
    const csv = [cols.join(','), ...rows.map(r => cols.map(c => esc(r[c])).join(','))].join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `uil4b-feedback-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast(`Exported ${rows.length} submissions`)
  }

  const filteredFeedback = [...feedback].reverse().filter(item => {
    if (filterType !== 'all' && item.type !== filterType) return false
    if (filterStatus !== 'all' && item.status !== filterStatus) return false
    return true
  })

  const newCount = feedback.filter(f => f.status === 'new').length
  const inProgressCount = feedback.filter(f => f.status === 'in-progress').length

  if (!effectiveUnlocked) {
    return (
      <div className="sec">
        <div style={{ maxWidth: 400, margin: '80px auto', textAlign: 'center' }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 16, fontFamily: 'var(--mono)' }}>Admin Access</div>
          <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-.03em', marginBottom: 8 }}>Developer Dashboard</h1>
          <p style={{ fontSize: 14, color: 'var(--t1)', marginBottom: 24 }}>{user ? 'Your account does not have admin access. Enter the admin code to continue.' : 'Sign in with an owner account, or enter the admin code to access analytics and management tools.'}</p>
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
          <button className="btn btn-s" onClick={exportCSV}>Export CSV</button>
          {!isAdminUser && <button className="btn btn-s" onClick={handleLock} style={{ color: 'var(--err)' }}>Lock</button>}
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
              <span style={{ marginLeft: 6, background: 'var(--accent)', color: 'var(--bg-0)', borderRadius: 10, padding: '1px 7px', fontSize: 10, fontWeight: 700 }}>
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

          <Section title="Product Insights">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(300px,100%), 1fr))', gap: 14 }}>
              <div className="card" style={{ padding: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 10 }}>Most Used Tools</div>
                {data.topPages.filter(([p]) => p && p !== '/' && !['settings','login','admin','community','feedback','privacy','terms','projects'].some(s => p.includes(s))).slice(0, 5).map(([page, count], i) => (
                  <div key={page} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: i < 4 ? '1px solid var(--border)' : 'none', fontSize: 12 }}>
                    <span style={{ fontFamily: 'var(--mono)', color: 'var(--t0)', fontWeight: 500 }}>{page.replace('/', '')}</span>
                    <span style={{ color: 'var(--accent)', fontWeight: 700 }}>{count}</span>
                  </div>
                ))}
                {data.topPages.length === 0 && <div style={{ fontSize: 12, color: 'var(--t3)' }}>No page data yet</div>}
              </div>

              <div className="card" style={{ padding: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 10 }}>Feature Requests</div>
                {feedback.filter(f => f.type === 'feature').slice(-5).reverse().map((f, i) => (
                  <div key={f.id || i} style={{ padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: 12 }}>
                    <div style={{ fontWeight: 500, color: 'var(--t0)', marginBottom: 2 }}>{f.subject || 'No subject'}</div>
                    <div style={{ color: 'var(--t2)', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.message}</div>
                  </div>
                ))}
                {feedback.filter(f => f.type === 'feature').length === 0 && <div style={{ fontSize: 12, color: 'var(--t3)' }}>No feature requests yet</div>}
              </div>

              <div className="card" style={{ padding: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 10 }}>Open Bugs</div>
                {feedback.filter(f => f.type === 'bug' && f.status !== 'done').map((f, i) => (
                  <div key={f.id || i} style={{ padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Badge color={STATUS_COLORS[f.status]} bg={STATUS_BGS[f.status]}>{STATUS_LABELS[f.status]}</Badge>
                      <span style={{ fontWeight: 500, color: 'var(--t0)' }}>{f.subject || 'No subject'}</span>
                    </div>
                  </div>
                ))}
                {feedback.filter(f => f.type === 'bug' && f.status !== 'done').length === 0 && <div style={{ fontSize: 12, color: 'var(--t3)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--ok)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                  No open bugs
                </div>}
              </div>
            </div>
          </Section>

          <Section title="Setup Checklist">
            <div className="card" style={{ padding: 16 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  { label: 'Firebase Auth configured', check: true, note: 'Enable Email/Password + Google providers in Firebase Console' },
                  { label: 'Firestore database created', check: true, note: 'Set region to australia-southeast1 (Sydney) in Firebase Console' },
                  { label: 'Firestore security rules deployed', check: false, note: 'Deploy firestore.rules from repo root via Firebase CLI' },
                  { label: 'Email notifications', check: false, note: 'Set RESEND_API_KEY + SUPPORT_NOTIFY_EMAIL env vars in Vercel' },
                  { label: 'Google Sheets sync', check: !!import.meta.env.VITE_SHEETS_ENABLED, note: 'Set GOOGLE_SHEETS_WEBHOOK_URL in Vercel — see docs/google-sheets-setup.md. Use Export CSV anytime.' },
                  { label: 'Custom domain', check: true, note: 'uil4b.com configured' },
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ width: 18, height: 18, borderRadius: '50%', background: item.check ? 'rgba(16,185,129,.1)' : 'rgba(245,158,11,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                      {item.check ? (
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--ok)" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
                      ) : (
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--warn)" strokeWidth="3" strokeLinecap="round"><circle cx="12" cy="12" r="1" /></svg>
                      )}
                    </div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--t0)' }}>{item.label}</div>
                      <div style={{ fontSize: 11, color: 'var(--t2)' }}>{item.note}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Section>
        </>
      )}

      {/* DESIGN ANALYTICS TAB */}
      {tab === 'design' && designData && (
        <>
          <Section title="Most Copied Fonts">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(300px,100%), 1fr))', gap: 14 }}>
              <div className="card" style={{ padding: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 10 }}>Top Fonts</div>
                {Object.entries(designData.fontCopies || {}).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([font, count], i) => (
                  <div key={font} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: i < 9 ? '1px solid var(--border)' : 'none', fontSize: 12 }}>
                    <span style={{ fontWeight: 500, color: 'var(--t0)' }}>{font}</span>
                    <span style={{ color: 'var(--accent)', fontWeight: 700, fontFamily: 'var(--mono)' }}>{count} copies</span>
                  </div>
                ))}
                {Object.keys(designData.fontCopies || {}).length === 0 && <div style={{ fontSize: 12, color: 'var(--t3)' }}>No font copy data yet — users need to copy fonts from Font Pair Finder or Font Gallery.</div>}
              </div>

              <div className="card" style={{ padding: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 10 }}>Font Copy Distribution</div>
                {(() => {
                  const entries = Object.entries(designData.fontCopies || {}).sort((a, b) => b[1] - a[1]).slice(0, 8)
                  const max = entries[0]?.[1] || 1
                  return entries.map(([font, count]) => (
                    <div key={font} style={{ marginBottom: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 2 }}>
                        <span style={{ color: 'var(--t0)', fontWeight: 500 }}>{font}</span>
                        <span style={{ color: 'var(--t2)' }}>{count}</span>
                      </div>
                      <div style={{ height: 6, borderRadius: 3, background: 'var(--bg-2)', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${(count / max) * 100}%`, background: 'var(--accent)', borderRadius: 3, transition: 'width .3s' }} />
                      </div>
                    </div>
                  ))
                })()}
              </div>
            </div>
          </Section>

          <Section title="Most Picked Colours">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(300px,100%), 1fr))', gap: 14 }}>
              <div className="card" style={{ padding: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 10 }}>Top Colours</div>
                {Object.entries(designData.colourPicks || {}).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([hex, count], i) => (
                  <div key={hex} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderBottom: i < 9 ? '1px solid var(--border)' : 'none', fontSize: 12 }}>
                    <div style={{ width: 24, height: 24, borderRadius: 'var(--radius-s)', background: hex, border: '1px solid var(--border)', flexShrink: 0 }} />
                    <span style={{ fontFamily: 'var(--mono)', color: 'var(--t0)', fontWeight: 500, flex: 1 }}>{hex}</span>
                    <span style={{ color: 'var(--accent)', fontWeight: 700, fontFamily: 'var(--mono)' }}>{count}×</span>
                  </div>
                ))}
                {Object.keys(designData.colourPicks || {}).length === 0 && <div style={{ fontSize: 12, color: 'var(--t3)' }}>No colour pick data yet — users need to select colours in Colour Studio.</div>}
              </div>

              <div className="card" style={{ padding: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 10 }}>Colour Palette Overview</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {Object.entries(designData.colourPicks || {}).sort((a, b) => b[1] - a[1]).slice(0, 30).map(([hex, count]) => (
                    <div key={hex} title={`${hex} — ${count} picks`} style={{
                      width: Math.max(24, Math.min(48, count * 6)),
                      height: Math.max(24, Math.min(48, count * 6)),
                      borderRadius: 'var(--radius-s)',
                      background: hex,
                      border: '1px solid var(--border)',
                      cursor: 'default',
                      transition: 'transform .15s',
                    }} />
                  ))}
                </div>
                {Object.keys(designData.colourPicks || {}).length === 0 && <div style={{ fontSize: 12, color: 'var(--t3)' }}>No data yet</div>}
              </div>
            </div>
          </Section>

          <Section title="Tool Usage">
            <div className="card" style={{ padding: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 10 }}>Most Used Tools (by action)</div>
              {Object.entries(designData.toolUsage || {}).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([tool, count], i) => (
                <div key={tool} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: i < 9 ? '1px solid var(--border)' : 'none', fontSize: 12 }}>
                  <span style={{ fontFamily: 'var(--mono)', color: 'var(--t0)', fontWeight: 500 }}>{tool}</span>
                  <span style={{ color: 'var(--accent)', fontWeight: 700 }}>{count}</span>
                </div>
              ))}
              {Object.keys(designData.toolUsage || {}).length === 0 && <div style={{ fontSize: 12, color: 'var(--t3)' }}>No tool usage data yet</div>}
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
              { key: 'provider', label: 'Provider', width: '80px' },
              { key: 'joined', label: 'Joined', width: '120px' },
            ]}
            rows={data.users.map(u => ({
              email: u.email,
              name: u.displayName || '—',
              provider: u.provider || 'email',
              joined: fmtDate(u.createdAt),
            }))}
          />
        </Section>
      )}

      {/* PROMPTS TAB */}
      {tab === 'prompts' && (
        <Section
          title={`Community Prompts (${pendingPrompts.length})`}
          right={
            <div style={{ display: 'flex', gap: 6 }}>
              {['pending', 'approved', 'rejected', 'all'].map(f => (
                <button
                  key={f}
                  className={`pt-t${promptFilter === f ? ' on' : ''}`}
                  onClick={() => setPromptFilter(f)}
                  style={{ padding: '4px 10px', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em' }}
                >
                  {f}
                </button>
              ))}
            </div>
          }
        >
          {pendingPrompts
            .filter(p => promptFilter === 'all' || p.status === promptFilter)
            .map(prompt => (
              <PromptAdminCard key={prompt.id} prompt={prompt} setPendingPrompts={setPendingPrompts} toast={toast} />
            ))}
          {pendingPrompts.filter(p => promptFilter === 'all' || p.status === promptFilter).length === 0 && (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--t2)', fontSize: 13 }}>
              No {promptFilter === 'all' ? '' : promptFilter} prompts yet.
            </div>
          )}
        </Section>
      )}
    </div>
  )
}
