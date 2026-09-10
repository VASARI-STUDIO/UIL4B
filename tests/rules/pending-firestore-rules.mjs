// THE PENDING firestore.rules PATCH — applied to a COPY, never to the file.
//
// ─────────────────────────────────────────────────────────────────────────────
// WHY THIS FILE EXISTS
// ─────────────────────────────────────────────────────────────────────────────
//
// `firestore.rules` is founder-gated (docs/reference/human-validation-zones.md)
// AND the Claude Code auto-mode classifier refuses to stage it regardless of
// approval — the same block recorded against the moderator role in
// docs/OWNER-ACTIONS.md §1.3, which stopped an agent and the Director both. So
// the two rules findings from the 2026-09-06 engineering review
// ([firestore-feedback-create-open-to-anyone], [firestore-signed-in-writes-unbounded])
// ship as a diff in the pull request body for the founder to apply by hand.
//
// A diff nobody has run is a guess. This module applies that exact diff to an
// in-memory copy of the real rules file so the tests in
// firestore-rules-pending.test.js can run the emulator against the rules the
// founder is being asked to publish — before he publishes them.
//
// EVERY ANCHOR MUST MATCH EXACTLY ONCE. If `firestore.rules` moves underneath
// this patch (the moderator role's held diff touches the same file), applying it
// THROWS rather than silently producing something that is not the reviewed
// change. That is the difference between a tested diff and a hopeful one.
//
// ─────────────────────────────────────────────────────────────────────────────
// ONE CORRECTION TO THE FILED FIX, and it matters
// ─────────────────────────────────────────────────────────────────────────────
//
// The pipeline row for [firestore-signed-in-writes-unbounded] proposes
// `request.resource.size < N`. THAT DOES NOT EXIST IN FIRESTORE RULES. Byte size
// is a Cloud STORAGE rules feature; in Firestore, `request.resource` exposes
// `.data` and `.id`, and `Map.size()` counts ENTRIES, not bytes. There is no way
// to measure a document's byte size from a Firestore rule.
//
// So the bound is built from the three things Firestore rules CAN measure, and
// together they cap the document far more tightly than a byte ceiling would:
//   - `keys().hasOnly([...])` — an exact key allowlist, so an invented field is
//     refused outright. This is the load-bearing half.
//   - `String.size()` — a length cap on every string field the client writes.
//   - `Map.size()` — a field-count cap, which is the only bound available for
//     analytics-daily, whose field NAMES are dynamic (`view__<path>`).
//
// The chosen numbers, and where each came from, are in the comments below.
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

export const RULES_PATH = fileURLToPath(new URL('../../firestore.rules', import.meta.url))

// ─────────────────────────────────────────────────────────────────────────────
// 1 · [firestore-feedback-create-open-to-anyone]  (P1)
// ─────────────────────────────────────────────────────────────────────────────

const FEEDBACK_CREATE = {
  id: 'feedback-create-closed',
  find: `      allow create: if true;
`,
  replace: `      // CLOSED. Nothing in src/ has ever written here: every report goes through
      // fetch('/api/support') (FeedbackModal.jsx), which writes with the Admin
      // SDK and bypasses these rules entirely. So this rule never guarded a real
      // write — it only granted one. \`if true\` meant no auth, no field
      // allowlist, no shape, no rate limit: a script could put unlimited
      // documents of any shape, up to Firestore's 1 MiB ceiling, straight into
      // the collection the admin queue renders, and the route's abuse limiter
      // ([support-abuse-hardening]) does not apply because it lives in the
      // route, not here.
      //
      // Reads, updates and deletes are UNCHANGED — the queue still works.
      allow create: if false;
`,
}

// ─────────────────────────────────────────────────────────────────────────────
// 2 · [firestore-signed-in-writes-unbounded]  (P2)
// ─────────────────────────────────────────────────────────────────────────────

// The key lists are the documents the client ACTUALLY writes, read off the call
// sites rather than off the comments:
//   community-prompts     → utils/promptSubmission.js buildCommunityPromptRecord
//                           + components/prompt/SubmitPromptPanel.jsx (media)
//   community-submissions → utils/communityQueue.js buildQueueRecord
//                           + Community.jsx / GradientGenerator.jsx /
//                             PaletteBuilder.jsx (the three payloads)

