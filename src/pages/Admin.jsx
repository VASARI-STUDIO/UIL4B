import { Fragment, useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
// ── WHAT THIS PAGE IS ALLOWED TO READ FROM utils/analytics ────────────────
// getAggregateAnalytics() is the only cross-user reader in that module: it sums
// the `analytics-daily` documents every signed-in session writes, so what it
// returns is the SITE. Everything else exported there —  getPageViews(),
// getSessions(), getDesignAnalytics() — reads this browser's own localStorage,
// and on 2026-09-16 the founder's instruction was to get "data from my specific
// browser window" off this dashboard. They are not imported here any more, and
// tests/unit/admin-reads-nothing-from-this-browser.test.js fails the build if
// one comes back.
//
// getAnalyticsSummary() is the ONE exception and it is a narrow one: the Users
// tab uses `summary.users` — the profile cache — as its fallback when the
// server user list cannot be read, and it says on screen that that is what it
// is showing. A labelled fallback is not a headline figure.
import { getAnalyticsSummary, getFeedback, updateFeedbackStatus, updateFeedbackNotes, deleteFeedback, getAggregateAnalytics, resetPageAnalytics } from '../utils/analytics'
import { collection, getDocs, doc, updateDoc, deleteDoc, query, orderBy } from 'firebase/firestore'
import { db } from '../utils/firebase'
import CommunityQueue from '../components/admin/CommunityQueue'
import { listFeedback, setFeedbackStatus, setFeedbackNotes, deleteFeedbackDoc } from '../utils/feedbackQueueApi'
import { useModerationRole } from '../hooks/useModerationRole'
import {
  FEEDBACK_STATUSES, FEEDBACK_STATUS_LABELS, nextFeedbackStatus,
  canReview, canSeeReporterEmail, canAssignModerators,
} from '../utils/moderation'
import { uploadCommunityMedia, dataUrlToBlob, extFromDataUrl } from '../utils/mediaUpload'
import { useAuth } from '../contexts/AuthContext'
import { isAdminEmail } from '../utils/constants'
// ── THE TWO INTERNAL BOARDS ARE NOT ON THIS PAGE AT ALL ANY MORE ──────────
// src/data/pipeline.js and src/data/moduleBoard.js are still imported here
// neither statically nor dynamically — but the reason has changed, and the new
// one is stronger. They used to arrive from GET /api/ai?backlog=1 behind the
// verified-admin gate, rendered by a Pipeline tab and a Board tab. Since
// 2026-09-16 the modules live on the founder's machine and out of this
// repository, so that endpoint answers 501 `localOnly` in every deployment and
// both tabs rendered a paragraph explaining why they were empty. He asked for
// the pipeline to go; the module board was the same tab in a different shape,
// so it went with it. The request is gone, the two components are gone, and
// there is now no code path from this page to either module.
import { firstWinById } from '../utils/firstWin'
import { resolvePromptProfileLink } from '../utils/promptSubmission'
import { PLAN_STATES, planStateOf, planSortKey, PLAN_STATE_ORDER } from '../utils/adminUsers'
import { toCsv } from '../utils/csv'
// The stylesheet families this surface needs, split out of the one
// render-blocking global sheet (see src/styles/deferred/). They ride this
// route's own lazy chunk, so they arrive with it and never with the homepage.
import '../styles/deferred/admin.css'
import '../styles/deferred/tool-shell.css'

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
// SPECTRUM, 2026-09-18: the last three literals here became color-mix() on the
// tokens they were approximating. `rgba(245,158,11,.1)` is amber, `rgba(16,185,
// 129,.1)` is emerald and `rgba(239,68,68,.1)` is red — each one the LIGHT
// theme's value of a signal token, frozen. The note above records that the
// same fault was already fixed once here for `#a855f7`, which "had no dark
// value at all"; these three had the same problem and survived that sweep
// because an rgba() reads less like a hardcoded colour than a hex does. They
// are the same thing. Derived from the token, they now track both themes and
// any future change to the signal ramp.
const STATUS_BGS = { new: 'color-mix(in srgb,var(--warn) 12%,transparent)', 'in-progress': 'color-mix(in srgb,var(--pending) 12%,transparent)', done: 'color-mix(in srgb,var(--ok) 12%,transparent)' }
const TYPE_COLORS = { bug: 'var(--err)', feature: 'var(--accent)', general: 'var(--t2)', help: 'var(--pending)' }
const TYPE_BGS = { bug: 'color-mix(in srgb,var(--err) 12%,transparent)', feature: 'var(--accent-bg)', general: 'var(--bg-2)', help: 'color-mix(in srgb,var(--pending) 12%,transparent)' }
const DONUT_COLORS = ['var(--accent)', 'var(--ok)', 'var(--warn)', 'var(--err)', 'var(--pending)', 'var(--t3)']

// ── TEN TABS, AUDITED, SIX LEFT ───────────────────────────────────────────
// Every tab here answers a question with data that can answer it. The four
// that went could not:
//
//   Pipeline  the founder asked for it. Its data has been local-only since
//             2026-09-16, so the deployed tab was a paragraph saying so.
//   Board     the same endpoint, the same paragraph, the same emptiness.
//   Design    "Most Copied Fonts" and "Most Picked Colours" counted what was
//             copied and picked IN THIS BROWSER. The site-wide equivalents —
//             icons and icon packs — moved to Overview, where the rest of the
//             cross-user aggregate already lived.
//   Pages     every table on it read this browser's localStorage, with nothing
//             on screen saying so. "Top Pages (all users)" on Overview is the
//             same question answered from the server.
//
// Order is by how often the surface is worked rather than by how it grew: the
// dashboard opens on Overview, and Users is the tab the founder named.
const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'users', label: 'Users' },
  { id: 'submissions', label: 'Submissions' },
  { id: 'community', label: 'Community' },
  { id: 'prompts', label: 'Prompts' },
  { id: 'stripe', label: 'Stripe' },
]

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

// ── SVG chart ───────────────────────────────────────────────

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
        {/* The number in the hole is a VALUE, so it is Geist Mono like every
            other figure on the dashboard — and its weight was 800, which is
            outside Geist's 300..700 axis and was being clamped to 700 by the
            renderer with nobody choosing it. The stylesheet sweep that caught
            the other 39 of these cannot see this one: it is an SVG attribute
            in JSX (`fontWeight="800"`), not a CSS declaration. 600 is the top
            of Geist Mono's own axis. */}
        <text x={cx} y={cy - 4} textAnchor="middle" fill="var(--t0)" fontFamily="var(--mono)" fontSize="19" fontWeight="600">{total}</text>
        {/* The word stays exactly as it was. Uppercasing it would have been a
            styling decision that edits a string, and strings on this page are
            the founder's. Mono and tracking carry the treatment instead. */}
        <text x={cx} y={cy + 12} textAnchor="middle" fill="var(--t3)" fontFamily="var(--mono)" fontSize="8.5" letterSpacing=".1em">total</text>
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

