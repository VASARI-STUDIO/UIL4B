// The plan facts only promise what a visitor can open.
//
// The Prompt Library sits behind the admin gate until PROMPT_LIBRARY_OPEN is
// turned on. While it is off, nothing /plans, Checkout, Settings or the upgrade
// modal prints may promise prompts, and the route must stay admin-only. Turning
// the flag on lifts both together.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { PROMPT_LIBRARY_OPEN } from '../../src/data/toolTree.js'
import {
  FREE_POINTS, PRO_POINTS, PRO_VALUE, FREE_LINES, PRO_ROWS, PRO_ROWS_PHONE, PLANS_LEAD,
  proValue, proRows, plansLead,
} from '../../src/config/planFacts.js'

const app = fs.readFileSync(path.join(process.cwd(), 'src/App.jsx'), 'utf8')
const PROMPT = /prompt/i

// Every string a plan surface prints, from both theme states.
const planStrings = () => {
  const out = [...FREE_POINTS, ...PRO_POINTS, ...FREE_LINES, PLANS_LEAD, plansLead(true), plansLead(false)]
  for (const value of [PRO_VALUE, proValue(true), proValue(false)]) {
    for (const group of value) for (const row of group.rows) out.push(row.label, row.free ?? '', row.pro ?? '')
  }
  for (const rows of [PRO_ROWS, PRO_ROWS_PHONE, proRows(true), proRows(false), proRows(true, { phone: true })]) {
    for (const row of rows) out.push(row.id, row.title, row.sub, row.phoneSub)
  }
  return out
}

test('the prompt library route is admin-only exactly while the flag is off', () => {
  const route = app.split('\n').find((line) => line.includes('path="/discover/prompts"'))
  assert.ok(route, 'App.jsx has a /discover/prompts route')
  assert.match(route, /PROMPT_LIBRARY_OPEN \?/, 'the route reads PROMPT_LIBRARY_OPEN')
  assert.match(route, /: <RequireAdmin notFound>/, 'the closed branch is the admin gate')
  assert.match(app, /import \{[^}]*PROMPT_LIBRARY_OPEN[^}]*\} from '\.\/data\/toolTree'/)
})

test('no plan fact mentions prompts while the library is admin-only', { skip: PROMPT_LIBRARY_OPEN && 'the Prompt Library is open' }, () => {
  const claims = planStrings().filter((s) => PROMPT.test(s))
  assert.deepEqual(claims, [], `plan facts name prompts while /discover/prompts is admin-only: ${claims.join(' | ')}`)
})

test('the plans lead still names the library it does sell', () => {
  assert.match(PLANS_LEAD, PROMPT_LIBRARY_OPEN ? /the whole library/ : /every palette and gradient/)
})
