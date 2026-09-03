// `aria-modal="true"` is a PROMISE to assistive technology: everything outside
// this element is inert. Six of seven dialogs in the app made that promise and
// trapped nothing — Tab walked straight out into the page behind, the
// background scrolled, and closing dropped focus to the top of the document.
//
// Measured 2026-08-15, before the fix:
//
//   ProUpgradeModal   dialog  esc  --    --       --      (the upgrade surface)
//   LoginPopup        dialog  esc  lock  restore  trap    (the only correct one)
//   FeedbackModal     dialog  esc  lock  --       --      (on every page)
//   UIPreviewModal    dialog  esc  lock  --       --      (deleted since — see below)
//   ColorPickerPop    dialog  esc  --    --       --
//   PromptModal       dialog  esc  --    --       --
//   UIKitGuide        dialog  --   --    --       --      (a new user's first screen)
//
// Escape alone is the easy half. The trap is the half everyone skipped, and it
// is the half the attribute actually claims. This test exists so the next
// dialog cannot be added without it.
//
// UIPreviewModal has since been DELETED, and its row is kept rather than tidied
// away because this table is a dated measurement — editing one to match today is
// how a record stops being one. It was unreachable: imported only by TopBar,
// which nothing rendered once App.jsx moved to PillNav, and no built bundle ever
// contained a line of it. So the focus trap this file's fix gave it was work no
// user could ever benefit from, which is the part worth carrying forward — check
// a surface is reachable before spending a fix on it. Every assertion below
// walks src/ live, so the deletion itself needed no edit here.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const SRC = path.join(process.cwd(), 'src')

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) return walk(full)
    return /\.jsx$/.test(entry.name) ? [full] : []
  })
}

// The invariant is "this dialog traps focus", not "this dialog imports our
// hook". Four surfaces had already written a correct trap by hand before the
// shared hook existed — LoginPopup, ExportPanel, PillNav and IconLibrary — and
// two of those carry extra behaviour the hook does not (PillNav and ExportPanel
// also pause the app-wide Lenis so its rAF loop cannot fight the locked body).
// Rewriting working code to satisfy a test is how a test starts causing bugs,
// so both routes count. A local trap is recognised by it intercepting Tab.
const TRAPS_FOCUS = /useModalDialog|key !== 'Tab'|key === 'Tab'/

// `[aria-modal="true"]` also appears inside querySelector strings — PaletteBuilder
// uses one to suppress its spacebar shortcut while any dialog is open. That is a
// READ, not a declaration, and must not be counted as one.
const DECLARES_MODAL = /(?<!\[)aria-modal=(?:"true"|\{true\})/

// Every assertion below that reads source reads it STRIPPED. Both files here
// carry prose that quotes the very strings under test — the hook explains why
// `.focus()` on a detached node is a silent no-op, and the modal's JSX comment
// spells out why declining needs a real button. An assertion that matches the
// explanation instead of the code is green forever and guards nothing.
const stripJs = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

test('every dialog that claims aria-modal actually traps focus', () => {
  const offenders = []
  for (const file of walk(SRC)) {
    const src = fs.readFileSync(file, 'utf8')
    if (!DECLARES_MODAL.test(src)) continue
    if (TRAPS_FOCUS.test(src)) continue
    offenders.push(path.relative(process.cwd(), file))
  }
  assert.deepEqual(offenders, [],
    'aria-modal="true" promises the rest of the page is inert. These declare it and trap '
    + 'nothing, so Tab walks straight out into the page behind:\n  ' + offenders.join('\n  '))
})

test('the guard above sees a real population, so it cannot pass by finding nothing', () => {
  // A file-scanning test that silently matches zero files is green and worthless.
  const dialogs = walk(SRC).filter(f => DECLARES_MODAL.test(fs.readFileSync(f, 'utf8')))
  assert.ok(dialogs.length >= 10, `expected the app's dialog surfaces, found ${dialogs.length}`)
})

test('the shared hook still provides all four parts of the contract', () => {
  // Guards against the hook being hollowed out while every consumer still
  // imports it and the test above stays green.
  const hook = stripJs(fs.readFileSync(path.join(SRC, 'hooks/useModalDialog.js'), 'utf8'))
  assert.match(hook, /document\.body\.style\.overflow = 'hidden'/, 'scroll lock')
  assert.match(hook, /e\.key === 'Escape'/, 'Escape closes')
  assert.match(hook, /e\.key !== 'Tab'/, 'Tab is intercepted for the focus trap')

  // Part four — focus returns to whatever opened the dialog.
  //
  // This was written as /opener\.focus\(\)/ against an implementation that has
  // since been superseded: the hook now remembers the opener's whole ancestor
  // CHAIN and restores to the nearest node still connected, so the restore
  // survives the opener's menu unmounting behind the dialog — the exact case
  // where the old single-node version silently dropped the user on <body>.
  // The invariant did not change; only the identifier did. Re-pinning the new
  // identifier would just re-arm the same trap, so assert the SHAPE that a
  // hollowed-out hook could not fake:
  //
  //   1. the opener is read out of document.activeElement and bound;
  //   2. that read happens BEFORE the hook focuses anything, because a capture
  //      taken afterwards records the dialog and "restores" focus to where it
  //      already sits; and
  //   3. the effect's cleanup calls .focus() on a binding that traces back to
  //      that capture — not on the dialog, not on document.body.
  //
  // Deliberately NOT asserted: the ancestor chain and the isConnected filter.
  // Those are one good way to satisfy the invariant, not the invariant itself,
  // and pinning them would make the next improvement read as a regression.
  const capture = /(?:const|let|var)\s+([\w$]+)\s*=\s*document\.activeElement/.exec(hook)
  assert.ok(capture, 'the hook no longer remembers what had focus before it opened')
  const firstFocus = hook.search(/\.focus\(\)/)
  assert.ok(firstFocus > -1, 'the hook focuses nothing at all')
  assert.ok(capture.index < firstFocus,
    'the opener is captured only after something has been focused, so it records the dialog itself')

  // Follow the capture through the assignments that carry it, so renaming the
  // binding or routing it via a chain keeps passing while deleting it cannot.
  const carries = new Set([capture[1]])
  const mentions = (text) => [...carries].some(name => new RegExp(`\\b${name}\\b`).test(text))
  for (let pass = 0; pass < 4; pass += 1) {
    for (const [, name, rhs] of hook.matchAll(/(?:const|let|var)\s+([\w$]+)\s*=\s*([^\n;]*)/g)) {
      if (mentions(rhs)) carries.add(name)
    }
    for (const [, name, arg] of hook.matchAll(/([\w$]+)\.push\(([^)]*)\)/g)) {
      if (mentions(arg)) carries.add(name)
    }
  }

  const cleanupAt = hook.search(/return\s*\(\s*\)\s*=>/)
  assert.ok(cleanupAt > -1, 'the effect returns no cleanup, so nothing is ever undone')
  const cleanup = hook.slice(cleanupAt)
  const restored = [...cleanup.matchAll(/([\w$]+)\s*\??\.focus\(\)/g)].map(m => m[1])
  assert.ok(restored.length, 'the cleanup no longer restores focus to anything')
  assert.ok(restored.some(name => carries.has(name)),
    `on close the cleanup focuses ${restored.join(', ')} — none of which carries the opener `
    + `captured before the dialog opened (${capture[1]}), so focus is not being returned`)
})

