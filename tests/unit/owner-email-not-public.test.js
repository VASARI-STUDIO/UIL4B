// NO PERSONAL EMAIL ADDRESS MAY SHIP IN THE BUNDLE.
//
// ── The defect this ends ────────────────────────────────────────────────────
//
// Measured against LIVE production on 2026-09-13, with no credentials sent:
//
//   curl https://uil4b.com/assets/constants-KnpCfm5i.js
//   -> 200, 1945 bytes, containing the founder's personal address TWICE
//
// `src/utils/constants.js` held the founder's personal address twice: once as
// the only entry of ADMIN_EMAILS, and once as the KEY of OWNER_HANDLES. Its
// chunk is in the `modulepreload` list of all 39 prerendered shells, so it was
// fetched in the first request wave by every anonymous visitor, on every route,
// signed in or not — a personal address harvestable by any scraper on every
// page, and the exact account to phish in order to reach /admin, named for the
// attacker.
//
// ── Why this reads dist/ and not src/ ───────────────────────────────────────
//
// The source can be clean and the address can still ship: through a re-export,
// a fixture that became an entry, a generated file, a prerendered shell, or a
// locale bundle nobody thought of as code. The only statement worth making is
// about the BYTES a visitor receives, so everything below walks dist/ — all of
// it, HTML, JS, CSS, JSON, txt and xml alike — and never src/.
//
// ── Written as a PATTERN, not as a search for one address ───────────────────
//
// A grep for one particular address would go green the day somebody pastes
// a different address in. So the probe matches anything ADDRESS-SHAPED and then
// requires every hit to be on a short, explicit allowlist:
//
//   · two role addresses at the site's own domain, in Terms and Privacy, which
//     are legally required contact points and must keep shipping;
//   · RFC 2606 / RFC 6761 reserved domains (example.com, .test, .invalid, …),
//     which cannot route mail and exist in order to be placeholders.
//
// The allowlist names EXACT addresses for the uil4b.com pair rather than
// allowing the domain, because a personal mailbox on the site's own domain is
// exactly as harvestable as one on gmail.com.
//
// ── Every group carries a positive control ──────────────────────────────────
//
// "No address found" is what a working guard, a moved directory, a broken regex
// and an empty dist/ all look like. That failure has happened on this repo — ten
// unit tests went vacuous reading the wrong file and 17 assertions ran against
// nothing. So the controls are not counts of convenience:
//
//   · scanning an EMPTY directory must throw, and this file proves it by
//     scanning one;
//   · the pattern must FIND a planted third-party address in a fixture
//     directory, and the allowlist must refuse it;
//   · the real scan must find the allowlisted addresses, so "none of the hits
//     is forbidden" is a claim about a non-empty set;
//   · the raw substring search for the founder's address must FIND it in a
//     fixture, before it is trusted to report dist/ clean.
//
// ── And the public identity must survive ────────────────────────────────────
//
// The founder's NAME is deliberately public; his address is not. A future
// "cleanup" that deleted the crown, the handle, the tooltip or the publicId
// along with the address would be a product regression, so the last groups
// EXECUTE the shipped chunk and require the owner record to come back whole.
//
// ── AND THE ADDRESS IS NO LONGER IN THE REPOSITORY TO TEST WITH ─────────────
//
// This file used to read the founder's address out of api/_lib/plans.js — "the
// one copy that is allowed to hold it, because api/_lib is never bundled". That
// stopped being true when the repository went public: a plaintext address in
// tracked source is published whether or not a browser ever fetches it. The
// server allowlist is now the ADMIN_EMAILS environment variable, and no file in
// this repository holds the address.
//
// So the probe asks the same questions through the DIGEST, which
// src/utils/constants.js already carries as a constant and which is not
// reversible by a scraper:
//
//   · dist/ is still swept for address-shaped strings, and any hit whose digest
//     is the owner's fails. That is the same guarantee as the old raw substring
//     search, because a plaintext address in the bundle is address-shaped by
//     definition;
//   · the stronger sweep is unchanged and needs no address at all: every hit
//     must be a published role address or an RFC 2606 placeholder, so the
//     founder's gmail would fail it twice over;
//   · the shipped chunk is exercised through the PUBLIC owner id, which reaches
//     the same record by the other door.
//
// What can no longer be checked here is whether the client digest and the
// server allowlist still name the SAME person — the server's copy is in Vercel.
// Those two groups run when ADMIN_EMAILS is set in the environment and SKIP
// WITH A REASON when it is not, rather than passing on nothing.
//
// MUTATION-VERIFIED: restoring the plaintext key at the OWNER_HANDLES call site
// turns the dist/ groups red; the evidence is in the pull request.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import crypto from 'node:crypto'
import { pathToFileURL } from 'node:url'
import { adminEmails as serverAdminEmails } from '../../api/_lib/adminEmails.js'
import {
  ADMIN_EMAILS,
  ADMIN_EMAIL_DIGESTS,
  isAdminEmail,
  ownerEmailDigest,
  getOwnerHandle,
  getPublicOwner,
  OWNER_HANDLES,
  PUBLIC_OWNER_ID,
} from '../../src/utils/constants.js'
import { prerenderRoutes } from '../../scripts/route-matrix.mjs'

