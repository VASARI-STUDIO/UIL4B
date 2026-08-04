// Explicit .js extension: this module is exercised directly by node --test,
// which (unlike Vite) will not guess it.
import { getOwnerHandle, getPublicOwner, PUBLIC_OWNER_ID } from './constants.js'

// Gradient submissions for the gradient library — the same LOCAL-FIRST shape
// Community.jsx already uses for design submissions (see communitySubmissions.js),
// deliberately so: there is no shared publishing pipeline yet, and this file
// invents no backend. A submission is a queue entry held in this browser, with
// an explicit moderation status, so the flow is real and upgrades cleanly to a
// shared review queue later without the UI changing shape.
//
// The honesty rule this module enforces: nothing here can put itself in the
// library. `status` is clamped to a known value and a client-written record can
// only ever be 'pending' or 'withdrawn' — 'approved' is a REVIEWER's word, and
// no reviewer exists on the client, so it can never be reached from here.

export const GRADIENT_SUBMISSIONS_KEY = 'vs-gradient-submissions'

// A cap so a runaway loop (or a bored user) can't fill the storage quota. Oldest
// entries fall off the end; the newest submission is always kept.
export const GRADIENT_SUBMISSIONS_MAX = 30

export const GRADIENT_SUBMISSION_STATUSES = ['pending', 'withdrawn']

const TYPES = ['Linear', 'Radial', 'Conic']
const MAX_STOPS = 12

function resolveStorage(storage) {
  return storage || (typeof localStorage !== 'undefined' ? localStorage : null)
}

const clean = (value, max) => (typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, max) : '')

function sanitizeStops(stops) {
  if (!Array.isArray(stops)) return null
  const safe = stops
    .filter(s => s && typeof s === 'object' && /^#[0-9a-fA-F]{6}$/.test(s.color))
    .slice(0, MAX_STOPS)
    .map(s => ({
      color: s.color.toUpperCase(),
      position: Math.max(0, Math.min(100, Math.round(Number(s.position)) || 0)),
    }))
  return safe.length >= 2 ? safe : null
}

// Anything that fails to describe a real gradient is dropped rather than stored
// half-formed — a corrupt entry must never reach the gallery renderer.
export function sanitizeGradientSubmission(item) {
  if (!item || typeof item !== 'object' || Array.isArray(item)) return null
  const stops = sanitizeStops(item.stops)
  if (!stops) return null
  const { authorEmail, ...rest } = item
  const owner = getOwnerHandle(authorEmail) || getPublicOwner(rest.ownerId)
  const status = GRADIENT_SUBMISSION_STATUSES.includes(rest.status) ? rest.status : 'pending'
  const submittedAt = Number(rest.submittedAt)
  return {
    id: clean(rest.id, 60) || `g${Date.now()}`,
    name: clean(rest.name, 60) || 'Untitled gradient',
    author: clean(owner?.publicHandle || rest.author, 40) || 'Community member',
    ownerId: owner ? PUBLIC_OWNER_ID : (clean(rest.ownerId, 60) || undefined),
    note: clean(rest.note, 200),
    type: TYPES.includes(rest.type) ? rest.type : 'Linear',
    angle: Math.max(0, Math.min(360, Math.round(Number(rest.angle)) || 0)),
    stops,
    status,
    submittedAt: Number.isFinite(submittedAt) && submittedAt > 0 ? submittedAt : Date.now(),
  }
}

export function writeGradientSubmissions(items, storage) {
  const target = resolveStorage(storage)
  const safe = Array.isArray(items)
    ? items.map(sanitizeGradientSubmission).filter(Boolean).slice(0, GRADIENT_SUBMISSIONS_MAX)
    : []
  try { target?.setItem(GRADIENT_SUBMISSIONS_KEY, JSON.stringify(safe)) } catch { /* disabled / quota */ }
  return safe
}

export function readGradientSubmissions(storage) {
  const target = resolveStorage(storage)
  try {
    const parsed = JSON.parse(target?.getItem(GRADIENT_SUBMISSIONS_KEY) || '[]')
    return writeGradientSubmissions(Array.isArray(parsed) ? parsed : [], target)
  } catch {
    return writeGradientSubmissions([], target)
  }
}

// Newest first — the queue reads top-down like a review list.
export function appendGradientSubmission(item, storage) {
  return writeGradientSubmissions([item, ...readGradientSubmissions(storage)], storage)
}

export function withdrawGradientSubmission(id, storage) {
  const next = readGradientSubmissions(storage).filter(s => s.id !== id)
  return writeGradientSubmissions(next, storage)
}

export function clearGradientSubmissions(storage) {
  try { resolveStorage(storage)?.removeItem(GRADIENT_SUBMISSIONS_KEY) } catch { /* disabled */ }
}
