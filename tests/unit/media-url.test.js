// isTrustedMediaUrl decides whether the admin queue may load a prompt's media.
// The stored link is a free string chosen by the submitter, so only UIL4B's own
// kinds of link (an inline data URL, or a Firebase Storage download URL over
// https) are loaded; everything else is shown as text.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { isTrustedMediaUrl } from '../../src/utils/mediaUrl.js'

test('inline image and video data URLs and Firebase Storage download URLs are accepted', () => {
  for (const url of [
    'data:image/webp;base64,UklGRg==',
    'data:video/mp4;base64,AAAA',
    'DATA:IMAGE/PNG;base64,AAAA',
    'https://firebasestorage.googleapis.com/v0/b/uil4b-357c5.firebasestorage.app/o/community%2Fa.webp?alt=media&token=abc',
    'https://firebasestorage.googleapis.com/v0/b/uil4b-357c5.appspot.com/o/community%2Fb.mp4?alt=media',
  ]) {
    assert.equal(isTrustedMediaUrl(url), true, url)
  }
})

test('plain http, other hosts, script URLs and protocol-relative links are refused', () => {
  const backslash = String.fromCharCode(92)
  for (const url of [
    'http://firebasestorage.googleapis.com/v0/b/x/o/a.webp',
    'https://firebasestorage.googleapis.com/v0/b/someone-else.appspot.com/o/a.webp',
    'https://firebasestorage.googleapis.com/v0/b/uil4b-357c5.firebasestorage.app/x/a.webp',
    'https://tracker.example/pixel.gif',
    'https://firebasestorage.googleapis.com.evil.example/v0/b/x/o/a.webp',
    'https://evil.example/firebasestorage.googleapis.com/v0/b/x/o/a.webp',
    'https://firebasestorage.googleapis.com@evil.example/v0/b/x/o/a.webp',
    'https://user:pw@firebasestorage.googleapis.com/v0/b/x/o/a.webp',
    `https:${backslash}${backslash}evil.example${backslash}@firebasestorage.googleapis.com/v0/b/x/o/a.webp`,
    'https://firebasestorage.googleapis.com/other/path.webp',
    'javascript:alert(1)',
    'data:text/html;base64,PHNjcmlwdD4=',
    'data:application/javascript,alert(1)',
    '//firebasestorage.googleapis.com/v0/b/x/o/a.webp',
    '//evil.example/pixel.gif',
    '/relative/path.webp',
    'ftp://firebasestorage.googleapis.com/v0/b/x/o/a.webp',
    'blob:https://uil4b.com/1234',
    '',
    '   ',
    undefined,
    null,
    42,
    {},
  ]) {
    assert.equal(isTrustedMediaUrl(url), false, JSON.stringify(url))
  }
})

test('the admin queue checks the link before it renders an image or a video', () => {
  const src = fs.readFileSync(path.join(process.cwd(), 'src/pages/Admin.jsx'), 'utf8')
  const check = src.indexOf('isTrustedMediaUrl(prompt.mediaUrl)')
  const img = src.indexOf('<img src={prompt.mediaUrl}')
  const video = src.indexOf('<video src={prompt.mediaUrl}')
  assert.ok(check > 0, 'the queue no longer checks prompt.mediaUrl')
  assert.ok(check < img && check < video, 'the media element is rendered ahead of the check')
  assert.match(src, /Media link not shown/)
})