const REPO = process.cwd()
const DIST = path.join(REPO, 'dist')

// These read dist/, so they only mean anything after a build; skip rather than
// fail when run standalone, the way tests/unit/canonical-host.test.js does.
// `npm run build` runs before `npm run test:unit`.
const built = fs.existsSync(path.join(DIST, 'index.html'))
const skip = !built && 'run `npm run build` first'

// ── The probe ───────────────────────────────────────────────────────────────

// Address-shaped. The final label is required to be ALPHABETIC and at least two
// characters, so that version strings — `@ffmpeg/core@0.12.6` reaches the bundle
// as `core@0.12.6` — are not reported as email addresses. Everything else about
// the shape is deliberately loose: this is a net, not a validator.
const ADDRESS_SOURCE = '[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\\.[A-Za-z0-9-]+)*\\.[A-Za-z]{2,24}'
const addressPattern = () => new RegExp(ADDRESS_SOURCE, 'g')

// Reserved by RFC 2606 / RFC 6761, plus this project's own `.test` fixtures.
// Nothing here can receive mail, which is the entire point of using them.
const UNROUTABLE = /(?:^|\.)(?:example\.(?:com|net|org)|example|invalid|test|localhost)$/i

// EXACT addresses, not a uil4b.com wildcard. These two are role addresses
// published on purpose in the Terms and Privacy pages; `dylan@uil4b.com` would
// still fail.
const PUBLISHED_ON_PURPOSE = new Set([
  'legal@uil4b.com',
  'privacy@uil4b.com',
])

function allowed(address) {
  const lower = address.toLowerCase()
  if (PUBLISHED_ON_PURPOSE.has(lower)) return true
  return UNROUTABLE.test(lower.slice(lower.lastIndexOf('@') + 1))
}

/** Every file under `dir`, as text, plus the address-shaped strings in them.
 *  THROWS on a directory that does not exist, and on one holding no files — a
 *  probe reading nothing is the exact failure mode this file guards against. */
function scan(dir, { label = dir } = {}) {
  const files = []
  const walk = (at) => {
    for (const entry of fs.readdirSync(at, { withFileTypes: true })) {
      const p = path.join(at, entry.name)
      if (entry.isDirectory()) { walk(p); continue }
      const bytes = fs.readFileSync(p)
      files.push({
        rel: path.relative(dir, p).split(path.sep).join('/'),
        text: bytes.toString('utf8'),
        bytes: bytes.length,
      })
    }
  }
  walk(dir)
  if (!files.length) throw new Error(`the probe read no files at all under ${label} — it is proving nothing`)

  const addresses = new Map()
  for (const file of files) {
    for (const [hit] of file.text.matchAll(addressPattern())) {
      if (!addresses.has(hit)) addresses.set(hit, [])
      if (!addresses.get(hit).includes(file.rel)) addresses.get(hit).push(file.rel)
    }
  }
  return { files, addresses, bytes: files.reduce((n, f) => n + f.bytes, 0) }
}

