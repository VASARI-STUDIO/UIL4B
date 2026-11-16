// The onboarding hold an export takes while it runs signed out
// (src/utils/exportHold.js), and the three places that use it.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  ONBOARDING_HOLD_MAX_MS, holdOnboardingForExport, onboardingHeld, subscribeOnboardingHold,
} from '../../src/utils/exportHold.js'

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8')

test('a hold is on until its release, and the release is safe to call twice', () => {
  assert.equal(onboardingHeld(), false)
  const release = holdOnboardingForExport()
  assert.equal(onboardingHeld(), true)
  release()
  release()
  assert.equal(onboardingHeld(), false)
})

test('nested holds keep onboarding held until the last one is released', () => {
  const a = holdOnboardingForExport()
  const b = holdOnboardingForExport()
  a()
  assert.equal(onboardingHeld(), true)
  b()
  assert.equal(onboardingHeld(), false)
})

test('a hold lifts itself after its cap', async () => {
  holdOnboardingForExport(20)
  assert.equal(onboardingHeld(), true)
  await new Promise((r) => setTimeout(r, 60))
  assert.equal(onboardingHeld(), false)
})

test('the cap is 30 seconds', () => {
  assert.equal(ONBOARDING_HOLD_MAX_MS, 30000)
})

test('subscribers hear each change and can unsubscribe', () => {
  let heard = 0
  const off = subscribeOnboardingHold(() => { heard += 1 })
  const release = holdOnboardingForExport()
  release()
  off()
  holdOnboardingForExport()()
  assert.equal(heard, 2)
})

test('the onboarding route waits while an export holds it', () => {
  const app = read('src/App.jsx')
  assert.match(app, /const onboardingHeldForExport = useOnboardingHold\(\)/)
  assert.match(app, /!pendingOnboarding \|\| onboardingHeldForExport\) return/)
})

test('a signed-out export holds onboarding for the whole run', () => {
  const runner = read('src/hooks/useExportRunner.js')
  assert.match(runner, /const release = user \? null : holdOnboardingForExport\(\)/)
  assert.match(runner, /finally \{[\s\S]{0,80}if \(release\) release\(\)/)
})

test('the download gate holds onboarding while it asks for an account', () => {
  const gate = read('src/hooks/useExportGate.js')
  assert.match(gate, /const release = holdOnboardingForExport\(\)\s+const signedIn = await requireLogin/)
  assert.match(gate, /if \(signedIn\) setTimeout\(release, GATE_SETTLE_MS\)\s+else release\(\)/)
})
