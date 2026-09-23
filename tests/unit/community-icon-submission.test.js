// Community ICON submissions — the founder's instruction, and the two things
// that could go wrong with it.
//
// 2026-09-18: "people can submit icons to the community they just need to be
// reviewed - all submissions of any sorts are tied to the account not browser."
//
// The Hub already took designs, and the queue already carried gradients and
// palettes. An icon is different from all three in one way that this whole file
// is about: AN ICON IS A DOCUMENT. A gradient is four numbers and a palette is a
// list of hex codes — neither can execute. An SVG can carry <script>, an onload=
// handler, a <foreignObject> of HTML, an entity expansion, or a reference that
// makes the page phone out.
//
// So there are two classes of guard here, and they are independent on purpose:
//
//   1. WHAT MAY BE SUBMITTED — normaliseIconSvg() refusing hostile markup on the
//      way in, which is defence in depth.
//   2. HOW IT IS EVER DRAWN — always the `src` of an <img>, never inlined, which
//      is the actual defence, because it is the browser's rule and not ours.
//
// Guard 2 matters most in the ADMIN, where the reviewer's session carries the
// `admin` custom claim: it is the single most valuable session on the site to
// run script in, and it is the one session that is guaranteed to look at every
// submission.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import {
  ICON_MAX_BYTES, ICON_MAX_LABEL, ICON_PAYLOAD_KEYS, ICON_SUBMISSIONS_MAX,
  buildIconPayload, iconBytes, iconPreviewDataUri, iconPreviewSvg,
  normaliseIconSvg, readIconSubmissions, writeIconSubmissions,
  appendIconSubmission, removeIconSubmission,
} from '../../src/utils/iconSubmission.js'
import { QUEUE_KINDS, buildQueueRecord } from '../../src/utils/communityQueue.js'

// Line endings normalised: this repo checks out CRLF on Windows and LF
// elsewhere, and a pattern that happens to span a newline must not pass on one
// machine and fail on another.
const read = (p) => fs.readFileSync(path.join(process.cwd(), p), 'utf8').replace(/\r\n/g, '\n')

const ICON = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14"/></svg>'

/** A minimal in-memory Storage, so the store is exercised without a browser. */
function fakeStorage() {
  const map = new Map()
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => { map.set(k, String(v)) },
    removeItem: (k) => { map.delete(k) },
  }
}

/* ── 1 · What may be submitted ───────────────────────────────────────────── */

test('a real icon is accepted, and comes back with the size it is drawn in', () => {
  const result = normaliseIconSvg(ICON)
  assert.equal(result.error, undefined)
  assert.equal(result.svg, ICON)
  assert.equal(result.width, 24)
  assert.equal(result.height, 24)
})

test('every way an SVG can carry code is refused', () => {
  // The first four come from utils/brandLogo.js, which this module imports
  // rather than re-implements — a second copy of a security check is a second
  // thing to forget to update. The last four are additive and are the ones a
  // logo upload never had to think about.
  const hostile = {
    'a script tag': '<svg viewBox="0 0 24 24"><script>fetch("//x")</script></svg>',
    'an inline handler': '<svg viewBox="0 0 24 24" onload="alert(1)"><path d="M0 0"/></svg>',
    'a foreignObject': '<svg viewBox="0 0 24 24"><foreignObject><b>hi</b></foreignObject></svg>',
    'an external reference': '<svg viewBox="0 0 24 24"><use href="https://evil.test/x.svg#a"/></svg>',
    'a DOCTYPE': '<!DOCTYPE svg [<!ENTITY a "aaa">]><svg viewBox="0 0 24 24"><path d="M0 0"/></svg>',
    'an entity declaration': '<svg viewBox="0 0 24 24"><!ENTITY lol "lol"><path d="M0 0"/></svg>',
    'an embedded image': '<svg viewBox="0 0 24 24"><image href="data:image/png;base64,AA"/></svg>',
    'a stylesheet': '<svg viewBox="0 0 24 24"><style>@import url(//evil.test/a.css)</style></svg>',
    'a link': '<svg viewBox="0 0 24 24"><a href="#x"><path d="M0 0"/></a></svg>',
  }
  for (const [what, markup] of Object.entries(hostile)) {
    const result = normaliseIconSvg(markup)
    assert.ok(result.error, `${what} was accepted as an icon`)
    assert.equal(result.svg, undefined, `${what} came back with usable markup anyway`)
    assert.equal(buildIconPayload({ svg: markup }), null, `${what} still built a queue payload`)
  }
})