/** A throwaway directory holding exactly the files given. */
function fixture(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'uil4b-address-probe-'))
  for (const [name, body] of Object.entries(files)) fs.writeFileSync(path.join(dir, name), body, 'utf8')
  return dir
}

// The owner, named by digest rather than by address. This is the constant
// src/utils/constants.js gates the /admin route on, so it is the one the
// product actually uses — pointing this file at anything else would make every
// group below vacuous. It is a SHA-256 and cannot be turned back into an
// address by anyone reading this repository.
const FOUNDER_DIGEST = ADMIN_EMAIL_DIGESTS[0]

// The server allowlist, if this machine has one configured. It lives in Vercel
// now, so it is usually absent here — and the two groups that compare the
// client's digest against it say so and skip rather than pass on nothing.
const CONFIGURED = serverAdminEmails()[0]
const NO_SERVER_LIST = !CONFIGURED
  && 'ADMIN_EMAILS is not set in this environment — the server allowlist lives in Vercel since the '
  + 'address left the source tree, so whether the client digest still names the same person cannot be '
  + 'checked here. Run with ADMIN_EMAILS set to check it.'

// ── Positive controls, first, so a broken probe fails before it reports ─────

test('the probe refuses to report on a directory it read nothing from', () => {
  const empty = fs.mkdtempSync(path.join(os.tmpdir(), 'uil4b-address-empty-'))
  assert.throws(() => scan(empty, { label: 'an empty directory' }), /read no files at all/,
    'scanning an empty directory came back clean instead of throwing — this probe could report a green dist/ '
    + 'while reading nothing, which is the exact failure this file exists to prevent')
  assert.throws(() => scan(path.join(empty, 'does-not-exist')), /ENOENT/,
    'scanning a path that does not exist came back clean')
  fs.rmSync(empty, { recursive: true, force: true })
})

test('the address pattern finds a planted address, and the allowlist refuses it', () => {
  const dir = fixture({
    'leak.js': 'const owner="ceo.person@contractor-co.co.uk";export default owner\n',
    'fine.js': 'const hint="you@example.com";const dep="@ffmpeg/core@0.12.6"\n',
  })
  const { addresses } = scan(dir)
  assert.ok(addresses.has('ceo.person@contractor-co.co.uk'),
    'the pattern did not find a plainly-shaped address — every "dist/ is clean" below would be vacuous')
  assert.equal(allowed('ceo.person@contractor-co.co.uk'), false,
    'the allowlist accepts an arbitrary third-party address')
  assert.ok(addresses.has('you@example.com'), 'the pattern missed a reserved-domain placeholder')
  assert.equal(allowed('you@example.com'), true, 'RFC 2606 placeholders are meant to be allowed')
  assert.ok(!addresses.has('core@0.12.6'), 'a package version string is being reported as an email address')
  assert.equal(allowed('dylan@uil4b.com'), false,
    'the allowlist is a domain wildcard — a personal mailbox on the site\'s own domain would pass')
  assert.equal(allowed('somebody.personal@gmail.com'), false,
    'a personal mailbox at a consumer provider — the shape the leak had — is on the allowlist')
  fs.rmSync(dir, { recursive: true, force: true })
})

