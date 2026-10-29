// Names and types for community-media uploads. No Firebase import, so the
// choices can be tested under `node --test`; mediaUpload.js does the upload.
//
// storage.rules accepts an object under community-media/{uid}/ only when its
// name is slot-0 to slot-9 plus one of six extensions and its content type is
// the type that extension stands for. An account therefore holds at most 60
// objects, and a repeat upload replaces one instead of adding another. These
// tables are the client's copy of that rule: change one, change the other.

export const MEDIA_SLOTS = 10
export const MAX_MEDIA_BYTES = 10 * 1024 * 1024

const TYPE_FOR_EXT = Object.freeze({
  webp: 'image/webp',
  png: 'image/png',
  jpg: 'image/jpeg',
  gif: 'image/gif',
  mp4: 'video/mp4',
  webm: 'video/webm',
})

const EXT_FOR_TYPE = Object.freeze({
  'image/webp': 'webp',
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/gif': 'gif',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
})

/**
 * The extension and content type to upload a blob under, or null when it is not
 * one of the six. The blob's own type wins; its extension is only read when it
 * has no type. SVG and QuickTime are refused here, and the callers fall back to
 * the inline-base64 path they already have for any upload that throws.
 *
 * @param {string} type  the blob's MIME type (may be empty)
 * @param {string} [ext] an extension hint, with or without a dot
 * @returns {{ ext: string, contentType: string } | null}
 */
export function resolveMediaKind(type, ext) {
  const mime = String(type || '').split(';')[0].trim().toLowerCase()
  if (mime) {
    const known = EXT_FOR_TYPE[mime]
    return known ? { ext: known, contentType: TYPE_FOR_EXT[known] } : null
  }
  const hint = String(ext || '').replace(/^\./, '').toLowerCase()
  const normal = hint === 'jpeg' ? 'jpg' : hint
  return TYPE_FOR_EXT[normal] ? { ext: normal, contentType: TYPE_FOR_EXT[normal] } : null
}

/**
 * Which slot name to upload under. The first slot of this type that is not in
 * the folder yet; when all ten are taken, a random one, which replaces that
 * object (the folder holds no record of which prompt uses which).
 *
 * @param {Iterable<string>} taken object names already in the owner's folder
 * @param {string} ext             one of the six extensions
 * @param {() => number} [random]  [0, 1), injectable for tests
 */
export function pickMediaSlot(taken, ext, random = Math.random) {
  const used = new Set(taken)
  for (let n = 0; n < MEDIA_SLOTS; n += 1) {
    if (!used.has(`slot-${n}.${ext}`)) return `slot-${n}.${ext}`
  }
  return `slot-${Math.floor(random() * MEDIA_SLOTS)}.${ext}`
}
