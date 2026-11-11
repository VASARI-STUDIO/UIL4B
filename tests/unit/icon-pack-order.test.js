import test from 'node:test'
import assert from 'node:assert/strict'
import { concatenatePackLists, orderIconsByPack } from '../../src/utils/iconPackOrder.js'

test('uneven pack lists stay contiguous in their defined order', () => {
  const lists = [['a:ad', 'a:ae', 'a:af'], ['b:ad'], ['c:ad', 'c:ae']]
  assert.deepEqual(concatenatePackLists(lists), ['a:ad', 'a:ae', 'a:af', 'b:ad', 'c:ad', 'c:ae'])
  assert.deepEqual(lists[0], ['a:ad', 'a:ae', 'a:af'])
})

test('search groups packs while retaining relevance within each pack', () => {
  const icons = ['c:us', 'a:us', 'b:gb', 'a:gb', 'c:gb'].map(id => ({ id, pack: id.split(':')[0] }))
  const original = [...icons]
  assert.deepEqual(orderIconsByPack(icons, ['a', 'b', 'c']).map(icon => icon.id),
    ['a:us', 'a:gb', 'b:gb', 'c:us', 'c:gb'])
  assert.deepEqual(icons, original)
})

test('a per-pack allowance retains every pack when the first pack exceeds the total allowance', () => {
  const lists = [Array.from({ length: 100 }, (_, i) => `a:${i}`), ['b:ad'], ['c:ad', 'c:ae']]
  const totalCap = 6
  const icons = concatenatePackLists(lists, Math.floor(totalCap / lists.length))
  assert.deepEqual(icons, ['a:0', 'a:1', 'b:ad', 'c:ad', 'c:ae'])
  assert.ok(icons.length <= totalCap)
})
