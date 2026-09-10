// What the right-click menu is allowed to learn about the element under the
// pointer, and when it must keep its hands off the browser's own menu.
//
// Backlog `right-click-feedback` (founder request, 2026-09-02): a context-menu
// action that opens feedback with details PREFILLED, so a report is easy to
// find and replicate. Two constraints in that note are the reason this file
// exists at all, and both are rules rather than rendering:
//
//   "a stable selector, not a DOM dump"  — a serialised DOM is unreadable in a
//   triage inbox, bloats every stored record, and is overwhelmingly likely to
//   contain something private, because the DOM is where the user's work lives.
//
//   "do not swallow the native menu on text selections, inputs or links" —
//   those right-clicks mean copy / paste / save / open-in-new-tab, and breaking
//   one is a worse bug than the one this feature was built to catch.
//
// Everything here is plain data in, plain data out. No DOM: the redaction rules
// are exactly the kind of thing that must stay verifiable without a browser.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {
  elementSignature, invokedByPointer, isStableToken, nativeMenuWins, safeSignature,
} from '../../src/utils/elementSignature.js'

const read = (p) => fs.readFileSync(path.join(process.cwd(), p), 'utf8')

// ── The signature identifies something a human can go and find ──────────────

test('an element that names itself is reported as tag plus its class', () => {
  assert.equal(elementSignature([{ tag: 'BUTTON', classes: ['plb-add'] }]), 'button.plb-add')
})

test('a data-testid beats an id, and an id beats a class', () => {
  assert.equal(
    elementSignature([{ tag: 'BUTTON', testId: 'save', id: 'x', classes: ['btn'] }]),
    'button[data-testid="save"]',
  )
  assert.equal(elementSignature([{ tag: 'BUTTON', id: 'export', classes: ['btn'] }]), 'button#export')
})

test('icon internals are stepped over to the control that was actually clicked', () => {
  // Every button in this app wraps an inline <svg>, so `event.target` on a
  // right-click is almost always a <path>. Reporting "path" would waste the
  // one field that tells a triager where to look.
  const sig = elementSignature([
    { tag: 'PATH' },
    { tag: 'SVG' },
    { tag: 'BUTTON', classes: ['plb-add'] },
  ])
  assert.equal(sig, 'button.plb-add')
})

test('an unnamed element borrows the nearest named ancestor', () => {
  // "the anchor inside .pnav-menu" is findable in seconds; "a" alone is not.
  assert.equal(
    elementSignature([{ tag: 'A' }, { tag: 'DIV', classes: ['pnav-menu'] }]),
    '.pnav-menu a',
  )
})

test('when nothing is named the tag alone is still returned', () => {
  assert.equal(elementSignature([{ tag: 'SECTION' }]), 'section')
})

test('an empty or absent chain reports nothing rather than guessing', () => {
  assert.equal(elementSignature([]), '')
  assert.equal(elementSignature(), '')
  assert.equal(elementSignature(null), '')
})

// ── What may never appear in a signature ────────────────────────────────────

test('generated tokens are rejected, because they identify nothing next build', () => {
  assert.equal(isStableToken(':r3:'), false, "React's useId output")
  assert.equal(isStableToken('a3f9c1d0'), false, 'a build hash')
  assert.equal(isStableToken('x1k9m2p4q7b3n8v5'), false, 'a generated blob')
})

test('a long digit run is rejected, because it is somebody\'s record id', () => {
  // `palette-84213` is the row id of a saved palette — the user's data, not
  // our markup, and not something a triager can act on either.
  assert.equal(isStableToken('palette-84213'), false)
  assert.equal(isStableToken('btn-2'), true, 'a small index is still authored')
})

test('state classes are rejected, because they are not stable and not specific', () => {
  // `.on` is true of hundreds of elements, and of THIS element only while it
  // happens to be on — so the same element would yield different signatures
  // depending on when you right-clicked it.
  for (const state of ['on', 'active', 'open', 'selected', 'loading']) {
    assert.equal(isStableToken(state), false, `${state} must not name an element`)
  }
})

test('anything that is not a bare CSS identifier is rejected', () => {
  // This is the hard stop for content. A value with a space, a quote, a slash,
  // an `@` or a dot in it is not a class we authored — it is a path, an email,
  // or a sentence that found its way into an attribute.
  for (const bad of ['user@example.com', 'my saved palette', 'a/b', 'Ünïcode', '"quoted"', '']) {
    assert.equal(isStableToken(bad), false, `${bad} must never reach the store`)
  }
})

