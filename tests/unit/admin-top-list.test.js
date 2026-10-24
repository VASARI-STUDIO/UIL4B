import assert from 'node:assert/strict'
import fs from 'node:fs'
import { stripCss, stripJs } from '../helpers/strip-comments.js'

const { test } = process.env.VITEST
  ? await import('vitest')
  : await import('node:test')

const css = stripCss([
  fs.readFileSync('src/styles/global.css', 'utf8'),
  fs.readFileSync('src/styles/deferred/admin.css', 'utf8'),
].join('\n'))

function declarationsFor(...selectors) {
  const declarations = {}
  for (const match of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (!selectors.includes(match[1].trim())) continue
    for (const declaration of match[2].split(';')) {
      const [property, value] = declaration.split(':').map(part => part.trim())
      if (property && value) declarations[property] = value
    }
  }
  return declarations
}

test('TopList labels wrap instead of truncating long stage names', () => {
  const label = declarationsFor('.adm-bar-label', '.adm-top-list .adm-bar-label')
  assert.notEqual(label['text-overflow'], 'ellipsis')
  assert.notEqual(label['white-space'], 'nowrap')
  assert.equal(label['white-space'], 'normal')
  assert.equal(label['overflow-wrap'], 'anywhere')
  assert.equal(label.overflow, 'visible')
  assert.equal(label['min-width'], '0')
})

test('TopList counts stay right-aligned on one line', () => {
  const count = declarationsFor('.adm-bar-value', '.adm-top-list .adm-bar-value')
  assert.equal(count['text-align'], 'right')
  assert.equal(count['white-space'], 'nowrap')
  assert.equal(count['flex-shrink'], '0')
  assert.equal(count['min-width'], 'max-content')
})

test('TopList applies its wrapping styles to the shared list container', () => {
  const admin = stripJs(fs.readFileSync('src/pages/Admin.jsx', 'utf8'))
  const topList = admin.slice(admin.indexOf('function TopList('), admin.indexOf('function ToolUsageCard('))
  assert.match(topList, /adm-bar adm-top-list/)
  assert.match(admin, /<TopList title="Funnel"[^>]*\swide\s/)
})
