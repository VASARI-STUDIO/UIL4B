// Every dropzone that sends an image to Gemini says so before upload. See
// src/config/aiImageConsent.js. What the provider may do with it is the Terms
// (tests/unit/ai-provider-terms.test.js).
import test from 'node:test'
import assert from 'node:assert/strict'
import { AI_IMAGE_SENT, AI_TERMS_PATH, AI_IMAGE_CONSENT } from '../../src/config/aiImageConsent.js'
import { read, stripComments } from './helpers/source-text.js'

test('the notices name where the image goes', () => {
  assert.match(AI_IMAGE_SENT, /Google Gemini/)
  assert.match(AI_IMAGE_CONSENT, /Google Gemini/)
  assert.match(AI_IMAGE_CONSENT, /Google may use them to improve its products/)
})

test('the Alt Text notice links to the Terms section that holds the statement', () => {
  assert.equal(AI_TERMS_PATH, '/terms#terms-s4')
  const terms = stripComments(read('src/pages/Terms.jsx'))
  assert.ok(terms.includes(`id: '${AI_TERMS_PATH.split('#')[1]}'`), 'the link points at a Terms section id that does not exist')
  assert.match(terms, /more: 'terms\.s4AiText'/, 'the linked section no longer carries the AI statement')
})

test('both image tools render their notice, and before their dropzone', () => {
  for (const [file, dropzone, notice] of [
    ['src/pages/AltTextGenerator.jsx', 'className={`alt-dropzone', '{AI_IMAGE_SENT}'],
    ['src/pages/AiPromptGenerator.jsx', 'className="aipg-ref-drop"', '{AI_IMAGE_CONSENT}'],
  ]) {
    const src = stripComments(read(file))
    const at = src.indexOf(notice)
    assert.ok(at > -1, `${file} does not render its notice`)
    assert.ok(at < src.indexOf(dropzone), `${file} shows the notice after the dropzone`)
  }
  const alt = stripComments(read('src/pages/AltTextGenerator.jsx'))
  assert.match(alt, /<Link to=\{AI_TERMS_PATH\}>/, 'the Alt Text notice does not link to the Terms')
})

test('api/ai.js still sends images only to Gemini, which is what the notices say', () => {
  const src = read('api/ai.js')
  const inline = src.match(/inline_data:/g) || []
  assert.equal(inline.length, 2, 'a new image path exists — does its tool show the notice?')
  assert.match(src, /generativelanguage\.googleapis\.com/)
})
