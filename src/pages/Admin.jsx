import { useState, useEffect, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { getAnalyticsSummary, getPageViews, getSessions, getFeedback, updateFeedbackStatus, updateFeedbackNotes, deleteFeedback, getDesignAnalytics, getAggregateAnalytics } from '../utils/analytics'
import { collection, getDocs, doc, updateDoc, deleteDoc, query, orderBy } from 'firebase/firestore'
import { db } from '../utils/firebase'
import { uploadCommunityMedia, dataUrlToBlob, extFromDataUrl } from '../utils/mediaUpload'
import { useAuth } from '../contexts/AuthContext'
import { ADMIN_EMAILS } from '../utils/constants'
import { MODULE_BOARD } from '../data/moduleBoard'

const ADMIN_CODE = 'uil4b-dev-2026'
const STATUSES = ['new', 'in-progress', 'done']
const STATUS_LABELS = { new: 'New', 'in-progress': 'In Progress', done: 'Done' }
const STATUS_COLORS = { new: 'var(--warn)', 'in-progress': 'var(--accent)', done: 'var(--ok)' }
const STATUS_BGS = { new: 'rgba(245,158,11,.1)', 'in-progress': 'var(--accent-bg)', done: 'rgba(16,185,129,.1)' }
const TYPE_COLORS = { bug: 'var(--err)', feature: 'var(--accent)', general: 'var(--t2)', help: '#a855f7' }
const TYPE_BGS = { bug: 'rgba(239,68,68,.1)', feature: 'var(--accent-bg)', general: 'var(--bg-2)', help: 'rgba(168,85,247,.1)' }
const DONUT_COLORS = ['var(--accent)', 'var(--ok)', 'var(--warn)', 'var(--err)', '#a855f7', 'var(--t3)']
const DAY = 86400000
const WEEK = 7 * DAY

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'board', label: 'Board' },
  { id: 'design', label: 'Design' },
  { id: 'submissions', label: 'Submissions' },
  { id: 'prompts', label: 'Prompts' },
  { id: 'pages', label: 'Pages' },
  { id: 'users', label: 'Users' },
  { id: 'stripe', label: 'Stripe' },
]

const TIME_RANGES = [
  { id: 'today', label: 'Today' },
  { id: '7d', label: '7 days' },
  { id: '30d', label: '30 days' },
  { id: 'all', label: 'All time' },
]

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

function fmtNum(n) {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return String(n)
}

// Read a File into a base64 data URL (used for the legacy base64 media fallback).
function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => resolve(e.target.result)
    reader.onerror = () => reject(new Error('Could not read file'))
    reader.readAsDataURL(file)
  })
}

function timeFilter(timestamp, range) {
  if (range === 'all') return true
  const now = Date.now()
  if (range === 'today') return now - timestamp < DAY
  if (range === '7d') return now - timestamp < WEEK
  if (range === '30d') return now - timestamp < 30 * DAY
  return true
}

// ── SVG Charts ──────────────────────────────────────────────

function AreaChart({ data, height = 120 }) {
  if (!data.length) return <div className="adm-empty">No data</div>
  const w = 400
  const h = height
  const pad = { t: 8, r: 4, b: 20, l: 36 }
  const iw = w - pad.l - pad.r
  const ih = h - pad.t - pad.b
  const max = Math.max(...data.map(d => d.value), 1)
  const xStep = data.length > 1 ? iw / (data.length - 1) : iw

  const points = data.map((d, i) => ({
    x: pad.l + i * xStep,
    y: pad.t + ih - (d.value / max) * ih,
  }))

  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')
  const area = `${line} L${points[points.length - 1].x},${pad.t + ih} L${points[0].x},${pad.t + ih} Z`

  const yTicks = [0, Math.round(max / 2), max]

  return (
    <div className="adm-chart">
      <svg role="img" aria-label="Values over time" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
        <defs>
          <linearGradient id="area-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity=".25" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity=".02" />
          </linearGradient>
        </defs>
        {yTicks.map(v => {
          const y = pad.t + ih - (v / max) * ih
          return (
            <g key={v}>
              <line x1={pad.l} x2={w - pad.r} y1={y} y2={y} stroke="var(--border)" strokeWidth=".5" />
              <text x={pad.l - 6} y={y + 3} textAnchor="end" fill="var(--t3)" fontSize="9" fontFamily="var(--mono)">{fmtNum(v)}</text>
            </g>
          )
        })}
        <path d={area} fill="url(#area-grad)" />
        <path d={line} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="3" fill="var(--accent)" opacity="0">
            <title>{data[i].label}: {data[i].value}</title>
          </circle>
        ))}
        {data.length <= 14 && data.map((d, i) => (
          <text key={i} x={points[i].x} y={h - 4} textAnchor="middle" fill="var(--t3)" fontSize="8" fontFamily="var(--mono)">{d.label}</text>
        ))}
      </svg>
    </div>
  )
}

