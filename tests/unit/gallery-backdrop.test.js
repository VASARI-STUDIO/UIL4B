import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import {
  BACKDROP_BASE, backdropFor, backdropKind, backdropUrls, nameSum,
} from '../../src/utils/galleryBackdrop.js'

const publicFile = (url) => fileURLToPath(new URL(`../../public${url}`, import.meta.url))

test('a Google category maps to a kind, and anything unknown reads as sans', () => {
  assert.equal(backdropKind('sans-serif'), 'sans')
  assert.equal(backdropKind('serif'), 'serif')
  assert.equal(backdropKind('display'), 'display')
  assert.equal(backdropKind('handwriting'), 'script')
  assert.equal(backdropKind('monospace'), 'mono')
  assert.equal(backdropKind('something-new'), 'sans')
  assert.equal(backdropKind(undefined), 'sans')
})

test('the strip is picked by the sum of the name\'s character codes', () => {
  assert.equal(nameSum('Inter'), 73 + 110 + 116 + 101 + 114)
  // Inter: 514 mod 4 is 2, so the third dark sans strip; mod 2 is 0, the first light one.
  assert.equal(backdropFor('Inter', 'sans-serif', 'dark'), `${BACKDROP_BASE}dark-script-4.webp`)
  assert.equal(backdropFor('Inter', 'sans-serif', 'light'), `${BACKDROP_BASE}light-sans-1.webp`)
})

test('the same family always gets the same strip, and a light ground uses the light set', () => {
  assert.equal(backdropFor('Lora', 'serif', 'dark'), backdropFor('Lora', 'serif', 'dark'))
  assert.match(backdropFor('Lora', 'serif', 'light'), /\/light-/)
  assert.match(backdropFor('Lora', 'serif', 'dark'), /\/dark-/)
  assert.match(backdropFor('Lora', 'serif', 'anything-else'), /\/dark-/)
})

test('the sets hold 20 dark and 10 light strips, and every one is hosted under 200KB', () => {
  const dark = backdropUrls('dark')
  const light = backdropUrls('light')
  assert.equal(dark.length, 20)
  assert.equal(light.length, 10)
  assert.equal(new Set(dark).size, 20)
  for (const url of [...dark, ...light]) {
    const file = publicFile(url)
    assert.ok(existsSync(file), `${url} is missing from public/`)
    assert.ok(statSync(file).size < 200 * 1000, `${url} is over 200KB`)
  }
})

test('one kind\'s list is four strips on dark and two on light', () => {
  assert.equal(backdropUrls('dark', 'serif').length, 4)
  assert.equal(backdropUrls('light', 'serif').length, 2)
})
