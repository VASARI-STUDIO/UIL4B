// What a row in the admin Users table is actually entitled to.
//
// ─────────────────────────────────────────────────────────────────────────────
// THE DEFECT THIS FILE EXISTS FOR
// ─────────────────────────────────────────────────────────────────────────────
// The Users tab computed the plan like this:
//
//   plan: status === 'active' || status === 'trialing' ? 'pro' : 'free'
//
// Every other Stripe status collapsed into the word "Free". So a subscriber
// whose card expired this morning — `past_due`, still being retried, still
// being served Pro by api/_lib/plans.js — appeared on the founder's dashboard
// as somebody who had never paid. So did a customer whose retries had run out,
// and a customer who cancelled last week, and a signup whose first charge never
// completed. Four different situations, four different things to do about them,
// one word.
//
// That is the opposite of what an admin list is for. The people worth finding
// in a list of users are precisely the ones whose billing is in an unusual
// state, and they were the ones the list hid.
//
// ─────────────────────────────────────────────────────────────────────────────
// WHY ENTITLEMENT IS THREE-VALUED AND NOT TWO
// ─────────────────────────────────────────────────────────────────────────────
// api/_lib/plans.js is the security boundary and it grants Pro to a `past_due`
// subscription for seven days measured from `paymentFailedAt`. That timestamp
// is written by the Stripe webhook with the admin SDK and it is NOT one of the
// fields api/verify-admin.js returns to this dashboard — the payload carries
// `status` and `interval` and nothing else about the subscription.
//
// So for a past-due row this page genuinely does not know whether Pro is still
// being served. It says so. Rendering `false` there would be a guess, and a
// guess about whether somebody currently has what they paid for is the kind of
// guess that gets acted on.
//
// ─────────────────────────────────────────────────────────────────────────────
// AND AN UNRECOGNISED STATUS IS LOUD, NOT FREE
// ─────────────────────────────────────────────────────────────────────────────
// Stripe adds subscription statuses. The old expression swallowed anything it
// had not heard of into "Free", which is the failure mode that hid `past_due`
// in the first place. `unknown` is a state of its own here, it sorts to the top
// with the other accounts needing attention, and it prints the raw status
// string so the founder can see what Stripe actually said.
//
// Pure and DOM-free, like utils/moderation.js and utils/billingState.js next to
// it: these are rules about money and access, and rules about money and access
// should be testable without a browser. See tests/unit/admin-user-plans.test.js.

/**
 * Every plan state a row can be in, keyed by id.
 *
 * `entitled` is `true`, `false`, or `'grace'` — see the note above on why the
 * third value is not an accident.
 *
 * `label` is the badge. `tone` maps onto the dashboard's existing signal
 * colours (ok / warn / err / pending / neutral) rather than introducing a new
 * palette for this table.
 */
export const PLAN_STATES = Object.freeze({
  pro: { id: 'pro', label: 'Pro', entitled: true, tone: 'ok', paying: true, attention: false },
  trial: { id: 'trial', label: 'Trial', entitled: true, tone: 'pending', paying: true, attention: false },
  'past-due': { id: 'past-due', label: 'Past due', entitled: 'grace', tone: 'warn', paying: true, attention: true },
  unpaid: { id: 'unpaid', label: 'Unpaid', entitled: false, tone: 'err', paying: false, attention: true },
  incomplete: { id: 'incomplete', label: 'Incomplete', entitled: false, tone: 'warn', paying: false, attention: true },
  canceled: { id: 'canceled', label: 'Cancelled', entitled: false, tone: 'neutral', paying: false, attention: false },
  paused: { id: 'paused', label: 'Paused', entitled: false, tone: 'neutral', paying: false, attention: false },
  unknown: { id: 'unknown', label: 'Unknown', entitled: 'unknown', tone: 'err', paying: false, attention: true },
  free: { id: 'free', label: 'Free', entitled: false, tone: 'neutral', paying: false, attention: false },
})

// Stripe's status vocabulary, mapped onto the states above. Anything absent
// from this table is `unknown` ON PURPOSE — see the header.
const FROM_STRIPE = Object.freeze({
  active: 'pro',
  trialing: 'trial',
  past_due: 'past-due',
  unpaid: 'unpaid',
  incomplete: 'incomplete',
  incomplete_expired: 'incomplete',
  canceled: 'canceled',
  cancelled: 'canceled',
  paused: 'paused',
})

/**
 * The plan state for one `subscription` object as api/verify-admin.js returns
 * it — `{ status, interval }`, where `status` may be null.
 *
 * No subscription and no status is `free`: an account that never started one.
 * That is the only thing "Free" is allowed to mean here.
 */
export function planStateOf(subscription) {
  const status = subscription?.status
  if (!status) return PLAN_STATES.free
  const id = FROM_STRIPE[String(status).toLowerCase()]
  return id ? PLAN_STATES[id] : PLAN_STATES.unknown
}

/** True when the row is one the founder should look at rather than scroll past. */
export function needsAttention(subscription) {
  return planStateOf(subscription).attention === true
}

/**
 * Sort order for the Plan column, and the order the summary tiles read in.
 *
 * Accounts needing attention come FIRST. A list of users sorted by plan exists
 * to surface the exceptions; putting the two hundred free accounts above the
 * one whose payment is failing would be sorting by how common a state is.
 */
export const PLAN_STATE_ORDER = Object.freeze([
  'past-due', 'unpaid', 'incomplete', 'unknown', 'pro', 'trial', 'canceled', 'paused', 'free',
])

/** Index of a subscription's state in PLAN_STATE_ORDER, for table sorting. */
export function planSortKey(subscription) {
  const i = PLAN_STATE_ORDER.indexOf(planStateOf(subscription).id)
  return i === -1 ? PLAN_STATE_ORDER.length : i
}