test('the digest search finds a planted address when it is there', () => {
  // The control for the dist/ group below, which can no longer search for the
  // owner's address as a string because the repository no longer holds it. What
  // it does instead is digest every address-shaped hit and compare. So this
  // plants an address, digests THAT, and requires the mechanism to find it —
  // the same positive control, one indirection along.
  const planted = 'planted.owner@contractor-co.co.uk'
  const dir = fixture({ 'leak.js': `const owner=${JSON.stringify(planted)}\n` })
  const { addresses } = scan(dir)
  const digests = [...addresses.keys()].map((hit) => ownerEmailDigest(hit))
  assert.ok(digests.includes(ownerEmailDigest(planted)),
    'the digest search cannot see an address in a file that plainly contains it — every "dist/ carries no owner '
    + 'address" below would be vacuous')
  assert.ok(!digests.includes(FOUNDER_DIGEST),
    'a fixture containing somebody else\'s address digested to the owner\'s — the comparison is not comparing')
  fs.rmSync(dir, { recursive: true, force: true })
})

// ── The real build ──────────────────────────────────────────────────────────

/** The 40 documents the build publishes, addressed by the ROUTE they serve
 *  rather than by walking whatever happens to be on disk. */
function publishedDocuments(files) {
  const byRel = new Map(files.map((f) => [f.rel, f]))
  const routes = prerenderRoutes()
  assert.equal(routes.length, 38,
    'the route matrix moved — the counts in this file are calibrated against 38 route shells')
  const wanted = [
    ['/', 'index.html'],
    ...routes.map((route) => [route, [...route.split('/').filter(Boolean), 'index.html'].join('/')]),
    ['/404', '404.html'],
  ]
  return wanted.map(([route, rel]) => {
    const file = byRel.get(rel)
    assert.ok(file, `dist/${rel} was not scanned — the walk is missing the prerendered shells`)
    return { route, ...file }
  })
}

test('the probe is holding the real build', { skip }, () => {
  const { files, bytes, addresses } = scan(DIST)
  assert.ok(files.length >= 150, `dist/ holds only ${files.length} files — this is not a full build`)
  assert.ok(bytes >= 2_000_000, `dist/ is only ${bytes} bytes — this is not a full build`)

  const docs = publishedDocuments(files)
  // 38 route shells + index + 404. It was 39 + 2 until 2026-09-18, when the
  // colour landing was deleted with the Spectrum swap and /create/color stopped
  // getting a shell of its own.
  assert.equal(docs.length, 40, 'the published document set is not 38 route shells + index + 404')
  for (const doc of docs) {
    assert.ok(doc.bytes > 2000, `${doc.route} is a stub, not a built shell (${doc.bytes} bytes)`)
  }

  // And the chunk this whole item is about is the one that ships in the first
  // request wave. If it stops being preloaded the leak changes shape, and the
  // numbers in the header stop describing reality.
  const preloaded = docs.filter((d) =>
    /<link rel="modulepreload"[^>]*href="\/assets\/constants-[A-Za-z0-9_-]+\.js"/.test(d.text))
  assert.equal(preloaded.length, 40,
    `the constants chunk is modulepreloaded by only ${preloaded.length} of 40 published documents`)

  // The scan produced addresses. "None of them is forbidden" below is a claim
  // about this set, and an empty set would make it vacuous.
  assert.ok(addresses.size >= 3,
    `the scan found only ${addresses.size} address-shaped strings in a ${bytes}-byte build — is it reading text at all?`)
})

test('no personal or third-party email address ships in dist/', { skip }, () => {
  const { addresses } = scan(DIST)
  const offenders = [...addresses]
    .filter(([address]) => !allowed(address))
    .map(([address, where]) =>
      `${address}  <- dist/${where.slice(0, 3).join(', dist/')}${where.length > 3 ? ` (+${where.length - 3} more)` : ''}`)
  assert.deepEqual(offenders, [],
    'an email address that is neither a published role address nor an RFC 2606 placeholder is being served to '
    + 'every visitor of this site:\n  ' + offenders.join('\n  '))

  // The allowlisted ones ARE there, so the filter above ran over real hits.
  for (const expected of PUBLISHED_ON_PURPOSE) {
    assert.ok(addresses.has(expected),
      `${expected} is no longer in the build — the scan is not reading the Terms and Privacy chunks`)
  }
})

