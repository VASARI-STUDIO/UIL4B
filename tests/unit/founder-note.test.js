// The founder's note: the data contract, and the four properties that make it
// the surface he asked for rather than the one the backlog item describes.
//
// `founder-intro-popup` in src/data/pipeline.js specifies a welcome popup shown
// to a new visitor once per account. The founder was offered that and chose
// something else — "maybe we make it visable when a user clicks a certian
// section or button" — and the difference between the two is not decoration. A
// popup that opens itself and a note that waits to be asked for are opposite
// answers to "should this interrupt you", and the second one is only true for as
// long as nobody adds a `useEffect` that opens it on a timer.
//
// So the never-opens-itself property is asserted here as a property of the
// SOURCE, not left as an intention in a comment. Same for the decision not to
// remember anything, which is the other half of the same contract: a "seen" flag
// exists only to change what is shown next, and the first thing anyone reaches
// for when they want to change what is shown next is a nudge.
//
// Every source assertion below reads the file STRIPPED OF COMMENTS. The prose in
// FounderNote.jsx quotes almost every string under test — it explains why there
// is no localStorage, why nothing is on a timer, why nothing sends mail — and an
// assertion that matched the explanation rather than the code would be green
// forever and guard nothing. tests/unit/modal-contract.test.js was bitten by
// exactly that and carries the same defence.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

import {
  FOUNDER_NOTE,
  FOUNDER_SIGNATURE,
  NOTE_PROMPTS,
  noteIsWritten,
  noteParagraphs,
} from '../../src/data/founderNote.js'

const read = (rel) => fs.readFileSync(path.join(process.cwd(), rel), 'utf8')
const stripJs = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

