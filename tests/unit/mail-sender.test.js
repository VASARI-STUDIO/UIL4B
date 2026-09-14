// THE SENDER IS ONE FACT, AND IT WAS WRITTEN DOWN TWICE.
//
// api/support.js and api/ai.js each hard-coded `UIL4B <onboarding@resend.dev>`
// — Resend's sandbox, which is not uil4b.com, cannot be branded, and is only
// delivered to the account owner's own address. Two copies meant no way to
// change the sender without a deploy, and every chance of changing one.
//
// The founder created admin@uil4b.com on 2026-09-14. A mailbox is NOT a
// verified sending domain: until SPF, DKIM and a return path exist on uil4b.com
// (OWNER-ACTIONS §4.10) Resend refuses to send as that address and the message
// is lost. So the default stays the sandbox and MAIL_FROM switches it — one
// dashboard field, no deploy — while `reply_to` points at the real mailbox
// today, because a reply-to header needs no verified domain.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { mailFrom, sendingDomainConfigured, REPLY_TO } from '../../api/_lib/mail.js'

test('with MAIL_FROM unset the sender is the sandbox, so nothing breaks today', () => {
  assert.equal(mailFrom({}), 'UIL4B <onboarding@resend.dev>')
  assert.equal(sendingDomainConfigured({}), false)
})

test('MAIL_FROM switches the sender without a deploy', () => {
  const env = { MAIL_FROM: 'UIL4B <admin@uil4b.com>' }
  assert.equal(mailFrom(env), 'UIL4B <admin@uil4b.com>')
  assert.equal(sendingDomainConfigured(env), true)
})

test('a value pasted from a dashboard survives quotes and a trailing newline', () => {
  // The reason every env var in api/_lib goes through cleanKey(): a newline
  // inside a From header is a malformed request, not a bad address, and it
  // fails in a way that reads as "the mail service is down".
  assert.equal(mailFrom({ MAIL_FROM: '"UIL4B <admin@uil4b.com>"\n' }), 'UIL4B <admin@uil4b.com>')
})

test('a half-configured sender is not mistaken for a verified one', () => {
  // POSITIVE CONTROL for the predicate. It must key on the ADDRESS, not on the
  // variable merely being set — otherwise pointing MAIL_FROM at another sandbox
  // would report the domain work as done and hide §4.10.
  assert.equal(sendingDomainConfigured({ MAIL_FROM: 'UIL4B <hello@example.com>' }), false)
  assert.equal(sendingDomainConfigured({ MAIL_FROM: 'UIL4B <onboarding@resend.dev>' }), false)
})

test('both mail-sending routes use the helper and neither hard-codes a sender', () => {
  // SOURCE ASSERTION, because the helper being correct is worth nothing if a
  // route stops calling it. This is the duplication the module exists to end.
  for (const file of ['api/support.js', 'api/ai.js']) {
    const src = fs.readFileSync(path.join(process.cwd(), file), 'utf8')
    assert.match(src, /from: mailFrom\(\)/, `${file} no longer sends from mailFrom()`)
    assert.match(src, /reply_to: REPLY_TO/, `${file} dropped the reply-to`)
    assert.doesNotMatch(src, /from: '[^']*@/, `${file} has a hard-coded From address again`)
  }
})

test('the reply address is the mailbox that exists', () => {
  assert.equal(REPLY_TO, 'admin@uil4b.com')
})
