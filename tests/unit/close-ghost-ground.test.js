// The closing call (`HomeFinalCall`) sits on a dark ground and its secondary
// link is a transparent ghost: `.hm-close-ghost`. /plans gives that link
// `.ui-pill-out` too, for the chroma ring. Both classes are specificity (0,1,0)
// and both set `background` and `color`, so whichever stylesheet the bundler
// places LAST wins. In the production build global.css lands after
// home-footer.css (main.jsx imports App, which eagerly imports the footer,
// before it imports global.css), so the ghost painted as a white card with
// black ink on the dark section. The user-sim build (`--mode test`) orders the
// chunks the other way round, which is why the rendered baseline never saw it.
//
// The guard: home-footer.css must carry a rule that outranks `.ui-pill-out` for
// a ghost inside the closing call, and that rule must restore the dark ghost.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const read = (p) => fs.readFileSync(path.join(process.cwd(), p), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '')

const FOOTER = read('src/styles/pages/home-footer.css')
const GLOBAL = read('src/styles/global.css')

// Class/attribute/pseudo-class count is all that differs between these rules.
const classCount = (sel) => (sel.match(/\.[\w-]+|\[[^\]]+\]|:(?!:)[\w-]+/g) || []).length

function rules(css) {
  const out = []
  const re = /([^{}]+)\{([^{}]*)\}/g
  let m
  while ((m = re.exec(css))) {
    for (const sel of m[1].split(',')) out.push({ sel: sel.trim(), body: m[2] })
  }
  return out
}

const decl = (body, prop) => {
  const m = body.match(new RegExp(`(?:^|;)\\s*${prop}\\s*:\\s*([^;]+)`))
  return m ? m[1].trim().toLowerCase() : null
}

test('global .ui-pill-out still paints its own ground (the rule this guard answers)', () => {
  const pill = rules(GLOBAL).find((r) => r.sel === '.ui-pill-out' && decl(r.body, 'background'))
  assert.ok(pill, 'expected a bare .ui-pill-out rule that sets background in global.css')
})

test('the closing ghost outranks .ui-pill-out and stays a transparent dark ghost', () => {
  const ghost = rules(FOOTER).filter((r) =>
    /\.hm-close-ghost\.ui-pill-out(?![\w-])/.test(r.sel) && !/:hover/.test(r.sel))
  assert.ok(ghost.length, 'home-footer.css needs a .hm-close-ghost.ui-pill-out rule')
  for (const r of ghost) {
    assert.ok(classCount(r.sel) > classCount('.ui-pill-out'),
      `${r.sel} must outrank .ui-pill-out whatever the bundle order`)
    assert.equal(decl(r.body, 'background'), 'transparent', `${r.sel} background`)
    assert.equal(decl(r.body, 'color'), '#efeeea', `${r.sel} color`)
    assert.ok(decl(r.body, 'border-color'), `${r.sel} must also replace the card border colour`)
  }
})

test('the fix is scoped to the closing call, so the docked /plans bar keeps its card ghost', () => {
  const ghost = rules(FOOTER).filter((r) => /\.hm-close-ghost\.ui-pill-out/.test(r.sel))
  for (const r of ghost) {
    assert.match(r.sel, /\.hm-close(-btns)?\b[^.]*\s*>?\s*\.hm-close-ghost/,
      `${r.sel} must be anchored inside the closing section`)
  }
})