test('an over-long token is rejected rather than truncated', () => {
  // Truncating would produce a plausible-looking prefix of something private.
  // The sample is hyphenated on purpose: an unbroken run of letters is already
  // caught by the generated-blob rule, so it would not exercise the cap.
  assert.equal(isStableToken('x-'.repeat(17)), false, '34 characters')
  assert.equal(isStableToken('x-'.repeat(8)), true, '16 characters is fine')
})

test('the last line of defence rejects anything outside the selector charset', () => {
  // Nothing reachable through elementSignature can violate this today — the
  // token and tag filters stop it first. That is precisely why it is tested
  // directly: an untested guard is one that silently stops working the day
  // the check in front of it changes.
  assert.equal(safeSignature('button.plb-add'), 'button.plb-add')
  assert.equal(safeSignature('.pnav-menu a'), '.pnav-menu a')
  for (const bad of [
    'div.my palette.saved',   // more than one space: a sentence, not a selector
    'a[title="user@x.com"]',  // an address that reached an attribute
    'div.<script>',
    'div.café',
    'x'.repeat(61),           // long enough to stop being a lead
  ]) {
    assert.equal(safeSignature(bad), '', `${bad} must never reach the store`)
  }
})

test('a malformed tag is dropped rather than emitted', () => {
  // The final guard. Every signature passes through it, so a future change to
  // the walk cannot widen what escapes — the shape is pinned in one place
  // rather than trusted to each caller.
  assert.equal(elementSignature([{ tag: 'DIV BAD"' }]), '')
  assert.equal(elementSignature([{ tag: 42 }]), '')
})

test('every signature the walk produces survives its own guard', () => {
  // If the guard and the walk ever disagree, the feature silently stops
  // reporting elements at all — a regression with no error to notice.
  for (const s of [
    elementSignature([{ tag: 'BUTTON', classes: ['plb-add'] }]),
    elementSignature([{ tag: 'BUTTON', id: 'export' }]),
    elementSignature([{ tag: 'BUTTON', testId: 'save' }]),
    elementSignature([{ tag: 'A' }, { tag: 'NAV', id: 'main-nav' }]),
    elementSignature([{ tag: 'SECTION' }]),
  ]) {
    assert.notEqual(s, '', 'the walk produced something the guard then threw away')
    assert.equal(safeSignature(s), s)
  }
})

test('nothing in the module reaches for text, values or attributes at large', () => {
  // A signature is structurally incapable of carrying content only for as long
  // as its inputs stay limited to tag, id, class and data-testid.
  // Both comment styles have to go: the module explains in prose what it does
  // NOT read, and matching those sentences would fail the test for saying the
  // right thing.
  const src = read('src/utils/elementSignature.js')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '')
  for (const forbidden of [
    'textContent', 'innerText', 'innerHTML', 'outerHTML',
    '\\.value', 'getAttributeNames', 'attributes', 'localStorage',
  ]) {
    assert.ok(!new RegExp(forbidden).test(src), `elementSignature must not read ${forbidden}`)
  }
})

// ── When the browser's own menu wins ────────────────────────────────────────

const plain = [{ tag: 'DIV', classes: ['card'] }]

test('a plain surface is ours to claim', () => {
  assert.equal(nativeMenuWins(plain, {}), false)
})

test('a text selection always keeps the native menu', () => {
  // They are reaching for Copy, and they are right to.
  assert.equal(nativeMenuWins(plain, { hasSelection: true }), true)
})

test('text-entry controls always keep the native menu', () => {
  // Right-clicking a field is how Paste is reached. Taking that away to offer
  // a feedback link is a straight downgrade.
  for (const tag of ['INPUT', 'TEXTAREA', 'SELECT', 'OPTION']) {
    assert.equal(nativeMenuWins([{ tag }], {}), true, `${tag} must keep its menu`)
  }
  assert.equal(nativeMenuWins([{ tag: 'DIV', editable: true }], {}), true, 'contenteditable')
})

test('a right-click on a child of an input still keeps the native menu', () => {
  // The veto has to look at the whole chain, not just the target: the pointer
  // can land on something nested inside the control.
  assert.equal(nativeMenuWins([{ tag: 'SPAN' }, { tag: 'LABEL' }, { tag: 'TEXTAREA' }], {}), true)
})

