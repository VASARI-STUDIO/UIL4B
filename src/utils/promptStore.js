// Local persistence + tag helpers for the Prompt Library. Kept tiny and
// dependency-free so any prompt component can import without pulling in React.
//
// Both keys are account-bound (utils/accountSync.js ACCOUNT_KEYS): the sync
// hook notices a changed value, stamps that key with the time of the change
// and sends it up. Every write here goes through `write()`, which announces
// the change straight away instead of waiting for the next poll.
//
// ── THE SAVE LEDGER ──────────────────────────────────────────────────────────
// `vs-saved-prompt-ids` is a ledger, one entry per community prompt ever
// saved: `{ id, saved, at }`, where `at` is when it was last saved or unsaved.
// An unsave keeps the entry with `saved: false` instead of dropping the id, so
// the account can merge two devices item by item (the newer `at` wins, see
// mergeStamped in accountSync) and an unsave on one device is not undone by
// another that still had the prompt saved. A plain list of ids, the older
// shape, reads as saved entries stamped 0.

const PROMPTS_KEY = 'vs-prompts'
const SAVED_IDS_KEY = 'vs-saved-prompt-ids'

export const PROMPT_STORE_KEYS = Object.freeze([PROMPTS_KEY, SAVED_IDS_KEY])

function store(storage) {
  if (storage) return storage
  try { return typeof localStorage === 'undefined' ? null : localStorage } catch { return null }
}

function read(storage, key, fallback) {
  try { return JSON.parse(store(storage)?.getItem(key) || fallback) }
  catch { return JSON.parse(fallback) }
}

function write(storage, key, value) {
  try { store(storage)?.setItem(key, JSON.stringify(value)) } catch { /* quota */ }
  // useFirestoreSync listens for this and stamps the key now.
  try { if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('vs-local-change')) } catch { /* no window */ }
}

export function getPrompts(storage) {
  const list = read(storage, PROMPTS_KEY, '[]')
  return Array.isArray(list) ? list : []
}

export function setPromptsStore(p, storage) {
  write(storage, PROMPTS_KEY, p)
}

/**
 * The ledger in its current shape, one entry per id (the newest), sorted by
 * id. Accepts the older plain list of ids, and a list mixing both shapes.
 */
export function normalizeSaveLedger(list) {
  const byId = new Map()
  for (const raw of Array.isArray(list) ? list : []) {
    const entry = raw && typeof raw === 'object'
      ? { id: raw.id, saved: raw.saved !== false, at: Number(raw.at) || 0 }
      : { id: raw, saved: true, at: 0 }
    if (entry.id === undefined || entry.id === null || entry.id === '') continue
    const held = byId.get(String(entry.id))
    // Newer wins; at the same time an unsave wins, the same answer on every device.
    if (!held || entry.at > held.at || (entry.at === held.at && !entry.saved)) byId.set(String(entry.id), entry)
  }
  return [...byId.values()].sort((a, b) => (String(a.id) < String(b.id) ? -1 : String(a.id) > String(b.id) ? 1 : 0))
}

export function getSaveLedger(storage) {
  return normalizeSaveLedger(read(storage, SAVED_IDS_KEY, '[]'))
}

export function savedIdsOf(ledger) {
  return new Set(normalizeSaveLedger(ledger).filter((e) => e.saved).map((e) => e.id))
}

export function getSavedIds(storage) {
  return savedIdsOf(getSaveLedger(storage))
}

/** The ledger with `id` marked saved or unsaved at `now`. Pure. */
export function markSave(ledger, id, saved, now = Date.now()) {
  const rest = normalizeSaveLedger(ledger).filter((e) => String(e.id) !== String(id))
  return normalizeSaveLedger([...rest, { id, saved: !!saved, at: now }])
}

/** Record one save or unsave in storage, stamped now. */
export function markStoredSave(id, saved, { storage, now } = {}) {
  const next = markSave(getSaveLedger(storage), id, saved, now ?? Date.now())
  write(storage, SAVED_IDS_KEY, next)
  return savedIdsOf(next)
}

/**
 * Drop the library copies an unsave has already removed somewhere else. The
 * two keys sync separately, so a device can receive the unsave (the ledger)
 * together with an older library that still holds the copy. A copy goes only
 * when its source was unsaved AFTER the copy was made; an older copy of the
 * same prompt saved again later stays.
 */
export function pruneUnsavedCopies(prompts, ledger) {
  const list = Array.isArray(prompts) ? prompts : []
  const unsavedAt = new Map(normalizeSaveLedger(ledger).filter((e) => !e.saved).map((e) => [String(e.id), e.at]))
  if (!unsavedAt.size) return list
  const next = list.filter((p) => {
    if (!p || p.sourceId == null || !unsavedAt.has(String(p.sourceId))) return true
    const madeAt = Number(p.savedAt ?? p.id)
    return !(Number.isFinite(madeAt) && madeAt <= unsavedAt.get(String(p.sourceId)))
  })
  return next.length === list.length ? list : next
}

/** The library and saved set as stored, with stale copies pruned (and the prune written). */
export function readPromptLibrary(storage) {
  const ledger = getSaveLedger(storage)
  const stored = getPrompts(storage)
  const prompts = pruneUnsavedCopies(stored, ledger)
  if (prompts !== stored) write(storage, PROMPTS_KEY, prompts)
  return { prompts, savedIds: savedIdsOf(ledger) }
}

