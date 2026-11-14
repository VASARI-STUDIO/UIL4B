// SETTINGS JOURNEYS AT 1440: name, email, password, plan (Free and Pro), delete, back out, theme, keyboard, second entry.
// Source: handover/08_v3_app_part2_2026_11_10/05_reviews/settings2-journeys.md. Each journey has one expectation that JOURNEY_MUTATE=1 swaps for a wrong one, and then it must fail.
import { test } from './base.js'
import { defineJourneys } from './settings-journeys-body.js'

test.describe('settings journeys at 1440', () => {
  test.use({ viewport: { width: 1440, height: 900 } })
  defineJourneys({ touch: false, tag: 'desktop' })
})