test('the owner\'s own address appears nowhere in dist/, in any file', { skip }, () => {
  // Named by digest, because the repository no longer holds the address — and
  // this is no weaker than the substring search it replaces: a plaintext
  // address in the bundle is address-shaped by definition, so the scan above
  // sees it, and the digest tells us whose it is.
  const { addresses } = scan(DIST)
  const carrying = [...addresses]
    .filter(([address]) => ownerEmailDigest(address) === FOUNDER_DIGEST)
    .map(([address, where]) => `${address}  <- dist/${where.join(', dist/')}`)
  assert.deepEqual(carrying, [],
    'the owner\'s personal address is published to every visitor by:\n  ' + carrying.join('\n  '))
})

// ── The replacement is what actually shipped ────────────────────────────────
//
// Reading src/utils/constants.js would prove the source and nothing about the
// bundle. These EXECUTE the built chunk. It is minified, so its exports are
// single letters and none can be addressed by name — each is called and kept
// for what it returns, the way canonical-host.test.js exercises the built
// export chunk.

/** The shipped constants chunk, imported. */
async function builtConstants() {
  const dir = path.join(DIST, 'assets')
  const names = fs.readdirSync(dir).filter((f) => /^constants-[A-Za-z0-9_-]+\.js$/.test(f))
  assert.equal(names.length, 1,
    `expected exactly one built constants chunk, found ${names.length} — this test is reading the wrong file`)
  return import(pathToFileURL(path.join(dir, names[0])).href)
}

/** Everything the chunk's exported single-argument functions return for `input`. */
function answersFor(mod, input) {
  const out = []
  for (const value of Object.values(mod)) {
    if (typeof value !== 'function') continue
    try {
      out.push(value(input))
    } catch {
      // Not one of the lookups — the chunk exports other helpers too.
    }
  }
  return out
}

// The founder's deliberate public identity, spelled with escapes so that a file
// whose encoding was mangled fails here rather than comparing mojibake to
// mojibake.
const OWNER_RECORD = {
  name: 'Dylan Coleman',
  crown: '\u{1F451}',
  publicHandle: 'Dylan Coleman \u{1F451}',
  title: 'UIL4B founder',
  publicId: 'uil4b-founder',
}

test('the SHIPPED chunk still carries the guard it recognises the founder by', { skip }, async () => {
  // It cannot be asked about the ADDRESS any more — that is the point of the
  // change — so it is asked about the constant the address resolves to. If the
  // digest stops shipping, the /admin route guard, the nav item, the command
  // palette and the Pro entitlement all go dark for him, which is the failure
  // this group has always been about.
  const dir = path.join(DIST, 'assets')
  const chunk = fs.readdirSync(dir).find((f) => /^constants-[A-Za-z0-9_-]+\.js$/.test(f))
  const text = fs.readFileSync(path.join(dir, chunk), 'utf8')
  assert.ok(text.includes(FOUNDER_DIGEST),
    'the founder digest is not in the shipped constants chunk — every surface gated on isAdminEmail() is dark for him')

  const mod = await builtConstants()
  assert.ok(Object.values(mod).some((v) => typeof v === 'function'),
    'the built chunk exports nothing callable — this test is exercising nothing')
  // And the check is a real one, not a function that says true to anybody.
  assert.ok(!answersFor(mod, 'mallory@not-the-founder.example').includes(true),
    'the shipped admin check answers true for an arbitrary address')
  assert.ok(!answersFor(mod, '').includes(true), 'the shipped admin check answers true for an empty string')
})

