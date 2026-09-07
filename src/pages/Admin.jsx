import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import { getAnalyticsSummary, getPageViews, getSessions, getFeedback, updateFeedbackStatus, updateFeedbackNotes, deleteFeedback, getDesignAnalytics, getAggregateAnalytics, resetColourPicks, resetPageAnalytics } from '../utils/analytics'
import { collection, getDocs, doc, updateDoc, deleteDoc, query, orderBy } from 'firebase/firestore'
import { db } from '../utils/firebase'
import CommunityQueue from '../components/admin/CommunityQueue'
import { listFeedback, setFeedbackStatus, setFeedbackNotes, deleteFeedbackDoc } from '../utils/feedbackQueueApi'
import { useModerationRole } from '../hooks/useModerationRole'
import {
  FEEDBACK_STATUSES, FEEDBACK_STATUS_LABELS, nextFeedbackStatus,
  canReview, canSeeReporterEmail,
} from '../utils/moderation'
import { uploadCommunityMedia, dataUrlToBlob, extFromDataUrl } from '../utils/mediaUpload'
import { useAuth } from '../contexts/AuthContext'
import { ADMIN_EMAILS } from '../utils/constants'
import { MODULE_BOARD } from '../data/moduleBoard'
// src/data/pipeline.js is NOT imported here. It is loaded by PipelineBoard with
// a dynamic import() — see the note above that component for the measurement.
import { resolvePromptProfileLink } from '../utils/promptSubmission'
import { toCsv } from '../utils/csv'

const ADMIN_CODE = 'uil4b-dev-2026'
// The triage vocabulary now lives in utils/moderation.js, so the moderation
// decisions and this dashboard cannot drift into two meanings of "done".
// The strings are unchanged; only where they are defined moved.
const STATUSES = FEEDBACK_STATUSES
const STATUS_LABELS = FEEDBACK_STATUS_LABELS
// 'in-progress' and 'help' used to be var(--accent) and the raw hex #a855f7
// (with rgba(168,85,247,.1) behind it, and the same hex again as DONUT slice 5).
// Both were the app reaching for a fifth signal colour it had no token for -
// one borrowed the BRAND colour, the other was typed in and had no dark value at
// all. --pending now exists and is measured in both themes; see the PENDING note
// in ColorStudio.jsx. NOT RENDER-VERIFIED: this page is admin-only and behind
// auth, so these are source-level swaps onto a token that is theme-aware, which
// is strictly better than a literal, but the badge contrast here is unchecked
// and belongs to [flair-tone-contrast]'s class of text-on-a-tint-of-itself.
const STATUS_COLORS = { new: 'var(--warn)', 'in-progress': 'var(--pending)', done: 'var(--ok)' }
const STATUS_BGS = { new: 'rgba(245,158,11,.1)', 'in-progress': 'color-mix(in srgb,var(--pending) 12%,transparent)', done: 'rgba(16,185,129,.1)' }
const TYPE_COLORS = { bug: 'var(--err)', feature: 'var(--accent)', general: 'var(--t2)', help: 'var(--pending)' }
const TYPE_BGS = { bug: 'rgba(239,68,68,.1)', feature: 'var(--accent-bg)', general: 'var(--bg-2)', help: 'color-mix(in srgb,var(--pending) 12%,transparent)' }
const DONUT_COLORS = ['var(--accent)', 'var(--ok)', 'var(--warn)', 'var(--err)', 'var(--pending)', 'var(--t3)']
const DAY = 86400000
const WEEK = 7 * DAY

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'pipeline', label: 'Pipeline' },
  { id: 'board', label: 'Board' },
  { id: 'design', label: 'Design' },
  { id: 'submissions', label: 'Submissions' },
  { id: 'prompts', label: 'Prompts' },
  { id: 'community', label: 'Community' },
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

// Tiny glyphs for the Submissions filter chips.
function FilterGlyph({ id }) {
  const paths = {
    all: <path d="M3 5h18l-7 8v6l-4 2v-8L3 5z" />,
    bug: <><rect x="8" y="7" width="8" height="13" rx="4" /><path d="M9 4l1.5 2.5M15 4l-1.5 2.5M4 11h4M16 11h4M5 19l3.5-2.5M19 19l-3.5-2.5M12 20v-9" /></>,
    feature: <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z" />,
    general: <path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5c-1.6 0-3.1-.4-4.4-1.2L3 20l1.2-5.1A8.5 8.5 0 1 1 21 11.5z" />,
    help: <><circle cx="12" cy="12" r="9" /><path d="M9.5 9a2.5 2.5 0 0 1 4.9.8c0 1.7-2.4 2.2-2.4 3.7" /><line x1="12" y1="17" x2="12.01" y2="17" /></>,
    new: <circle cx="12" cy="12" r="5" fill="currentColor" stroke="none" />,
    'in-progress': <><circle cx="12" cy="12" r="9" /><polyline points="12 7 12 12 15 14" /></>,
    done: <polyline points="4 12.5 10 18.5 20 6.5" />,
  }
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0 }}>
      {paths[id] || paths.all}
    </svg>
  )
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