// ── Invented proof ───────────────────────────────────────────────────────────
// The upgrade dialog carried five filled stars above "Loved by designers who'd
// rather build than tab-hop." There are no reviews, no ratings and nobody
// attributed to that sentence. It sat on the one surface where a user decides
// whether to trust us with money.
test('the upgrade dialog makes no claim we cannot source', () => {
  const body = stripJs(fs.readFileSync(path.join(SRC, 'components/ProUpgradeModal.jsx'), 'utf8'))
  assert.ok(!/Loved by designers/.test(body), 'the invented testimonial is back')
  assert.ok(!/ui-pro-proof-stars/.test(body), 'the unsourced star rating is back')
})

test('the upgrade dialog offers an explicit way to decline', () => {
  // Leaving "no" as the only choice without a button is the shape of a dark
  // pattern even when nothing behind it is coercive.
  //
  // This was written as /ui-pro-decline/. That class no longer exists — the
  // dialog was redesigned around a plan picker and the control is now
  // `.ui-pro-later`, "Maybe later" — but the invariant it guards did not move.
  // Chasing the rename would only buy the next rename another silent failure,
  // and a class name is not the thing that lets a user say no: it proves
  // nothing about the element being a button, being labelled, or being wired to
  // anything. So key on the behaviour instead, and read it out of the JSX:
  // a real <button> whose click closes the dialog and which carries VISIBLE
  // text.
  //
  // The visible-text half is what stops this going vacuous. The dialog also
  // has a corner ✕ — `onClick={onClose}` too, but an icon with only an
  // aria-label — so a check for "some button closes this" would stay green
  // with the decline control deleted. Text is exactly what "a real button with
  // a real label, not a grey word hidden in a corner" means, and the ✕ has
  // none. The label's wording is left free; the ✕ is not a substitute for it
  // whatever the wording becomes.
  const src = stripJs(fs.readFileSync(path.join(SRC, 'components/ProUpgradeModal.jsx'), 'utf8'))
  // Attributes may contain both `=>` and braced expressions, so the attribute
  // run is "anything but > or {" plus balanced brace groups.
  const BUTTON = /<button\b((?:[^>{]|\{(?:[^{}]|\{[^{}]*\})*\})*)>([\s\S]*?)<\/button>/g
  const buttons = [...src.matchAll(BUTTON)]
  assert.ok(buttons.length >= 4,
    `the JSX scan found ${buttons.length} buttons in a dialog that has several — it is not parsing`)

  const declines = buttons.filter(([, attrs, children]) =>
    /onClick=\{onClose\}/.test(attrs)
    && children.replace(/<[^>]*>/g, '').replace(/\{[\s\S]*?\}/g, '').trim().length > 0)
  assert.ok(declines.length,
    'no labelled button closes the upgrade dialog. The corner ✕ is not a way to decline — '
    + 'declining has to be exactly as easy as accepting, which means a real button with a '
    + 'real label sitting next to the one that says yes.')
})
