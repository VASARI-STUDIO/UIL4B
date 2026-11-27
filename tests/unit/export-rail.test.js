import test from 'node:test'
import assert from 'node:assert/strict'
import { EXPORT_TYPES } from '../../src/config/dialogExport.js'
import { RAIL, STYLE_PAGES, railCategories, railOfCategory, typeIdOfCategory } from '../../src/config/exportRail.js'

const allCategories = EXPORT_TYPES.flatMap((t) => t.categories.map((c) => c.id))

test('the rail is Brand guidelines, UI style guide, Image and Code, in that order', () => {
  assert.deepEqual(RAIL.map((r) => r.label), ['Brand guidelines', 'UI style guide', 'Image', 'Code'])
  for (const r of RAIL) assert.ok(r.short, `${r.label} has a short name for a phone`)
})

test('every category the dialog has is on exactly one rail item', () => {
  const listed = RAIL.flatMap((r) => r.categories)
  assert.deepEqual([...listed].sort(), [...allCategories].sort())
  assert.equal(new Set(listed).size, listed.length, 'no category twice')
})

test('railCategories resolves each item to the dialog category objects, in the item order', () => {
  for (const r of RAIL) assert.deepEqual(railCategories(r).map((c) => c.id), [...r.categories])
})

test('railOfCategory and typeIdOfCategory agree with the config for every category', () => {
  for (const id of allCategories) {
    assert.ok(railOfCategory(id).categories.includes(id), `${id} is found on its rail item`)
    assert.ok(EXPORT_TYPES.find((t) => t.id === typeIdOfCategory(id)).categories.some((c) => c.id === id), `${id} sits in its type`)
  }
})

test('the free style guide pages are the seven the engine draws', () => {
  assert.deepEqual([...STYLE_PAGES], ['Cover', 'Logo', 'Colour', 'Type', 'Contrast', 'Tokens', 'Usage'])
})

test('the rail carries no plan flag: Free and Pro are decided elsewhere', () => {
  for (const r of RAIL) assert.equal('pro' in r || 'free' in r || 'isPro' in r, false, r.label)
})
