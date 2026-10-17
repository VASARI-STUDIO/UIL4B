import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const vercel = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'vercel.json'), 'utf8'))

test('serverless functions run in the same region as the database', () => {
  assert.deepEqual(vercel.regions, ['syd1'])
})
