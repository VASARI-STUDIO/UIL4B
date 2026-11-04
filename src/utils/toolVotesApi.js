// Firestore reads and writes for roadmap votes. `fs` is the broker's firestore
// namespace (loadFirestore() / whenFirestore()), so the SDK stays out of first paint.
//
//   toolVotes/{toolId}                 { count, open }   public read
//   toolVotes/{toolId}/voters/{uid}    { at }            owner read
//
// A vote and a take-back are each one transaction that changes the counter and
// the caller's own voter document together, which is the pairing the rules check.
const COLLECTION = 'toolVotes'

/** { [toolId]: { count, open } } for every counter that exists. */
export async function readCounts(fs) {
  const snap = await fs.getDocs(fs.collection(fs.db, COLLECTION))
  const out = {}
  snap.forEach((d) => {
    const data = d.data()
    out[d.id] = { count: Number(data.count) || 0, open: data.open !== false }
  })
  return out
}

/** { [toolId]: boolean }: has this account a voter document for each tool. */
export async function readVoted(fs, uid, ids) {
  const snaps = await Promise.all(ids.map((id) => fs.getDoc(fs.doc(fs.db, COLLECTION, id, 'voters', uid))))
  return Object.fromEntries(ids.map((id, i) => [id, snaps[i].exists()]))
}

export class VoteClosedError extends Error {
  constructor() { super('voting is closed'); this.code = 'closed' }
}

/**
 * Cast (`want` true) or take back (`want` false) the caller's vote on one tool.
 * Resolves with the counter's new value. Voting twice, or taking back a vote that
 * is not there, writes nothing and resolves with the current count.
 */
export function setVote(fs, uid, id, want) {
  const counterRef = fs.doc(fs.db, COLLECTION, id)
  const voterRef = fs.doc(fs.db, COLLECTION, id, 'voters', uid)
  return fs.runTransaction(fs.db, async (tx) => {
    const counter = await tx.get(counterRef)
    const voter = await tx.get(voterRef)
    const has = counter.exists()
    if (has && counter.data().open === false) throw new VoteClosedError()
    const count = has ? Number(counter.data().count) || 0 : 0
    if (want) {
      if (voter.exists()) return count
      if (has) tx.update(counterRef, { count: count + 1 })
      else tx.set(counterRef, { count: 1, open: true })
      tx.set(voterRef, { at: fs.serverTimestamp() })
      return count + 1
    }
    if (!voter.exists() || count < 1) return count
    tx.update(counterRef, { count: count - 1 })
    tx.delete(voterRef)
    return count - 1
  })
}

/** 'offline' | 'closed' | 'failed' for a thrown write error. */
export async function classifyFailure(fs, id, err) {
  if (err?.code === 'closed') return 'closed'
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return 'offline'
  if (err?.code === 'unavailable' || /offline/i.test(err?.message || '')) return 'offline'
  if (err?.code === 'permission-denied') {
    try {
      const snap = await fs.getDoc(fs.doc(fs.db, COLLECTION, id))
      if (snap.exists() && snap.data().open === false) return 'closed'
    } catch { /* fall through */ }
  }
  return 'failed'
}