test('the SHIPPED chunk still resolves the crown and the public handle', { skip }, async () => {
  const mod = await builtConstants()
  // A public submission carries an ownerId, not an address, and Community and
  // PaletteBuilder render through it — so this door into the record needs no
  // address and is the one the test can still open.
  const byId = answersFor(mod, PUBLIC_OWNER_ID).find((v) => v && typeof v === 'object' && 'crown' in v)
  assert.ok(byId, 'the shipped chunk no longer resolves the public owner id — community posts lose the crown')
  assert.deepEqual({ ...byId }, OWNER_RECORD,
    'the shipped owner record is not the public identity it is supposed to be')
})

// ── The source-level contract ───────────────────────────────────────────────

test('the public identity is intact in source, field by field', () => {
  // Reached by the public id and by the digest key — the two doors that do not
  // need the address. getOwnerHandle() is the third, and it is exercised in the
  // drift group below whenever a server allowlist is configured.
  assert.deepEqual({ ...getPublicOwner(PUBLIC_OWNER_ID) }, OWNER_RECORD,
    'a field of the owner\'s deliberate public identity was changed or removed — the name, crown, handle, tooltip '
    + 'and public id are product, not incidental')
  assert.deepEqual({ ...OWNER_HANDLES[FOUNDER_DIGEST] }, OWNER_RECORD)
  assert.equal(PUBLIC_OWNER_ID, 'uil4b-founder')
})

test('OWNER_HANDLES is keyed by a digest, not by an address', () => {
  const keys = Object.keys(OWNER_HANDLES)
  assert.equal(keys.length, 1, 'the owner map gained or lost an entry')
  const key = keys[0]
  assert.match(key, /^[0-9a-f]{64}$/,
    `OWNER_HANDLES is keyed by ${key} — a key that is not a digest is a key that ships in the bundle`)
  assert.equal(addressPattern().test(key), false, 'OWNER_HANDLES is keyed by something address-shaped')
  assert.equal(key, FOUNDER_DIGEST,
    'the crown is keyed by one digest and the /admin guard by another, so the owner gets exactly one of the two')
  assert.match(FOUNDER_DIGEST, /^[0-9a-f]{64}$/)
})

test('the client check agrees with the server allowlist it mirrors', { skip: NO_SERVER_LIST }, () => {
  // THE DRIFT CHECK, and it can only run where both halves exist. The client
  // decides what to RENDER from a digest compiled into the bundle; the server
  // decides what is GRANTED from ADMIN_EMAILS in the deployment environment.
  // Nothing holds them together any more except this assertion, and this
  // assertion is only possible where the variable is set — on the founder's
  // machine, or in a CI job given it. Where it is not, the skip above says so.
  //
  // A disagreement is not fatal, and is worth knowing: the server would grant
  // an administrator that every client surface hides the door from.
  for (const address of serverAdminEmails()) {
    assert.equal(isAdminEmail(address), true,
      `ADMIN_EMAILS grants ${address} admin server-side and src/utils/constants.js does not recognise them — `
      + '/admin, the nav item and the command palette are hidden from an account the server calls an administrator')
    assert.equal(isAdminEmail(address.toUpperCase()), true, 'the client check stopped being case-insensitive')
    assert.ok(getOwnerHandle(address), 'the configured administrator resolves to no owner record')
  }
})

test('the client check says no to everybody else', () => {
  for (const address of ['mallory@not-the-founder.example', 'somebody@gmail.com', '', null, undefined, 0, {}]) {
    assert.equal(isAdminEmail(address), false, `isAdminEmail said yes to ${JSON.stringify(address)}`)
  }
  // A near-miss of whoever IS the owner, built from the digest rather than
  // from an address: no string the test can construct may be accepted.
  assert.equal(ADMIN_EMAIL_DIGESTS.includes(ownerEmailDigest('mallory@not-the-founder.example')), false)
})