function DonutChart({ segments, size = 120 }) {
  const total = segments.reduce((s, d) => s + d.value, 0)
  if (!total) return <div className="adm-empty">No data</div>
  const r = size / 2
  const inner = r * 0.6
  const cx = r
  const cy = r
  const angles = segments.map(seg => (seg.value / total) * Math.PI * 2)
  const startAngles = angles.map((_, i) => -Math.PI / 2 + angles.slice(0, i).reduce((s, a) => s + a, 0))

  const paths = segments.map((seg, i) => {
    const angle = angles[i]
    const cumAngle = startAngles[i]
    const x1 = cx + r * Math.cos(cumAngle)
    const y1 = cy + r * Math.sin(cumAngle)
    const x2 = cx + r * Math.cos(cumAngle + angle)
    const y2 = cy + r * Math.sin(cumAngle + angle)
    const ix1 = cx + inner * Math.cos(cumAngle + angle)
    const iy1 = cy + inner * Math.sin(cumAngle + angle)
    const ix2 = cx + inner * Math.cos(cumAngle)
    const iy2 = cy + inner * Math.sin(cumAngle)
    const large = angle > Math.PI ? 1 : 0
    const d = `M${x1},${y1} A${r},${r} 0 ${large} 1 ${x2},${y2} L${ix1},${iy1} A${inner},${inner} 0 ${large} 0 ${ix2},${iy2} Z`
    return <path key={i} d={d} fill={DONUT_COLORS[i % DONUT_COLORS.length]} opacity=".85"><title>{seg.label}: {seg.value}</title></path>
  })

  return (
    <div className="adm-donut-wrap">
      <svg role="img" aria-label="Distribution breakdown" width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {paths}
        <text x={cx} y={cy - 4} textAnchor="middle" fill="var(--t0)" fontSize="20" fontWeight="800">{total}</text>
        <text x={cx} y={cy + 12} textAnchor="middle" fill="var(--t3)" fontSize="9">total</text>
      </svg>
      <div className="adm-donut-legend">
        {segments.map((seg, i) => (
          <div key={i} className="adm-donut-item">
            <span className="adm-donut-dot" style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }} />
            <span>{seg.label}</span>
            <span className="adm-donut-count">{seg.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function Sparkline({ data }) {
  if (!data.length) return null
  const max = Math.max(...data, 1)
  return (
    <div className="adm-sparkline" role="img" aria-label="Trend sparkline">
      {data.map((v, i) => (
        <div key={i} className="adm-sparkline-bar" style={{ height: `${Math.max(4, (v / max) * 100)}%` }} title={String(v)} />
      ))}
    </div>
  )
}

// ── Sub-components ──────────────────────────────────────────

function SubmissionCard({ item, onStatusChange, onNotesChange, onDelete, expanded, onToggle }) {
  const [notes, setNotes] = useState(item.adminNotes || '')
  const [editingNotes, setEditingNotes] = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)
  const nextStatus = () => STATUSES[(STATUSES.indexOf(item.status) + 1) % STATUSES.length]

  return (
    <div className={`adm-card adm-submission${item.status === 'done' ? ' done' : ''}`} style={{ borderLeftColor: STATUS_COLORS[item.status] }}>
      <div className="adm-submission-head" onClick={onToggle}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="adm-submission-badges">
            <span className="adm-badge" style={{ color: TYPE_COLORS[item.type], background: TYPE_BGS[item.type] }}>{item.type}</span>
            <span className="adm-badge" style={{ color: STATUS_COLORS[item.status], background: STATUS_BGS[item.status] }}>{STATUS_LABELS[item.status]}</span>
            {item.source && <span className="adm-badge" style={{ color: 'var(--t3)', background: 'var(--bg-2)' }}>{item.source}</span>}
            <span style={{ fontSize: 10, color: 'var(--t3)' }}>{fmtDateTime(item.createdAt)}</span>
          </div>
          <div className="adm-submission-title">{item.subject || `[${item.type}] Submission`}</div>
          <p className={`adm-submission-preview${expanded ? ' expanded' : ''}`}>{item.message}</p>
          {!expanded && item.adminNotes && <div style={{ fontSize: 10, color: 'var(--accent)', marginTop: 4 }}>Has admin notes</div>}
        </div>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--t3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, transition: 'transform .2s', transform: expanded ? 'rotate(180deg)' : 'none', marginTop: 4 }}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>

      {expanded && (
        <div className="adm-submission-body">
          <div className="adm-submission-msg">{item.message}</div>
          {item.email && <div style={{ fontSize: 11, color: 'var(--t2)', marginBottom: 12 }}>From: <strong>{item.email}</strong></div>}
          <div className="adm-submission-notes">
            <div className="adm-submission-notes-title">Admin Notes</div>
            {editingNotes ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Add internal notes, action items, or a reply draft..." style={{ width: '100%', minHeight: 80, resize: 'vertical', fontSize: 12 }} autoFocus />
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn btn-s" onClick={() => { onNotesChange(item.id, notes); setEditingNotes(false) }}>Save</button>
                  <button className="btn btn-s" onClick={() => { setNotes(item.adminNotes || ''); setEditingNotes(false) }}>Cancel</button>
                </div>
              </div>
            ) : (
              <div>
                {item.adminNotes
                  ? <p style={{ fontSize: 12, color: 'var(--t0)', whiteSpace: 'pre-wrap', lineHeight: 1.6, marginBottom: 8 }}>{item.adminNotes}</p>
                  : <p style={{ fontSize: 12, color: 'var(--t3)', fontStyle: 'italic', marginBottom: 8 }}>No notes yet</p>}
                <button className="btn btn-s" onClick={() => setEditingNotes(true)} style={{ fontSize: 10 }}>{item.adminNotes ? 'Edit notes' : 'Add notes'}</button>
              </div>
            )}
          </div>
          <div className="adm-submission-actions">
            <button className="btn btn-s" onClick={() => onStatusChange(item.id, nextStatus())} style={{ fontSize: 10, color: STATUS_COLORS[nextStatus()] }}>Mark as {STATUS_LABELS[nextStatus()]}</button>
            {STATUSES.filter(s => s !== item.status && s !== nextStatus()).map(s => (
              <button key={s} className="btn btn-s" onClick={() => onStatusChange(item.id, s)} style={{ fontSize: 10, color: STATUS_COLORS[s] }}>{STATUS_LABELS[s]}</button>
            ))}
            {confirmDel ? (
              <>
                <span style={{ fontSize: 10, color: 'var(--err)', fontWeight: 600, marginLeft: 'auto' }}>Delete?</span>
                <button className="btn btn-s" onClick={() => { onDelete(item.id); setConfirmDel(false) }} style={{ fontSize: 10, color: '#fff', background: 'var(--err)', borderColor: 'var(--err)' }}>Yes</button>
                <button className="btn btn-s" onClick={() => setConfirmDel(false)} style={{ fontSize: 10 }}>No</button>
              </>
            ) : (
              <button className="btn btn-s" onClick={() => setConfirmDel(true)} style={{ fontSize: 10, color: 'var(--err)', marginLeft: 'auto' }}>Delete</button>
            )}
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

  const handleMediaUpload = async (file) => {
    if (!file) return
    const isImage = file.type.startsWith('image/')
    const isVideo = file.type.startsWith('video/')
    if (!isImage && !isVideo) { toast('Only images and videos'); return }
    if (file.size > 10 * 1024 * 1024) { toast('File must be under 10 MB'); return }
    setBusy(true)
    try {
      const mediaType = isImage ? 'image' : 'video'
      // Compute the legacy base64 data URL first (images are compressed to WebP).
      let dataUrl
      if (isImage) {
        const { processImageForUpload } = await import('../utils/imageProcessing')
        dataUrl = (await processImageForUpload(file, { maxDimension: 1200, quality: 0.8 })).dataUrl
      } else {
        dataUrl = await readFileAsDataUrl(file)
      }

      // Preferred path: upload to Firebase Storage and store a plain URL (no
      // size cap). For images upload the compressed WebP blob; for videos
      // upload the original File. If Storage is disabled the upload throws and
      // we fall back to the legacy base64 path below.
      let uploaded = false
      try {
        const blob = isImage ? dataUrlToBlob(dataUrl) : file
        const ext = isImage ? extFromDataUrl(dataUrl, 'webp') : extFromDataUrl(dataUrl, 'mp4')
        if (blob) {
          const url = await uploadCommunityMedia(blob, undefined, ext)
          await updatePrompt({ mediaType, mediaUrl: url })
          uploaded = true
        }
      } catch {
        // fall through to base64 fallback
      }

      if (!uploaded) {
        // Legacy fallback: inline base64, keeping the existing 900KB guard.
        if (dataUrl.length < 900_000) {
          await updatePrompt({ mediaType, mediaUrl: dataUrl })
        } else {
          toast(isImage ? 'Image too large after compression' : 'Video too large for storage')
        }
      }
    } catch { toast('Failed to process media') }
    setBusy(false)
  }

  const handleSave = () => {
    updatePrompt({ title, text, tags: tags.split(',').map(t => t.trim()).filter(Boolean) })
    setEditing(false)
  }

  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const handleDelete = async () => {
    setBusy(true)
    try {
      await deleteDoc(doc(db, 'community-prompts', prompt.id))
      setPendingPrompts(prev => prev.filter(p => p.id !== prompt.id))
      toast('Prompt deleted')
    } catch { toast('Delete failed') }
    setBusy(false)
    setConfirmingDelete(false)
  }

  const statusColor = { pending: 'var(--warn)', approved: 'var(--ok)', rejected: 'var(--err)' }[prompt.status] || 'var(--t2)'
  const statusBg = { pending: 'rgba(245,158,11,.1)', approved: 'rgba(16,185,129,.1)', rejected: 'rgba(239,68,68,.1)' }[prompt.status] || 'var(--bg-2)'

  return (
    <div className="adm-card adm-prompt" style={{ borderLeftColor: statusColor }}>
      <div className="adm-card-body">
        <div className="adm-prompt-header">
          <span className="adm-badge" style={{ color: statusColor, background: statusBg }}>{prompt.status}</span>
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
              <div className="adm-prompt-tags">
                {prompt.tags.map(tag => <span key={tag} className="adm-prompt-tag">{tag}</span>)}
              </div>
            )}
            {prompt.profileLink && (
              <div style={{ fontSize: 11, color: 'var(--t2)', marginBottom: 8 }}>
                Profile: <a href={prompt.profileLink} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>{prompt.profileLink}</a>
              </div>
            )}
            {prompt.mediaUrl && (
              <div style={{ marginBottom: 8, padding: 8, background: 'var(--bg-1)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                {prompt.mediaType === 'image' ? (
                  <img src={prompt.mediaUrl} alt="Prompt media" style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 6, display: 'block' }} />
                ) : (
                  <video src={prompt.mediaUrl} controls style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 6, display: 'block' }} />
                )}
                <button className="btn btn-s" onClick={() => updatePrompt({ mediaUrl: '', mediaType: '' })} disabled={busy}
                  style={{ fontSize: 10, color: 'var(--err)', marginTop: 6 }}>Remove media</button>
              </div>
            )}
          </>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
          <label
            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 600, color: 'var(--accent)', cursor: 'pointer', padding: '4px 10px', borderRadius: 'var(--radius-s)', border: '1px solid var(--border)', background: 'var(--bg-1)' }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            {prompt.mediaUrl ? 'Replace' : 'Add'} media
            <input type="file" accept="image/*,video/*" style={{ display: 'none' }} onChange={e => handleMediaUpload(e.target.files?.[0])} />
          </label>
        </div>

        <div className="adm-prompt-actions">
          {!editing && <button className="btn btn-s" onClick={() => setEditing(true)} disabled={busy} style={{ fontSize: 10 }}>Edit</button>}
          {prompt.status !== 'approved' && <button className="btn btn-s" onClick={() => updatePrompt({ status: 'approved' })} disabled={busy} style={{ fontSize: 10, color: 'var(--ok)' }}>Approve</button>}
          {prompt.status !== 'rejected' && <button className="btn btn-s" onClick={() => updatePrompt({ status: 'rejected' })} disabled={busy} style={{ fontSize: 10, color: 'var(--warn)' }}>Reject</button>}
          {confirmingDelete ? (
            <>
              <span style={{ fontSize: 10, color: 'var(--err)', fontWeight: 600, marginLeft: 'auto' }}>Delete?</span>
              <button className="btn btn-s" onClick={handleDelete} disabled={busy} style={{ fontSize: 10, color: '#fff', background: 'var(--err)', borderColor: 'var(--err)' }}>Yes</button>
              <button className="btn btn-s" onClick={() => setConfirmingDelete(false)} style={{ fontSize: 10 }}>No</button>
            </>
          ) : (
            <button className="btn btn-s" onClick={() => setConfirmingDelete(true)} disabled={busy} style={{ fontSize: 10, color: 'var(--err)', marginLeft: 'auto' }}>Delete</button>
          )}
        </div>
      </div>
    </div>
  )
}