test('links and media keep the native menu; a linkless <a> does not', () => {
  assert.equal(nativeMenuWins([{ tag: 'A', href: true }], {}), true, 'open in new tab')
  for (const tag of ['IMG', 'VIDEO', 'AUDIO', 'CANVAS', 'IFRAME']) {
    assert.equal(nativeMenuWins([{ tag }], {}), true, `${tag} must keep its menu`)
  }
  // A bare <a> with no href is a styling shell. Nothing in the browser menu
  // applies to it, so it does not get to veto.
  assert.equal(nativeMenuWins([{ tag: 'A' }], {}), false)
})

test('inline SVG does not veto, or the feature would be dead on most of the app', () => {
  // Every icon in this app is an inline <svg>. Browsers offer no image actions
  // for one, so there is no native menu here worth protecting.
  assert.equal(nativeMenuWins([{ tag: 'SVG' }, { tag: 'BUTTON' }], {}), false)
})

test('Shift is the escape hatch back to the browser menu', () => {
  // The promise "we do not swallow the native menu" needs a fallback for the
  // cases the rules above did not anticipate. Firefox honours this convention
  // for pages that override the menu; so do we.
  assert.equal(nativeMenuWins(plain, { shiftKey: true }), true)
})

test('a local menu that already handled the event is not overridden', () => {
  // The sidebar and PaletteBuilder have their own right-click menus. Ours is
  // the app-wide default and defers to anything more specific.
  assert.equal(nativeMenuWins(plain, { defaultPrevented: true }), true)
})

test('our own surfaces are excluded, so the menu cannot be opened on itself', () => {
  assert.equal(nativeMenuWins([{ tag: 'DIV', feedbackSurface: true }], {}), true)
})

test('a touch-only device keeps its long-press', () => {
  // Browsers fire `contextmenu` from a long-press. That gesture is how people
  // select text, copy, save an image and reach the callout menu on a phone,
  // and there is no Shift+long-press to escape with — so claiming it would be
  // the same harm the rest of this function exists to prevent, on the one
  // platform with no way out. Measured 2026-09-10 in a Pixel 7 context: the
  // long-press contextmenu came back defaultPrevented, i.e. we were swallowing
  // the native callout on every phone. On touch the affordance is the Feedback
  // button instead.
  assert.equal(nativeMenuWins(plain, { touchOnly: true }), true)
  // A tablet with a mouse attached is not touch-only and keeps the gesture —
  // which is why the component asks `(any-pointer: fine)` as well as
  // `(pointer: coarse)`.
  assert.equal(nativeMenuWins(plain, { touchOnly: false }), false)
})

// ── Pointer or keyboard ─────────────────────────────────────────────────────

test('a real right-click is a pointer even though its detail is 0', () => {
  // MEASURED in Chromium, 2026-09-10, against this app's own build: a genuine
  // mouse right-click reports exactly this. `detail: 0` is the trap — the
  // common "detail === 0 means keyboard" heuristic is wrong on EVERY mouse
  // right-click in Chrome, and using it anchored the menu to
  // document.activeElement (<body>), so a click at (200, 200) opened the menu
  // at (8, 919). Caught in a real browser, not in this file; pinned here so it
  // cannot come back silently.
  assert.equal(invokedByPointer({ button: 2, detail: 0, clientX: 200, clientY: 200 }), true)
})

test('Shift+F10 and the Menu key are keyboard, wherever they claim to be', () => {
  // Both report button 0. Getting this wrong in the other direction is worse
  // than a misplaced menu: `shiftKey` would then fire the native-menu escape
  // hatch on Shift+F10 and silently remove the only keyboard route into the
  // feature — so button 0 is answered before the coordinate tiebreak, even
  // when the event carries coordinates.
  assert.equal(invokedByPointer({ button: 0, detail: 0, clientX: 0, clientY: 0 }), false)
  assert.equal(invokedByPointer({ button: 0, detail: 0, clientX: 120, clientY: 40 }), false)
  // An event reporting no button at all falls back to the coordinates.
  assert.equal(invokedByPointer({}), false)
  assert.equal(invokedByPointer({ clientX: 0, clientY: 0 }), false)
})