function SubmissionCard({ item, onStatusChange, onNotesChange, onDelete, expanded, onToggle, canSeeEmail = true }) {
  const [notes, setNotes] = useState(item.adminNotes || '')
  const [editingNotes, setEditingNotes] = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)
  // The shared helper, so the cycle a reviewer clicks through and the cycle
  // utils/moderation.js validates are the same one.
  const nextStatus = () => nextFeedbackStatus(item.status)

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
          {!expanded && item.adminNotes && <div style={{ fontSize: 10, color: 'var(--accent-strong)', marginTop: 4 }}>Has admin notes</div>}
        </div>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--t3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, transition: 'transform .2s', transform: expanded ? 'rotate(180deg)' : 'none', marginTop: 4 }}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>

      {expanded && (
        <div className="adm-submission-body">
          <div className="adm-submission-msg">{item.message}</div>
          {/* The reporter's address is founder-only (utils/moderation.js,
              canSeeReporterEmail). It arrives through /api/support from a
              PUBLIC form with no session, so it is personal data handed to the
              site owner and not verified to belong to the sender. A moderator
              can triage from the subject and message; a mailbox to answer from
              is a separate permission nobody has asked for. The row is still
              rendered, saying what is withheld — a silently missing field
              reads as a report with no sender. */}
          {item.email && (canSeeEmail
            ? <div style={{ fontSize: 11, color: 'var(--t2)', marginBottom: 12 }}>From: <strong>{item.email}</strong></div>
            : <div style={{ fontSize: 11, color: 'var(--t3)', marginBottom: 12 }}>From: <span style={{ fontStyle: 'italic' }}>address withheld from moderators</span></div>)}

          {/* WHO ACTED ON THIS.
              Mobbin: Aboard's whistleblowing table carries a Handler column
              that reads "Unassigned" until somebody takes it
              (https://mobbin.com/screens/cb4c0d02-dfb6-4138-aaac-ff9e4cf78082).
              While one person moderated, this was never a question. The moment
              a second person can act, an unattributed decision is a decision
              nobody can be asked about. Rendered as meta type rather than a
              badge: it is provenance, not a status. */}
          <div style={{ fontSize: 11, color: 'var(--t3)', marginBottom: 12 }}>
            {item.reviewedBy
              ? <>Last actioned by <strong style={{ color: 'var(--t2)' }}>{item.reviewedBy}</strong>{item.updatedAt ? ` · ${fmtDateTime(item.updatedAt)}` : ''}</>
              : 'Not actioned by anyone yet'}
          </div>
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
  const profileLink = resolvePromptProfileLink(prompt)

  return (
    <div className="adm-card adm-prompt" style={{ borderLeftColor: statusColor }}>
      <div className="adm-card-body">
        <div className="adm-prompt-header">
          <span className="adm-badge" style={{ color: statusColor, background: statusBg }}>{prompt.status}</span>
          {prompt.authorName && <span style={{ fontSize: 11, color: 'var(--t2)' }}>by {prompt.authorName}</span>}
          {prompt.authorUid && <span title="Firebase user ID" style={{ fontSize: 10, color: 'var(--t3)' }}>UID {prompt.authorUid}</span>}
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
            {profileLink && (
              <div style={{ fontSize: 11, color: 'var(--t2)', marginBottom: 8 }}>
                Profile: <a href={profileLink} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-strong)' }}>{profileLink}</a>
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
            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 600, color: 'var(--accent-strong)', cursor: 'pointer', padding: '4px 10px', borderRadius: 'var(--radius-s)', border: '1px solid var(--border)', background: 'var(--bg-1)' }}
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
                      <span style={{ marginLeft: 'auto', fontSize: 9, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--accent-strong)', background: 'var(--brand-bg)', padding: '2px 7px', borderRadius: 999 }}>{m.area}</span>
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

const PRIORITY_COLOR = { P0: 'var(--err)', P1: 'var(--warn)', P2: 'var(--t2)' }
// `deferred` is NOT `blocked`: blocked means something unknown is in the way,
// deferred means the founder decided to wait. They read differently on this
// board, so they get different colours — deferred is muted, not alarming.
// EVERY status in NEXT_TODO must appear in all three of these, or the item is
// mis-reported on the founder's own board. `done` (94 items) and `partial` (16)
// were in none of them: they fell through to the raw lowercase string in the
// default grey, and neither had a filter button, so 110 of 130 items could not
// be filtered to at all. tests/unit/pipeline-board-renderable.test.js now fails
// the build if a status is added to the data and not to these.
const TODO_STATUS_COLOR = { todo: 'var(--t3)', doing: 'var(--brand)', review: 'var(--warn)', partial: 'var(--accent)', blocked: 'var(--err)', deferred: 'var(--t2)', done: 'var(--ok)' }
const TODO_STATUS_LABEL = { todo: 'To do', doing: 'Doing', review: 'Review', partial: 'Partial', blocked: 'Blocked', deferred: 'Deferred', done: 'Done' }

// Pipeline — the owner's ops view: current app condition, the workstreams
// moving through the pipeline, and the prioritised next-to-do queue. Renders
// from src/data/pipeline.js (no backend). Complements the Board tab, which
// tracks each feature module.
//
// ── WHY THE DATA ARRIVES BY import() AND NOT BY import ──────────────────────
//
// src/data/pipeline.js is the engineering log: every note every agent has left,
// as prose, inside the row objects this board renders. It is 672 KB of source
// and it grows by a few KB every time anybody records what they did. A static
// import put all of it in Admin-*.js, which was 776,482 bytes raw / 287,073
// gzip — by a wide margin the largest chunk this app ships — and 84% of that
// was this one file. The admin downloaded the project's whole engineering
// history as JavaScript, and parsed it, in order to draw a table of it. Filed
// twice, by #405 and #406, which is itself a sign of how visible it was.
//
// The dynamic import moves it into its own chunk. `{tab === 'pipeline' && ...}`
// in the tab switch below means this component is not mounted until the Pipeline
// tab is opened, so the effect — and therefore the request — does not fire on
// any other tab. MEASURED, clean build either side: Admin-*.js 776,482 →
// 113,900 bytes raw (-85%), 287,073 → 29,755 gzip (-90%), and the notes become
// pipeline-*.js at 663,549 / 258,382 — paid for only by an admin who opens this
// one tab, and by nobody else on any other admin screen.
//
// A DYNAMIC IMPORT RATHER THAN A BUILD-TIME JSON, deliberately. Emitting the
// notes as a JSON asset would take them out of the JavaScript graph entirely
// and cache them separately, which is a real advantage — but it needs a
// generator, and a generator can go stale. An agent who edits pipeline.js and
// does not re-run it would leave the founder's own board showing yesterday's
// backlog while every check stayed green, which is precisely the class of
// silent-wrong this repository keeps paying for. import() cannot go stale: it
// resolves the same module by the same path, and the bundler regenerates the
// chunk on every build.
//
// pipeline.js DOES NOT MOVE. Every agent's composition scripts and several
// tests/unit/*.test.js files import it by that exact path, and
// pipeline-board-renderable.test.js imports the same three exports this
// component renders — so the board and its guard still read one source.
//
// GUARDED AT BUILD LEVEL by tests/unit/admin-chunk-carries-no-backlog.test.js,
// which runs a real production build and fails if the backlog is back in the
// Admin chunk. A comment asking the next agent not to re-add the static import
// would not survive a refactor; that test will.
function PipelineBoard() {
  const [todoFilter, setTodoFilter] = useState('all')
  const [board, setBoard] = useState(null)
  const [loadError, setLoadError] = useState('')
  const todoFilters = ['all', 'doing', 'todo', 'review', 'partial', 'blocked', 'deferred', 'done']

  useEffect(() => {
    let alive = true
    import('../data/pipeline').then(
      (mod) => { if (alive) setBoard(mod) },
      // Named in words rather than swallowed. A chunk request can fail on a
      // stale deploy, and a board that silently rendered zero rows would read
      // as "the backlog is empty", which is the most misleading thing this
      // surface could say.
      (err) => {
        console.error('[admin] the pipeline backlog chunk failed to load:', err?.message || err)
        if (alive) setLoadError(err?.message || String(err))
      },
    )
    return () => { alive = false }
  }, [])

  if (loadError) {
    return (
      <div className="adm-section">
        <div className="adm-card">
          <div className="adm-empty">
            Could not load the backlog ({loadError}). This board reads
            src/data/pipeline.js as a separate chunk; a failed request here is
            usually a stale tab after a deploy. Reload the page.
          </div>
        </div>
      </div>
    )
  }
  if (!board) {
    return (
      <div className="adm-section">
        <div className="adm-card"><div className="adm-empty">Loading the backlog…</div></div>
      </div>
    )
  }

  const { APP_CONDITION, PIPELINE_STAGES, PIPELINE_PROCESSES, NEXT_TODO } = board
  const visibleTodos = NEXT_TODO.filter(t => todoFilter === 'all' || t.status === todoFilter)

  return (
    <>
      {/* Current app condition */}
      <div className="adm-section">
        <div className="adm-section-h">
          <div className="adm-section-title"><span className="adm-section-bar" />App condition</div>
        </div>
        <div className="adm-stats">
          {APP_CONDITION.map(c => (
            <div key={c.id} className="adm-stat">
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: HEALTH_COLOR[c.status] || 'var(--t3)', flexShrink: 0 }} title={c.status} />
                <div className="adm-stat-value" style={{ fontSize: 18 }}>{c.value}</div>
              </div>
              <div className="adm-stat-label">{c.label}</div>
              <div className="adm-stat-sub">{c.detail}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Processes moving through the pipeline */}
      <div className="adm-section">
        <div className="adm-section-h">
          <div className="adm-section-title"><span className="adm-section-bar" />Pipeline ({PIPELINE_PROCESSES.length} processes)</div>
        </div>
        <div style={{ display: 'flex', gap: 14, overflowX: 'auto', paddingBottom: 12, alignItems: 'flex-start' }}>
          {PIPELINE_STAGES.map(stage => {
            const items = PIPELINE_PROCESSES.filter(p => p.stage === stage.id)
            return (
              <div key={stage.id} style={{ flex: '0 0 260px', minWidth: 260, background: 'var(--bg-1)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: stage.color }} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--t0)', textTransform: 'uppercase', letterSpacing: '.05em' }}>{stage.label}</span>
                  <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--t3)', fontFamily: 'var(--mono)' }}>{items.length}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {items.map(p => (
                    <div key={p.id} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-s)', padding: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--t0)', lineHeight: 1.3 }}>{p.name}</span>
                        <span style={{ marginLeft: 'auto', fontSize: 9, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--accent-strong)', background: 'var(--brand-bg)', padding: '2px 7px', borderRadius: 999, flexShrink: 0 }}>{p.area}</span>
                      </div>
                      <p style={{ fontSize: 12, color: 'var(--t1)', lineHeight: 1.5, margin: '0 0 10px' }}>{p.summary}</p>
                      <div className="adm-pipe-bar" role="progressbar" aria-valuenow={p.progress} aria-valuemin={0} aria-valuemax={100} aria-label={`${p.name} progress`}>
                        <span className="adm-pipe-bar-fill" style={{ width: `${p.progress}%`, background: stage.color }} />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
                        <span style={{ fontSize: 10, color: 'var(--t3)', fontFamily: 'var(--mono)' }}>Updated {p.updated}</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--t1)', fontFamily: 'var(--mono)' }}>{p.progress}%</span>
                      </div>
                    </div>
                  ))}
                  {items.length === 0 && <div style={{ fontSize: 11, color: 'var(--t3)', fontStyle: 'italic', padding: '8px 4px' }}>Nothing here.</div>}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Next-to-do queue */}
      <div className="adm-section">
        <div className="adm-section-h">
          <div className="adm-section-title"><span className="adm-section-bar" />Next to do ({visibleTodos.length})</div>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {todoFilters.map(f => (
              <button key={f} className={`adm-time-btn${todoFilter === f ? ' active' : ''}`} onClick={() => setTodoFilter(f)} style={{ textTransform: 'uppercase', letterSpacing: '.04em' }}>
                {f}
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {visibleTodos.map(t => (
            <div key={t.id} className="adm-pipe-todo">
              <span className="adm-pipe-prio" style={{ color: PRIORITY_COLOR[t.priority] || 'var(--t2)', borderColor: PRIORITY_COLOR[t.priority] || 'var(--t2)' }}>{t.priority}</span>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--t0)' }}>{t.title}</span>
                  <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--t2)', background: 'var(--bg-2)', padding: '2px 7px', borderRadius: 999 }}>{t.area}</span>
                </div>
                {t.note && <p style={{ fontSize: 12, color: 'var(--t2)', lineHeight: 1.5, margin: '4px 0 0' }}>{t.note}</p>}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--t3)', fontFamily: 'var(--mono)' }} title="Effort">{t.effort}</span>
                <span className="adm-pipe-status" style={{ color: TODO_STATUS_COLOR[t.status] || 'var(--t3)', background: 'color-mix(in srgb, currentColor 12%, transparent)' }}>{TODO_STATUS_LABEL[t.status] || t.status}</span>
              </div>
            </div>
          ))}
          {visibleTodos.length === 0 && <div className="adm-card"><div className="adm-empty">Nothing in this state.</div></div>}
        </div>
      </div>
    </>
  )
}