const PROMPTS_CREATE = {
  id: 'community-prompts-bounded-create',
  find: `    match /community-prompts/{promptId} {
      allow create: if request.auth != null
        && request.resource.data.authorUid == request.auth.uid
        && request.resource.data.status == 'pending';
`,
  replace: `    match /community-prompts/{promptId} {
      // The shape buildCommunityPromptRecord + SubmitPromptPanel actually write.
      // Before this, create checked authorUid and status and NOTHING else: one
      // free account could write unlimited documents of any shape into a
      // collection every signed-in user reads.
      //
      // hasOnly is the subset test (ownerId, mediaType and mediaUrl are
      // conditional); hasAll pins the ones that are always present. Together
      // they are an exact-shape check that still admits the optional fields.
      function promptShapeOk() {
        return request.resource.data.keys().hasOnly([
                 'title', 'text', 'tags', 'authorName', 'authorUid', 'ownerId',
                 'profileLink', 'status', 'createdAt', 'mediaType', 'mediaUrl'])
          && request.resource.data.keys().hasAll([
                 'title', 'text', 'tags', 'authorName', 'authorUid', 'status',
                 'profileLink', 'createdAt'])
          // These caps are DELIBERATELY generous, not tight. None of the four
          // inputs in SubmitPromptPanel carries a maxLength, so whatever is set
          // here becomes the product's limit, and a bound that refuses a real
          // submission is a worse bug than the one being fixed. 20,000
          // characters is several times the longest prompt anyone writes and
          // still bounds a media-less document at ~21 KB instead of 1 MiB.
          && request.resource.data.title is string
          && request.resource.data.title.size() <= 300
          && request.resource.data.text is string
          && request.resource.data.text.size() <= 20000
          && request.resource.data.tags is string
          && request.resource.data.tags.size() <= 300
          && request.resource.data.authorName is string
          && request.resource.data.authorName.size() <= 120
          && request.resource.data.createdAt is string
          && request.resource.data.createdAt.size() <= 40
          // buildCommunityPromptRecord writes null when there is no link, and a
          // null field is still a PRESENT field — so this is a type union, not
          // an optional key.
          && (request.resource.data.profileLink == null
              || (request.resource.data.profileLink is string
                  && request.resource.data.profileLink.size() <= 2048))
          && (!('ownerId' in request.resource.data)
              || (request.resource.data.ownerId is string
                  && request.resource.data.ownerId.size() <= 64))
          && (!('mediaType' in request.resource.data)
              || (request.resource.data.mediaType is string
                  && request.resource.data.mediaType.size() <= 16))
          // mediaUrl is the one field that is legitimately huge: when Firebase
          // Storage is not enabled, SubmitPromptPanel falls back to inlining the
          // image as base64 and guards it with \`< 900_000\` itself. This is that
          // same guard, enforced where a client cannot skip it. Everything else
          // above adds up to ~6 KB, so a prompt without media is bounded tightly
          // and one with media is bounded by the client's own ceiling.
          && (!('mediaUrl' in request.resource.data)
              || (request.resource.data.mediaUrl is string
                  && request.resource.data.mediaUrl.size() < 900000));
      }

      allow create: if request.auth != null
        && request.resource.data.authorUid == request.auth.uid
        && request.resource.data.status == 'pending'
        && promptShapeOk();
`,
}

