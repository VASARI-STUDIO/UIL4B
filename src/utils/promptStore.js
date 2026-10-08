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
 * when its source was unsaved AFTER the copy was last touched (`editedAt` when
 * the person changed it, otherwise `savedAt`); an older copy of the same prompt
 * saved again later stays, and so does a copy edited since the unsave.
 */
export function pruneUnsavedCopies(prompts, ledger) {
  const list = Array.isArray(prompts) ? prompts : []
  const unsavedAt = new Map(normalizeSaveLedger(ledger).filter((e) => !e.saved).map((e) => [String(e.id), e.at]))
  if (!unsavedAt.size) return list
  const next = list.filter((p) => {
    if (!p || p.sourceId == null || !unsavedAt.has(String(p.sourceId))) return true
    const madeAt = Number(p.editedAt ?? p.savedAt ?? p.id)
    return !(Number.isFinite(madeAt) && madeAt <= unsavedAt.get(String(p.sourceId)))
  })
  return next.length === list.length ? list : next
}

/**
 * The saved ids that have no copy in the library, each with its community
 * prompt from `catalog` (null when the catalog does not hold it or is not
 * given). With a catalog a copy is found the way saving finds it, by `sourceId`
 * or, for an older copy, by identical title and text; without one only by
 * `sourceId`. Pure.
 */
export function savedIdsWithoutCopy(prompts, savedIds, catalog) {
  const list = Array.isArray(prompts) ? prompts : []
  const bySource = new Map((Array.isArray(catalog) ? catalog : []).map((cp) => [String(cp.id), cp]))
  const out = []
  for (const id of savedIds || []) {
    const source = bySource.get(String(id)) || null
    const held = source
      ? libraryCopyIndex(list, source) !== -1
      : list.some((p) => p && p.sourceId != null && String(p.sourceId) === String(id))
    if (!held) out.push({ id, source })
  }
  return out
}

// What a read shows for a saved id whose copy is missing: the community prompt
// itself, flagged `derived` and never stored.
function derivedCopy(cp) {
  return { id: `saved:${cp.id}`, derived: true, sourceId: cp.id, title: cp.title, text: cp.text, tags: cp.tags, img: cp.img || '', date: '' }
}

/**
 * The library and saved set as stored, with stale copies pruned (and the prune
 * written).
 *
 * A saved id with no library copy never writes one here: this read cannot tell
 * "never had a copy" from "the library has not synced in yet", and a write on
 * a read would overwrite one that is still arriving. Instead, when `catalog`
 * (the community prompts) is given, the id shows as a `derived` entry built
 * from the community prompt; without it, or when the catalog does not hold the
 * id, it is left out. `missing` lists those ids. The copy itself is added by
 * `repairMissingCopies`, after a sync has settled.
 */
export function readPromptLibrary(storage, { catalog } = {}) {
  const ledger = getSaveLedger(storage)
  const stored = getPrompts(storage)
  const prompts = pruneUnsavedCopies(stored, ledger)
  if (prompts !== stored) write(storage, PROMPTS_KEY, prompts)
  const savedIds = savedIdsOf(ledger)
  const gaps = savedIdsWithoutCopy(prompts, savedIds, catalog)
  const derived = gaps.filter((g) => g.source).map((g) => derivedCopy(g.source))
  return {
    prompts: derived.length ? [...prompts, ...derived] : prompts,
    savedIds,
    missing: gaps.map((g) => g.id),
  }
}

/**
 * Add a library copy for each saved id that has none, from `catalog`. Meant to
 * run once a sync has settled, not on a read. It only ever adds: an existing
 * entry, including a copy the person edited, is never touched, and an id the
 * catalog does not hold is left alone (it may be newer than this build). The
 * library is read fresh and written once, and only when something was added, so
 * a second run changes nothing. The write is an ordinary edit: it is noticed
 * and synced up like any other.
 *
 * @returns {Array} the copies added (empty when none)
 */
export function repairMissingCopies({ storage, catalog, now = Date.now() } = {}) {
  // A stored library that will not parse is left as it is, not replaced.
  const raw = store(storage)?.getItem(PROMPTS_KEY)
  if (raw != null) {
    try { if (!Array.isArray(JSON.parse(raw))) return [] } catch { return [] }
  }
  const list = getPrompts(storage)
  const gaps = savedIdsWithoutCopy(list, getSavedIds(storage), catalog).filter((g) => g.source)
  if (!gaps.length) return []
  let next = list
  const added = []
  for (const { source } of gaps) {
    const copy = newCopy(source, next, now)
    added.push(copy)
    next = [copy, ...next]
  }
  write(storage, PROMPTS_KEY, next)
  return added
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

/**
 * Delete one library entry by id, against storage, and clear the Save it came
 * from so the repair never adds it back. The entry's source is its `sourceId`,
 * or, for a copy saved before `sourceId` existed, each catalog prompt with the
 * same title and text. Each source that is saved is unsaved (stamped `now`,
 * synced like any unsave). Reads both keys fresh.
 *
 * A copy the person edited before `sourceId` existed matches nothing, and a
 * saved id left behind by an earlier delete cannot be told apart from one whose
 * copy has not synced in yet; neither is touched here.
 *
 * @returns {{ prompts: Array, savedIds: Set, removed: object|null }}
 */
export function removeStoredPrompt(id, { storage, catalog, now = Date.now() } = {}) {
  const current = getPrompts(storage)
  const removed = current.find((p) => p && p.id === id) || null
  const prompts = current.filter((p) => !p || p.id !== id)
  setPromptsStore(prompts, storage)
  let savedIds = getSavedIds(storage)
  if (removed) {
    const sources = removed.sourceId != null
      ? [removed.sourceId]
      : (Array.isArray(catalog) ? catalog : [])
        .filter((cp) => cp && cp.title === removed.title && cp.text === removed.text)
        .map((cp) => cp.id)
    for (const sourceId of sources) {
      if (savedIds.has(sourceId)) savedIds = markStoredSave(sourceId, false, { storage, now })
    }
  }
  return { prompts, savedIds, removed }
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
