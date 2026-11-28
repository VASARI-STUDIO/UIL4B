// The Google account chooser shows every time, and a sign-in returns to the
// whole address it started from.
//
// Read from source: One Tap runs against Google's live script, which the
// browser suite stubs out, so the config handed to it is checked here.
//
// MUTATIONS (each turns the test named red):
//   `auto_select: false` back to `auto_select: returning` in GoogleOneTap   -> "One Tap never signs a returning person in silently"
//   the disableAutoSelect() call removed from logout in AuthContext         -> "signing out tells Google not to auto-select next time"
//   `+ location.hash` dropped from RequireAuth's `from`                     -> "a gated link keeps its hash through sign-in"
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8')

test('One Tap never signs a returning person in silently', () => {
  const src = read('src/components/GoogleOneTap.jsx')
  const init = src.slice(src.indexOf('accounts.id.initialize('))
  assert.match(init.slice(0, init.indexOf('prompt()')), /auto_select:\s*false\b/)
})

test('signing out tells Google not to auto-select next time', () => {
  const src = read('src/contexts/AuthContext.jsx')
  const start = src.indexOf('const logout = useCallback(')
  assert.ok(start > -1, 'logout not found')
  const body = src.slice(start, src.indexOf('}, [])', start))
  assert.match(body, /accounts\?*\.id\?*\.disableAutoSelect\(\)/)
})

test('a gated link keeps its hash through sign-in', () => {
  const src = read('src/App.jsx')
  assert.match(src, /from:\s*location\.pathname\s*\+\s*location\.search\s*\+\s*location\.hash/)
})
