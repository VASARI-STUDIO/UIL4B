// The admin's "Reply by email" link. The address came from a public form, so a
// value a mail app would read as extra recipients or headers must give no link.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { replyMailto } from '../../src/utils/replyMailto.js'

test('a plain address gets a reply link with the subject', () => {
  assert.equal(replyMailto({ email: 'sam@example.com', subject: 'Export is blank' }),
    'mailto:sam@example.com?subject=Re%3A%20Export%20is%20blank')
  assert.equal(replyMailto({ email: ' sam.o+ui@mail.example.co ', type: 'help' }),
    'mailto:sam.o+ui@mail.example.co?subject=Re%3A%20your%20help%20request')
  assert.equal(replyMailto({ email: 'sam@example.com' }), 'mailto:sam@example.com?subject=Re%3A%20your%20feedback')
})

test('a subject cannot add header lines', () => {
  const href = replyMailto({ email: 'sam@example.com', subject: 'Hi\r\nBcc: x@evil.example' })
  assert.ok(!/[\r\n]/.test(decodeURIComponent(href.split('subject=')[1])), href)
  assert.ok(!href.includes('&'), href)
})

test('anything that is not one plain address gives no link', () => {
  for (const email of [
    '', '   ', null, undefined, 42, 'sam', 'sam@', '@example.com', 'sam@example',
    'sam@example.com,other@example.com', 'sam@example.com other@example.com',
    'Sam <sam@example.com>', 'sam@example.com?cc=x@evil.example', 'sam@example.com&bcc=x@evil.example',
    'sam@example.com\nbcc:x@evil.example', 'sam@-example.com', `${'a'.repeat(250)}@example.com`,
  ]) {
    assert.equal(replyMailto({ email }), null, `gave a link for ${JSON.stringify(email)}`)
  }
})

test('the link is drawn only where the address itself is shown', () => {
  const src = readFileSync('src/pages/Admin.jsx', 'utf8')
  const shown = src.indexOf('From: <strong>{item.email}</strong>')
  const withheld = src.indexOf('address withheld from moderators')
  const link = src.indexOf('Reply by email')
  assert.ok(shown > 0 && withheld > 0 && link > 0, 'the admin sender row moved; this check is reading nothing')
  assert.ok(link > shown && link < withheld, 'Reply by email is outside the branch that may show the address')
})
