// Every dropzone that sends an image to Gemini says so before upload
//. See src/config/aiImageConsent.js.
import test from 'node:test'
import assert from 'node:assert/strict'
import { AI_IMAGE_CONSENT } from '../../src/config/aiImageConsent.js'
import { read, stripComments } from './helpers/source-text.js'

test('the notice names where the image goes and what Google may do with it', () => {
  assert.match(AI_IMAGE_CONSENT, /Google Gemini/)
  assert.match(AI_IMAGE_CONSENT, /Google may use them to improve its products/)
})

test('both image tools render it, and before their dropzone', () => {
  for (const [file, dropzone] of [
    ['src/pages/AltTextGenerator.jsx', 'className={`alt-dropzone'],
    ['src/pages/AiPromptGenerator.jsx', 'className="aipg-ref-drop"'],
  ]) {
    const src = stripComments(read(file))
    const notice = src.indexOf('{AI_IMAGE_CONSENT}')
    assert.ok(notice > -1, `${file} does not render the consent notice`)
    assert.ok(notice < src.indexOf(dropzone), `${file} shows the notice after the dropzone`)
  }
})

test('api/ai.js still sends images only to Gemini, which is what the notice says', () => {
  const src = read('api/ai.js')
  const inline = src.match(/inline_data:/g) || []
  assert.equal(inline.length, 2, 'a new image path exists — does its tool show the notice?')
  assert.match(src, /generativelanguage\.googleapis\.com/)
})
