// SETTINGS JOURNEYS AT 390 WITH A FINGER, plus the 390 and 320 sweeps. Same journeys as 385; see settings-journeys-body.js.
import { test } from './base.js'
import { defineJourneys } from './settings-journeys-body.js'

test.describe('settings journeys at 390', () => {
  test.use({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true })
  defineJourneys({ touch: true, tag: 'phone' })
})