const SUBMISSIONS_CREATE = {
  id: 'community-submissions-bounded-create',
  // The anchor deliberately swallows the comment above the rule, so the two new
  // functions land BEFORE it rather than between a comment and the rule it
  // describes. The founder applies this file by hand; leaving an orphaned
  // comment in the middle of it is how a hand-applied diff goes wrong.
  find: `      // A client may only ever create its OWN submission, and only as
      // 'pending'. 'approved' is a reviewer's word — reachable from nowhere on
      // the client, so nothing can put itself in the library.
      allow create: if isSignedIn()
        && request.resource.data.authorUid == request.auth.uid
        && request.resource.data.status == 'pending';
`,
  replace: `      // The exact seven keys buildQueueRecord writes — no more, no fewer.
      //
      // \`payload\` is the only free-form field, and it is where an unbounded
      // write would go, so it is bounded on BOTH axes: an allowlist over the
      // union of the three call sites' payload keys, and a length cap on every
      // string in it. The three real payloads are a handful of hex codes, a
      // category and a URL — hundreds of bytes.
      function submissionPayloadOk() {
        return request.resource.data.payload is map
          && request.resource.data.payload.keys().hasOnly([
               'type', 'angle', 'stops', 'author', 'category', 'url',
               'c1', 'c2', 'colors'])
          && (!('url' in request.resource.data.payload)
              || (request.resource.data.payload.url is string
                  && request.resource.data.payload.url.size() <= 2048))
          && (!('author' in request.resource.data.payload)
              || (request.resource.data.payload.author is string
                  && request.resource.data.payload.author.size() <= 80))
          && (!('category' in request.resource.data.payload)
              || (request.resource.data.payload.category is string
                  && request.resource.data.payload.category.size() <= 80))
          && (!('type' in request.resource.data.payload)
              || (request.resource.data.payload.type is string
                  && request.resource.data.payload.type.size() <= 32))
          && (!('c1' in request.resource.data.payload)
              || (request.resource.data.payload.c1 is string
                  && request.resource.data.payload.c1.size() <= 64))
          && (!('c2' in request.resource.data.payload)
              || (request.resource.data.payload.c2 is string
                  && request.resource.data.payload.c2.size() <= 64))
          // A gradient carries stops and a palette carries colours. Both are
          // lists, and a list is the other way to make a document enormous.
          && (!('stops' in request.resource.data.payload)
              || (request.resource.data.payload.stops is list
                  && request.resource.data.payload.stops.size() <= 32))
          && (!('colors' in request.resource.data.payload)
              || (request.resource.data.payload.colors is list
                  && request.resource.data.payload.colors.size() <= 32));
      }

      function submissionShapeOk() {
        return request.resource.data.keys().hasOnly([
                 'kind', 'name', 'authorUid', 'authorName', 'status', 'payload',
                 'createdAt'])
          && request.resource.data.keys().hasAll([
                 'kind', 'name', 'authorUid', 'authorName', 'status', 'payload',
                 'createdAt'])
          && request.resource.data.kind in ['gradient', 'design', 'palette']
          && request.resource.data.name is string
          && request.resource.data.name.size() <= 80
          && request.resource.data.authorName is string
          && request.resource.data.authorName.size() <= 60
          && request.resource.data.createdAt is string
          && request.resource.data.createdAt.size() <= 40
          && submissionPayloadOk();
      }

      // A client may only ever create its OWN submission, and only as
      // 'pending'. 'approved' is a reviewer's word — reachable from nowhere on
      // the client, so nothing can put itself in the library.
      allow create: if isSignedIn()
        && request.resource.data.authorUid == request.auth.uid
        && request.resource.data.status == 'pending'
        && submissionShapeOk();
`,
}

const ANALYTICS_BOUNDS = {
  id: 'analytics-daily-day-id-and-field-cap',
  find: `    match /analytics-daily/{day} {
      allow read: if request.auth != null && request.auth.token.email == 'dylanjacob1100@gmail.com';
      allow create, update: if request.auth != null;
    }
`,
  replace: `    match /analytics-daily/{day} {
      allow read: if request.auth != null && request.auth.token.email == 'dylanjacob1100@gmail.com';

      // Two bounds this never had, and one it deliberately still does not.
      //
      // THE ID. \`{day}\` matched ANY document id, so a signed-in client could
      // create analytics-daily/<anything>. The dashboard reads this collection
      // and the founder's reset sweep (analytics.js resetPageAnalytics) orders
      // by \`day\` — a document that is not a day is invisible to the sweep that
      // is supposed to be able to clear it. The id must now be a date, and the
      // \`day\` FIELD must agree with the id it is filed under, so the two can
      // never disagree.
      //
      // THE FIELD COUNT. Field NAMES here are dynamic (\`view__<path>\`,
      // \`tool__<id>\`), so no key allowlist is possible and no byte size is
      // measurable in Firestore rules. The count of entries is the one bound
      // that is: ~110 counters are in normal use (one per route, one per tool,
      // plus icon and pack tallies), so 500 is roughly 4x headroom and still
      // refuses a client trying to grow one document without limit.
      //
      // NOT WIDENED, and deliberately: counter INFLATION by a signed-in user
      // stays possible. That was already recorded above as an accepted
      // limitation for an internal, non-billing dashboard, and nothing here
      // changes it — a rule cannot tell a real page view from a fake one.
      allow create, update: if request.auth != null
        && day.matches('^[0-9]{4}-[0-9]{2}-[0-9]{2}$')
        && request.resource.data.day == day
        && request.resource.data.size() <= 500;
    }
`,
}