/**
 * One ranked list on the Overview, drawn from the cross-user aggregate.
 *
 * Four of these replace four hand-copied blocks of the same markup. The
 * duplication was how the Design tab drifted: its bar cards looked identical to
 * Overview's and were reading a different, narrower source — this browser's
 * localStorage — with nothing on either card to tell them apart. One component
 * that is only ever handed aggregate rows cannot develop that difference again.
 */
function TopList({ title, rows, unit, empty }) {
  const max = rows[0]?.[1] || 1
  return (
    <div className="adm-card">
      <div className="adm-card-header">
        <span className="adm-card-title">{title}</span>
        <span className="mono" style={{ fontSize: 10, color: 'var(--t3)' }}>{rows.length} {unit}</span>
      </div>
      <div className="adm-card-body">
        {rows.length > 0 ? (
          <div className="adm-bar">
            {rows.slice(0, 8).map(([label, count]) => (
              <div key={label} className="adm-bar-row">
                <span className="adm-bar-label">{label}</span>
                <div className="adm-bar-track"><div className="adm-bar-fill" style={{ width: `${(count / max) * 100}%` }} /></div>
                <span className="adm-bar-value">{count}</span>
              </div>
            ))}
          </div>
        ) : <div className="adm-empty">{empty}</div>}
      </div>
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
            <span className="mono" style={{ fontSize: 10, color: 'var(--t3)' }}>{fmtDateTime(item.createdAt)}</span>
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
              ? <>Last actioned by <strong className="mono" style={{ color: 'var(--t2)' }}>{item.reviewedBy}</strong>{item.updatedAt ? <> · <span className="mono">{fmtDateTime(item.updatedAt)}</span></> : ''}</>
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
                <button className="btn btn-s" onClick={() => { onDelete(item.id); setConfirmDel(false) }} style={{ fontSize: 10, color: 'var(--err-fg)', background: 'var(--err)', borderColor: 'var(--err)' }}>Yes</button>
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
  // Same three frozen light-theme literals as STATUS_BGS above, same fix.
  const statusBg = {
    pending: 'color-mix(in srgb,var(--warn) 12%,transparent)',
    approved: 'color-mix(in srgb,var(--ok) 12%,transparent)',
    rejected: 'color-mix(in srgb,var(--err) 12%,transparent)',
  }[prompt.status] || 'var(--bg-2)'
  const profileLink = resolvePromptProfileLink(prompt)

  return (
    <div className="adm-card adm-prompt" style={{ borderLeftColor: statusColor }}>
      <div className="adm-card-body">
        <div className="adm-prompt-header">
          <span className="adm-badge" style={{ color: statusColor, background: statusBg }}>{prompt.status}</span>
          {prompt.authorName && <span style={{ fontSize: 11, color: 'var(--t2)' }}>by {prompt.authorName}</span>}
          {prompt.authorUid && <span className="mono" title="Firebase user ID" style={{ fontSize: 10, color: 'var(--t3)' }}>UID {prompt.authorUid}</span>}
          <span className="mono" style={{ fontSize: 10, color: 'var(--t3)', marginLeft: 'auto' }}>{fmtDateTime(prompt.createdAt)}</span>
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
                  <img src={prompt.mediaUrl} alt="Prompt media" style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 'var(--radius-s)', display: 'block' }} />
                ) : (
                  <video src={prompt.mediaUrl} controls style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 'var(--radius-s)', display: 'block' }} />
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
              <button className="btn btn-s" onClick={handleDelete} disabled={busy} style={{ fontSize: 10, color: 'var(--err-fg)', background: 'var(--err)', borderColor: 'var(--err)' }}>Yes</button>
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

// Snap an auto-filled amount to the SHAPE OF ITS OWN DEFAULT, rather than to
// .99 always.
//
// The .99 rule was right when every price ended in .99. The founder-approved
// ladder is whole dollars for the recurring plans — $7 monthly, $18 quarterly,
// $48 yearly — and .99 only on lifetime (api/_lib/pricing.js says exactly
// this). Snapping $7 to $6.99 would have quietly overwritten an approved price
// with a different one every time auto-fill ran.
//
// So the reference amount decides: a whole-number default keeps whole numbers,
// a default with real cents keeps the .99 ending it already had.
const roundLikeDefault = (x, reference) => {
  const wantsWhole = Math.abs(reference - Math.round(reference)) < 0.005
  if (wantsWhole) return Math.max(1, Math.round(x))
  return Math.max(0.99, Math.round(x - 0.99) + 0.99)
}

