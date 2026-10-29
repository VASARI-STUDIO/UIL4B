// Names and types for community-media uploads. No Firebase import, so the
// choices can be tested under `node --test`; mediaUpload.js does the upload.
//
// storage.rules accepts an object under community-media/{uid}/ only when its
// name is slot-0 to slot-9 plus one of six extensions and its content type is
// the type that extension stands for, and only where no object exists yet. An
// account therefore holds at most 60 objects, a slot is never overwritten, and
// a full set of ten for a type means the next upload of that type has to take
// the caller's inline fallback. These tables are the client's copy of that
// rule: change one, change the other.

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

/** Thrown when all ten slots of a type are taken; callers fall back to inline base64. */
export class MediaSlotsFullError extends Error {
  constructor(ext) {
    super(`All ${MEDIA_SLOTS} ${ext} slots are in use`)
    this.name = 'MediaSlotsFullError'
    this.ext = ext
  }
}

/**
 * Which slot name to upload under: the first slot of this type that is not in
 * the folder yet. The rule refuses an upload over an existing object, so when
 * all ten are taken this throws rather than name one of them.
 *
 * @param {Iterable<string>} taken object names already in the owner's folder
 * @param {string} ext             one of the six extensions
 * @throws {MediaSlotsFullError} when every slot of this type is taken
 */
export function pickMediaSlot(taken, ext) {
  const used = new Set(taken)
  for (let n = 0; n < MEDIA_SLOTS; n += 1) {
    if (!used.has(`slot-${n}.${ext}`)) return `slot-${n}.${ext}`
  }
  throw new MediaSlotsFullError(ext)
}

/** storage.rules answers an upload over an existing object with this code. */
const isRefused = (err) => err?.code === 'storage/unauthorized'

/**
 * Upload into a free slot. Two uploads can pick the same free slot from the
 * same listing; the rule lets the first create it and refuses the second, so a
 * refusal is retried once with a fresh listing, the slot just tried counted as
 * taken. A second refusal, or a full set, throws for the caller's fallback.
 *
 * @param {object} args
 * @param {() => Promise<string[]>} args.listTaken object names in the owner's folder
 * @param {(name: string) => Promise<unknown>} args.put uploads under that name
 * @param {string} args.ext one of the six extensions
 * @returns {Promise<string>} the slot name that took the upload
 * @throws {MediaSlotsFullError} when every slot of this type is taken
 */
export async function putInFreeSlot({ listTaken, put, ext }) {
  const tried = []
  for (let attempt = 0; ; attempt += 1) {
    const name = pickMediaSlot([...(await listTaken()), ...tried], ext)
    try {
      await put(name)
      return name
    } catch (err) {
      if (attempt > 0 || !isRefused(err)) throw err
      tried.push(name)
    }
  }
}
