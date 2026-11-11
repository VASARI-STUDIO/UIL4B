// The profile website: only http(s) is kept, and only http(s) can reach an href.
// MUTATION: drop the protocol check in parseHttp -> the `javascript:` and `data:` cases go red.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { stripJs } from '../helpers/strip-comments.js'
import { checkWebsite, safeHttpUrl } from '../../src/utils/websiteUrl.js'

test('http and https addresses are kept as typed', () => {
  assert.deepEqual(checkWebsite('https://yoursite.example'), { ok: true, value: 'https://yoursite.example' })
  assert.deepEqual(checkWebsite('  http://yoursite.example/work?x=1#top  '), { ok: true, value: 'http://yoursite.example/work?x=1#top' })
  assert.deepEqual(checkWebsite('HTTPS://YourSite.example'), { ok: true, value: 'HTTPS://YourSite.example' })
})

test('an empty value is allowed and clears the field', () => {
  assert.deepEqual(checkWebsite(''), { ok: true, value: '' })
  assert.deepEqual(checkWebsite('   '), { ok: true, value: '' })
  assert.deepEqual(checkWebsite(undefined), { ok: true, value: '' })
})

test('an address with no scheme gets https://', () => {
  assert.deepEqual(checkWebsite('yoursite.example'), { ok: true, value: 'https://yoursite.example' })
  assert.deepEqual(checkWebsite('yoursite.example:8080/x'), { ok: true, value: 'https://yoursite.example:8080/x' }, 'a port is not a scheme')
  assert.deepEqual(checkWebsite('//yoursite.example'), { ok: true, value: 'https://yoursite.example' })
})

test('script-running and other schemes are refused', () => {
  for (const bad of [
    'javascript:alert(1)',
    'JavaScript:alert(1)',
    ' javascript:alert(1)',
    'jav\tascript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'vbscript:msgbox(1)',
    'file:///etc/passwd',
    'ftp://yoursite.example',
    'mailto:me@yoursite.example',
    'blob:https://yoursite.example/abc',
  ]) {
    const r = checkWebsite(bad)
    assert.equal(r.ok, false, `${JSON.stringify(bad)} should be refused`)
    assert.equal(r.error, 'Enter a web address, like https://yoursite.com.')
  }
})

test('addresses with no host, with spaces or with embedded credentials are refused', () => {
  for (const bad of ['http://', 'https:///', 'not a url', 'https://user:pass@yoursite.example', 'https://a b.example']) {
    assert.equal(checkWebsite(bad).ok, false, `${JSON.stringify(bad)} should be refused`)
  }
})

test('safeHttpUrl lets only http(s) through to an href', () => {
  assert.equal(safeHttpUrl('https://yoursite.example'), 'https://yoursite.example')
  assert.equal(safeHttpUrl(' http://yoursite.example '), 'http://yoursite.example')
  assert.equal(safeHttpUrl('javascript:alert(1)'), '')
  assert.equal(safeHttpUrl('data:text/html,x'), '')
  assert.equal(safeHttpUrl('yoursite.example'), '', 'a stored value with no scheme is not a safe href as it stands')
  assert.equal(safeHttpUrl(''), '')
  assert.equal(safeHttpUrl(null), '')
})

test('Settings saves the website only through the check', () => {
  const src = stripJs(fs.readFileSync(path.join(process.cwd(), 'src/pages/Settings.jsx'), 'utf8'))
  assert.match(src, /checkWebsite\(raw\)/)
  assert.match(src, /saveProfile\(\{ website: checked\.value \}, 'website'\)/)
  assert.doesNotMatch(src, /(updateProfile|saveProfile)\(\{ website: (v|raw) \}/, 'the raw value went back to the profile')
})