// Human label for an interval key, derived so a new interval needs no edit here.
const intervalLabel = (id) => id.charAt(0).toUpperCase() + id.slice(1)

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
    // ── A 200 THAT IS NOT JSON IS A FAILED READ, NOT AN EMPTY CONFIG ────────
    // This was `await res.json().catch(() => ({}))`, and the fallback was the
    // defect: a response that is not JSON became `{}`, `{}` passed the `res.ok`
    // check, and `setConfig({})` put a TRUTHY object into state. The panel then
    // took its loaded branch and ran `config.currencies.map(...)` on undefined.
    //
    // That is not hypothetical and it is not confined to the Stripe tab. The
    // throw lands in render, the route's ErrorBoundary catches it, and the
    // WHOLE admin dashboard unmounts — six tabs gone because one fetch came
    // back as a document. It reproduces on any host that answers an unknown
    // /api path with the SPA shell, which is exactly what `vite preview` does:
    // GET /api/setup-stripe there is `200 text/html`.
    //
    // It is worth guarding rather than dismissing as a preview artefact,
    // because the production shape of the same fault is a dropped or
    // mis-deployed function — and /api is at Vercel's twelve-function limit,
    // so a deploy that loses one is the realistic way this happens live.
    //
    // The parse failure is now reported instead of swallowed. Nothing about a
    // real response changes: a genuine JSON body behaves exactly as before, and
    // the panel's existing "Couldn't load Stripe config" card — which already
    // prints `error` in mono — is where this surfaces.
    const body = await res.text()
    let data
    try {
      data = body ? JSON.parse(body) : {}
    } catch {
      const kind = res.headers.get('content-type') || 'no content type'
      throw new Error(`The Stripe settings route answered ${res.status} with ${kind} rather than JSON`)
    }
    if (!res.ok) throw new Error(data.error || `Server returned ${res.status}`)
    return data
  }, [])

  // THE INTERVALS AND THEIR CURRENCIES COME FROM THE SERVER, not from a list
  // typed here. `defaults` is api/_lib/pricing.js#DEFAULT_PRICES: its keys are
  // the intervals /api/setup-stripe will validate against, and each interval's
  // own keys are the currencies approved for it — which is how `lifetime`
  // expresses that it is not sold in SGD or CHF. Reading the shape off the
  // payload is what stops this panel drifting from the route again.
  const buildDraft = useCallback((data) => {
    const out = {}
    for (const interval of Object.keys(data.defaults || {})) {
      out[interval] = {}
      const live = data.prices?.[interval]?.currencies
      for (const code of Object.keys(data.defaults[interval])) {
        out[interval][code] = (live && live[code] != null) ? live[code] : data.defaults[interval][code]
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

  // #12 auto-fill: editing one cell scales every other currency, in every
  // interval, off its default ratio. The edited cell keeps the raw string so
  // typing isn't fought mid-keystroke.
  //
  // Only currencies the interval actually HAS are written — iterating the full
  // currency list would have invented a lifetime price in SGD, which the route
  // refuses ("Lifetime pricing is not approved for SGD") and which nobody
  // approved.
  const handlePriceEdit = (interval, code, raw) => {
    setDraft(d => {
      const next = {}
      for (const iv of Object.keys(d)) next[iv] = { ...d[iv] }
      next[interval][code] = raw
      const base = config?.defaults?.[interval]?.[code]
      const n = Number(raw)
      if (!autoFill || !raw || !isFinite(n) || n <= 0 || !base) return next
      const scale = n / base
      for (const iv of Object.keys(config.defaults)) {
        for (const c of Object.keys(config.defaults[iv])) {
          if (iv === interval && c === code) continue
          const ref = config.defaults[iv][c]
          const scaled = roundLikeDefault(ref * scale, ref)
          next[iv][c] = Number.isInteger(scaled) ? String(scaled) : scaled.toFixed(2)
        }
      }
      return next
    })
  }

  // The intervals this Stripe account sells, in the order api/_lib/pricing.js
  // declares them. Derived, so adding an interval to the route adds a column
  // here and needs no edit in this file.
  const intervals = useMemo(() => Object.keys(config?.defaults || {}), [config])

  const save = async () => {
    setSaving(true); setError(''); setResult(null)
    try {
      // Every interval the route validates, or it answers 400 and nothing is
      // created. This used to post monthly and yearly only.
      const prices = {}
      for (const interval of Object.keys(draft)) {
        prices[interval] = {}
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
                Set the {intervals.map(intervalLabel).join(', ').toLowerCase()} price for the <strong>UIL4B Pro</strong> plan per currency. Each customer is
                shown their local currency at checkout automatically (detected from their browser locale).
              </p>
              {/* The ".99" tip that used to sit here was removed rather than
                  reworded: the approved ladder is whole dollars on the
                  recurring plans ($7 / $18 / $48) and .99 on lifetime only, so
                  the tip argued against the prices it sat above. The sentence
                  kept below is the half that is still true. */}
              <p className="adm-stripe-tip">
                Saving creates fresh Stripe prices and retires the old ones — existing subscribers keep their current rate.
              </p>
              <div style={{ overflowX: 'auto' }}>
                <table className="adm-stripe-table">
                  <thead>
                    <tr>
                      <th>Currency</th>
                      {intervals.map(iv => <th key={iv}>{intervalLabel(iv)}</th>)}
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
                        {intervals.map(interval => {
                          // An interval does not necessarily sell in every
                          // currency: lifetime has no approved SGD or CHF
                          // amount, and the route refuses one. A cell with no
                          // approved amount is stated as unavailable rather
                          // than given an input that would post a number
                          // nobody signed off.
                          const value = draft[interval]?.[c.code]
                          if (value == null) {
                            return (
                              <td key={interval}>
                                <span className="adm-stripe-na" title={`${intervalLabel(interval)} is not sold in ${c.code.toUpperCase()}`}>—</span>
                              </td>
                            )
                          }
                          return (
                            <td key={interval}>
                              <div className="adm-stripe-input">
                                <span>{c.symbol}</span>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  aria-label={`${intervalLabel(interval)} price in ${c.code.toUpperCase()}`}
                                  value={value}
                                  onChange={e => handlePriceEdit(interval, c.code, e.target.value)}
                                />
                              </div>
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <label className="adm-stripe-autofill">
                <input type="checkbox" checked={autoFill} onChange={e => setAutoFill(e.target.checked)} />
                Auto-fill other currencies — edit one price and every currency, in every plan, recalculates from the approved ladder by the same ratio
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
                  {Object.entries(result.prices || {}).map(([iv, v]) => (
                    <div key={iv}>{intervalLabel(iv)} price: <strong>{v?.id}</strong></div>
                  ))}
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

// The founder's own row. He is a founder by verified email against a
// server-side allowlist, which outranks any claim, so offering to "make" him a
// moderator would be offering him less than he has.
const isFounderRow = (u) => isAdminEmail(u?.email)

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

// ── WHAT THE MODERATOR ROLE IS, IN ONE PLACE ──────────────────────────────
// These three strings are the prose form of the predicates in
// utils/moderation.js. They were written once, inline, above the table; they
// are constants now because the confirmation step below has to say the SAME
// thing at the moment the decision is taken. A grant described in one sentence
// where the reader is browsing and a different sentence where they are deciding
// is how a permission gets handed out on a misunderstanding.
const MODERATOR_GRANTS = 'They can read, triage and delete feedback, and approve, reject or delete community submissions and prompts.'
const MODERATOR_DENIES = 'They cannot see a reporter’s email address, appoint another moderator, reach anyone’s account or billing record, or read site analytics.'
const MODERATOR_REVOKE_LAG = 'Removing somebody takes effect on their next sign-in — an ID token already issued stays valid for up to an hour.'

// Ranks the Access column sorts by. Not alphabetical: the column exists to
// gather the people who hold something, and "founder" sorting under "user"
// would scatter them.
const ACCESS_RANK = { founder: 0, moderator: 1, user: 2, unknown: 3 }

/**
 * The signup answers this account actually has, in the labels the table used
 * for them before they moved into the detail panel.
 *
 * ── WHY THIS IS A FILTER AND NOT THREE COLUMNS ─────────────────────────────
 * The signup questionnaire was cut to a single question (#436 took out the
 * role and attribution questions as answers nobody read). So an account made
 * since then has ONE answer and an older one has three, and three fixed
 * columns printed a field of em-dashes across the newest half of the table.
 *
 * `firstWin` is also the answer that the table could never show. It was a
 * column — headed "First win" — and it was blank for every row on the site,
 * because api/verify-admin.js returns `onboarding.source` and never
 * `onboarding.firstWin`. Nothing said so; the column simply read as "nobody
 * answered". It is read here so that the day the route returns the field it
 * appears, and until then this panel shows the two legacy answers rather than
 * a blank labelled with a live question.
 *
 * The id is resolved through firstWinById so the answer reads in the words the
 * signup screen offered ("A colour palette"), not the id it stored.
 */
const onboardingAnswers = (u) => [
  ['First win', firstWinById(u.onboarding?.firstWin)?.label || u.onboarding?.firstWin],
  ['Role', u.onboarding?.role],
  ['Category', u.onboarding?.use],
].filter(([, value]) => value)

const USER_SORTS = {
  email: (u) => (u.email || '').toLowerCase(),
  // By STATE rather than by a pro/free flag, so the accounts with a billing
  // problem sort to the top of the column that is about billing. See
  // PLAN_STATE_ORDER in utils/adminUsers.js.
  plan: (u) => planSortKey(u.subscription),
  access: (u) => ACCESS_RANK[u.access] ?? ACCESS_RANK.unknown,
  country: (u) => (u.country ? countryName(u.country) : '￿'),
  createdAt: (u) => u.joinedTs || 0,
  lastLoginAt: (u) => (u.lastLoginAt ? new Date(u.lastLoginAt).getTime() : 0),
}

// The four states the tiles above the table filter to. Each one is a QUESTION
// the founder actually asks of this list, and each is a real subset of it —
// Mobbin: HubSpot's Users & Teams puts its counts in tiles above the table and
// makes each one a way into the rows it counted, rather than a figure to read
// and then go filtering for by hand
// (https://mobbin.com/screens/a5d65b51-ab30-4cd1-bcf3-65b7490177a9).
const USER_VIEWS = [
  { id: 'all', label: 'All accounts' },
  { id: 'paying', label: 'Paying' },
  { id: 'attention', label: 'Needs attention' },
  // The id is NOT the plural of the role. tests/unit/moderation-role.test.js
  // fails any file under src/ that contains that word inside quotes, because
  // the only reason browser code would name the roster collection is to try to
  // reach it — and a filter id is not worth blunting a security guard for.
  { id: 'role', label: 'Moderators' },
]

/** One value the founder needs in his clipboard to act on this person elsewhere. */
function CopyValue({ label, value, mono = true, onCopy }) {
  if (!value) return null
  return (
    <div className="adm-copy-row">
      <span className="adm-copy-label">{label}</span>
      <span className={`adm-copy-value${mono ? ' mono' : ''}`}>{value}</span>
      <button
        type="button"
        className="btn btn-s adm-copy-btn"
        onClick={() => { navigator.clipboard?.writeText(value); onCopy?.(label) }}
      >
        Copy
      </button>
    </div>
  )
}

/** The plan badge, coloured by the state's tone rather than by a pro/free flag. */
function PlanBadge({ state }) {
  return <span className={`adm-badge adm-plan adm-plan--${state.tone}`}>{state.label}</span>
}

function UsersPanel({ localUsers, toast, role }) {
  const [users, setUsers] = useState(null) // null = loading
  const [source, setSource] = useState('server')
  const [error, setError] = useState('')
  // The moderator roster, as a Set of uids. null = NOT READ YET, and it renders
  // as "checking" rather than as "nobody holds the role" — the same distinction
  // the feedback panel was fixed for, in the one place where getting it wrong
  // would have the founder appointing somebody who is already appointed.
  const [roster, setRoster] = useState(null)
  const [rosterError, setRosterError] = useState('')
  // ── Whether the deployed route can grant the role at all ──────────────────
  // null = not asked yet · true = the roster half of /api/verify-admin is live
  // · false = it is not.
  //
  // THREE STATES, NOT TWO, AND THIS IS THE WHOLE POINT. api/verify-admin.js is
  // founder-gated: it ships only once `npm run apply:gated` has been run and
  // the site redeployed. The UNPATCHED route does not reject `moderatorAction`
  // — it has never heard of it — so it falls through to its ordinary 200 and a
  // button wired to `res.ok` would report a grant that never happened, on the
  // one screen in this product where a false success is a security statement.
  //
  // So the probe is a POSITIVE signal rather than the absence of an error: the
  // patched route returns `role` as a string on every one of its exits and the
  // unpatched one returns it on none of them.
  const [roleEnabled, setRoleEnabled] = useState(null)
  const [busyUid, setBusyUid] = useState(null)
  // { uid, grant } — the decision waiting on the confirmation step. ONE piece
  // of state for both directions, because both directions are the same
  // decision: who can work the queues.
  const [pendingRole, setPendingRole] = useState(null)
  const [revealed, setRevealed] = useState(() => new Set())
  const [openUid, setOpenUid] = useState(null)
  const [search, setSearch] = useState('')
  const [view, setView] = useState('all')
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
          subscription: { status: null, interval: null }, onboarding: {}, location: '', company: '',
        })))
      }
    })()
    return () => { cancelled = true }
  }, [localUsers])

  // ── The roster ────────────────────────────────────────────────────────────
  // Read separately from the user list because the route answers one question
  // per call: `moderatorAction` returns early, before `includeUsers` is read.
  // Founder-only, so a moderator who somehow reached this tab does not even
  // request the list of who else holds the role.
  const loadRoster = useCallback(async () => {
    if (!canAssignModerators(role)) return
    try {
      const { auth: fbAuth } = await import('../utils/firebase')
      const token = await fbAuth.currentUser?.getIdToken()
      if (!token) throw new Error('Not authenticated')
      const res = await fetch('/api/verify-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ moderatorAction: 'list' }),
      })
      const data = await res.json().catch(() => ({}))
      // The probe. An unpatched route answers this call with its ordinary
      // handshake — 200, no `role`, no roster array — which is not an error and
      // must not be reported as one.
      if (res.ok && typeof data.role !== 'string') {
        setRoleEnabled(false)
        setRoster(null)
        setRosterError('')
        return
      }
      setRoleEnabled(true)
      if (!res.ok || !Array.isArray(data.moderators)) {
        throw new Error(data.error || `Server returned ${res.status}`)
      }
      setRoster(new Set(data.moderators.map(m => m.uid)))
      setRosterError('')
    } catch (err) {
      // null, not an empty Set. "Nobody is a moderator" and "we could not find
      // out" are different sentences and must not render as the same one.
      setRoster(null)
      setRosterError(String(err?.message || err || 'Unknown error').slice(0, 200))
    }
  }, [role])

  useEffect(() => { loadRoster() }, [loadRoster])

  const setModerator = async (u, grant) => {
    setBusyUid(u.uid)
    setPendingRole(null)
    try {
      const { auth: fbAuth } = await import('../utils/firebase')
      const token = await fbAuth.currentUser?.getIdToken()
      if (!token) throw new Error('Not authenticated')
      const res = await fetch('/api/verify-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ moderatorAction: grant ? 'grant' : 'revoke', targetUid: u.uid }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || `Server returned ${res.status}`)
      // The same probe again, and it is not belt-and-braces: this control is
      // only rendered when roleEnabled is true, but the deploy can change under
      // an open tab. A 200 from a route that has never heard of
      // `moderatorAction` is a 200 that did nothing.
      if (typeof data.role !== 'string') {
        setRoleEnabled(false)
        throw new Error('The moderator role is not switched on yet, so nothing was changed')
      }
      // Re-read rather than patching the Set locally: the server is the record
      // of who holds the role, and a local guess is how the two drift apart.
      await loadRoster()
      toast(grant
        ? `${u.displayName || u.email || 'That account'} can now review submissions and feedback`
        : data.note || 'Removed from the roster')
    } catch (err) {
      setRosterError(String(err?.message || err || 'Unknown error').slice(0, 200))
      toast(grant ? 'Could not grant the role — the server refused' : 'Could not revoke the role — the server refused')
    } finally {
      setBusyUid(null)
    }
  }

  const founderView = canAssignModerators(role)

  const rows = useMemo(() => (users || []).map(u => ({
    ...u,
    planState: planStateOf(u.subscription),
    // 'unknown' while the roster has not been read, so the column can say so
    // rather than calling everybody an ordinary user by default.
    access: isFounderRow(u) ? 'founder'
      : !founderView || roster === null ? 'unknown'
        : roster.has(u.uid) ? 'moderator' : 'user',
    country: countryFromLocation(u.location),
    joinedTs: u.createdAt ? new Date(u.createdAt).getTime() : 0,
  })), [users, roster, founderView])

  const countryCounts = useMemo(() => {
    const counts = {}
    rows.forEach(r => { const k = r.country || 'unknown'; counts[k] = (counts[k] || 0) + 1 })
    return Object.entries(counts).sort((a, b) => b[1] - a[1])
  }, [rows])

  // The tile counts, computed over EVERY row rather than over the filtered set:
  // a count that moved when you filtered by it would be telling you about the
  // filter rather than about the site.
  const viewCounts = useMemo(() => ({
    all: rows.length,
    paying: rows.filter(r => r.planState.paying).length,
    attention: rows.filter(r => r.planState.attention).length,
    role: rows.filter(r => r.access === 'moderator').length,
  }), [rows])

  const inView = useCallback((r) => {
    if (view === 'paying') return r.planState.paying
    if (view === 'attention') return r.planState.attention
    if (view === 'role') return r.access === 'moderator'
    return true
  }, [view])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const out = rows.filter(r => {
      if (!inView(r)) return false
      if (countryFilter !== 'all' && (r.country || 'unknown') !== countryFilter) return false
      if (q && ![r.email, r.displayName, r.uid, r.location, r.company, r.subscription?.status]
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
  }, [rows, search, inView, countryFilter, sortKey, sortDir])

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
    // `plan` is the STATE now, not a pro/free flag, and `stripeStatus` carries
    // the raw word beside it — a spreadsheet that collapsed past-due into
    // "free" would rebuild the defect this panel was fixed for, one export
    // later and somewhere nobody is looking.
    const cols = ['email', 'displayName', 'provider', 'emailVerified', 'plan', 'stripeStatus', 'interval', 'access', 'location', 'country', 'company', 'createdAt', 'lastLoginAt']
    // displayName, company and location are user-controlled profile fields, so
    // the cells go through csvCell rather than bare quote-escaping. See utils/csv.js.
    const csv = toCsv(cols, filtered, (r, c) => (
      c === 'plan' ? r.planState.label
        : c === 'stripeStatus' ? (r.subscription?.status || '')
          : c === 'interval' ? (r.subscription?.interval || '')
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

  const SortTh = ({ k, children, ...rest }) => (
    <th {...rest} scope="col">
      <button type="button" className={`adm-th-sort${sortKey === k ? ' active' : ''}`} onClick={() => toggleSort(k)}>
        {children}
        <span className="adm-th-arrow">{sortKey === k ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}</span>
      </button>
    </th>
  )

  // User · Plan · Joined · Last seen · Location · Details, plus Access when the
  // founder is the one reading. Counted once so the empty row cannot go out of
  // step with the header again.
  const COLUMNS = founderView ? 7 : 6

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
          {/* THE COUNTS ARE THE FILTERS. Four tiles, four questions, and every
              one of them opens the rows it counted. */}
          <div className="adm-user-views" role="group" aria-label="Filter accounts">
            {USER_VIEWS.map(v => (
              <button
                key={v.id}
                type="button"
                className={`adm-user-view${view === v.id ? ' active' : ''}${v.id === 'attention' && viewCounts.attention > 0 ? ' warn' : ''}`}
                aria-pressed={view === v.id}
                onClick={() => setView(v.id)}
              >
                <span className="adm-user-view-n">{viewCounts[v.id]}</span>
                <span className="adm-user-view-l">{v.label}</span>
              </button>
            ))}
          </div>

          <div className="adm-users-toolbar">
            <input
              type="search"
              className="adm-search"
              aria-label="Search users"
              placeholder="Search email, name, user ID, company…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <span className="adm-user-count" aria-live="polite">
              {filtered.length === rows.length ? `${rows.length} shown` : `${filtered.length} of ${rows.length}`}
            </span>
            <button className="btn btn-s" onClick={() => setRevealed(allRevealed ? new Set() : new Set(rows.map(r => r.uid)))}>
              {allRevealed ? 'Hide all emails' : 'Reveal all emails'}
            </button>
            <button className="btn btn-s" onClick={exportUsersCSV}>Export CSV</button>
          </div>

          {countryCounts.length > 1 && (
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

          {/* THE ROSTER'S OWN STATE, and when the role cannot be handed out at
              all, why. Mobbin: Teachable's User Roles table gives the role an
              access description and a live count of who holds it, and says
              "1 of 1 admin seats" rather than leaving the reader to count
              (https://mobbin.com/screens/8990ea9c-0399-45f0-ab10-2b4d3bd0004c).
              What the role GRANTS has moved to the confirmation step, where the
              decision is actually taken. */}
          {founderView && (
            <div className="adm-cat-desc adm-roster-line">
              {roleEnabled === false
                ? <>
                    <strong style={{ color: 'var(--t1)' }}>The moderator role is not switched on yet.</strong>
                    {' '}The rules understand a moderator, but this deployment cannot grant one yet, so
                    {' '}nothing on this screen offers to appoint anybody. Enabling it is an owner
                    {' '}action &mdash; the steps are in docs/OWNER-ACTIONS.md &sect;1.3.
                  </>
                : roster === null
                  ? (rosterError
                      ? <span style={{ color: 'var(--err)' }}>The moderator roster could not be read &mdash; {rosterError}. The Access column cannot be trusted until it can.</span>
                      : 'Reading the moderator roster…')
                  : <>
                      <strong style={{ color: 'var(--t1)' }}>{roster.size === 0 ? 'Nobody' : roster.size} {roster.size === 1 ? 'person holds' : 'hold'} the moderator role.</strong>
                      {' '}{MODERATOR_GRANTS}
                    </>}
            </div>
          )}

          <div className="adm-card">
            <div className="adm-table-wrap">
              {/* The roles are written out because the narrow-width rule below
                  680px re-lays every one of these elements as a block, and a
                  <table> whose display is not `table` loses its implicit
                  semantics in every engine. A card per row must not cost a
                  screen reader the row. */}
              <table className="adm-table adm-users-table" role="table">
                <thead>
                  <tr role="row">
                    <SortTh k="email">User</SortTh>
                    {founderView && <SortTh k="access">Access</SortTh>}
                    <SortTh k="plan">Plan</SortTh>
                    <SortTh k="createdAt">Joined</SortTh>
                    <SortTh k="lastLoginAt">Last seen</SortTh>
                    <SortTh k="country">Location</SortTh>
                    <th scope="col"><span className="sr-only">Details</span></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(u => {
                    const open = openUid === u.uid
                    const pending = pendingRole?.uid === u.uid ? pendingRole : null
                    return (
                      <Fragment key={u.uid}>
                        <tr role="row" className={`${open ? 'adm-row-open' : ''}${u.planState.attention ? ' adm-row-flag' : ''}`}>
                          <td role="cell" data-label="User">
                            <MaskedEmail email={u.email} revealed={revealed.has(u.uid)} onToggle={() => toggleReveal(u.uid)} />
                            <div className="adm-user-sub">
                              {u.displayName || '—'} · {u.provider}{u.emailVerified === false ? ' · unverified' : ''}
                              {u.company ? ` · ${u.company}` : ''}
                            </div>
                          </td>
                          {/* THE DEGRADED STATE IS NOT "User". With the route
                              unapplied nobody CAN hold the role, but that is a
                              fact about the deployment rather than about this
                              person, and a cell that answered "User" would be
                              stating the second while only knowing the first.
                              It says which one it is. */}
                          {founderView && (
                            <td role="cell" data-label="Access">
                              <span className={`adm-access adm-access--${u.access}`}>
                                {u.access === 'founder' ? 'Founder'
                                  : roleEnabled === false ? <span className="adm-access-off">not switched on</span>
                                    : u.access === 'moderator' ? 'Moderator'
                                      : u.access === 'unknown' ? (rosterError ? 'unknown' : 'checking…')
                                        : 'User'}
                              </span>
                            </td>
                          )}
                          <td role="cell" data-label="Plan">
                            <PlanBadge state={u.planState} />
                            {u.subscription?.interval && <span className="adm-plan-interval">{u.subscription.interval}</span>}
                          </td>
                          <td role="cell" data-label="Joined" style={{ whiteSpace: 'nowrap' }}>{u.createdAt ? fmtDate(u.createdAt) : '—'}</td>
                          <td role="cell" data-label="Last seen" style={{ whiteSpace: 'nowrap' }}>{u.lastLoginAt ? fmtDate(u.lastLoginAt) : '—'}</td>
                          <td role="cell" data-label="Location">
                            {u.country
                              ? <span className="adm-flag-cell" title={u.location ? `${u.location} — ${countryName(u.country)}` : countryName(u.country)}>
                                  <span className="adm-flag">{flagEmoji(u.country)}</span>{u.country}
                                </span>
                              : u.location
                                ? <span title={u.location} style={{ color: 'var(--t2)' }}>{u.location}</span>
                                : <span style={{ color: 'var(--t3)' }}>—</span>}
                          </td>
                          {/* ONE affordance per row, at the end of it, opening
                              everything there is to know about this person.
                              Mobbin: Deel's compliance table keeps identity and
                              one primary action pinned at the two ends of the
                              row and lets the middle columns carry the detail
                              (https://mobbin.com/screens/9f5af254-f966-4810-adbb-c428854523e3). */}
                          <td role="cell" className="adm-row-end">
                            <button
                              type="button"
                              className="btn btn-s"
                              aria-expanded={open}
                              onClick={() => setOpenUid(open ? null : u.uid)}
                            >
                              {open ? 'Close' : 'Details'}
                            </button>
                          </td>
                        </tr>
                        {open && (
                          <tr role="row" className="adm-detail-row">
                            <td role="cell" colSpan={COLUMNS}>
                              <div className="adm-detail">
                                <div className="adm-detail-cols">
                                  <section className="adm-detail-sec">
                                    <h4>Account</h4>
                                    {/* The two handles the founder needs to act on
                                        this person anywhere else — Firebase console,
                                        Stripe, a support reply. Neither was reachable
                                        from this page before; the uid was not rendered
                                        at all and the address was behind a blur. */}
                                    <CopyValue label="Email" value={u.email} onCopy={(l) => toast?.(`${l} copied`)} />
                                    <CopyValue label="User ID" value={u.uid} onCopy={(l) => toast?.(`${l} copied`)} />
                                    <dl className="adm-detail-dl">
                                      <dt>Name</dt><dd>{u.displayName || '—'}</dd>
                                      <dt>Sign-in</dt><dd>{u.provider}</dd>
                                      <dt>Email verified</dt>
                                      <dd>{u.emailVerified === true ? 'Yes' : u.emailVerified === false ? 'No' : 'Not reported'}</dd>
                                      {u.company && <><dt>Company</dt><dd>{u.company}</dd></>}
                                      {u.location && <><dt>Location</dt><dd>{u.location}</dd></>}
                                    </dl>
                                  </section>

                                  <section className="adm-detail-sec">
                                    <h4>Plan</h4>
                                    <dl className="adm-detail-dl">
                                      <dt>State</dt><dd><PlanBadge state={u.planState} /></dd>
                                      <dt>Stripe status</dt>
                                      <dd className="mono">{u.subscription?.status || 'no subscription'}</dd>
                                      <dt>Billing period</dt><dd>{u.subscription?.interval || '—'}</dd>
                                      <dt>Pro access now</dt>
                                      <dd>
                                        {u.planState.entitled === true ? 'Yes'
                                          : u.planState.entitled === false ? 'No'
                                            : u.planState.entitled === 'grace'
                                              // NOT a yes and NOT a no. api/_lib/plans.js keeps a
                                              // past-due subscription on Pro for seven days from
                                              // `paymentFailedAt`, and that timestamp is not one
                                              // of the fields this list is given.
                                              ? 'Within the seven-day past-due grace, if the failure was recent — this list does not carry the timestamp that decides it'
                                              : 'Unrecognised status — check Stripe'}
                                      </dd>
                                    </dl>
                                  </section>

                                  {/* Only the answers that came back — see the note
                                      above onboardingAnswers(). */}
                                  {onboardingAnswers(u).length > 0 && (
                                    <section className="adm-detail-sec">
                                      <h4>Signup</h4>
                                      <dl className="adm-detail-dl">
                                        {onboardingAnswers(u).map(([label, value]) => (
                                          <Fragment key={label}><dt>{label}</dt><dd>{value}</dd></Fragment>
                                        ))}
                                      </dl>
                                    </section>
                                  )}
                                </div>

                                {founderView && roleEnabled !== false && (
                                  <section className="adm-detail-sec adm-detail-access">
                                    <h4>Moderator role</h4>
                                    {roster === null ? (
                                      <p className="adm-detail-note">{rosterError ? `The roster could not be read — ${rosterError}` : 'Reading the moderator roster…'}</p>
                                    ) : isFounderRow(u) ? (
                                      <p className="adm-detail-note">This is the founder account. It already has every permission a moderator has, and more.</p>
                                    ) : pending ? (
                                      /* THE CONFIRMATION, AND IT GUARDS BOTH
                                         DIRECTIONS. Granting used to be a single
                                         unconfirmed click and only revoking asked —
                                         which is backwards, because handing somebody
                                         the delete button on the queues is the half
                                         that cannot be undone by clicking again.
                                         Mobbin: Deel's Select access level states, on
                                         each option, the exact sentence of what that
                                         level can do
                                         (https://mobbin.com/screens/15fb662e-c13b-4a92-96c6-4e7b6a0eadf5);
                                         Toggl Track's delete confirmation names what
                                         the action cannot undo before it offers the
                                         button
                                         (https://mobbin.com/screens/e62d32e0-7a4e-409f-a1f1-9acd8242dc1a). */
                                      <div className={`adm-confirm${pending.grant ? '' : ' adm-confirm--danger'}`}>
                                        <p className="adm-confirm-lead">
                                          {pending.grant ? 'Make ' : 'Remove the moderator role from '}
                                          <strong>{u.displayName || u.email || u.uid}</strong>
                                          {pending.grant ? ' a moderator?' : '?'}
                                        </p>
                                        <ul className="adm-confirm-list">
                                          {pending.grant ? (
                                            <>
                                              <li>{MODERATOR_GRANTS}</li>
                                              <li>{MODERATOR_DENIES}</li>
                                            </>
                                          ) : (
                                            <>
                                              <li>{MODERATOR_REVOKE_LAG}</li>
                                              <li>Feedback and submissions they have already triaged keep the decisions they made. This removes the access, not the record.</li>
                                            </>
                                          )}
                                        </ul>
                                        <div className="adm-confirm-actions">
                                          <button className="btn btn-s" onClick={() => setPendingRole(null)}>Cancel</button>
                                          <button
                                            className={`btn btn-s ${pending.grant ? 'adm-btn-go' : 'adm-btn-danger'}`}
                                            disabled={busyUid === u.uid}
                                            onClick={() => setModerator(u, pending.grant)}
                                          >
                                            {busyUid === u.uid ? 'Saving…' : pending.grant ? 'Make moderator' : 'Remove the role'}
                                          </button>
                                        </div>
                                      </div>
                                    ) : roster.has(u.uid) ? (
                                      <>
                                        <p className="adm-detail-note">Holds the moderator role. {MODERATOR_GRANTS}</p>
                                        <button className="btn btn-s adm-btn-danger" disabled={busyUid === u.uid} onClick={() => setPendingRole({ uid: u.uid, grant: false })}>
                                          Remove the role
                                        </button>
                                      </>
                                    ) : (
                                      <>
                                        <p className="adm-detail-note">An ordinary account. {MODERATOR_DENIES}</p>
                                        <button className="btn btn-s" disabled={busyUid === u.uid} onClick={() => setPendingRole({ uid: u.uid, grant: true })}>
                                          Make moderator
                                        </button>
                                      </>
                                    )}
                                  </section>
                                )}

                                {/* WHAT THIS DASHBOARD CANNOT DO TO AN ACCOUNT,
                                    said once, where somebody hunting for it would
                                    look. Suspending, deleting or refunding a
                                    customer all need server routes that do not
                                    exist; a button that appeared to do any of them
                                    would be the worst thing on this page. Mobbin:
                                    Supabase gathers the irreversible account
                                    actions into one labelled Danger zone rather
                                    than scattering them through the detail panel
                                    (https://mobbin.com/screens/0cb2b22a-4a91-4251-a2eb-ca8b23c82071)
                                    — this is that region, stating that it is
                                    empty. */}
                                <p className="adm-detail-foot">
                                  Suspending, deleting or refunding an account is not done from here. Copy the user ID
                                  above and act in the Firebase console or the Stripe dashboard, where the change is
                                  recorded against your account.
                                </p>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    )
                  })}
                  {filtered.length === 0 && (
                    <tr role="row"><td role="cell" colSpan={COLUMNS}>
                      <div className="adm-empty">
                        {rows.length === 0 ? 'No users yet' : 'No users match the current filters'}
                      </div>
                    </td></tr>
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
  const isAdminUser = isAdminEmail(user?.email)
  // The SERVER-VERIFIED role, from the ID token's custom claims. isAdminUser
  // above compares a digest against a list that ships in the browser bundle —
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
  // Cross-user aggregate (server-read). null = loading, object = loaded.
  const [aggregate, setAggregate] = useState(null)
  const [aggregateLoaded, setAggregateLoaded] = useState(false)
  // '' = fine. Non-empty = the read FAILED and any number shown would be a lie.
  const [aggregateError, setAggregateError] = useState('')
  // When the figures on screen were actually fetched. A dashboard with no
  // timestamp cannot be distinguished from a dashboard that stopped updating.
  const [refreshedAt, setRefreshedAt] = useState(null)
  const [confirmPageReset, setConfirmPageReset] = useState(false)
  const [resettingPages, setResettingPages] = useState(false)

  const refresh = useCallback(async () => {
    // The profile cache, and ONLY as the Users tab's labelled fallback for
    // when the server list cannot be read. Nothing on this page states a
    // figure from it. See the import note at the top of the file.
    setData(getAnalyticsSummary())
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
          <Link to="/style-guide" className="btn btn-s">Style Guide</Link>
          {/* When these figures were actually fetched. Without it, a dashboard
              that quietly stopped updating looks exactly like one that is
              current — and this page is only useful if you can trust its age. */}
          {refreshedAt && (
            <span className="adm-cat-desc" style={{ marginRight: 8 }}>
              Updated <span className="mono">{new Date(refreshedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
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
            aria-controls="adm-panel"
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

      {/* ONE PANEL, NAMED BY WHICHEVER TAB IS SELECTED.

          The tablist was already correct — roving tabindex, arrow keys,
          aria-selected, a real focus ring — but there was no tabpanel and no
          aria-controls anywhere on the route. A screen reader was told "tab,
          selected" and then offered nothing to move into. Found by the
          2026-09-18 independent review, measured: [role=tabpanel] count 0,
          every aria-controls null.

          Settings.jsx renders all six of ITS panels and hides the inactive
          ones, which is the house pattern in nine other files. That shape is
          wrong here: these panels fetch — users, the community queue, Stripe
          — so rendering all six always would trade an accessibility fix for a
          performance and quota regression. Only the selected panel exists, so
          there is one panel element and its accessible name follows the
          selection via aria-labelledby.

          tabIndex={-1} rather than 0: the panel always contains focusable
          content, so making the container itself a tab stop would add an
          empty stop before every panel. -1 keeps it programmatically
          focusable for the arrow-key handler without that cost. */}
      <div
        id="adm-panel"
        role="tabpanel"
        aria-labelledby={`admtab-${tab}`}
        tabIndex={-1}
      >

      {/* ═══════ OVERVIEW TAB ═══════ */}
      {tab === 'overview' && (
        <>
          {/* Category — audience (all users, server aggregate) */}
          <div className="adm-cat">
            <div className="adm-cat-head">
              <div className="adm-cat-title"><span className="adm-section-bar" />Audience</div>
              <span className="adm-cat-desc" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                All users · server totals · last 30 days
                {!confirmPageReset && (
                  <button className="btn btn-s" onClick={() => setConfirmPageReset(true)} style={{ fontSize: 10 }}>Reset page analytics</button>
                )}
              </span>
            </div>

            {/* ── THE RESET SAYS WHAT IT REACHES ───────────────────────────
                It read "Wipe page views? Yes / No" on one line beside the
                heading, which describes a local button. It is not one:
                resetPageAnalytics() deletes the `views` field and every
                `view__<path>` field from up to 400 documents in
                `analytics-daily`, which is the record every administrator
                reads and the only copy of it. What it does NOT touch is worth
                as much as what it does — the tool, icon and pack counters in
                the same documents survive, and the three lists below it stay
                exactly as they are.
                Mobbin: Pipedrive's delete confirmation spends its whole body
                on what else goes and what stays, and ends with where a
                recovery would come from
                (https://mobbin.com/screens/6e7cb815-5a01-481b-b0c2-6781feb3acde).
                Here there is no recovery, so that is the sentence. */}
            {confirmPageReset && (
              <div className="adm-confirm adm-confirm--danger" role="group" aria-label="Reset page analytics">
                <p className="adm-confirm-lead"><strong>Reset page analytics for everyone?</strong></p>
                <ul className="adm-confirm-list">
                  <li>Clears the page-view totals and the per-page counts from every daily document in <span className="mono">analytics-daily</span>, for every administrator — not just this browser.</li>
                  <li>Leaves the tool, icon and icon-pack counts alone, so Top Tools, Top Icons and Top Icon Packs below are unaffected.</li>
                  <li>There is no undo and no backup. Deleted counts are gone.</li>
                </ul>
                <div className="adm-confirm-actions">
                  <button className="btn btn-s" disabled={resettingPages} onClick={() => setConfirmPageReset(false)}>Cancel</button>
                  <button className="btn btn-s adm-btn-danger" disabled={resettingPages} onClick={handleResetPages}>
                    {resettingPages ? 'Resetting…' : 'Reset page analytics'}
                  </button>
                </div>
              </div>
            )}
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
                {/* THE FOUR RANKED LISTS, ALL FROM THE SAME AGGREGATE.
                    Icons and icon packs arrived here from the Design tab: they
                    were the only two cards on it whose numbers were the site's
                    rather than this browser's, because they already preferred
                    aggregate.byIcon / aggregate.byPack and fell back to
                    localStorage when those were empty. The fallback is gone
                    with the rest of it — a card that silently swaps the whole
                    site for one browser is the defect, not the remedy. */}
                <div className="adm-grid-2" style={{ marginBottom: 0 }}>
                  <TopList
                    title="Top Pages"
                    unit="pages"
                    empty="No page data yet"
                    rows={aggregate.byPath.map(([path, n]) => [path === 'root' ? '/' : path.replace(/_/g, '/'), n])}
                  />
                  <TopList title="Top Tools" unit="tools" empty="No tool usage yet" rows={aggregate.byTool} />
                  <TopList title="Top Icons" unit="icons" empty="No icon copies yet" rows={aggregate.byIcon} />
                  <TopList title="Top Icon Packs" unit="packs" empty="No pack copies yet" rows={aggregate.byPack} />
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
                <span className="mono" style={{ fontSize: 10, color: 'var(--t3)' }}>{feedback.filter(f => f.type === 'feature').length} total</span>
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
                        <div className="adm-feed-meta">{STATUS_LABELS[f.status]} · <span className="mono">{fmtDateTime(f.createdAt)}</span></div>
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
                        <span>OpenRouter served <strong className="mono" style={{ color: 'var(--t0)' }}>{aiHealth.totals.openrouterOk}</strong></span>
                        <span>OpenRouter failed <strong className="mono" style={{ color: 'var(--t0)' }}>{aiHealth.totals.openrouterFail}</strong></span>
                        <span>Gemini fallback served <strong className="mono" style={{ color: 'var(--t0)' }}>{aiHealth.totals.geminiOk}</strong></span>
                        <span>Both down <strong className="mono" style={{ color: 'var(--t0)' }}>{aiHealth.totals.noProvider}</strong></span>
                      </div>
                    )}
                    {aiHealth.lastFailover && (
                      <div style={{ fontSize: 11, color: 'var(--t3)', lineHeight: 1.5 }}>
                        Last failover <span className="mono">{fmtDateTime(aiHealth.lastFailover.at)}</span>
                        {aiHealth.lastFailover.status ? <> · <span className="mono">HTTP {aiHealth.lastFailover.status}</span></> : ''}
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

      {/* ═══════ SUBMISSIONS TAB ═══════ */}
      {tab === 'submissions' && (
        <div className="adm-section">
          <div className="adm-section-h">
            <div className="adm-section-title"><span className="adm-section-bar" />Submissions ({filteredFeedback.length}{filteredFeedback.length !== feedback.length ? ` of ${feedback.length}` : ''})</div>
            <div className="adm-sub-summary">
              {/* The figure is mono, the word beside it is not: these three
                  read as one line and the split is what makes the counts
                  comparable down the eye rather than three sentences. */}
              <span style={{ color: 'var(--warn)' }}><span className="mono">{newCount}</span> new</span>
              <span style={{ color: 'var(--accent-strong)' }}><span className="mono">{inProgressCount}</span> in progress</span>
              <span style={{ color: 'var(--ok)' }}><span className="mono">{statusCounts.done || 0}</span> done</span>
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
              <span className="mono">{serverFeedbackCount}</span> from the server · <span className="mono">{Math.max(0, feedback.length - serverFeedbackCount)}</span> from this browser
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

      {/* ═══════ USERS TAB ═══════ */}
      {/* `role` is the SERVER-VERIFIED role from the ID token, not the bundled
          email check. Only a founder is offered the assignment controls, and the
          route refuses the action with a 403 regardless — the UI hides what the
          server would refuse rather than being the thing that decides it. */}
      {tab === 'users' && <UsersPanel localUsers={data.users} toast={toast} role={role} />}

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
    </div>
  )
}
