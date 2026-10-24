import assert from 'node:assert/strict'
import { test } from 'node:test'
import { flattenOptions, listboxKeyAction, listboxSelection, listboxTarget, selectedOptionIndex, typeaheadTarget } from '../../src/utils/listboxKeys.js'

const options = [
  { value: 'auto', label: 'Auto' },
  { value: 'locked', label: 'Amber', disabled: true },
  { value: 'analogous', label: 'Analogous', mark: 'Pro' },
  { value: 'blue', label: 'Blue' },
  { value: 'black', label: 'Black' },
]

test('activation keys open, commit and dismiss without treating Tab as a choice', () => {
  for (const key of ['Enter', ' ', 'ArrowDown', 'ArrowUp']) assert.equal(listboxKeyAction(key, false), 'open')
  for (const key of ['Enter', ' ']) assert.equal(listboxKeyAction(key, true), 'select')
  for (const key of ['Escape', 'Tab']) assert.equal(listboxKeyAction(key, true), 'close')
  for (const key of ['ArrowDown', 'ArrowUp', 'Home', 'End']) assert.equal(listboxKeyAction(key, true), 'move')
  assert.equal(listboxKeyAction('b', true), 'typeahead')
  assert.equal(listboxKeyAction('b', false), null)
  assert.equal(listboxKeyAction('Shift', true), null)
  for (const key of ['Enter', ' ', 'ArrowDown', 'ArrowUp', 'b']) assert.equal(listboxKeyAction(key, false, true), null)
})

test('opening activates the current value, including numeric values, with an enabled fallback', () => {
  assert.equal(selectedOptionIndex('analogous', options), 2)
  assert.equal(selectedOptionIndex('locked', options), 0)
  assert.equal(selectedOptionIndex('missing', options), 0)
  assert.equal(selectedOptionIndex('0', [{ value: 0, label: 'Forever' }]), 0)
  assert.equal(selectedOptionIndex('', []), -1)
})

test('committing emits a value string only when an enabled selection changes', () => {
  assert.equal(listboxSelection(2, options, 'auto'), 'analogous')
  assert.equal(listboxSelection(0, options, 'auto'), null)
  assert.equal(listboxSelection(1, options, 'auto'), null)
  assert.equal(listboxSelection(-1, options, 'auto'), null)
  assert.equal(listboxSelection(0, [{ value: 0 }], 1), '0')
  assert.equal(listboxSelection(0, [{ value: 0 }], '0'), null)
})

test('arrows wrap and skip disabled options while marked options remain reachable', () => {
  assert.equal(listboxTarget('ArrowDown', 0, options), 2)
  assert.equal(listboxTarget('ArrowUp', 2, options), 0)
  assert.equal(listboxTarget('ArrowDown', 4, options), 0)
  assert.equal(listboxTarget('ArrowUp', 0, options), 4)
  assert.equal(listboxTarget('ArrowDown', -1, options), 0)
  assert.equal(listboxTarget('ArrowUp', -1, options), 4)
})

test('Home and End find enabled edges; empty and disabled lists have no target', () => {
  const rows = [{ disabled: true }, ...options, { disabled: true }]
  assert.equal(listboxTarget('Home', 4, rows), 1)
  assert.equal(listboxTarget('End', 1, rows), 5)
  for (const key of ['Home', 'End', 'ArrowDown', 'ArrowUp']) {
    assert.equal(listboxTarget(key, 0, []), -1)
    assert.equal(listboxTarget(key, 0, [{ disabled: true }]), -1)
  }
  assert.equal(listboxTarget('Tab', 2, options), -1)
})

test('type-ahead is case-insensitive, skips disabled rows and cycles repeated letters', () => {
  const first = typeaheadTarget('A', 0, options, undefined, 1000)
  assert.equal(first.index, 2)
  const second = typeaheadTarget('a', first.index, options, first, 1100)
  assert.equal(second.index, 0)
  assert.equal(typeaheadTarget('a', second.index, options, second, 1200).index, 2)
})

test('prefix typing refines the current match and resets after 500ms', () => {
  const first = typeaheadTarget('b', 0, options, undefined, 1000)
  assert.equal(first.index, 3)
  const prefix = typeaheadTarget('l', first.index, options, first, 1100)
  assert.equal(prefix.index, 3)
  assert.equal(typeaheadTarget('a', prefix.index, options, prefix, 1200).index, 4)
  const reset = typeaheadTarget('a', prefix.index, options, prefix, 1600)
  assert.equal(reset.text, 'a')
  assert.equal(reset.index, 0)
  assert.equal(typeaheadTarget('z', 2, options, undefined, 2000).index, 2)
  assert.equal(typeaheadTarget('a', -1, [], undefined, 2000).index, -1)
})

test('groups preserve option order, marks and values and inherit group disabling', () => {
  const rows = flattenOptions(['Auto', { group: 'Locked', disabled: true, options: [{ value: 0, label: 'Zero', mark: 'Pro' }] }, { group: 'Open', options: [options[2]] }])
  assert.deepEqual(rows.map(row => row.value), ['Auto', 0, 'analogous'])
  assert.equal(rows[1].disabled, true)
  assert.equal(rows[1].mark, 'Pro')
  assert.equal(listboxTarget('ArrowDown', 0, rows), 2)
})