export const PENDING_PATCHES = [
  FEEDBACK_CREATE,
  PROMPTS_CREATE,
  SUBMISSIONS_CREATE,
  ANALYTICS_BOUNDS,
]

/**
 * Is this patch already in the text? Asked of the RESULT, not of whether the
 * anchor still matches — a patch that has landed has no anchor left to find,
 * and "the anchor is gone" and "the file moved" are the two answers this has to
 * tell apart. Every marker below is a line the patch itself adds.
 */
export const PENDING_MARKERS = {
  'feedback-create-closed': (t) =>
    /match \/feedback\/\{feedbackId\}\s*\{[\s\S]*?allow create: if false;/.test(t),
  'community-prompts-bounded-create': (t) => t.includes('function promptShapeOk()'),
  'community-submissions-bounded-create': (t) => t.includes('function submissionShapeOk()'),
  'analytics-daily-day-id-and-field-cap': (t) =>
    t.includes("day.matches('^[0-9]{4}-[0-9]{2}-[0-9]{2}$')"),
}

/**
 * The published rules with the pending diff applied — in memory, never on disk.
 *
 * Throws unless every anchor matched EXACTLY once, OR the patch is already in
 * the file. A patch that silently half-applies is worse than no patch: the
 * tests would go green against rules the founder is not being handed.
 *
 * THE DAY IT IS APPLIED IS NOT A FAILURE. `npm run apply:gated` writes this
 * diff into firestore.rules for real, and from then on the anchors are gone. A
 * function that only knew how to apply would turn the successful day red, so
 * each patch is skipped when the file already carries what it grants — and the
 * text returned is the same text either way, which is what keeps every
 * assertion downstream honest.
 */
export async function pendingRulesText(rulesPath = RULES_PATH) {
  // The working tree is CRLF and the patch anchors below are written LF, so an
  // un-normalised match finds nothing and the whole suite reports "the rules
  // moved" when nothing has. Normalise first; the emulator does not care about
  // line endings, and neither does the diff the founder applies.
  const original = (await readFile(rulesPath, 'utf8')).replace(/\r\n/g, '\n')
  let text = original
  let applied = 0
  for (const patch of PENDING_PATCHES) {
    if (PENDING_MARKERS[patch.id](text)) continue
    const occurrences = text.split(patch.find).length - 1
    if (occurrences !== 1) {
      throw new Error(
        `pending firestore.rules patch "${patch.id}" matched ${occurrences} times, expected exactly 1, ` +
        'and the rule it grants is not in the file either. ' +
        'firestore.rules has moved underneath this patch — re-derive the diff before trusting any test that uses it.',
      )
    }
    // A FUNCTION replacer, not the string. String.replace treats `$&`, `$'` and
    // "$`" as substitution patterns in the replacement, and the analytics day
    // regex below ends in `$'` — which silently spliced the rest of the file
    // into the middle of a rule and produced something that only failed at
    // compile time.
    text = text.replace(patch.find, () => patch.replace)
    applied += 1
  }
  // The whole point is that the returned text carries the patch. Whether this
  // run put it there or the founder already had is not the question.
  for (const patch of PENDING_PATCHES) {
    if (!PENDING_MARKERS[patch.id](text)) {
      throw new Error(`the pending patch "${patch.id}" applied and granted nothing`)
    }
  }
  if (applied === 0 && text === original && !PENDING_MARKERS['feedback-create-closed'](original)) {
    throw new Error('the pending patch changed nothing')
  }
  return text
}
