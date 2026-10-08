// A size ceiling for archives that three.js's loaders unpack in memory.
//
// 3MF, KMZ, AMF and USDZ are zip files, and the loaders inflate every entry in
// full before parsing any of it. The rule: no single entry may unpack to more
// than 256 MB and the whole archive no more than 512 MB. The converter takes
// files up to 150 MB, so that allows a real 3MF (XML, which deflates about
// 5 to 10 times) while stopping well short of what a tab can hold alongside
// the parsed model.
//
// The check reads the archive's central directory and adds up the declared
// sizes BEFORE anything is inflated. That bounds the inflate itself: fflate
// inflates each entry into a buffer of exactly its declared size, so an entry
// whose data is larger than it declares is cut off at the declared size and
// cannot grow past it.
import { unzipSync } from 'three/examples/jsm/libs/fflate.module.js'

export const MAX_ENTRY_BYTES = 256 * 1024 * 1024
export const MAX_TOTAL_BYTES = 512 * 1024 * 1024

export const ARCHIVE_TOO_LARGE = 'archive-too-large'

const mb = (n) => `${Math.round(n / 1048576)} MB`

/**
 * Throws Error('archive-too-large') (with `.limit` set to a plain-words
 * description) when the archive would unpack past either ceiling. An archive
 * that is not a readable zip passes: the loader reports that itself.
 *
 * The check never looks at the file's leading bytes. Each loader decides for
 * itself what counts as a zip (two bytes, a full header, or just "try it"),
 * and fflate finds the archive from its end record, so the only test that
 * agrees with every loader is whether fflate can read it.
 */
export function assertArchiveWithinCap(buffer, { maxEntry = MAX_ENTRY_BYTES, maxTotal = MAX_TOTAL_BYTES } = {}) {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer)
  let total = 0
  const tooLarge = (limit) => Object.assign(new Error(ARCHIVE_TOO_LARGE), { limit })
  try {
    unzipSync(bytes, {
      filter(entry) {
        if (entry.originalSize > maxEntry) throw tooLarge(`a single part of it unpacks to more than ${mb(maxEntry)}`)
        total += entry.originalSize
        if (total > maxTotal) throw tooLarge(`it unpacks to more than ${mb(maxTotal)}`)
        return false
      },
    })
  } catch (err) {
    if (err?.message === ARCHIVE_TOO_LARGE) throw err
  }
}