const BOARD_COLUMNS = [
  { id: 'live', label: 'Live', color: 'var(--ok)' },
  { id: 'in-progress', label: 'In Progress', color: 'var(--brand)' },
  { id: 'planned', label: 'Planned', color: 'var(--warn)' },
  { id: 'idea', label: 'Ideas', color: 'var(--t3)' },
]
const HEALTH_COLOR = { good: 'var(--ok)', watch: 'var(--warn)', blocked: 'var(--err)' }

function ModuleBoard() {
  const [area, setArea] = useState('all')
  const [search, setSearch] = useState('')

  const areas = ['all', ...Array.from(new Set(MODULE_BOARD.map(m => m.area)))]
  const q = search.trim().toLowerCase()
  const filtered = MODULE_BOARD.filter(m => {
    if (area !== 'all' && m.area !== area) return false
    if (q && !(`${m.name} ${m.summary} ${m.area}`.toLowerCase().includes(q))) return false
    return true
  })

  return (
    <div className="adm-section">
      <div className="adm-section-h">
        <div className="adm-section-title"><span className="adm-section-bar" />Module Board ({filtered.length})</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            aria-label="Search modules"
            placeholder="Search modules…"
            style={{ fontSize: 12, padding: '6px 10px', borderRadius: 'var(--radius-s)', border: '1px solid var(--border)', background: 'var(--inp)', color: 'var(--t0)', minWidth: 160 }}
          />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 14 }}>
        {areas.map(a => (
          <button
            key={a}
            className={`adm-time-btn${area === a ? ' active' : ''}`}
            onClick={() => setArea(a)}
            style={{ textTransform: a === 'all' ? 'uppercase' : 'none', letterSpacing: '.03em' }}
          >
            {a === 'all' ? 'All areas' : a}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 14, overflowX: 'auto', paddingBottom: 12, alignItems: 'flex-start' }}>
        {BOARD_COLUMNS.map(col => {
          const cards = filtered.filter(m => m.status === col.id)
          return (
            <div key={col.id} style={{ flex: '0 0 300px', minWidth: 300, background: 'var(--bg-1)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: col.color }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--t0)', textTransform: 'uppercase', letterSpacing: '.05em' }}>{col.label}</span>
                <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--t3)', fontFamily: 'var(--mono)' }}>{cards.length}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {cards.map(m => (
                  <div key={m.id} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-s)', padding: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: HEALTH_COLOR[m.health] || 'var(--t3)', flexShrink: 0 }} title={m.health} />
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--t0)' }}>{m.name}</span>
                      <span style={{ marginLeft: 'auto', fontSize: 9, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--brand)', background: 'var(--brand-bg)', padding: '2px 7px', borderRadius: 999 }}>{m.area}</span>
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--t1)', lineHeight: 1.5, margin: '0 0 8px' }}>{m.summary}</p>
                    {m.recentChanges?.length > 0 && (
                      <div style={{ marginBottom: 8 }}>
                        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--ok)', marginBottom: 4 }}>Recent</div>
                        <ul style={{ margin: 0, paddingLeft: 14, display: 'flex', flexDirection: 'column', gap: 2 }}>
                          {m.recentChanges.slice(0, 4).map((c, i) => <li key={i} style={{ fontSize: 11, color: 'var(--t2)', lineHeight: 1.45 }}>{c}</li>)}
                        </ul>
                      </div>
                    )}
                    {m.nextSteps?.length > 0 && (
                      <div style={{ marginBottom: 8 }}>
                        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--warn)', marginBottom: 4 }}>Next</div>
                        <ul style={{ margin: 0, paddingLeft: 14, display: 'flex', flexDirection: 'column', gap: 2 }}>
                          {m.nextSteps.slice(0, 4).map((c, i) => <li key={i} style={{ fontSize: 11, color: 'var(--t2)', lineHeight: 1.45 }}>{c}</li>)}
                        </ul>
                      </div>
                    )}
                    <div style={{ fontSize: 10, color: 'var(--t3)', fontFamily: 'var(--mono)' }}>Updated {m.updated}</div>
                  </div>
                ))}
                {cards.length === 0 && <div style={{ fontSize: 11, color: 'var(--t3)', fontStyle: 'italic', padding: '8px 4px' }}>Nothing here.</div>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function StripeSetupPanel({ toast }) {
  const [config, setConfig] = useState(null)
  const [draft, setDraft] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  const authedFetch = useCallback(async (opts = {}) => {
    const { auth: fbAuth } = await import('../utils/firebase')
    const token = await fbAuth.currentUser?.getIdToken()
    if (!token) throw new Error('Not authenticated')
    const res = await fetch('/api/setup-stripe', {
      ...opts,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(opts.headers || {}) },
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.error || `Server returned ${res.status}`)
    return data
  }, [])

  const buildDraft = useCallback((data) => {
    const out = { monthly: {}, yearly: {} }
    for (const interval of ['monthly', 'yearly']) {
      const live = data.prices?.[interval]?.currencies
      for (const c of data.currencies) {
        out[interval][c.code] = (live && live[c.code] != null) ? live[c.code] : data.defaults[interval][c.code]
      }
    }
    return out
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true); setError('')
      try {
        const data = await authedFetch({ method: 'GET' })
        if (cancelled) return
        setConfig(data)
        setDraft(buildDraft(data))
      } catch (err) {
        if (!cancelled) setError(err.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [authedFetch, buildDraft])

  const save = async () => {
    setSaving(true); setError(''); setResult(null)
    try {
      const prices = { monthly: {}, yearly: {} }
      for (const interval of ['monthly', 'yearly']) {
        for (const [code, amt] of Object.entries(draft[interval])) prices[interval][code] = Number(amt)
      }
      const data = await authedFetch({ method: 'POST', body: JSON.stringify({ prices }) })
      setResult(data)
      toast?.('Prices saved to Stripe')
    } catch (err) {
      setError(err.message)
      toast?.('Save failed: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="adm-section">
      <div className="adm-section-h">
        <div className="adm-section-title"><span className="adm-section-bar" />Stripe Pricing</div>
      </div>
      {loading ? (
        <div className="adm-card"><div className="adm-empty">Loading current prices...</div></div>
      ) : !config ? (
        <div className="adm-card adm-verify-error">
          <div className="adm-card-body">
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--err)', marginBottom: 4 }}>Couldn&apos;t load Stripe config</div>
            <div style={{ fontSize: 12, color: 'var(--t1)', fontFamily: 'var(--mono)' }}>{error}</div>
          </div>
        </div>
      ) : (
        <>
          <div className="adm-card" style={{ marginBottom: 16 }}>
            <div className="adm-card-body">
              <p className="adm-stripe-desc">
                Set the monthly and yearly price for the <strong>UIL4B Pro</strong> plan per currency. Each customer is
                shown their local currency at checkout automatically (detected from their browser locale).
              </p>
              <p className="adm-stripe-tip">
                Tip: keep amounts ending in <strong>.99</strong>. Saving creates fresh Stripe prices and retires the old ones — existing subscribers keep their current rate.
              </p>
              <div style={{ overflowX: 'auto' }}>
                <table className="adm-stripe-table">
                  <thead>
                    <tr>
                      <th>Currency</th>
                      <th>Monthly</th>
                      <th>Yearly</th>
                    </tr>
                  </thead>
                  <tbody>
                    {config.currencies.map(c => (
                      <tr key={c.code}>
                        <td style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                          <span style={{ fontWeight: 600 }}>{c.code.toUpperCase()}</span>
                          <span style={{ color: 'var(--t3)', marginLeft: 6 }}>{c.label}</span>
                          {c.code === config.baseCurrency && <span style={{ color: 'var(--accent)', marginLeft: 6, fontSize: 10 }}>base</span>}
                        </td>
                        {['monthly', 'yearly'].map(interval => (
                          <td key={interval}>
                            <div className="adm-stripe-input">
                              <span>{c.symbol}</span>
                              <input type="number" min="0" step="0.01" value={draft[interval][c.code]} onChange={e => setDraft(d => ({ ...d, [interval]: { ...d[interval], [c.code]: e.target.value } }))} />
                            </div>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="adm-stripe-actions">
                <button className="btn btn-accent" onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save Prices to Stripe'}</button>
                <button className="btn btn-s" onClick={() => setDraft(buildDraft({ ...config, prices: {} }))} disabled={saving}>Reset to defaults</button>
              </div>
            </div>
          </div>

          {error && (
            <div className="adm-card adm-verify-error" style={{ marginBottom: 16 }}>
              <div className="adm-card-body">
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--err)', marginBottom: 4 }}>Error</div>
                <div style={{ fontSize: 12, color: 'var(--t1)', fontFamily: 'var(--mono)' }}>{error}</div>
              </div>
            </div>
          )}

          {result && (
            <div className="adm-card" style={{ borderLeft: '3px solid var(--ok)', marginBottom: 16 }}>
              <div className="adm-card-body">
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ok)', marginBottom: 10 }}>Prices Saved</div>
                <div style={{ fontSize: 12, fontFamily: 'var(--mono)', lineHeight: 2, color: 'var(--t0)' }}>
                  <div>Product: <strong>{result.product}</strong></div>
                  <div>Monthly price: <strong>{result.prices?.monthly?.id}</strong></div>
                  <div>Yearly price: <strong>{result.prices?.yearly?.id}</strong></div>
                </div>
                <p style={{ fontSize: 11, color: 'var(--t2)', marginTop: 10 }}>{result.note}</p>
              </div>
            </div>
          )}

          <div className="adm-card" style={{ background: 'var(--bg-1)' }}>
            <div className="adm-card-header"><span className="adm-card-title">Required Vercel Env Vars</span></div>
            <div className="adm-card-body">
              <div className="adm-stripe-env">
                <div>STRIPE_SECRET_KEY <span>— sk_live_... or sk_test_...</span></div>
                <div>VITE_STRIPE_PUBLISHABLE_KEY <span>— pk_live_... or pk_test_...</span></div>
                <div>STRIPE_WEBHOOK_SECRET <span>— whsec_... (from Stripe dashboard)</span></div>
                <div>FIREBASE_SERVICE_ACCOUNT_KEY <span>— JSON string (for auth token verification)</span></div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ── Main Component ──────────────────────────────────────────

export default function Admin({ toast }) {
  const { user } = useAuth()
  const isAdminUser = !!user?.email && ADMIN_EMAILS.includes(user.email.toLowerCase())
  const [unlocked, setUnlocked] = useState(false)
  const [code, setCode] = useState('')
  const [tab, setTab] = useState('overview')
  const [timeRange, setTimeRange] = useState('7d')
  const [data, setData] = useState(null)
  const [feedback, setFeedback] = useState([])
  const [filterType, setFilterType] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [expandedId, setExpandedId] = useState(null)
  const [pendingPrompts, setPendingPrompts] = useState([])
  const [promptFilter, setPromptFilter] = useState('pending')
  const [designData, setDesignData] = useState(null)
  const [rawViews, setRawViews] = useState([])
  const [rawSessions, setRawSessions] = useState([])
  // Cross-user aggregate (server-read). null = loading, object = loaded.
  const [aggregate, setAggregate] = useState(null)
  const [aggregateLoaded, setAggregateLoaded] = useState(false)

  const refresh = useCallback(async () => {
    setData(getAnalyticsSummary())
    setDesignData(getDesignAnalytics())
    setRawViews(getPageViews())
    setRawSessions(getSessions())
    // Cross-user aggregate from Firestore (safe-empty on failure). Non-blocking
    // relative to the localStorage data above, which renders immediately.
    setAggregateLoaded(false)
    getAggregateAnalytics(30)
      .then(agg => setAggregate(agg))
      .catch(() => setAggregate({ totalViews: 0, byPath: [], byTool: [], days: [] }))
      .finally(() => setAggregateLoaded(true))
    const localFeedback = getFeedback()
    let merged = [...localFeedback]
    try {
      const q2 = query(collection(db, 'feedback'), orderBy('createdAt', 'desc'))
      const snap = await getDocs(q2)
      const fsFeedback = snap.docs.map(d => ({ ...d.data(), id: d.id, _fs: true, source: d.data().source || 'firestore' }))
      const localIds = new Set(localFeedback.map(f => f.id))
      fsFeedback.forEach(f => { if (!localIds.has(f.id)) merged.push(f) })
    } catch { /* firestore unavailable */ }
    setFeedback(merged)
    try {
      const promptSnap = await getDocs(query(collection(db, 'community-prompts'), orderBy('createdAt', 'desc')))
      setPendingPrompts(promptSnap.docs.map(d => ({ ...d.data(), id: d.id })))
    } catch { /* firestore unavailable */ }
  }, [])

  const [serverVerified, setServerVerified] = useState(false)
  const [verifyError, setVerifyError] = useState('')

  useEffect(() => {
    if (!isAdminUser || serverVerified) return
    ;(async () => {
      try {
        const { auth: fbAuth } = await import('../utils/firebase')
        const token = await fbAuth.currentUser?.getIdToken()
        if (!token) return
        const res = await fetch('/api/verify-admin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        })
        const data = await res.json().catch(() => ({}))
        if (data.isAdmin) { setServerVerified(true); setVerifyError('') }
        else { setVerifyError(data.error || `Server returned ${res.status}`); toast?.('Admin verification failed') }
      } catch { /* offline */ }
    })()
  }, [isAdminUser, serverVerified]) // eslint-disable-line react-hooks/exhaustive-deps

  const effectiveUnlocked = unlocked || isAdminUser

  useEffect(() => {
    if (effectiveUnlocked) refresh()
  }, [effectiveUnlocked, refresh])

  // ── Derived data ──

  const filteredViews = useMemo(() => rawViews.filter(v => timeFilter(v.timestamp, timeRange)), [rawViews, timeRange])
  const filteredSessions = useMemo(() => rawSessions.filter(s => timeFilter(s.timestamp, timeRange)), [rawSessions, timeRange])

  const viewsChartData = useMemo(() => {
    if (!filteredViews.length) return []
    const now = Date.now()
    let buckets, labels
    if (timeRange === 'today') {
      buckets = Array(24).fill(0)
      labels = Array.from({ length: 24 }, (_, i) => `${i}h`)
      filteredViews.forEach(v => { const h = new Date(v.timestamp).getHours(); buckets[h]++ })
    } else if (timeRange === '7d') {
      buckets = Array(7).fill(0)
      labels = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(now - (6 - i) * DAY)
        return d.toLocaleDateString([], { weekday: 'short' })
      })
      filteredViews.forEach(v => {
        const daysAgo = Math.floor((now - v.timestamp) / DAY)
        if (daysAgo < 7) buckets[6 - daysAgo]++
      })
    } else if (timeRange === '30d') {
      buckets = Array(30).fill(0)
      labels = Array.from({ length: 30 }, (_, i) => {
        const d = new Date(now - (29 - i) * DAY)
        return i % 5 === 0 ? d.toLocaleDateString([], { month: 'short', day: 'numeric' }) : ''
      })
      filteredViews.forEach(v => {
        const daysAgo = Math.floor((now - v.timestamp) / DAY)
        if (daysAgo < 30) buckets[29 - daysAgo]++
      })
    } else {
      const oldest = Math.min(...filteredViews.map(v => v.timestamp))
      const span = now - oldest
      const numBuckets = Math.min(30, Math.max(7, Math.ceil(span / DAY)))
      buckets = Array(numBuckets).fill(0)
      labels = Array.from({ length: numBuckets }, (_, i) => {
        const d = new Date(oldest + (i / (numBuckets - 1)) * span)
        return i % Math.ceil(numBuckets / 6) === 0 ? d.toLocaleDateString([], { month: 'short', day: 'numeric' }) : ''
      })
      filteredViews.forEach(v => {
        const idx = Math.min(numBuckets - 1, Math.floor(((v.timestamp - oldest) / span) * numBuckets))
        buckets[idx]++
      })
    }
    return buckets.map((v, i) => ({ value: v, label: labels[i] }))
  }, [filteredViews, timeRange])

  const bounceRate = useMemo(() => {
    if (!filteredSessions.length) return 0
    return Math.round(filteredSessions.filter(s => s.pages <= 1).length / filteredSessions.length * 100)
  }, [filteredSessions])

  const avgDuration = useMemo(() => {
    if (!filteredSessions.length) return 0
    return Math.round(filteredSessions.reduce((s, sess) => s + sess.duration, 0) / filteredSessions.length / 1000)
  }, [filteredSessions])

  const topPagesFiltered = useMemo(() => {
    const counts = {}
    filteredViews.forEach(v => { counts[v.path] = (counts[v.path] || 0) + 1 })
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 10)
  }, [filteredViews])

  const sessionsPerDay = useMemo(() => {
    const last7 = Array(7).fill(0)
    const now = Date.now()
    rawSessions.forEach(s => {
      const d = Math.floor((now - s.timestamp) / DAY)
      if (d < 7) last7[6 - d]++
    })
    return last7
  }, [rawSessions])

  // Submission stats
  const newCount = feedback.filter(f => f.status === 'new').length
  const inProgressCount = feedback.filter(f => f.status === 'in-progress').length

  const filteredFeedback = useMemo(() =>
    [...feedback].reverse().filter(item => {
      if (filterType !== 'all' && item.type !== filterType) return false
      if (filterStatus !== 'all' && item.status !== filterStatus) return false
      return true
    }),
  [feedback, filterType, filterStatus])

  const feedbackDonut = useMemo(() => {
    const types = ['bug', 'feature', 'general', 'help']
    return types.map(t => ({ label: t.charAt(0).toUpperCase() + t.slice(1), value: feedback.filter(f => f.type === t).length })).filter(d => d.value > 0)
  }, [feedback])

  // ── Handlers ──

  const handleUnlock = (e) => {
    e.preventDefault()
    if (code.trim() === ADMIN_CODE) { setUnlocked(true); toast('Admin access granted') }
    else toast('Invalid code')
    setCode('')
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

  // ── Lock screen ──

  if (!effectiveUnlocked) {
    return (
      <div className="sec">
        <div className="adm-lock">
          <div className="adm-lock-eyebrow">Admin Access</div>
          <h1>Developer Dashboard</h1>
          <p>{user ? 'Your account does not have admin access. Enter the admin code to continue.' : 'Sign in with an owner account, or enter the admin code.'}</p>
          <form onSubmit={handleUnlock}>
            <input type="password" value={code} onChange={e => setCode(e.target.value)} placeholder="Enter admin code" autoFocus />
            <button className="btn btn-accent" type="submit">Unlock</button>
          </form>
        </div>
      </div>
    )
  }

  if (!data) return null

  // ── Dashboard ──

  return (
    <div className="sec adm">
      {/* Header */}
      <div className="adm-header">
        <div className="adm-header-left">
          <div className="adm-status"><span className="adm-status-dot" /> Admin Mode</div>
          <h1>Dashboard</h1>
        </div>
        <div className="adm-actions">
          <div className="adm-time-filter">
            {TIME_RANGES.map(t => (
              <button key={t.id} className={`adm-time-btn${timeRange === t.id ? ' active' : ''}`} onClick={() => setTimeRange(t.id)}>{t.label}</button>
            ))}
          </div>
          <Link to="/style-guide" className="btn btn-s">Style Guide</Link>
          <button className="btn btn-s" onClick={refresh}>Refresh</button>
          <button className="btn btn-s" onClick={exportCSV}>Export CSV</button>
          {!isAdminUser && <button className="btn btn-s" onClick={() => { setUnlocked(false); toast('Admin access revoked') }} style={{ color: 'var(--err)' }}>Lock</button>}
        </div>
      </div>

      {verifyError && (
        <div className="adm-card adm-verify-error" style={{ marginBottom: 20 }}>
          <div className="adm-card-body">
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--err)', marginBottom: 6 }}>Server admin verification failed</div>
            <div style={{ fontSize: 12, color: 'var(--t1)', lineHeight: 1.7 }}>{verifyError}</div>
            <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 8 }}>Server-backed actions (Stripe setup) won&apos;t work until resolved. Local analytics below still function.</div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="adm-tabs">
        {TABS.map(t => (
          <button key={t.id} className={`adm-tab${tab === t.id ? ' active' : ''}`} onClick={() => setTab(t.id)}>
            {t.label}
            {t.id === 'submissions' && (newCount + inProgressCount) > 0 && (
              <span className="adm-tab-badge">{newCount + inProgressCount}</span>
            )}
          </button>
        ))}
      </div>

      {/* ═══════ OVERVIEW TAB ═══════ */}
      {tab === 'overview' && (
        <>
          {/* Stat cards — derived from THIS browser's localStorage only */}
          <div className="adm-section">
            <div className="adm-section-h">
              <div className="adm-section-title"><span className="adm-section-bar" />This device · local analytics</div>
              <span style={{ fontSize: 11, color: 'var(--t3)' }}>Tracked in this browser&apos;s localStorage</span>
            </div>
            <div className="adm-stats">
              <div className="adm-stat">
                <div className="adm-stat-value">{fmtNum(filteredViews.length)}</div>
                <div className="adm-stat-label">Page Views</div>
                <div className="adm-stat-sub">{timeRange === 'all' ? 'All time' : TIME_RANGES.find(t => t.id === timeRange)?.label}</div>
              </div>
              <div className="adm-stat">
                <div className="adm-stat-value">{fmtNum(filteredSessions.length)}</div>
                <div className="adm-stat-label">Sessions</div>
                <Sparkline data={sessionsPerDay} />
              </div>
              <div className="adm-stat">
                <div className="adm-stat-value">{bounceRate}%</div>
                <div className="adm-stat-label">Bounce Rate</div>
                <div className="adm-stat-sub">Single-page sessions</div>
              </div>
              <div className="adm-stat">
                <div className="adm-stat-value">{fmtDuration(avgDuration)}</div>
                <div className="adm-stat-label">Avg Duration</div>
                <div className="adm-stat-sub">Per session</div>
              </div>
              <div className="adm-stat">
                <div className="adm-stat-value">{data.users.length}</div>
                <div className="adm-stat-label">Registered Users</div>
                <div className="adm-stat-sub">Profile cache</div>
              </div>
              <div className="adm-stat">
                <div className="adm-stat-value">{feedback.length}</div>
                <div className="adm-stat-label">Submissions</div>
                <div className="adm-stat-sub">
                  <span style={{ color: 'var(--warn)' }}>{newCount} new</span>{' / '}
                  <span style={{ color: 'var(--accent)' }}>{inProgressCount} open</span>
                </div>
              </div>
            </div>
          </div>

          {/* All users · aggregate — read from Firestore (cross-device) */}
          <div className="adm-section">
            <div className="adm-section-h">
              <div className="adm-section-title"><span className="adm-section-bar" />All users · aggregate</div>
              <span style={{ fontSize: 11, color: 'var(--t3)' }}>Server totals · last 30 days · all signed-in users</span>
            </div>
            {!aggregateLoaded ? (
              <div className="adm-card"><div className="adm-empty">Loading aggregate analytics…</div></div>
            ) : !aggregate || (aggregate.totalViews === 0 && aggregate.byPath.length === 0 && aggregate.byTool.length === 0) ? (
              <div className="adm-card">
                <div className="adm-card-body">
                  <div className="adm-empty">No aggregate data yet.</div>
                  <p style={{ fontSize: 11, color: 'var(--t3)', textAlign: 'center', margin: '6px 0 0' }}>
                    Counts appear once signed-in users browse. If this stays empty, the <span className="mono">analytics-daily</span> Firestore rules may still need publishing.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="adm-stats" style={{ marginBottom: 24 }}>
                  <div className="adm-stat">
                    <div className="adm-stat-value">{fmtNum(aggregate.totalViews)}</div>
                    <div className="adm-stat-label">Total Page Views</div>
                    <div className="adm-stat-sub">All signed-in users</div>
                  </div>
                  <div className="adm-stat">
                    <div className="adm-stat-value">{fmtNum(aggregate.byPath.length)}</div>
                    <div className="adm-stat-label">Distinct Pages</div>
                    <div className="adm-stat-sub">With recorded views</div>
                  </div>
                  <div className="adm-stat">
                    <div className="adm-stat-value">{fmtNum(aggregate.byTool.reduce((s, t) => s + t[1], 0))}</div>
                    <div className="adm-stat-label">Tool Actions</div>
                    <div className="adm-stat-sub">{aggregate.byTool.length} tool types</div>
                  </div>
                  <div className="adm-stat">
                    <div className="adm-stat-value">{fmtNum(aggregate.days.length)}</div>
                    <div className="adm-stat-label">Active Days</div>
                    <div className="adm-stat-sub">In last 30 days</div>
                  </div>
                </div>
                <div className="adm-grid-2" style={{ marginBottom: 0 }}>
                  <div className="adm-card">
                    <div className="adm-card-header">
                      <span className="adm-card-title">Top Pages (all users)</span>
                      <span style={{ fontSize: 10, color: 'var(--t3)' }}>{aggregate.byPath.length} pages</span>
                    </div>
                    <div className="adm-card-body">
                      {aggregate.byPath.length > 0 ? (
                        <div className="adm-bar">
                          {(() => {
                            const max = aggregate.byPath[0]?.[1] || 1
                            return aggregate.byPath.slice(0, 8).map(([path, count]) => (
                              <div key={path} className="adm-bar-row">
                                <span className="adm-bar-label">{path === 'root' ? '/' : path.replace(/_/g, '/')}</span>
                                <div className="adm-bar-track"><div className="adm-bar-fill" style={{ width: `${(count / max) * 100}%` }} /></div>
                                <span className="adm-bar-value">{count}</span>
                              </div>
                            ))
                          })()}
                        </div>
                      ) : <div className="adm-empty">No page data yet</div>}
                    </div>
                  </div>

                  <div className="adm-card">
                    <div className="adm-card-header">
                      <span className="adm-card-title">Top Tools (all users)</span>
                      <span style={{ fontSize: 10, color: 'var(--t3)' }}>{aggregate.byTool.length} tools</span>
                    </div>
                    <div className="adm-card-body">
                      {aggregate.byTool.length > 0 ? (
                        <div className="adm-bar">
                          {(() => {
                            const max = aggregate.byTool[0]?.[1] || 1
                            return aggregate.byTool.slice(0, 8).map(([tool, count]) => (
                              <div key={tool} className="adm-bar-row">
                                <span className="adm-bar-label">{tool}</span>
                                <div className="adm-bar-track"><div className="adm-bar-fill" style={{ width: `${(count / max) * 100}%` }} /></div>
                                <span className="adm-bar-value">{count}</span>
                              </div>
                            ))
                          })()}
                        </div>
                      ) : <div className="adm-empty">No tool usage yet</div>}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Charts row — local (this device) */}
          <div className="adm-grid-2" style={{ marginBottom: 32 }}>
            <div className="adm-card">
              <div className="adm-card-header">
                <span className="adm-card-title">Page Views</span>
                <span style={{ fontSize: 10, color: 'var(--t3)' }}>{filteredViews.length} total</span>
              </div>
              <div className="adm-card-body">
                <AreaChart data={viewsChartData} />
              </div>
            </div>

            <div className="adm-card">
              <div className="adm-card-header">
                <span className="adm-card-title">Submissions by Type</span>
              </div>
              <div className="adm-card-body">
                {feedbackDonut.length > 0
                  ? <DonutChart segments={feedbackDonut} />
                  : <div className="adm-empty">No submissions yet</div>}
              </div>
            </div>
          </div>

          {/* Top pages + insights */}
          <div className="adm-grid-3" style={{ marginBottom: 32 }}>
            <div className="adm-card">
              <div className="adm-card-header">
                <span className="adm-card-title">Top Pages</span>
              </div>
              <div className="adm-card-body">
                {topPagesFiltered.length > 0 ? (
                  <div className="adm-bar">
                    {(() => {
                      const max = topPagesFiltered[0]?.[1] || 1
                      return topPagesFiltered.slice(0, 8).map(([page, count]) => (
                        <div key={page} className="adm-bar-row">
                          <span className="adm-bar-label">{page.replace(/^\//, '') || '/'}</span>
                          <div className="adm-bar-track"><div className="adm-bar-fill" style={{ width: `${(count / max) * 100}%` }} /></div>
                          <span className="adm-bar-value">{count}</span>
                        </div>
                      ))
                    })()}
                  </div>
                ) : <div className="adm-empty">No page data yet</div>}
              </div>
            </div>

            <div className="adm-card">
              <div className="adm-card-header">
                <span className="adm-card-title">Feature Requests</span>
                <span style={{ fontSize: 10, color: 'var(--t3)' }}>{feedback.filter(f => f.type === 'feature').length} total</span>
              </div>
              <div className="adm-card-body">
                <div className="adm-list">
                  {feedback.filter(f => f.type === 'feature').slice(-6).reverse().map((f, i) => (
                    <div key={f.id || i} className="adm-list-row">
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--t0)', marginBottom: 2 }}>{f.subject || 'No subject'}</div>
                        <div style={{ fontSize: 11, color: 'var(--t2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.message}</div>
                      </div>
                      <span className="adm-badge" style={{ color: STATUS_COLORS[f.status], background: STATUS_BGS[f.status] }}>{STATUS_LABELS[f.status]}</span>
                    </div>
                  ))}
                  {feedback.filter(f => f.type === 'feature').length === 0 && <div className="adm-empty" style={{ padding: 16 }}>No feature requests yet</div>}
                </div>
              </div>
            </div>

            <div className="adm-card">
              <div className="adm-card-header">
                <span className="adm-card-title">Open Bugs</span>
              </div>
              <div className="adm-card-body">
                <div className="adm-feed">
                  {feedback.filter(f => f.type === 'bug' && f.status !== 'done').map(f => (
                    <div key={f.id} className="adm-feed-item">
                      <span className="adm-feed-dot" style={{ background: STATUS_COLORS[f.status] }} />
                      <div className="adm-feed-body">
                        <div className="adm-feed-text">{f.subject || 'No subject'}</div>
                        <div className="adm-feed-meta">{STATUS_LABELS[f.status]} · {fmtDateTime(f.createdAt)}</div>
                      </div>
                    </div>
                  ))}
                  {feedback.filter(f => f.type === 'bug' && f.status !== 'done').length === 0 && (
                    <div style={{ padding: 12, display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--ok)' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
                      No open bugs
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Setup checklist */}
          <div className="adm-section">
            <div className="adm-section-h">
              <div className="adm-section-title"><span className="adm-section-bar" />Setup Checklist</div>
            </div>
            <div className="adm-card">
              <div className="adm-card-body">
                <div className="adm-checklist">
                  {[
                    { label: 'Firebase Auth configured', ok: true, note: 'Enable Email/Password + Google providers in Firebase Console' },
                    { label: 'Firestore database created', ok: true, note: 'Set region to australia-southeast1 (Sydney) in Firebase Console' },
                    { label: 'Firestore security rules deployed', ok: false, note: 'Deploy firestore.rules from repo root via Firebase CLI' },
                    { label: 'Email notifications', ok: false, note: 'Set RESEND_API_KEY + SUPPORT_NOTIFY_EMAIL env vars in Vercel' },
                    { label: 'Google Sheets sync', ok: !!import.meta.env.VITE_SHEETS_ENABLED, note: 'Set GOOGLE_SHEETS_WEBHOOK_URL in Vercel — see docs/google-sheets-setup.md' },
                    { label: 'Custom domain', ok: true, note: 'uil4b.com configured' },
                  ].map((item, i) => (
                    <div key={i} className="adm-check-row">
                      <div className={`adm-check-icon ${item.ok ? 'done' : 'pending'}`}>
                        {item.ok
                          ? <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--ok)" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
                          : <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--warn)" strokeWidth="3" strokeLinecap="round"><circle cx="12" cy="12" r="1" /></svg>}
                      </div>
                      <div>
                        <div className="adm-check-label">{item.label}</div>
                        <div className="adm-check-note">{item.note}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ═══════ DESIGN ANALYTICS TAB ═══════ */}
      {tab === 'design' && designData && (
        <>
          <div className="adm-grid-2" style={{ marginBottom: 32 }}>
            <div className="adm-card">
              <div className="adm-card-header">
                <span className="adm-card-title">Most Copied Fonts</span>
                <span style={{ fontSize: 10, color: 'var(--t3)' }}>{Object.keys(designData.fontCopies || {}).length} fonts</span>
              </div>
              <div className="adm-card-body">
                {(() => {
                  const entries = Object.entries(designData.fontCopies || {}).sort((a, b) => b[1] - a[1]).slice(0, 10)
                  if (!entries.length) return <div className="adm-empty">No font copy data yet</div>
                  const max = entries[0][1]
                  return (
                    <div className="adm-bar">
                      {entries.map(([font, count]) => (
                        <div key={font} className="adm-bar-row">
                          <span className="adm-bar-label" style={{ fontFamily: 'inherit' }}>{font}</span>
                          <div className="adm-bar-track"><div className="adm-bar-fill" style={{ width: `${(count / max) * 100}%` }} /></div>
                          <span className="adm-bar-value">{count}</span>
                        </div>
                      ))}
                    </div>
                  )
                })()}
              </div>
            </div>

            <div className="adm-card">
              <div className="adm-card-header">
                <span className="adm-card-title">Font Copy Distribution</span>
              </div>
              <div className="adm-card-body">
                {(() => {
                  const entries = Object.entries(designData.fontCopies || {}).sort((a, b) => b[1] - a[1]).slice(0, 8)
                  if (!entries.length) return <div className="adm-empty">No data yet</div>
                  return <AreaChart data={entries.map(([font, count]) => ({ label: font.split(' ')[0], value: count }))} height={100} />
                })()}
              </div>
            </div>
          </div>

          <div className="adm-grid-2" style={{ marginBottom: 32 }}>
            <div className="adm-card">
              <div className="adm-card-header">
                <span className="adm-card-title">Most Picked Colours</span>
              </div>
              <div className="adm-card-body">
                {(() => {
                  const entries = Object.entries(designData.colourPicks || {}).sort((a, b) => b[1] - a[1]).slice(0, 10)
                  if (!entries.length) return <div className="adm-empty">No colour pick data yet</div>
                  return (
                    <div className="adm-list">
                      {entries.map(([hex, count]) => (
                        <div key={hex} className="adm-swatch-row">
                          <div className="adm-swatch" style={{ background: hex }} />
                          <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--t0)', flex: 1 }}>{hex}</span>
                          <span className="adm-list-value">{count}x</span>
                        </div>
                      ))}
                    </div>
                  )
                })()}
              </div>
            </div>

            <div className="adm-card">
              <div className="adm-card-header">
                <span className="adm-card-title">Colour Palette Overview</span>
              </div>
              <div className="adm-card-body">
                {(() => {
                  const entries = Object.entries(designData.colourPicks || {}).sort((a, b) => b[1] - a[1]).slice(0, 30)
                  if (!entries.length) return <div className="adm-empty">No data yet</div>
                  return (
                    <div className="adm-swatch-grid">
                      {entries.map(([hex, count]) => (
                        <div key={hex} className="adm-swatch" title={`${hex} — ${count} picks`} style={{
                          background: hex,
                          width: Math.max(24, Math.min(48, count * 6)),
                          height: Math.max(24, Math.min(48, count * 6)),
                        }} />
                      ))}
                    </div>
                  )
                })()}
              </div>
            </div>
          </div>

          <div className="adm-section">
            <div className="adm-section-h">
              <div className="adm-section-title"><span className="adm-section-bar" />Tool Usage</div>
            </div>
            <div className="adm-card">
              <div className="adm-card-body">
                {(() => {
                  const entries = Object.entries(designData.toolUsage || {}).sort((a, b) => b[1] - a[1]).slice(0, 10)
                  if (!entries.length) return <div className="adm-empty">No tool usage data yet</div>
                  const max = entries[0][1]
                  return (
                    <div className="adm-bar">
                      {entries.map(([tool, count]) => (
                        <div key={tool} className="adm-bar-row">
                          <span className="adm-bar-label">{tool}</span>
                          <div className="adm-bar-track"><div className="adm-bar-fill" style={{ width: `${(count / max) * 100}%` }} /></div>
                          <span className="adm-bar-value">{count}</span>
                        </div>
                      ))}
                    </div>
                  )
                })()}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ═══════ SUBMISSIONS TAB ═══════ */}
      {tab === 'submissions' && (
        <div className="adm-section">
          <div className="adm-section-h">
            <div className="adm-section-title"><span className="adm-section-bar" />Submissions ({filteredFeedback.length})</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {['all', 'bug', 'feature', 'general', 'help'].map(t => (
                <button key={t} className={`adm-time-btn${filterType === t ? ' active' : ''}`} onClick={() => setFilterType(t)} style={{ textTransform: 'uppercase', letterSpacing: '.04em' }}>
                  {t === 'all' ? 'All Types' : t}
                </button>
              ))}
              <span style={{ width: 1, background: 'var(--border)', margin: '0 4px' }} />
              {['all', ...STATUSES].map(s => (
                <button key={s} className={`adm-time-btn${filterStatus === s ? ' active' : ''}`} onClick={() => setFilterStatus(s)} style={{ textTransform: 'uppercase', letterSpacing: '.04em' }}>
                  {s === 'all' ? 'All' : STATUS_LABELS[s]}
                </button>
              ))}
            </div>
          </div>
          {filteredFeedback.length === 0 && <div className="adm-card"><div className="adm-empty">{feedback.length === 0 ? 'No submissions yet.' : 'No submissions match filters.'}</div></div>}
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
        </div>
      )}

      {/* ═══════ PAGES TAB ═══════ */}
      {tab === 'pages' && (
        <>
          <div className="adm-section">
            <div className="adm-section-h"><div className="adm-section-title"><span className="adm-section-bar" />Most Visited Pages</div></div>
            <div className="adm-card">
              <div className="adm-table-wrap">
                <table className="adm-table">
                  <thead><tr><th>Page</th><th>Views</th><th>% of Total</th></tr></thead>
                  <tbody>
                    {data.topPages.map(([page, count]) => (
                      <tr key={page}>
                        <td className="mono bold">{page || '/'}</td>
                        <td>{count}</td>
                        <td className="accent">{data.totalViews > 0 ? `${Math.round((count / data.totalViews) * 100)}%` : '0%'}</td>
                      </tr>
                    ))}
                    {data.topPages.length === 0 && <tr><td colSpan={3}><div className="adm-empty">No data</div></td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="adm-section">
            <div className="adm-section-h"><div className="adm-section-title"><span className="adm-section-bar" />Bounce Rate by Entry Page</div></div>
            <div className="adm-card">
              <div className="adm-table-wrap">
                <table className="adm-table">
                  <thead><tr><th>Entry Page</th><th>Entries</th><th>Bounces</th><th>Rate</th></tr></thead>
                  <tbody>
                    {data.bounceByPage.map(b => (
                      <tr key={b.page}>
                        <td className="mono bold">{b.page || '/'}</td>
                        <td>{b.total}</td>
                        <td>{b.bounces}</td>
                        <td className="accent">{b.rate}%</td>
                      </tr>
                    ))}
                    {data.bounceByPage.length === 0 && <tr><td colSpan={4}><div className="adm-empty">No data</div></td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="adm-grid-2">
            <div className="adm-section">
              <div className="adm-section-h"><div className="adm-section-title"><span className="adm-section-bar" />Top Exit Pages</div></div>
              <div className="adm-card">
                <div className="adm-table-wrap">
                  <table className="adm-table">
                    <thead><tr><th>Exit Page</th><th>Exits</th></tr></thead>
                    <tbody>
                      {data.topExitPages.map(([page, count]) => (
                        <tr key={page}><td className="mono bold">{page || '/'}</td><td>{count}</td></tr>
                      ))}
                      {data.topExitPages.length === 0 && <tr><td colSpan={2}><div className="adm-empty">No data</div></td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="adm-section">
              <div className="adm-section-h"><div className="adm-section-title"><span className="adm-section-bar" />Top Entry Pages</div></div>
              <div className="adm-card">
                <div className="adm-table-wrap">
                  <table className="adm-table">
                    <thead><tr><th>Entry Page</th><th>Entries</th></tr></thead>
                    <tbody>
                      {data.topEntryPages.map(([page, count]) => (
                        <tr key={page}><td className="mono bold">{page || '/'}</td><td>{count}</td></tr>
                      ))}
                      {data.topEntryPages.length === 0 && <tr><td colSpan={2}><div className="adm-empty">No data</div></td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ═══════ USERS TAB ═══════ */}
      {tab === 'users' && (
        <div className="adm-section">
          <div className="adm-section-h"><div className="adm-section-title"><span className="adm-section-bar" />Registered Users ({data.users.length})</div></div>
          <div className="adm-card">
            <div className="adm-table-wrap">
              <table className="adm-table">
                <thead><tr><th>Email</th><th>Name</th><th>Provider</th><th>Joined</th></tr></thead>
                <tbody>
                  {data.users.map(u => (
                    <tr key={u.uid}>
                      <td className="mono bold">{u.email}</td>
                      <td>{u.displayName || '—'}</td>
                      <td>{u.provider || 'email'}</td>
                      <td>{fmtDate(u.createdAt)}</td>
                    </tr>
                  ))}
                  {data.users.length === 0 && <tr><td colSpan={4}><div className="adm-empty">No users yet</div></td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ═══════ BOARD TAB ═══════ */}
      {tab === 'board' && <ModuleBoard />}

      {/* ═══════ PROMPTS TAB ═══════ */}
      {tab === 'prompts' && (
        <div className="adm-section">
          <div className="adm-section-h">
            <div className="adm-section-title"><span className="adm-section-bar" />Community Prompts ({pendingPrompts.length})</div>
            <div style={{ display: 'flex', gap: 4 }}>
              {['pending', 'approved', 'rejected', 'all'].map(f => (
                <button key={f} className={`adm-time-btn${promptFilter === f ? ' active' : ''}`} onClick={() => setPromptFilter(f)} style={{ textTransform: 'uppercase', letterSpacing: '.04em' }}>
                  {f}
                </button>
              ))}
            </div>
          </div>
          {pendingPrompts
            .filter(p => promptFilter === 'all' || p.status === promptFilter)
            .map(prompt => (
              <PromptAdminCard key={prompt.id} prompt={prompt} setPendingPrompts={setPendingPrompts} toast={toast} />
            ))}
          {pendingPrompts.filter(p => promptFilter === 'all' || p.status === promptFilter).length === 0 && (
            <div className="adm-card"><div className="adm-empty">No {promptFilter === 'all' ? '' : promptFilter} prompts yet.</div></div>
          )}
        </div>
      )}

      {/* ═══════ STRIPE TAB ═══════ */}
      {tab === 'stripe' && <StripeSetupPanel toast={toast} />}
    </div>
  )
}