test('the founder-gated call site still gets a working admin check', () => {
  // src/contexts/SubscriptionContext.jsx is one of the four founder-gated files
  // (tests/unit/firebase-deferral.test.js), so it still writes
  // `ADMIN_EMAILS.includes(user.email.toLowerCase())` and could not be rewritten
  // on this branch. If that stops answering true the founder silently loses his
  // Pro entitlement — a downgraded founder on a green build — and if it starts
  // holding addresses again the leak is back.
  // The positive half needs an address the shim should say yes to, and the
  // only one this repository can name is a configured server allowlist entry —
  // absent, it is skipped inside rather than asserted on nothing.
  if (CONFIGURED) {
    assert.equal(ADMIN_EMAILS.includes(CONFIGURED.toLowerCase()), true,
      'the gated call site no longer recognises the configured administrator: he loses Pro on every surface '
      + 'useSubscription gates')
  }
  assert.equal(ADMIN_EMAILS.includes('mallory@not-the-founder.example'), false,
    'the gated call site says yes to anybody')
  // It delegates rather than holding its own answer — asserted without an
  // address by requiring the two to agree wherever they can be asked.
  for (const address of ['mallory@not-the-founder.example', 'somebody@gmail.com', '']) {
    assert.equal(ADMIN_EMAILS.includes(address), isAdminEmail(address),
      `the shim and isAdminEmail disagree about ${JSON.stringify(address)} — the shim is a second implementation`)
  }

  // It is a membership test, not a list. Nothing address-shaped can be read out
  // of it, by JSON, by iteration, or out of the source of its own method.
  const readable = JSON.stringify(ADMIN_EMAILS) + Object.keys(ADMIN_EMAILS).join(' ') + String(ADMIN_EMAILS.includes)
  assert.equal(addressPattern().test(readable), false,
    `ADMIN_EMAILS is holding an address again: ${readable}`)
  assert.equal(ADMIN_EMAILS[0], undefined, 'ADMIN_EMAILS is indexable, so it is a list of something')

  // And a cleanup note rather than a trap: when the gate lifts and that call
  // site becomes isAdminEmail(), this shim should go with it.
  const gated = fs.readFileSync(path.join(REPO, 'src', 'contexts', 'SubscriptionContext.jsx'), 'utf8')
  assert.match(gated, /ADMIN_EMAILS\.includes\(user\.email\.toLowerCase\(\)\)/,
    'the founder-gated call site changed shape — if it calls isAdminEmail() now, delete the ADMIN_EMAILS shim in '
    + 'src/utils/constants.js rather than leaving a footgun behind')
})

test('the hand-written SHA-256 is a real SHA-256', () => {
  // The digest constant is only worth anything if the function that produced it
  // is the algorithm it claims to be. Checked against node:crypto across the
  // padding boundaries a hand-rolled implementation gets wrong. The scope prefix
  // is 21 bytes, so the interesting input lengths are 34, 35 and 43: they put
  // the message at 55, 56 and 64 bytes, either side of the point where the
  // 64-bit length word no longer fits in the final block. Multibyte input is in
  // there too, which a naive charCodeAt loop would encode differently.
  const scoped = (s) => 'uil4b/owner-email/v1:' + String(s).toLowerCase()
  const cases = [
    '', 'a', 'abc', 'somebody.personal@gmail.com',
    'x'.repeat(34), 'y'.repeat(35), 'z'.repeat(43), 'q'.repeat(44),
    'w'.repeat(1000), 'naïve\u{1F451}',
  ]
  for (const value of cases) {
    assert.equal(ownerEmailDigest(value), crypto.createHash('sha256').update(scoped(value), 'utf8').digest('hex'),
      `ownerEmailDigest disagrees with node:crypto for a ${value.length}-character input`)
  }
  // Positive control: identical wrong answers on both sides would still pass
  // the loop above if the digest collapsed to a constant.
  assert.notEqual(ownerEmailDigest('a'), ownerEmailDigest('b'))
  assert.match(ownerEmailDigest('somebody@example.com'), /^[0-9a-f]{64}$/)
  // And the constant the whole file hangs on is that function's output shape.
  assert.match(FOUNDER_DIGEST, /^[0-9a-f]{64}$/)
})