test('something that is not an SVG at all is refused before anything else looks at it', () => {
  for (const junk of ['', '   ', null, undefined, 42, '<html><body>hi</body></html>', '{"svg":true}']) {
    assert.ok(normaliseIconSvg(junk).error, `${JSON.stringify(junk)} was accepted`)
  }
})

test('the cap is enforced in BYTES and the message states the real number', () => {
  // A cap the UI prints and the module does not enforce is not a cap. Both come
  // from ICON_MAX_BYTES, and this asserts they cannot drift apart.
  const fat = ICON.replace('<path', `<path data-pad="${'x'.repeat(ICON_MAX_BYTES)}"`)
  assert.ok(iconBytes(fat) > ICON_MAX_BYTES)
  const result = normaliseIconSvg(fat)
  assert.ok(result.error, 'an oversized icon was accepted')
  assert.ok(result.error.includes(ICON_MAX_LABEL),
    `the refusal quotes a limit other than ${ICON_MAX_LABEL}`)
  // And one byte under the cap still goes through, so the cap is a boundary
  // rather than a blanket refusal of anything large.
  const snug = ICON.replace('<path', `<path data-pad="${'x'.repeat(ICON_MAX_BYTES - iconBytes(ICON) - 12)}"`)
  assert.ok(iconBytes(snug) <= ICON_MAX_BYTES)
  assert.equal(normaliseIconSvg(snug).error, undefined)
})

test('bytes are counted as UTF-8, not as characters', () => {
  // The cap bounds what Firestore stores and what the reviewer downloads, and
  // both count bytes. A multi-byte character counted as one would let a file
  // three times the cap through.
  assert.equal(iconBytes('abc'), 3)
  assert.equal(iconBytes('—'), 3)
  assert.equal(iconBytes('😀'), 4)
})

test('an SVG with no coordinate system is refused rather than guessed at', () => {
  // A guessed size puts the reviewer's decision on artwork they were never
  // shown, which is the one thing a review queue may not do.
  const noBox = '<svg xmlns="http://www.w3.org/2000/svg"><path d="M5 12h14"/></svg>'
  assert.ok(normaliseIconSvg(noBox).error)
  // width/height is an acceptable coordinate system too — plenty of exports
  // carry one and not the other.
  assert.equal(normaliseIconSvg('<svg width="32" height="32"><path d="M5 12h14"/></svg>').error, undefined)
})

/* ── 2 · The payload that reaches Firestore ──────────────────────────────── */

test('a payload carries only the keys the rules allow, and no more', () => {
  const payload = buildIconPayload({ svg: ICON, author: '  Dylan  ', category: 'Nope', uid: 'x' })
  assert.deepEqual(Object.keys(payload).sort(), ['author', 'svg'])
  assert.equal(payload.author, 'Dylan')
  for (const key of Object.keys(payload)) {
    assert.ok(ICON_PAYLOAD_KEYS.includes(key), `${key} is not in ICON_PAYLOAD_KEYS`)
  }
})

test('the queue takes an icon without a fourth code path', () => {
  assert.ok(QUEUE_KINDS.includes('icon'))
  const record = buildQueueRecord({
    kind: 'icon',
    name: 'Plus',
    user: { uid: 'u1', displayName: 'Dylan', email: 'd@example.com' },
    payload: buildIconPayload({ svg: ICON }),
  })
  assert.ok(record, 'an icon could not be shaped for the queue')
  assert.equal(record.status, 'pending', 'approval is a reviewer word')
  assert.ok(!JSON.stringify(record).includes('d@example.com'),
    'a submission does not need to disclose an address to be reviewed')
})

/* ── 3 · How it is drawn — the load-bearing defence ──────────────────────── */