const COMPONENT = stripJs(read('src/components/FounderNote.jsx'))
const DATA = stripJs(read('src/data/founderNote.js'))
const FOOTER = stripJs(read('src/components/AppFooter.jsx'))
const CSS = read('src/styles/global.css').replace(/\/\*[\s\S]*?\*\//g, '')

/** A note with every slot filled, for the written-state assertions. */
const FILLED = { who: '  A  ', what: 'B', state: 'C', help: 'D' }
/** And one with none, which is how the module ships today. */
const BLANK = { who: '', what: '', state: '', help: '' }

test('1 · an unwritten note renders no prose at all', () => {
  // Asserted against a BLANK FIXTURE rather than against FOUNDER_NOTE itself,
  // and that is the whole point of the fixture. "The shipped note is empty" is
  // true today and is supposed to STOP being true — the moment Dylan writes his
  // four lines. A test that asserted it would turn his edit into a red suite,
  // which is a test that punishes the one action it exists to enable.
  //
  // What must hold forever is the BEHAVIOUR: no words, no paragraphs, and
  // therefore the panel's unwritten state rather than an empty note.
  assert.equal(noteIsWritten(BLANK), false)
  assert.deepEqual(noteParagraphs(BLANK), [], 'an unwritten note renders no prose, so the panel shows its unwritten state')
  // The slots exist and are addressable even while empty, which is what makes
  // filling them in a four-line edit and nothing else.
  assert.deepEqual(Object.keys(FOUNDER_NOTE).sort(), NOTE_PROMPTS.map((p) => p.key).sort())
})

test('2 · a partly-filled note is still unwritten', () => {
  // All-or-nothing on purpose. Three filled slots and one blank would render as
  // a note that stops mid-thought, and a reader cannot tell "short" from
  // "truncated" — so the panel keeps saying it is unwritten until it is not.
  for (const { key } of NOTE_PROMPTS) {
    const partial = { ...FILLED, [key]: '' }
    assert.equal(noteIsWritten(partial), false, `a blank "${key}" must leave the note unwritten`)
    assert.deepEqual(noteParagraphs(partial), [])
  }
  // Whitespace is not an answer.
  assert.equal(noteIsWritten({ ...FILLED, help: '   \n  ' }), false)
})

test('3 · a filled note renders four trimmed paragraphs in prompt order', () => {
  assert.equal(noteIsWritten(FILLED), true)
  assert.deepEqual(noteParagraphs(FILLED), ['A', 'B', 'C', 'D'])
  // The order is the argument the note makes: who I am, what this is, where it
  // is up to, what would help. A reshuffle here is a different note.
  assert.deepEqual(NOTE_PROMPTS.map((p) => p.key), ['who', 'what', 'state', 'help'])
})

test('4 · the signature asserts only what the app already says in public', () => {
  // AppFooter has read "Built in Brisbane by Dylan Coleman" since before this
  // note existed, so neither fact is invented here. Nothing else about him is
  // stated anywhere in the module — a fabricated origin story is the exact
  // opposite of the effect this note is for.
  assert.equal(FOUNDER_SIGNATURE.name, 'Dylan Coleman')
  assert.equal(FOUNDER_SIGNATURE.place, 'Brisbane')
  assert.match(FOOTER, /Dylan Coleman/, 'the footer is where these two facts already come from')
  assert.match(FOOTER, /Built in Brisbane/)
})

test('5 · nothing in the note can open itself', () => {
  // THE contract of this surface. A person pressing the trigger is the only
  // thing that may open it: not a first visit, not a timer, not a scroll depth,
  // not an account flag.
  const opens = COMPONENT.split('\n').filter((l) => l.includes('setOpen(true)'))
  assert.equal(opens.length, 1, `exactly one place may open the panel, found ${opens.length}`)
  assert.match(opens[0], /onClick/, 'the one opener must be a click handler')

  for (const banned of ['useEffect', 'setTimeout', 'setInterval', 'IntersectionObserver', 'addEventListener', 'requestAnimationFrame']) {
    assert.ok(
      !COMPONENT.includes(banned),
      `FounderNote.jsx must not reach for ${banned} — every one of them is a way for this panel to open without being asked`,
    )
  }
})

test('6 · nothing about the note is remembered, so nothing can throw reading it', () => {
  // The decision, and its dividend. `localStorage` can THROW rather than return
  // empty (a locked-down or private-mode profile), so any read needs a
  // try/catch and a correct render with no stored value. The correct render
  // with no stored value is the only render this surface has.
  for (const src of [COMPONENT, DATA]) {
    for (const banned of ['localStorage', 'sessionStorage', 'indexedDB', 'document.cookie']) {
      assert.ok(!src.includes(banned), `the note must not persist anything (${banned})`)
    }
  }
})

test('7 · the one action reuses the feedback channel the app already has', () => {
  // Not a second channel wearing the same name, and not email: the transactional
  // email work is blocked on a key that does not exist, and nothing here waits
  // on it.
  assert.match(COMPONENT, /to="\/feedback"/, 'the action must point at the existing feedback route')
  assert.ok(!/mailto:/.test(COMPONENT), 'the note must not invent an email channel')
  assert.match(FOOTER, /'\/feedback', 'Send feedback'/, 'and it must be the same destination the footer already offers')

  // One action, not a row of them. Framer's beta notice is the reference: state
  // the state, offer exactly one way to answer.
  const links = COMPONENT.match(/<Link\b/g) || []
  assert.equal(links.length, 1, `the panel offers exactly one destination, found ${links.length}`)
})

test('8 · the trigger is actually mounted, and the panel is a real dialog', () => {
  // modal-contract.test.js makes the point this borrows: check a surface is
  // REACHABLE before spending anything on it. A note nothing renders is a note
  // nobody can open.
  assert.match(FOOTER, /import FounderNote from '\.\/FounderNote'/)
  assert.match(FOOTER, /<FounderNote \/>/)

  // The dialog half is enforced app-wide by modal-contract.test.js; what is
  // local to this surface is that the TRIGGER says what it does before it is
  // pressed, and reports its state after.
  assert.match(COMPONENT, /aria-haspopup="dialog"/)
  assert.match(COMPONENT, /aria-expanded=\{open\}/)
})

test('9 · both animated parts of the panel are flattened under reduced motion', () => {
  // The stylesheet-wide guard in reduced-motion-guard.test.js proves that any
  // `@media (prefers-reduced-motion: reduce)` block carries the in-app override
  // and has an explicit companion. It cannot prove a NEW animated surface was
  // given a block at all — delete both halves and that test still passes while
  // this panel fades and rises for someone who asked it not to.
  //
  // The global clamp at the top of global.css does not cover this either: it
  // forces durations and delays to near-zero but cannot reach `opacity` or
  // `transform`, and opacity and transform are exactly what cp-fade and cp-rise
  // animate.
  const animated = ['.fnote-overlay', '.fnote']
  for (const sel of animated) {
    const declares = new RegExp(`\\${sel}\\{[^}]*animation:cp-`)
    assert.match(CSS, declares, `${sel} is expected to carry an entrance animation`)

    const explicit = new RegExp(`html\\[data-reduced-motion="true"\\] \\${sel}[,{]`)
    assert.match(CSS, explicit, `${sel} needs an explicit-attribute reduced-motion rule`)

    const guarded = new RegExp(`html:not\\(\\[data-reduced-motion="false"\\]\\) \\${sel}[,{]`)
    assert.match(CSS, guarded, `${sel} needs the OS-query half too`)
  }

  // And both halves must flatten the two properties the clamp cannot reach.
  const blocks = CSS.match(/[^{}]*\.fnote\{animation:none[^}]*\}/g) || []
  assert.ok(blocks.length >= 2, `expected both reduced-motion halves, found ${blocks.length}`)
  for (const block of blocks) {
    assert.match(block, /opacity:1/, 'the clamp cannot reach opacity, so the rule must')
    assert.match(block, /transform:none/, 'the clamp cannot reach transform either')
  }
})
