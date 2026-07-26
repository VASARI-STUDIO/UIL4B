import { getOwnerHandle, getPublicOwner, PUBLIC_OWNER_ID } from './constants'
import { safeHttpUrl } from './urlSafety'

export const COMMUNITY_SUBMISSIONS_KEY = 'vs-community-submissions'

function resolveStorage(storage) {
  return storage || (typeof localStorage !== 'undefined' ? localStorage : null)
}

export function sanitizeCommunitySubmission(item) {
  if (!item || typeof item !== 'object' || Array.isArray(item)) return null
  const { authorEmail, ...submission } = item
  const owner = getOwnerHandle(authorEmail) || getPublicOwner(submission.ownerId)
  return {
    ...submission,
    author: owner?.publicHandle || submission.author || 'Community member',
    ownerId: owner ? PUBLIC_OWNER_ID : submission.ownerId,
    url: safeHttpUrl(submission.url),
  }
}

export function writeCommunitySubmissions(items, storage) {
  const target = resolveStorage(storage)
  const safe = Array.isArray(items)
    ? items.map(sanitizeCommunitySubmission).filter(Boolean)
    : []
  try { target?.setItem(COMMUNITY_SUBMISSIONS_KEY, JSON.stringify(safe)) } catch { /* disabled / quota */ }
  return safe
}

export function readCommunitySubmissions(storage) {
  const target = resolveStorage(storage)
  try {
    const parsed = JSON.parse(target?.getItem(COMMUNITY_SUBMISSIONS_KEY) || '[]')
    return writeCommunitySubmissions(Array.isArray(parsed) ? parsed : [], target)
  } catch {
    return writeCommunitySubmissions([], target)
  }
}

export function appendCommunitySubmission(item, storage) {
  return writeCommunitySubmissions([...readCommunitySubmissions(storage), item], storage)
}

export function clearCommunitySubmissions(storage) {
  try { resolveStorage(storage)?.removeItem(COMMUNITY_SUBMISSIONS_KEY) } catch { /* disabled */ }
}