test('submitted markup is never inlined, on any surface that renders it', () => {
  // This is the guard the feature actually rests on. An <img> is a replaced
  // element: script inside its source does not run and external subresources
  // are not fetched. Inlining the same string — dangerouslySetInnerHTML, or an
  // innerHTML assignment — hands all of that back.
  const surfaces = [
    'src/pages/Community.jsx',
    'src/components/admin/CommunityQueue.jsx',
    'src/components/discover/IconSubmissionPreview.jsx',
  ]
  for (const file of surfaces) {
    const src = read(file)
    assert.ok(!/dangerouslySetInnerHTML/.test(src), `${file} inlines markup`)
    assert.ok(!/\.innerHTML\s*=/.test(src), `${file} assigns innerHTML`)
  }
  // Positive control: the preview really does render an <img> with the data
  // URI, so the two assertions above are not passing on a file that draws
  // nothing at all.
  const preview = read('src/components/discover/IconSubmissionPreview.jsx')
  assert.match(preview, /<img\b/, 'the preview no longer renders an <img>')
  assert.match(preview, /src=\{iconPreviewDataUri\(/, 'the <img> no longer carries the sanitised data URI')
})

test('the preview paints the root so a currentColor icon is not invisible', () => {
  // Nearly every icon worth submitting is drawn in currentColor. Inside an
  // <img> there is nothing to be current, so it resolves to black — and this
  // app has a near-black theme, on which the artwork would simply not be there.
  const painted = iconPreviewSvg(ICON, '#EFEEEA')
  assert.match(painted, /<svg color="#EFEEEA"/)
  assert.ok(painted.includes('stroke="currentColor"'), 'the artwork itself was altered')
})

test('an icon that already sets a root colour does not become a duplicate attribute', () => {
  // An SVG inside an <img> is parsed as XML, and XML treats a duplicated
  // attribute as a FATAL error — the image does not render at all. So this bug
  // would have broken exactly the files that had already thought about colour,
  // and only those.
  const opinionated = '<svg viewBox="0 0 24 24" color="#FF0000" fill="currentColor"><path d="M0 0"/></svg>'
  const painted = iconPreviewSvg(opinionated, '#121418')
  assert.equal((painted.match(/\scolor=/g) || []).length, 1,
    'the root tag carries two colour attributes, so the preview will not render')
  assert.match(painted, /color="#121418"/)
})

test('the ink cannot break out of the attribute it is written into', () => {
  const painted = iconPreviewSvg(ICON, '"><script>alert(1)</script><svg x="')
  assert.ok(!painted.includes('<script>'), 'the ink injected markup into the root tag')
})

test('the data URI is fully percent-encoded, so nothing in it can be read as markup', () => {
  const uri = iconPreviewDataUri(ICON, '#121418')
  assert.ok(uri.startsWith('data:image/svg+xml;utf8,'))
  const body = uri.slice('data:image/svg+xml;utf8,'.length)
  for (const ch of ['<', '>', '"', "'", '&', ' ']) {
    assert.ok(!body.includes(ch), `the encoded body still contains a raw ${ch}`)
  }
  assert.equal(iconPreviewDataUri('', '#000'), '', 'nothing produces nothing, not a broken URI')
})

/* ── 4 · The local copy is a buffer, and never a way around the rules ────── */

test('the store refuses on READ what the form refuses on WRITE', () => {
  // localStorage is editable by anyone with devtools. Markup hand-written into
  // the key must meet exactly the same bar as markup typed into the form, or
  // the store is a second door into the preview.
  const storage = fakeStorage()
  storage.setItem('vs-icon-submissions', JSON.stringify([
    { id: 'a', name: 'Good', svg: ICON },
    { id: 'b', name: 'Bad', svg: '<svg viewBox="0 0 1 1"><script>x()</script></svg>' },
    { id: 'c', name: 'Junk' },
    null,
  ]))
  const list = readIconSubmissions(storage)
  assert.equal(list.length, 1)
  assert.equal(list[0].id, 'a')
})

test('a client-held submission is always pending, whatever the stored record claims', () => {
  const storage = fakeStorage()
  const [saved] = writeIconSubmissions([{ id: 'a', name: 'X', svg: ICON, status: 'approved' }], storage)
  assert.equal(saved.status, 'pending')
  assert.equal(readIconSubmissions(storage)[0].status, 'pending')
})

test('the store is capped, newest kept, and withdrawal removes exactly one', () => {
  const storage = fakeStorage()
  for (let i = 0; i < ICON_SUBMISSIONS_MAX + 5; i++) {
    appendIconSubmission({ id: `i${i}`, name: `Icon ${i}`, svg: ICON }, storage)
  }
  const list = readIconSubmissions(storage)
  assert.equal(list.length, ICON_SUBMISSIONS_MAX)
  assert.equal(list[0].id, `i${ICON_SUBMISSIONS_MAX + 4}`, 'the newest submission fell off the end')
  const after = removeIconSubmission(list[0].id, storage)
  assert.equal(after.length, ICON_SUBMISSIONS_MAX - 1)
  assert.ok(!after.some(s => s.id === list[0].id))
})

test('a storage that throws loses nothing but the cache', () => {
  const broken = {
    getItem: () => { throw new Error('disabled') },
    setItem: () => { throw new Error('disabled') },
    removeItem: () => {},
  }
  assert.deepEqual(readIconSubmissions(broken), [])
  assert.deepEqual(writeIconSubmissions([{ id: 'a', name: 'X', svg: ICON }], broken).length, 1)
})

/* ── 5 · The page, and the promises it does and does not make ────────────── */

const COMMUNITY = read('src/pages/Community.jsx')

test('an icon reaches the ACCOUNT, not just this browser', () => {
  assert.match(COMMUNITY, /listMySubmissions\(uid, 'icon'\)/,
    'the page no longer reads the account for icons')
  assert.match(COMMUNITY, /buildQueueRecord\(\{ kind: 'icon'/,
    'the icon is not shaped for the shared queue')
  assert.match(COMMUNITY, /await publishToQueue\(\{ \.\.\.queued, localId: item\.id \}\)/,
    'and is not published, carrying the local id so the merge can pair them')
  assert.match(COMMUNITY, /mergeSubmissions\(serverIcons, iconLocal\)/,
    'the account copy and this browser are no longer merged')
})

test('the local copy is written FIRST, as it is for designs and palettes', () => {
  // Local-first is why submitting works offline and the list updates without
  // waiting on a round trip. Publishing before the local write would make a
  // dropped connection lose the submission outright.
  const localAt = COMMUNITY.indexOf('setIconLocal(appendIconSubmission(item))')
  const publishAt = COMMUNITY.indexOf('await publishIcon(item)')
  assert.ok(localAt > -1, 'the icon flow keeps no local copy')
  assert.ok(publishAt > -1, 'the icon flow never publishes')
  assert.ok(localAt < publishAt, 'the icon flow publishes before it writes locally')
})

test('an unsent submission can still be sent — the hole the other three flows have', () => {
  // Gradients, palettes and designs all keep a local copy when the publish
  // fails and then offer no route to the account at all, which re-enters the
  // exact bug the queue was built to end.
  assert.match(COMMUNITY, /retryIcon/, 'the retry is gone')
  assert.match(COMMUNITY, /s\.synced \? 'Pending review' : 'Not sent'/,
    'the row no longer distinguishes what reached the account from what did not')
})

test('nothing on /community says an icon will appear', () => {
  // Same premise surface-claims-truth.test.js pins: no file outside
  // src/components/admin calls listQueue(), so an approved submission is shown
  // to nobody but its author. The moment a public feed exists, that test says
  // so and this one retires with it.
  const strip = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
  const queueReaders = ['src/pages/Community.jsx', 'src/components/discover/IconSubmissionPreview.jsx']
  for (const file of queueReaders) {
    // Comments stripped for the same reason surface-claims-truth.test.js strips
    // them: Community.jsx's own note EXPLAINS that listQueue() is called from
    // the admin and nowhere else, and that sentence is the opposite of a
    // violation.
    assert.ok(!strip(read(file)).includes('listQueue('), `${file} now renders the queue — revisit both claim tests`)
  }
  const code = strip(COMMUNITY)
  for (const phrase of ['before it appears', 'appears publicly', 'in the library', 'will be published']) {
    assert.ok(!code.includes(phrase), `/community claims a submission "${phrase}"`)
  }
  // Positive control: the comment-stripper has not simply emptied the file.
  assert.ok(code.length > 4000, 'the claim scan read an empty or missing page')
  assert.ok(code.includes('Queued for review'), 'the page no longer says what actually happens')
})

test('the icon gate is its own surface, so signing in reopens the right form', () => {
  // One name for both forms would sign somebody in for an icon and hand them
  // back the design form.
  const intent = read('src/utils/submitIntent.js')
  assert.match(intent, /'community-icon'/)
  assert.match(COMMUNITY, /hasSubmitIntent\(ICON_SUBMIT_SURFACE\)/)
  assert.match(COMMUNITY, /setSubmitIntent\(ICON_SUBMIT_SURFACE\)/)
  // And it is a free-account gate that opens on the CREATE-ACCOUNT form, like
  // the other three — everyone who reaches it has no account.
  assert.match(COMMUNITY, /requireLogin\('submit an icon to the community', \{\s*free: true,\s*signup: true,/)
})

test('a reviewer is shown the artwork, not a placeholder', () => {
  // A gradient is its stops and a palette is its colours; an icon can only be
  // judged by looking at it. Approving one sight unseen is the failure.
  const admin = read('src/components/admin/CommunityQueue.jsx')
  assert.match(admin, /item\.kind === 'icon'/, 'the queue row no longer branches on an icon')
  assert.match(admin, /<IconSubmissionPreview/, 'the reviewer is not shown the icon')
})

/* ── 6 · The rules, which are the founder's to publish ───────────────────── */

const PATCH = 'docs/design/community-icon-rules.patch'

test('the rules diff exists, still applies, and grants exactly what the client needs', () => {
  // firestore.rules pins `kind in ['gradient', 'design', 'palette']` and an
  // allowlist of payload keys that does not include `svg`, so an icon
  // submission is REFUSED until this lands. The file is founder-gated (the
  // auto-mode classifier refuses to stage it), so it ships as a diff somebody
  // has to apply — the same shape as the four in scripts/gated-patches.mjs.
  //
  // Asserted as "either it is already in the file, or the diff that puts it
  // there still applies", so this measures the code rather than the calendar.
  const rules = read('firestore.rules')
  const applied = /kind in \['gradient', 'design', 'palette', 'icon'\]/.test(rules)
  const patch = read(PATCH)
  if (!applied) {
    assert.match(patch, /^\+.*kind in \['gradient', 'design', 'palette', 'icon'\]/m,
      'the diff does not add the icon kind')
    assert.match(patch, /^\+.*'c1', 'c2', 'colors', 'svg'\]\)/m,
      'the diff does not add svg to the payload allowlist')
    execFileSync('git', ['apply', '--check', PATCH], { cwd: process.cwd(), stdio: 'pipe' })
  }
  // Whichever side of the change we are on, the size bound must be the one the
  // client enforces. A rule that allowed more than ICON_MAX_BYTES would make
  // the client's cap the only cap, and a client cap is not a cap.
  const text = applied ? rules : patch
  assert.ok(text.includes(`payload.svg.size() <= ${ICON_MAX_BYTES}`),
    `the rules must bound payload.svg at ICON_MAX_BYTES (${ICON_MAX_BYTES})`)
})

test('the diff does not widen anything else in the collection', () => {
  // A rules diff is the highest-blast-radius artefact in this repo. This one
  // may add an icon and nothing more: it must not touch who may create, who may
  // review, or the status a client can claim.
  const patch = read(PATCH)
  const added = patch.split('\n').filter(l => l.startsWith('+') && !l.startsWith('+++'))
  const removed = patch.split('\n').filter(l => l.startsWith('-') && !l.startsWith('---'))
  assert.equal(removed.length, 3, 'the diff removes more lines than the three it replaces')
  for (const line of [...added, ...removed]) {
    assert.ok(!/allow (create|read|update|delete)/.test(line),
      `the diff changes a permission: ${line.trim()}`)
    assert.ok(!/isReviewer|isAdmin|isOwner|authorUid|status/.test(line),
      `the diff touches the review or ownership gate: ${line.trim()}`)
  }
})

/* ── 7 · The seed rule this surface has always been under ────────────────── */

test('the icon feature credits no invented person, anywhere', () => {
  // src/data/communityDesigns.js records why twelve invented designs by
  // invented people were deleted. Nothing added here may reintroduce one: an
  // icon's author comes from the signed-in account or is empty.
  const files = [
    'src/utils/iconSubmission.js',
    'src/components/discover/IconSubmissionPreview.jsx',
    'src/pages/Community.jsx',
  ]
  for (const file of files) {
    const code = read(file).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
    for (const name of ['Maya R.', 'Devon K.', 'Sam T.', 'Alex P.']) {
      assert.ok(!code.includes(name), `${file} credits "${name}", who does not exist`)
    }
  }
  // The author on a submission is the ACCOUNT's, never a default that names a
  // person: an empty credit is honest, an invented one is not.
  assert.equal(buildIconPayload({ svg: ICON }).author, undefined)
  assert.equal(buildIconPayload({ svg: ICON, author: '   ' }).author, undefined)
})