// Nearest psychological price ending in .99 (e.g. 7.40 → 7.99, 7.30 → 6.99),
// never below 0.99.
const round99 = (x) => Math.max(0.99, Math.round(x - 0.99) + 0.99)

function StripeSetupPanel({ toast }) {
  const [config, setConfig] = useState(null)
  const [draft, setDraft] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [autoFill, setAutoFill] = useState(true)

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

  // #12 auto-fill: editing one cell scales every other currency (both
  // intervals) off its default ratio, snapped to the nearest .99. The edited
  // cell keeps the raw string so typing isn't fought mid-keystroke.
  const handlePriceEdit = (interval, code, raw) => {
    setDraft(d => {
      const next = { monthly: { ...d.monthly }, yearly: { ...d.yearly } }
      next[interval][code] = raw
      const base = config?.defaults?.[interval]?.[code]
      const n = Number(raw)
      if (!autoFill || !raw || !isFinite(n) || n <= 0 || !base) return next
      const scale = n / base
      for (const iv of ['monthly', 'yearly']) {
        for (const c of config.currencies) {
          if (iv === interval && c.code === code) continue
          next[iv][c.code] = round99(config.defaults[iv][c.code] * scale).toFixed(2)
        }
      }
      return next
    })
  }

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
                          {c.code === config.baseCurrency && <span style={{ color: 'var(--accent-strong)', marginLeft: 6, fontSize: 10 }}>base</span>}
                        </td>
                        {['monthly', 'yearly'].map(interval => (
                          <td key={interval}>
                            <div className="adm-stripe-input">
                              <span>{c.symbol}</span>
                              <input type="number" min="0" step="0.01" value={draft[interval][c.code]} onChange={e => handlePriceEdit(interval, c.code, e.target.value)} />
                            </div>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <label className="adm-stripe-autofill">
                <input type="checkbox" checked={autoFill} onChange={e => setAutoFill(e.target.checked)} />
                Auto-fill other currencies — edit one price and every currency (monthly &amp; yearly) recalculates to the nearest .99
              </label>
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

// ── Users panel (#13) ───────────────────────────────────────

// Free-text profile locations ("Sydney, Australia") mapped to ISO-3166 alpha-2.
// Lowercased common names + aliases; extend as real user data shows gaps.
const COUNTRY_CODES = {
  'united states': 'US', 'united states of america': 'US', usa: 'US', 'u.s.': 'US', 'u.s.a.': 'US', america: 'US',
  'united kingdom': 'GB', uk: 'GB', england: 'GB', scotland: 'GB', wales: 'GB', 'northern ireland': 'GB', 'great britain': 'GB',
  australia: 'AU', 'new zealand': 'NZ', canada: 'CA', ireland: 'IE',
  germany: 'DE', france: 'FR', spain: 'ES', italy: 'IT', portugal: 'PT', netherlands: 'NL', 'the netherlands': 'NL',
  belgium: 'BE', switzerland: 'CH', austria: 'AT', sweden: 'SE', norway: 'NO', denmark: 'DK', finland: 'FI', iceland: 'IS',
  poland: 'PL', czechia: 'CZ', 'czech republic': 'CZ', slovakia: 'SK', hungary: 'HU', romania: 'RO', bulgaria: 'BG',
  greece: 'GR', croatia: 'HR', serbia: 'RS', ukraine: 'UA', russia: 'RU', turkey: 'TR', 'türkiye': 'TR',
  estonia: 'EE', latvia: 'LV', lithuania: 'LT', luxembourg: 'LU', malta: 'MT', cyprus: 'CY',
  india: 'IN', pakistan: 'PK', bangladesh: 'BD', 'sri lanka': 'LK', nepal: 'NP',
  china: 'CN', japan: 'JP', 'south korea': 'KR', korea: 'KR', taiwan: 'TW', 'hong kong': 'HK', mongolia: 'MN',
  singapore: 'SG', malaysia: 'MY', indonesia: 'ID', philippines: 'PH', thailand: 'TH', vietnam: 'VN', cambodia: 'KH',
  israel: 'IL', 'united arab emirates': 'AE', uae: 'AE', dubai: 'AE', 'saudi arabia': 'SA', qatar: 'QA', kuwait: 'KW',
  jordan: 'JO', lebanon: 'LB', iraq: 'IQ', iran: 'IR',
  egypt: 'EG', nigeria: 'NG', kenya: 'KE', ghana: 'GH', ethiopia: 'ET', tanzania: 'TZ', uganda: 'UG',
  morocco: 'MA', algeria: 'DZ', tunisia: 'TN', 'south africa': 'ZA', zimbabwe: 'ZW',
  brazil: 'BR', argentina: 'AR', chile: 'CL', colombia: 'CO', peru: 'PE', venezuela: 'VE', ecuador: 'EC',
  bolivia: 'BO', paraguay: 'PY', uruguay: 'UY', mexico: 'MX', 'costa rica': 'CR', panama: 'PA',
  cuba: 'CU', jamaica: 'JM', 'dominican republic': 'DO', guatemala: 'GT',
  fiji: 'FJ', 'papua new guinea': 'PG',
}
const ISO2_SET = new Set(Object.values(COUNTRY_CODES))
const regionNames = typeof Intl !== 'undefined' && Intl.DisplayNames ? new Intl.DisplayNames(['en'], { type: 'region' }) : null

// "Sydney, Australia" → 'AU'. Scans segments right-to-left because the country
// conventionally comes last; also accepts a bare ISO2 code like "AU".
function countryFromLocation(location) {
  if (!location) return null
  const segs = String(location).split(/[,/·|]/).map(s => s.trim().toLowerCase()).filter(Boolean)
  for (let i = segs.length - 1; i >= 0; i--) {
    if (COUNTRY_CODES[segs[i]]) return COUNTRY_CODES[segs[i]]
    const up = segs[i].toUpperCase()
    if (up.length === 2 && ISO2_SET.has(up)) return up
  }
  return null
}

const flagEmoji = (iso2) => iso2.replace(/./g, ch => String.fromCodePoint(0x1F1A5 + ch.charCodeAt(0)))
const countryName = (iso2) => { try { return regionNames?.of(iso2) || iso2 } catch { return iso2 } }

function EyeIcon({ off }) {
  return off ? (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" /><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" /><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" /><line x1="2" y1="2" x2="22" y2="22" />
    </svg>
  ) : (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" />
    </svg>
  )
}

// Email hidden behind an eye toggle — first few characters visible, the rest
// blurred, so the founder can screen-share the dashboard without leaking PII.
function MaskedEmail({ email, revealed, onToggle }) {
  if (!email) return <span style={{ color: 'var(--t3)' }}>—</span>
  const cut = Math.min(3, email.indexOf('@') > 0 ? email.indexOf('@') : 3)
  return (
    <span className="adm-mask">
      <span className="mono adm-mask-text">
        {revealed ? email : (<>{email.slice(0, cut)}<span className="adm-mask-blur" aria-hidden="true">{email.slice(cut)}</span></>)}
      </span>
      <button type="button" className="adm-eye-btn" onClick={onToggle} title={revealed ? 'Hide email' : 'Reveal email'} aria-label={revealed ? 'Hide email' : 'Reveal email'}>
        <EyeIcon off={revealed} />
      </button>
    </span>
  )
}

const USER_SORTS = {
  email: (u) => (u.email || '').toLowerCase(),
  plan: (u) => (u.plan === 'pro' ? 0 : 1),
  role: (u) => u.onboarding?.role || '￿',
  use: (u) => u.onboarding?.use || '￿',
  firstWin: (u) => u.onboarding?.firstWin || '￿',
  country: (u) => (u.country ? countryName(u.country) : '￿'),
  createdAt: (u) => u.joinedTs || 0,
  lastLoginAt: (u) => (u.lastLoginAt ? new Date(u.lastLoginAt).getTime() : 0),
}

function UsersPanel({ localUsers, toast }) {
  const [users, setUsers] = useState(null) // null = loading
  const [source, setSource] = useState('server')
  const [error, setError] = useState('')
  const [revealed, setRevealed] = useState(() => new Set())
  const [search, setSearch] = useState('')
  const [planFilter, setPlanFilter] = useState('all')
  const [countryFilter, setCountryFilter] = useState('all')
  const [sortKey, setSortKey] = useState('createdAt')
  const [sortDir, setSortDir] = useState('desc')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const { auth: fbAuth } = await import('../utils/firebase')
        const token = await fbAuth.currentUser?.getIdToken()
        if (!token) throw new Error('Not authenticated')
        const res = await fetch('/api/verify-admin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ includeUsers: true }),
        })
        const data = await res.json().catch(() => ({}))
        if (cancelled) return
        if (!Array.isArray(data.users)) throw new Error(data.usersError || data.error || `Server returned ${res.status}`)
        setUsers(data.users)
      } catch (err) {
        if (cancelled) return
        // Fall back to this browser's profile cache — fewer users, fewer fields,
        // but the tab stays useful offline / before the API deploys.
        setError(err.message)
        setSource('local')
        setUsers((localUsers || []).map(u => ({
          uid: u.uid, email: u.email || '', displayName: u.displayName || '', provider: u.provider || 'email',
          emailVerified: null, createdAt: u.createdAt || null, lastLoginAt: null,
          subscription: { status: null, interval: null }, onboarding: { role: null, use: null, firstWin: null }, location: '', company: '',
        })))
      }
    })()
    return () => { cancelled = true }
  }, [localUsers])

  const rows = useMemo(() => (users || []).map(u => {
    const status = u.subscription?.status
    return {
      ...u,
      plan: status === 'active' || status === 'trialing' ? 'pro' : 'free',
      country: countryFromLocation(u.location),
      joinedTs: u.createdAt ? new Date(u.createdAt).getTime() : 0,
    }
  }), [users])

  const countryCounts = useMemo(() => {
    const counts = {}
    rows.forEach(r => { const k = r.country || 'unknown'; counts[k] = (counts[k] || 0) + 1 })
    return Object.entries(counts).sort((a, b) => b[1] - a[1])
  }, [rows])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const out = rows.filter(r => {
      if (planFilter !== 'all' && r.plan !== planFilter) return false
      if (countryFilter !== 'all' && (r.country || 'unknown') !== countryFilter) return false
      if (q && ![r.email, r.displayName, r.location, r.company, r.onboarding?.role, r.onboarding?.use, r.onboarding?.firstWin]
        .some(v => v && String(v).toLowerCase().includes(q))) return false
      return true
    })
    const key = USER_SORTS[sortKey] || USER_SORTS.createdAt
    out.sort((a, b) => {
      const ka = key(a), kb = key(b)
      const cmp = ka < kb ? -1 : ka > kb ? 1 : 0
      return sortDir === 'asc' ? cmp : -cmp
    })
    return out
  }, [rows, search, planFilter, countryFilter, sortKey, sortDir])

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(key); setSortDir(key === 'createdAt' || key === 'lastLoginAt' ? 'desc' : 'asc') }
  }

  const toggleReveal = (uid) => setRevealed(prev => {
    const next = new Set(prev)
    if (next.has(uid)) next.delete(uid); else next.add(uid)
    return next
  })
  const allRevealed = rows.length > 0 && revealed.size >= rows.length

  const exportUsersCSV = () => {
    const cols = ['email', 'displayName', 'provider', 'emailVerified', 'plan', 'role', 'use', 'firstWin', 'location', 'country', 'company', 'createdAt', 'lastLoginAt']
    // displayName, company and location are user-controlled profile fields, so
    // the cells go through csvCell rather than bare quote-escaping. See utils/csv.js.
    const csv = toCsv(cols, filtered, (r, c) => (
      c === 'role' || c === 'use' || c === 'firstWin' ? r.onboarding?.[c]
        : c === 'country' ? (r.country ? countryName(r.country) : '')
          : r[c]
    ))
    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `uil4b-users-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast?.(`Exported ${filtered.length} users`)
  }

  const proCount = rows.filter(r => r.plan === 'pro').length
  const SortTh = ({ k, children, ...rest }) => (
    <th {...rest}>
      <button type="button" className={`adm-th-sort${sortKey === k ? ' active' : ''}`} onClick={() => toggleSort(k)}>
        {children}
        <span className="adm-th-arrow">{sortKey === k ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}</span>
      </button>
    </th>
  )

  return (
    <div className="adm-section">
      <div className="adm-section-h">
        <div className="adm-section-title"><span className="adm-section-bar" />Registered Users ({rows.length})</div>
        <span style={{ fontSize: 11, color: 'var(--t3)' }}>
          {users === null ? 'Loading…' : source === 'server' ? 'All accounts · server data' : 'This browser only · profile cache'}
        </span>
      </div>

      {source === 'local' && users !== null && (
        <div className="adm-card adm-verify-error" style={{ marginBottom: 12 }}>
          <div className="adm-card-body" style={{ fontSize: 12, color: 'var(--t1)' }}>
            Couldn&apos;t load the full user list from the server ({error}). Showing accounts cached in this browser instead.
          </div>
        </div>
      )}

      {users === null ? (
        <div className="adm-card"><div className="adm-empty">Loading users…</div></div>
      ) : (
        <>
          <div className="adm-stats" style={{ marginBottom: 16 }}>
            <div className="adm-stat">
              <div className="adm-stat-value">{rows.length}</div>
              <div className="adm-stat-label">Total Users</div>
              <div className="adm-stat-sub">{source === 'server' ? 'All accounts' : 'Cached locally'}</div>
            </div>
            <div className="adm-stat">
              <div className="adm-stat-value">{proCount}</div>
              <div className="adm-stat-label">Pro Subscribers</div>
              <div className="adm-stat-sub">{rows.length ? Math.round((proCount / rows.length) * 100) : 0}% of users</div>
            </div>
            <div className="adm-stat">
              <div className="adm-stat-value">{countryCounts.filter(([k]) => k !== 'unknown').length}</div>
              <div className="adm-stat-label">Countries</div>
              <div className="adm-stat-sub">From profile locations</div>
            </div>
            <div className="adm-stat">
              <div className="adm-stat-value">{rows.filter(r => r.provider === 'google').length}</div>
              <div className="adm-stat-label">Google Sign-ins</div>
              <div className="adm-stat-sub">{rows.filter(r => r.provider !== 'google').length} email/password</div>
            </div>
          </div>

          {countryCounts.length > 0 && (
            <div className="adm-country-chips">
              <button type="button" className={`adm-country-chip${countryFilter === 'all' ? ' active' : ''}`} onClick={() => setCountryFilter('all')}>
                All <span>{rows.length}</span>
              </button>
              {countryCounts.map(([code, count]) => (
                <button key={code} type="button" className={`adm-country-chip${countryFilter === code ? ' active' : ''}`}
                  onClick={() => setCountryFilter(countryFilter === code ? 'all' : code)}
                  title={code === 'unknown' ? 'No location on profile' : countryName(code)}>
                  {code === 'unknown' ? 'No location' : <><span className="adm-flag">{flagEmoji(code)}</span>{countryName(code)}</>}
                  <span>{count}</span>
                </button>
              ))}
            </div>
          )}

          <div className="adm-users-toolbar">
            <input type="search" className="adm-search" placeholder="Search email, name, role, location…" value={search} onChange={e => setSearch(e.target.value)} />
            <div className="adm-time-filter">
              {['all', 'pro', 'free'].map(p => (
                <button key={p} className={`adm-time-btn${planFilter === p ? ' active' : ''}`} onClick={() => setPlanFilter(p)} style={{ textTransform: 'capitalize' }}>{p}</button>
              ))}
            </div>
            <button className="btn btn-s" onClick={() => setRevealed(allRevealed ? new Set() : new Set(rows.map(r => r.uid)))}>
              {allRevealed ? 'Hide all emails' : 'Reveal all emails'}
            </button>
            <button className="btn btn-s" onClick={exportUsersCSV}>Export CSV</button>
          </div>

          <div className="adm-card">
            <div className="adm-table-wrap">
              <table className="adm-table adm-users-table">
                <thead>
                  <tr>
                    <SortTh k="email">User</SortTh>
                    <SortTh k="plan">Plan</SortTh>
                    <SortTh k="role">Role</SortTh>
                    <SortTh k="use">Category</SortTh>
                    <SortTh k="firstWin">First win</SortTh>
                    <SortTh k="country">Country</SortTh>
                    <SortTh k="createdAt">Joined</SortTh>
                    <SortTh k="lastLoginAt">Last Login</SortTh>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(u => (
                    <tr key={u.uid}>
                      <td>
                        <MaskedEmail email={u.email} revealed={revealed.has(u.uid)} onToggle={() => toggleReveal(u.uid)} />
                        <div className="adm-user-sub">
                          {u.displayName || '—'} · {u.provider}{u.emailVerified === false ? ' · unverified' : ''}
                          {u.company ? ` · ${u.company}` : ''}
                        </div>
                      </td>
                      <td>
                        <span className={`adm-badge adm-plan-${u.plan}`}>{u.plan === 'pro' ? `Pro${u.subscription?.interval ? ` · ${u.subscription.interval}` : ''}` : 'Free'}</span>
                      </td>
                      <td>{u.onboarding?.role || <span style={{ color: 'var(--t3)' }}>—</span>}</td>
                      <td>{u.onboarding?.use || <span style={{ color: 'var(--t3)' }}>—</span>}</td>
                      <td>{u.onboarding?.firstWin || <span style={{ color: 'var(--t3)' }}>—</span>}</td>
                      <td>
                        {u.country
                          ? <span className="adm-flag-cell" title={u.location ? `${u.location} — ${countryName(u.country)}` : countryName(u.country)}>
                              <span className="adm-flag">{flagEmoji(u.country)}</span>{u.country}
                            </span>
                          : u.location
                            ? <span title={u.location} style={{ color: 'var(--t2)' }}>{u.location}</span>
                            : <span style={{ color: 'var(--t3)' }}>—</span>}
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>{u.createdAt ? fmtDate(u.createdAt) : '—'}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>{u.lastLoginAt ? fmtDate(u.lastLoginAt) : '—'}</td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr><td colSpan={7}><div className="adm-empty">{rows.length === 0 ? 'No users yet' : 'No users match the current filters'}</div></td></tr>
                  )}
                </tbody>
              </table>
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
  // The SERVER-VERIFIED role, from the ID token's custom claims. isAdminUser
  // above compares an email against a list that ships in the browser bundle —
  // fine for deciding what to render, worthless as a fact. This hook is also
  // what finally reads /api/verify-admin's `claimUpdated` and forces the token
  // refresh that makes a freshly minted claim usable in the same session.
  const { role, loading: roleLoading } = useModerationRole()
  const [unlocked, setUnlocked] = useState(false)
  const [code, setCode] = useState('')
  const [tab, setTab] = useState('overview')
  // Roving-tabindex keyboard navigation for the tab bar. A tablist is ONE tab
  // stop; arrows move within it. Without this the ten tabs were ten separate
  // stops, so reaching the content of the last one meant ten presses.
  const tabRefs = useRef({})
  const onTabKeyDown = (e) => {
    const i = TABS.findIndex(t => t.id === tab)
    let next = null
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (i + 1) % TABS.length
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (i - 1 + TABS.length) % TABS.length
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = TABS.length - 1
    if (next === null) return
    e.preventDefault()
    const id = TABS[next].id
    setTab(id)
    tabRefs.current[id]?.focus()
  }

  const [timeRange, setTimeRange] = useState('7d')
  const [data, setData] = useState(null)
  const [feedback, setFeedback] = useState([])
  // How many documents the SERVER actually returned, and why it did not.
  // null means unread — never 0. Mobbin: Circle's Content > Moderation states
  // the report count on its own line above the table body, so "0 reports" and
  // "No data available" are two separate claims rather than one ambiguous
  // empty state. https://mobbin.com/screens/d695963e-5465-44f1-8a86-171fd1f7c121
  const [serverFeedbackCount, setServerFeedbackCount] = useState(null)
  const [feedbackError, setFeedbackError] = useState('')
  // '' = fine. Non-empty = the last triage write was REFUSED and the row on
  // screen no longer matches the server.
  const [writeError, setWriteError] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [subSearch, setSubSearch] = useState('')
  const [subSort, setSubSort] = useState('newest')
  const [expandedId, setExpandedId] = useState(null)
  const [pendingPrompts, setPendingPrompts] = useState([])
  const [promptFilter, setPromptFilter] = useState('pending')
  const [designData, setDesignData] = useState(null)
  const [rawViews, setRawViews] = useState([])
  const [rawSessions, setRawSessions] = useState([])
  // Cross-user aggregate (server-read). null = loading, object = loaded.
  const [aggregate, setAggregate] = useState(null)
  const [aggregateLoaded, setAggregateLoaded] = useState(false)
  // '' = fine. Non-empty = the read FAILED and any number shown would be a lie.
  const [aggregateError, setAggregateError] = useState('')
  // When the figures on screen were actually fetched. A dashboard with no
  // timestamp cannot be distinguished from a dashboard that stopped updating.
  const [refreshedAt, setRefreshedAt] = useState(null)
  const [confirmColourReset, setConfirmColourReset] = useState(false)
  const [confirmPageReset, setConfirmPageReset] = useState(false)
  const [resettingPages, setResettingPages] = useState(false)

  const refresh = useCallback(async () => {
    setData(getAnalyticsSummary())
    setDesignData(getDesignAnalytics())
    setRawViews(getPageViews())
    setRawSessions(getSessions())
    // Cross-user aggregate from Firestore (safe-empty on failure). Non-blocking
    // relative to the localStorage data above, which renders immediately.
    setAggregateLoaded(false)
    setAggregateError('')
    // A FAILED READ IS NOT ZERO. This used to swallow the error and substitute
    // an empty result, so a permissions failure, an offline admin or a bad
    // service account all rendered as "0 views" — visually identical to a site
    // nobody visited. On the one page whose entire job is telling you what is
    // true, the most expensive thing it can do is state a confident number it
    // does not have. The error is kept and shown instead.
    getAggregateAnalytics(30)
      .then(agg => { setAggregate(agg); setAggregateError('') })
      .catch(err => {
        setAggregate(null)
        setAggregateError(String(err?.message || err || 'Unknown error').slice(0, 200))
      })
      .finally(() => setAggregateLoaded(true))
    const localFeedback = getFeedback()
    const merged = [...localFeedback]
    // A REFUSED READ IS NOT AN EMPTY QUEUE — the same fault the aggregate block
    // above was fixed for, in the one place it is most expensive. This read is
    // gated by firestore.rules on `request.auth.token.admin == true`, and it
    // used to sit inside `catch { /* firestore unavailable */ }` with an EMPTY
    // body: a permission-denied rendered as the localStorage list alone, with
    // nothing on screen to say the server half had been refused. listFeedback()
    // throws, and the failure is reported rather than absorbed.
    try {
      const fsFeedback = await listFeedback()
      const localIds = new Set(localFeedback.map(f => f.id))
      fsFeedback.forEach(f => { if (!localIds.has(f.id)) merged.push(f) })
      setServerFeedbackCount(fsFeedback.length)
      setFeedbackError('')
    } catch (err) {
      // null, not 0. "We read the server and there was nothing" and "we could
      // not read the server" must never render as the same sentence.
      setServerFeedbackCount(null)
      setFeedbackError(String(err?.message || err || 'Unknown error').slice(0, 200))
    }
    setFeedback(merged)
    try {
      const promptSnap = await getDocs(query(collection(db, 'community-prompts'), orderBy('createdAt', 'desc')))
      setPendingPrompts(promptSnap.docs.map(d => ({ ...d.data(), id: d.id })))
    } catch { /* firestore unavailable */ }
    setRefreshedAt(Date.now())
  }, [])

  const [serverVerified, setServerVerified] = useState(false)
  const [verifyError, setVerifyError] = useState('')

  useEffect(() => {
    // useModerationRole already performs this handshake, and a founder whose
    // role came back 'founder' has all the proof this effect could gather — so
    // skipping it there removes a duplicate POST to /api/verify-admin on every
    // admin page load. It still runs when the role did NOT resolve to founder,
    // which is exactly when the diagnostic banner below is worth showing.
    if (!isAdminUser || serverVerified || roleLoading || role === 'founder') return
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
  }, [isAdminUser, serverVerified, roleLoading, role]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── AI provider health ──
  // The diagnostic at GET /api/ai?diag=1 is already gated on a VERIFIED
  // administrator, so this reuses it rather than inventing a second admin
  // surface — and it has to reuse it: /api holds twelve route files and Vercel's
  // limit on this plan is twelve, so there is no room for a route of its own.
  //
  // This is the surface that answers "would an operator who is not looking at
  // devtools find out, within a day?". The key rows the diagnostic already
  // returned report EXISTENCE, which is exactly what a revoked key looks like.
  // `providerHealth` reports what the key DID on real traffic.
  const [aiHealth, setAiHealth] = useState(null)
  const [aiHealthError, setAiHealthError] = useState('')

  useEffect(() => {
    if (!isAdminUser || tab !== 'overview' || aiHealth) return
    ;(async () => {
      try {
        const { auth: fbAuth } = await import('../utils/firebase')
        const token = await fbAuth.currentUser?.getIdToken()
        if (!token) return
        const res = await fetch('/api/ai?diag=1', { headers: { Authorization: `Bearer ${token}` } })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) { setAiHealthError(data.error || `Diagnostic returned ${res.status}`); return }
        setAiHealth(data.providerHealth || { status: 'unavailable', summary: 'The diagnostic answered without a providerHealth block.' })
        setAiHealthError('')
      } catch { setAiHealthError('Could not reach the AI diagnostic') }
    })()
  }, [isAdminUser, tab, aiHealth])

  // The gate gains a SERVER-VERIFIED path. `isAdminUser` is an email compared
  // against a list that ships in the bundle and ADMIN_CODE is a shared secret
  // sitting in the same bundle; canReview(role) is a signed custom claim, which
  // is the only one of the three a browser cannot fake. It is an OR, so nothing
  // that opened before is closed now — this only adds a way in that is true.
  //
  // It admits `moderator` as well as `founder`, which is inert until the claim
  // is granted AND firestore.rules honours it — both founder-gated changes, both
  // proposed rather than taken. Today the branch that fires is `founder`.
  const effectiveUnlocked = unlocked || isAdminUser || canReview(role)

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

  const filteredFeedback = useMemo(() => {
    // Every whitespace-separated token must match somewhere, so multi-word
    // queries like "export bug" narrow instead of failing outright.
    const tokens = subSearch.trim().toLowerCase().split(/\s+/).filter(Boolean)
    const out = feedback.filter(item => {
      if (filterType !== 'all' && item.type !== filterType) return false
      if (filterStatus !== 'all' && item.status !== filterStatus) return false
      if (tokens.length) {
        const hay = [item.subject, item.message, item.email, item.adminNotes, item.type, item.status, item.source]
          .filter(Boolean).join(' ').toLowerCase()
        if (!tokens.every(t => hay.includes(t))) return false
      }
      return true
    })
    out.sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''))
    if (subSort === 'newest') out.reverse()
    return out
  }, [feedback, filterType, filterStatus, subSearch, subSort])

  const typeCounts = useMemo(() => {
    const counts = { all: feedback.length }
    feedback.forEach(f => { counts[f.type] = (counts[f.type] || 0) + 1 })
    return counts
  }, [feedback])

  const statusCounts = useMemo(() => {
    const counts = { all: feedback.length }
    feedback.forEach(f => { counts[f.status] = (counts[f.status] || 0) + 1 })
    return counts
  }, [feedback])

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

  // ── Triage writes ─────────────────────────────────────────────────────────
  // These three used to update local state optimistically, send the write
  // inside `catch { /* offline */ }`, and then fire the success toast
  // UNCONDITIONALLY. A write Firestore rejected therefore produced a row that
  // moved to Done and a toast that said so — and reverted on the next refresh.
  // A lying success is worse than a visible failure: nothing prompts anyone to
  // look. Each now restores the previous row and reports what the server said.
  //
  // `role` rather than `user.uid` is not what is recorded — the uid is — but
  // the decision is attributed at all for the reason the role exists: the
  // moment a second person can act on a report, an unattributed decision is a
  // decision nobody can be asked about.
  const reviewerUid = user?.uid || null

  const handleStatusChange = async (id, status) => {
    const item = feedback.find(f => f.id === id)
    if (!item?._fs) {
      setFeedback(updateFeedbackStatus(id, status))
      toast(`Marked as ${STATUS_LABELS[status]}`)
      return
    }
    const before = item
    setFeedback(prev => prev.map(f => f.id === id
      ? { ...f, status, updatedAt: new Date().toISOString(), reviewedBy: reviewerUid }
      : f))
    try {
      await setFeedbackStatus(id, status, reviewerUid)
      setWriteError('')
      toast(`Marked as ${STATUS_LABELS[status]}`)
    } catch (err) {
      setFeedback(prev => prev.map(f => (f.id === id ? before : f)))
      setWriteError(String(err?.message || err || 'Unknown error').slice(0, 200))
      toast('Could not save that — the server refused the change')
    }
  }

  const handleNotesChange = async (id, notes) => {
    const item = feedback.find(f => f.id === id)
    if (!item?._fs) {
      setFeedback(updateFeedbackNotes(id, notes))
      toast('Notes saved')
      return
    }
    const before = item
    setFeedback(prev => prev.map(f => f.id === id
      ? { ...f, adminNotes: notes, updatedAt: new Date().toISOString(), reviewedBy: reviewerUid }
      : f))
    try {
      await setFeedbackNotes(id, notes, reviewerUid)
      setWriteError('')
      toast('Notes saved')
    } catch (err) {
      setFeedback(prev => prev.map(f => (f.id === id ? before : f)))
      setWriteError(String(err?.message || err || 'Unknown error').slice(0, 200))
      toast('Could not save those notes — the server refused the change')
    }
  }

  const handleDelete = async (id) => {
    const item = feedback.find(f => f.id === id)
    if (!item?._fs) {
      setFeedback(deleteFeedback(id))
      setExpandedId(null)
      toast('Submission deleted')
      return
    }
    const before = feedback
    setFeedback(prev => prev.filter(f => f.id !== id))
    setExpandedId(null)
    try {
      await deleteFeedbackDoc(id)
      setWriteError('')
      toast('Submission deleted')
    } catch (err) {
      setFeedback(before)
      setWriteError(String(err?.message || err || 'Unknown error').slice(0, 200))
      toast('Could not delete that — the server refused the change')
    }
  }

  const exportCSV = () => {
    const cols = ['createdAt', 'type', 'status', 'subject', 'message', 'email', 'source', 'adminNotes']
    const rows = [...feedback].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
    // The sharpest of the three: /api/support accepts subject, message and
    // email UNAUTHENTICATED, and this file is opened by an admin — the attacker
    // picks the payload and someone with elevated access runs it. utils/csv.js.
    const csv = toCsv(cols, rows)
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `uil4b-feedback-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast(`Exported ${rows.length} submissions`)
  }

  const handleResetColours = () => {
    resetColourPicks()
    setDesignData(getDesignAnalytics())
    setConfirmColourReset(false)
    toast('Colour pick data reset')
  }

  const handleResetPages = async () => {
    setResettingPages(true)
    const ok = await resetPageAnalytics()
    setResettingPages(false)
    setConfirmPageReset(false)
    toast(ok ? 'Page analytics reset' : 'Local data cleared — server reset failed')
    refresh()
  }

  // ── Lock screen ──

  // Never accuse somebody of not having access while still finding out. A
  // moderator's claim is read from their token asynchronously, so rendering the
  // lock screen first and the dashboard a moment later would tell them they are
  // not a moderator and then contradict itself.
  if (!effectiveUnlocked && roleLoading && user) {
    return (
      <div className="sec">
        <div className="adm-lock">
          <div className="adm-lock-eyebrow">Admin Access</div>
          <h1>Developer Dashboard</h1>
          <p>Checking what your account is allowed to do…</p>
        </div>
      </div>
    )
  }

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
          {/* When these figures were actually fetched. Without it, a dashboard
              that quietly stopped updating looks exactly like one that is
              current — and this page is only useful if you can trust its age. */}
          {refreshedAt && (
            <span className="adm-cat-desc" style={{ marginRight: 8 }}>
              Updated {new Date(refreshedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          )}
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

      {/* Tabs.
          Were ten plain <button>s: no tablist, nothing in the accessibility
          tree saying which was selected, no keyboard navigation between them,
          and "active" carried by a CSS class alone. Now a real tablist with a
          roving tabindex — one tab stop for the whole bar, arrows to move
          within it — matching the pattern Settings already uses. */}
      <div
        className="adm-tabs rail-overflow"
        role="tablist"
        aria-label="Admin sections"
        onKeyDown={onTabKeyDown}
      >
        {TABS.map(t => (
          <button
            key={t.id}
            role="tab"
            id={`admtab-${t.id}`}
            aria-selected={tab === t.id}
            tabIndex={tab === t.id ? 0 : -1}
            ref={(el) => { if (el) tabRefs.current[t.id] = el }}
            className={`adm-tab${tab === t.id ? ' active' : ''}`}
            onClick={() => setTab(t.id)}
          >
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
          {/* Category — traffic & engagement (this device only) */}
          <div className="adm-cat">
            <div className="adm-cat-head">
              <div className="adm-cat-title"><span className="adm-section-bar" />Traffic &amp; Engagement</div>
              {/* Loud, because these are the biggest numbers on the page and
                  they are NOT site traffic — they are this admin's own browser.
                  A quiet grey caption under a four-figure "Page views" is read
                  as a footnote, not as the scope of the figure. */}
              <span className="adm-cat-desc" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span style={{ padding: '2px 7px', borderRadius: 999, background: 'color-mix(in srgb,var(--warn) 16%,transparent)', color: '#854d0e', fontWeight: 700, fontSize: 10, letterSpacing: '.04em', textTransform: 'uppercase' }}>
                  This device only
                </span>
                not site-wide · from this browser&apos;s localStorage
              </span>
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
                  <span style={{ color: 'var(--accent-strong)' }}>{inProgressCount} open</span>
                </div>
              </div>
            </div>

            <div className="adm-grid-2">
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
            </div>
          </div>

          {/* Category — audience (all users, server aggregate) */}
          <div className="adm-cat">
            <div className="adm-cat-head">
              <div className="adm-cat-title"><span className="adm-section-bar" />Audience</div>
              <span className="adm-cat-desc" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                All users · server totals · last 30 days
                {confirmPageReset ? (
                  <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                    <span style={{ fontSize: 10, color: 'var(--err)', fontWeight: 600 }}>Wipe page views?</span>
                    <button className="btn btn-s" disabled={resettingPages} onClick={handleResetPages} style={{ fontSize: 10, color: '#fff', background: 'var(--err)', borderColor: 'var(--err)' }}>{resettingPages ? 'Resetting…' : 'Yes'}</button>
                    <button className="btn btn-s" disabled={resettingPages} onClick={() => setConfirmPageReset(false)} style={{ fontSize: 10 }}>No</button>
                  </span>
                ) : (
                  <button className="btn btn-s" onClick={() => setConfirmPageReset(true)} style={{ fontSize: 10 }}>Reset page analytics</button>
                )}
              </span>
            </div>
            {!aggregateLoaded ? (
              <div className="adm-card"><div className="adm-empty">Loading aggregate analytics…</div></div>
            ) : aggregateError ? (
              // Distinct from "no data yet", deliberately. These two states used
              // to be one, so a failed read looked like an empty site.
              <div className="adm-card">
                <div className="adm-card-body">
                  <div className="adm-empty" style={{ color: 'var(--err)' }}>Aggregate analytics could not be read.</div>
                  <p style={{ fontSize: 11, color: 'var(--t2)', textAlign: 'center', margin: '6px 0 0' }}>
                    No number is shown because none was returned — this is <strong>not</strong> zero traffic.
                  </p>
                  <p className="mono" style={{ fontSize: 10.5, color: 'var(--t3)', textAlign: 'center', margin: '6px 0 0', wordBreak: 'break-word' }}>{aggregateError}</p>
                  <div style={{ display: 'flex', justifyContent: 'center', marginTop: 10 }}>
                    <button type="button" className="btn btn-s" onClick={refresh}>Retry</button>
                  </div>
                </div>
              </div>
            ) : !aggregate || (aggregate.totalViews === 0 && aggregate.byPath.length === 0 && aggregate.byTool.length === 0) ? (
              <div className="adm-card">
                <div className="adm-card-body">
                  <div className="adm-empty">No aggregate data yet.</div>
                  <p style={{ fontSize: 11, color: 'var(--t3)', textAlign: 'center', margin: '6px 0 0' }}>
                    Counts appear once signed-in users browse. If this stays empty, verify signed-in events reach <span className="mono">analytics-daily</span>, confirm which environments are allowed to write, and test the published live rules on the intended write/admin-read paths.
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

          {/* Category — feedback & community */}
          <div className="adm-cat">
            <div className="adm-cat-head">
              <div className="adm-cat-title"><span className="adm-section-bar" />Feedback &amp; Community</div>
              <span className="adm-cat-desc">Submissions across all devices</span>
            </div>
            <div className="adm-grid-3">
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

          </div>

          {/* Category — setup */}
          <div className="adm-cat">
            <div className="adm-cat-head">
              <div className="adm-cat-title"><span className="adm-section-bar" />Setup</div>
              <span className="adm-cat-desc">Infrastructure checklist</span>
            </div>

            {/* AI provider health — the failover made visible. A dead OpenRouter
                returns a perfect prompt from the Gemini fallback, so nothing
                else on any screen would ever say so. */}
            <div className="adm-card" style={{ marginBottom: 16 }}>
              <div className="adm-card-header">
                <span className="adm-card-title">AI provider health</span>
                <span style={{ fontSize: 11, color: 'var(--t3)' }}>
                  {aiHealth?.windowDays ? `last ${aiHealth.windowDays} days` : 'live'}
                </span>
              </div>
              <div className="adm-card-body">
                {aiHealthError && <div style={{ fontSize: 12, color: 'var(--warn)' }}>{aiHealthError}</div>}
                {!aiHealth && !aiHealthError && <div style={{ fontSize: 12, color: 'var(--t2)' }}>Checking…</div>}
                {aiHealth && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{
                        width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                        background: aiHealth.status === 'ok' ? 'var(--ok)'
                          : aiHealth.status === 'failing' ? 'var(--err)'
                            : aiHealth.status === 'degraded' ? 'var(--warn)' : 'var(--t3)',
                      }} />
                      <span style={{ fontSize: 13, fontWeight: 600 }}>
                        {aiHealth.status === 'ok' ? 'OpenRouter is serving generations'
                          : aiHealth.status === 'failing' ? 'OpenRouter is dead — everything is on the fallback'
                            : aiHealth.status === 'degraded' ? 'OpenRouter is failing intermittently'
                              : aiHealth.status === 'no-data' ? 'No generations to judge by'
                                : 'Health unavailable'}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--t2)', lineHeight: 1.5 }}>{aiHealth.summary}</div>
                    {aiHealth.totals && (
                      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 12, color: 'var(--t2)' }}>
                        <span>OpenRouter served <strong style={{ color: 'var(--t0)' }}>{aiHealth.totals.openrouterOk}</strong></span>
                        <span>OpenRouter failed <strong style={{ color: 'var(--t0)' }}>{aiHealth.totals.openrouterFail}</strong></span>
                        <span>Gemini fallback served <strong style={{ color: 'var(--t0)' }}>{aiHealth.totals.geminiOk}</strong></span>
                        <span>Both down <strong style={{ color: 'var(--t0)' }}>{aiHealth.totals.noProvider}</strong></span>
                      </div>
                    )}
                    {aiHealth.lastFailover && (
                      <div style={{ fontSize: 11, color: 'var(--t3)', lineHeight: 1.5 }}>
                        Last failover {fmtDateTime(aiHealth.lastFailover.at)}
                        {aiHealth.lastFailover.status ? ` · HTTP ${aiHealth.lastFailover.status}` : ''}
                        {aiHealth.lastFailover.message ? ` · ${aiHealth.lastFailover.message}` : ''}
                      </div>
                    )}
                    {aiHealth.alerting && (
                      <div style={{ fontSize: 11, color: aiHealth.alerting.startsWith('on') ? 'var(--t3)' : 'var(--warn)', lineHeight: 1.5 }}>
                        Email alerts: {aiHealth.alerting}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="adm-card">
              <div className="adm-card-body">
                <div className="adm-checklist">
                  {[
                    { label: 'Firebase Auth configured', ok: true, note: 'Enable Email/Password + Google providers in Firebase Console' },
                    { label: 'Firestore database created', ok: true, note: 'Set region to australia-southeast1 (Sydney) in Firebase Console' },
                    { label: 'Firestore security rules published', ok: true, note: 'Founder-confirmed 31 Jul 2026; re-test and republish after any rules change' },
                    { label: 'Feedback/support email notifications', ok: false, note: 'Externally unverified — configure RESEND_API_KEY + SUPPORT_NOTIFY_EMAIL in Vercel, then submit test feedback' },
                    { label: 'Google Sheets mirror (optional)', ok: false, note: 'Server-only configuration is not visible here — verify in Vercel and submit test feedback if used' },
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
                {confirmColourReset ? (
                  <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                    <span style={{ fontSize: 10, color: 'var(--err)', fontWeight: 600 }}>Reset?</span>
                    <button className="btn btn-s" onClick={handleResetColours} style={{ fontSize: 10, color: '#fff', background: 'var(--err)', borderColor: 'var(--err)' }}>Yes</button>
                    <button className="btn btn-s" onClick={() => setConfirmColourReset(false)} style={{ fontSize: 10 }}>No</button>
                  </span>
                ) : (
                  <button className="btn btn-s" onClick={() => setConfirmColourReset(true)} style={{ fontSize: 10 }}>Reset</button>
                )}
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

          <div className="adm-grid-2" style={{ marginBottom: 32 }}>
            <div className="adm-card">
              <div className="adm-card-header">
                <span className="adm-card-title">Most Copied Icons</span>
                <span style={{ fontSize: 10, color: 'var(--t3)' }}>{aggregate?.byIcon?.length ? 'all users · 30 days' : 'this device'}</span>
              </div>
              <div className="adm-card-body">
                {(() => {
                  const agg = aggregate?.byIcon || []
                  const entries = agg.length
                    ? agg.slice(0, 10)
                    : Object.entries(designData.iconCopies || {}).sort((a, b) => b[1] - a[1]).slice(0, 10)
                  if (!entries.length) return <div className="adm-empty">No icon copy data yet</div>
                  const max = entries[0][1]
                  return (
                    <div className="adm-bar">
                      {entries.map(([key, count]) => (
                        <div key={key} className="adm-bar-row">
                          <span className="adm-bar-label">{key}</span>
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
                <span className="adm-card-title">Most Copied Icon Packs</span>
                <span style={{ fontSize: 10, color: 'var(--t3)' }}>{aggregate?.byPack?.length ? 'all users · 30 days' : 'this device'}</span>
              </div>
              <div className="adm-card-body">
                {(() => {
                  const agg = aggregate?.byPack || []
                  const entries = agg.length
                    ? agg.slice(0, 10)
                    : Object.entries(designData.packCopies || {}).sort((a, b) => b[1] - a[1]).slice(0, 10)
                  if (!entries.length) return <div className="adm-empty">No pack copy data yet</div>
                  const max = entries[0][1]
                  return (
                    <div className="adm-bar">
                      {entries.map(([pack, count]) => (
                        <div key={pack} className="adm-bar-row">
                          <span className="adm-bar-label">{pack}</span>
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
            <div className="adm-section-title"><span className="adm-section-bar" />Submissions ({filteredFeedback.length}{filteredFeedback.length !== feedback.length ? ` of ${feedback.length}` : ''})</div>
            <div className="adm-sub-summary">
              <span style={{ color: 'var(--warn)' }}>{newCount} new</span>
              <span style={{ color: 'var(--accent-strong)' }}>{inProgressCount} in progress</span>
              <span style={{ color: 'var(--ok)' }}>{statusCounts.done || 0} done</span>
            </div>
          </div>

          {/* WHERE THESE ROWS CAME FROM.
              Mobbin: Circle's Content > Moderation prints the report count on
              its own line above the table, so the count and the body are two
              separate statements rather than one ambiguous empty state
              (https://mobbin.com/screens/d695963e-5465-44f1-8a86-171fd1f7c121).
              That distinction is the whole fix here: the server read is gated
              on the `admin` claim, and when it is refused this panel used to
              render the browser's own copy in silence. One quiet sentence, in
              the dashboard's existing meta type — not a card, because it is a
              caption on the list below and not an object of its own. */}
          {feedbackError ? (
            <div className="adm-card" style={{ marginBottom: 8, borderLeft: '2px solid var(--err)' }}>
              <div className="adm-card-body">
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--err)', marginBottom: 6 }}>
                  The server&apos;s copy could not be read
                </div>
                <div style={{ fontSize: 12, color: 'var(--t1)', lineHeight: 1.7 }}>{feedbackError}</div>
                <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 8 }}>
                  Only reports saved in this browser are listed below. Reports submitted through the
                  site are missing from this list, not absent from the site.
                </div>
              </div>
            </div>
          ) : serverFeedbackCount === null ? (
            // Before the first read returns, the honest sentence is that we do
            // not know yet. `null` is also the refused value, so rendering the
            // arithmetic here would print an empty count and NaN on first paint.
            <div className="adm-cat-desc" style={{ marginBottom: 8 }}>
              Checking the server&apos;s copy…
            </div>
          ) : (
            <div className="adm-cat-desc" style={{ marginBottom: 8 }}>
              {serverFeedbackCount} from the server · {Math.max(0, feedback.length - serverFeedbackCount)} from this browser
            </div>
          )}

          {writeError && (
            <div className="adm-card" style={{ marginBottom: 8, borderLeft: '2px solid var(--err)' }}>
              <div className="adm-card-body">
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--err)', marginBottom: 6 }}>
                  The last change was refused
                </div>
                <div style={{ fontSize: 12, color: 'var(--t1)', lineHeight: 1.7 }}>{writeError}</div>
                <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 8 }}>
                  The row was put back the way the server has it. Nothing on screen is pretending to be saved.
                </div>
              </div>
            </div>
          )}
          <div className="adm-sub-toolbar">
            <input type="search" className="adm-search" placeholder="Search subject, message, email…" value={subSearch} onChange={e => setSubSearch(e.target.value)} />
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              {['all', 'bug', 'feature', 'general', 'help'].map(t => (
                <button
                  key={t}
                  className={`adm-time-btn${filterType === t ? ' active' : ''}`}
                  onClick={() => setFilterType(prev => (prev === t ? 'all' : t))}
                  title={filterType === t && t !== 'all' ? 'Click again to clear' : undefined}
                  style={{ textTransform: 'uppercase', letterSpacing: '.04em', display: 'inline-flex', alignItems: 'center', gap: 5 }}
                >
                  <FilterGlyph id={t} />
                  {t === 'all' ? 'All Types' : t}{typeCounts[t] ? ` · ${typeCounts[t]}` : ''}
                </button>
              ))}
              <span style={{ width: 1, alignSelf: 'stretch', background: 'var(--border)', margin: '0 4px' }} />
              {['all', ...STATUSES].map(s => (
                <button
                  key={s}
                  className={`adm-time-btn${filterStatus === s ? ' active' : ''}`}
                  onClick={() => setFilterStatus(prev => (prev === s ? 'all' : s))}
                  title={filterStatus === s && s !== 'all' ? 'Click again to clear' : undefined}
                  style={{ textTransform: 'uppercase', letterSpacing: '.04em', display: 'inline-flex', alignItems: 'center', gap: 5 }}
                >
                  <FilterGlyph id={s} />
                  {s === 'all' ? 'All' : STATUS_LABELS[s]}{statusCounts[s] ? ` · ${statusCounts[s]}` : ''}
                </button>
              ))}
              <span style={{ width: 1, alignSelf: 'stretch', background: 'var(--border)', margin: '0 4px' }} />
              <button className="adm-time-btn" onClick={() => setSubSort(s => (s === 'newest' ? 'oldest' : 'newest'))} title="Toggle sort order">
                {subSort === 'newest' ? 'Newest ↓' : 'Oldest ↑'}
              </button>
            </div>
          </div>
          {filteredFeedback.length === 0 && (
            <div className="adm-card">
              <div className="adm-empty">
                {feedback.length > 0
                  ? 'No submissions match filters.'
                  : feedbackError
                    ? 'Nothing to show — the server read was refused, so this is not "no submissions".'
                    : 'No submissions yet.'}
              </div>
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filteredFeedback.map(item => (
              <SubmissionCard
                key={item.id}
                item={item}
                canSeeEmail={canSeeReporterEmail(role)}
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
      {tab === 'users' && <UsersPanel localUsers={data.users} toast={toast} />}

      {/* ═══════ PIPELINE TAB ═══════ */}
      {tab === 'pipeline' && <PipelineBoard />}

      {/* ═══════ BOARD TAB ═══════ */}
      {tab === 'board' && <ModuleBoard />}

      {/* ═══════ PROMPTS TAB ═══════ */}
      {/* ═══════ COMMUNITY REVIEW QUEUE ═══════ */}
      {tab === 'community' && (
        <div className="adm-cat">
          <div className="adm-cat-head">
            <h2>Community submissions</h2>
            <p>
              Gradients, palettes and designs members have submitted. Until this
              existed they were written to the submitter&rsquo;s browser and nowhere
              else, so nothing could be reviewed.
            </p>
          </div>
          <CommunityQueue toast={toast} />
        </div>
      )}

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
