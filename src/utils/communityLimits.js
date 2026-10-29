// The client half of the community post limits in firestore.rules
// (docs/design/queue-limits-rules.patch). No Firebase import, so the sums are
// testable under `node --test`; communityQueueApi.js does the writes.
//
// The rules want every new prompt or submission written in one batch with the
// poster's counter document users/{uid}/limits/community, stamped with the
// server's clock. The counter holds { windowStart, lastAt, lastKind, lastId,
// prompts, submissions }: at most 10 of each kind per 24-hour window, one post
// per 30 seconds. The window starts at the first post and restarts only on a
// server time at least 24 hours later, so the client has to pick "keep" or
// "restart" and the rules refuse the wrong pick. A client clock that is off can
// pick wrong near the 24-hour mark; planCounter takes `flip` for the retry.

// Held off until the rules are in: against the old rules a batch that carries
// submittedAt and a limits document is refused outright. `npm run apply:gated`
// flips it to true together with the rules patch (scripts/gated-patches.mjs).
export const COMMUNITY_LIMITS_ENABLED = false

export const POST_COOLDOWN_MS = 30 * 1000
export const POST_WINDOW_MS = 24 * 60 * 60 * 1000
export const POST_DAILY_CAP = 10

/** The field the reviewers' queue is ordered on: the server's stamp once the rules require it. */
export const queueOrderField = (enabled = COMMUNITY_LIMITS_ENABLED) => (enabled ? 'submittedAt' : 'createdAt')

/** A thrown refusal the screen can show as it is. */
export class PostLimitError extends Error {
  constructor(reason, retryInMs) {
    const secs = Math.max(1, Math.ceil((retryInMs || 0) / 1000))
    super(reason === 'cooldown'
      ? `You can post once every 30 seconds. Try again in ${secs} seconds.`
      : 'You have reached today\'s limit of 10. Try again tomorrow.')
    this.name = 'PostLimitError'
    this.reason = reason
    this.retryInMs = retryInMs || 0
  }
}

const millis = (t) => (t && typeof t.toMillis === 'function' ? t.toMillis() : Number(t) || 0)

/**
 * The counter document to write alongside a post.
 *
 * @param {object|null} prev   the stored counter, or null when there is none
 * @param {object} post
 * @param {'prompt'|'submission'} post.kind
 * @param {string} post.id     the new post's document id
 * @param {number} post.nowMs  the client clock
 * @param {*} post.stamp       serverTimestamp()
 * @param {boolean} [post.flip] take the other branch (keep/restart), for the retry
 * @returns {{ data: object, mode: string }}  mode is 'start' | 'keep' | 'restart'
 * @throws {PostLimitError} when the cooldown or the daily cap says no (not on a flipped retry)
 */
export function planCounter(prev, { kind, id, nowMs, stamp, flip = false }) {
  const own = kind === 'prompt' ? 'prompts' : 'submissions'
  const other = own === 'prompts' ? 'submissions' : 'prompts'
  const base = { lastAt: stamp, lastKind: kind, lastId: id }
  if (!prev) return { mode: 'start', data: { ...base, windowStart: stamp, [own]: 1, [other]: 0 } }

  const sinceLast = nowMs - millis(prev.lastAt)
  if (!flip && sinceLast < POST_COOLDOWN_MS) throw new PostLimitError('cooldown', POST_COOLDOWN_MS - sinceLast)

  const expired = nowMs >= millis(prev.windowStart) + POST_WINDOW_MS
  if (expired !== flip) {
    return { mode: 'restart', data: { ...base, windowStart: stamp, [own]: 1, [other]: 0 } }
  }
  const used = Number(prev[own]) || 0
  if (!flip && used >= POST_DAILY_CAP) {
    throw new PostLimitError('daily', millis(prev.windowStart) + POST_WINDOW_MS - nowMs)
  }
  return {
    mode: 'keep',
    data: { ...base, windowStart: prev.windowStart, [own]: used + 1, [other]: Number(prev[other]) || 0 },
  }
}
