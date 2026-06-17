// Upload community-prompt media (images/videos) to Firebase Storage instead of
// embedding base64 in Firestore documents. Firestore docs are capped at ~1MB,
// which previously forced us to drop any media over ~900KB. Storage has no such
// limit (rules cap at 25MB), and the stored value becomes a plain download URL
// that existing <img>/<video src> code already understands.
//
// IMPORTANT: every caller must treat this as best-effort. If Firebase Storage
// isn't enabled in the project yet, these calls THROW — callers are expected to
// catch and fall back to the legacy base64-in-Firestore path so nothing
// regresses. Once Storage is enabled + rules are published, uploads succeed
// automatically and the base64 fallback stops being hit.

import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { storage, auth } from './firebase'

/**
 * Upload a Blob/File to community-media/{uid}/{timestamp}.{ext} and return its
 * public download URL.
 *
 * @param {Blob|File} blobOrFile - the media to upload (raw File or processed Blob)
 * @param {string} [uid] - owner uid; defaults to the signed-in user's uid
 * @param {string} [ext] - file extension without the dot (e.g. 'webp', 'mp4')
 * @returns {Promise<string>} download URL
 * @throws if Storage is unavailable/disabled, the user isn't authed, or upload fails
 */
export async function uploadCommunityMedia(blobOrFile, uid, ext) {
  const ownerUid = uid || auth.currentUser?.uid
  if (!ownerUid) throw new Error('Not authenticated')
  if (!blobOrFile) throw new Error('No media to upload')

  const safeExt = (ext || guessExt(blobOrFile)).replace(/[^a-z0-9]/gi, '').toLowerCase() || 'bin'
  const path = `community-media/${ownerUid}/${Date.now()}.${safeExt}`
  const storageRef = ref(storage, path)
  const meta = blobOrFile.type ? { contentType: blobOrFile.type } : undefined
  await uploadBytes(storageRef, blobOrFile, meta)
  return await getDownloadURL(storageRef)
}

// Best-effort extension from a File's name or MIME type. Used only when the
// caller doesn't pass an explicit ext.
function guessExt(blobOrFile) {
  const name = blobOrFile?.name || ''
  const fromName = name.includes('.') ? name.split('.').pop() : ''
  if (fromName) return fromName
  const type = blobOrFile?.type || ''
  if (type === 'image/svg+xml') return 'svg'
  const sub = type.split('/')[1]
  return sub || 'bin'
}

/**
 * Convert a base64 data URL into a Blob so it can be uploaded to Storage.
 * Returns null if the input isn't a parseable data URL.
 */
export function dataUrlToBlob(dataUrl) {
  try {
    if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) return null
    const [head, body] = dataUrl.split(',')
    const mimeMatch = head.match(/data:([^;]+)/)
    const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream'
    const isBase64 = /;base64/i.test(head)
    const binary = isBase64 ? atob(body) : decodeURIComponent(body)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    return new Blob([bytes], { type: mime })
  } catch {
    return null
  }
}

// Map a MIME type / data URL to a sensible Storage extension.
export function extFromDataUrl(dataUrl, fallback = 'bin') {
  if (typeof dataUrl !== 'string') return fallback
  const m = dataUrl.match(/^data:([^;,]+)/)
  const mime = m ? m[1] : ''
  if (mime === 'image/svg+xml') return 'svg'
  const sub = mime.split('/')[1]
  return sub || fallback
}