// ── Saving a community prompt ────────────────────────────────────────────────
//
// Saving puts the community id in the saved set AND a copy of the prompt in
// the person's own library. The copy records `sourceId`, so unsaving can find
// and remove the copy it created. Copies written before `sourceId` existed are
// matched by identical title and text: an unedited legacy copy is recognised,
// an edited one is left alone rather than guessed at.

export function libraryCopyIndex(prompts, cp) {
  const list = Array.isArray(prompts) ? prompts : []
  const byId = list.findIndex((p) => p && p.sourceId === cp.id)
  if (byId !== -1) return byId
  return list.findIndex((p) => p && p.sourceId == null && p.title === cp.title && p.text === cp.text)
}

/** True when the person changed their copy after saving it. */
export function isCopyEdited(copy, cp) {
  if (!copy || !cp) return false
  return copy.title !== cp.title || copy.text !== cp.text || (copy.tags || '') !== (cp.tags || '')
}

function newCopy(cp, prompts, now) {
  // Date-based ids are what AddPromptPanel writes too; bump past a collision.
  let id = now
  const taken = new Set(prompts.map((p) => p?.id))
  while (taken.has(id)) id += 1
  return {
    id,
    sourceId: cp.id,
    savedAt: now,
    title: cp.title,
    text: cp.text,
    tags: cp.tags,
    img: cp.img || '',
    date: new Date(now).toLocaleDateString('en-AU'),
  }
}

/**
 * Save or unsave one community prompt. Pure: takes the current library and
 * saved set, returns the next ones.
 *
 * @returns {{ prompts, savedIds, saved: boolean, undo: object|null, edited: boolean }}
 *   `saved` is the state AFTER the toggle. `undo` is set on an unsave and is
 *   what `undoUnsave` needs to put everything back.
 */
export function toggleCommunitySave({ prompts, savedIds }, cp, now = Date.now()) {
  const list = Array.isArray(prompts) ? prompts : []
  const ids = new Set(savedIds || [])

  if (!ids.has(cp.id)) {
    const at = libraryCopyIndex(list, cp)
    const next = at === -1 ? [newCopy(cp, list, now), ...list] : list
    ids.add(cp.id)
    return { prompts: next, savedIds: ids, saved: true, undo: null, edited: false }
  }

  ids.delete(cp.id)
  const at = libraryCopyIndex(list, cp)
  const copy = at === -1 ? null : list[at]
  const next = at === -1 ? list : [...list.slice(0, at), ...list.slice(at + 1)]
  return {
    prompts: next,
    savedIds: ids,
    saved: false,
    undo: { id: cp.id, copy, index: at },
    edited: isCopyEdited(copy, cp),
  }
}

/** Put back what an unsave removed. A copy already present is not duplicated. */
export function undoUnsave({ prompts, savedIds }, undo) {
  const list = Array.isArray(prompts) ? [...prompts] : []
  const ids = new Set(savedIds || [])
  if (!undo) return { prompts: list, savedIds: ids }
  ids.add(undo.id)
  if (undo.copy && !list.some((p) => p?.id === undo.copy.id)) {
    const at = Math.min(Math.max(undo.index, 0), list.length)
    list.splice(at, 0, undo.copy)
  }
  return { prompts: list, savedIds: ids }
}

/**
 * The same toggle against storage. Reads BOTH keys fresh rather than trusting
 * a caller's in-memory copy: another device's change may have been applied
 * since the page rendered, and writing an old set back would undo it. Only
 * the toggled prompt's ledger entry changes, stamped `now`.
 */
export function toggleStoredCommunitySave(cp, { storage, now = Date.now() } = {}) {
  const result = toggleCommunitySave({ prompts: getPrompts(storage), savedIds: getSavedIds(storage) }, cp, now)
  setPromptsStore(result.prompts, storage)
  const savedIds = markStoredSave(cp.id, result.saved, { storage, now })
  return { ...result, savedIds }
}

export function undoStoredUnsave(undo, { storage, now = Date.now() } = {}) {
  const result = undoUnsave({ prompts: getPrompts(storage), savedIds: getSavedIds(storage) }, undo)
  setPromptsStore(result.prompts, storage)
  const savedIds = undo ? markStoredSave(undo.id, true, { storage, now }) : result.savedIds
  return { ...result, savedIds }
}

export function parseTags(tagStr) {
  if (!tagStr) return []
  return tagStr.split(',').map(t => t.trim().toLowerCase()).filter(Boolean)
}

// A community prompt's `tags` is ONE comma-separated STRING — what
// buildCommunityPromptRecord writes and what firestore.rules requires. Admin
// reads and writes it only through these two: its card used to call `.join`
// and `.map` on the string and crashed on the first tagged submission. An
// array is still accepted on read, for any document an earlier admin edit
// saved in that shape. Case is kept (parseTags above lowercases for search).
export function promptTagList(tags) {
  const parts = Array.isArray(tags) ? tags : String(tags || '').split(',')
  return parts.map((t) => String(t).trim()).filter(Boolean)
}

export function promptTagString(tags) {
  return promptTagList(tags).join(', ')
}
