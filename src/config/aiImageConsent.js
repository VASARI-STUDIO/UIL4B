// What happens to an image someone uploads to an AI tool, said before they
// upload it.
//
// Gemini stays on the
// free tier, and on that tier Google may use what it is sent to improve its
// products. So every dropzone that sends an image to Gemini (api/ai.js: the
// alt-text task and the photo scan) states it plainly, visibly, next to the
// dropzone, before anything is chosen — not in a tooltip and not after.
//
// ONE sentence in one place so the tools cannot drift apart. It is a
// placeholder for final approved wording; tests/unit/ai-image-consent.test.js
// checks it names Google Gemini and the use, not the exact words.
export const AI_IMAGE_CONSENT =
  'Images you upload here are sent to Google Gemini to generate the text, and Google may use them to improve its products.'

// Shown instead of the dropzone to visitors in the UK, Switzerland or the
// European Economic Area, where Google's terms don't allow the free tier to
// serve them (api/_lib/geoBlock.js).
export const AI_REGION_TITLE = 'Not available in your region'
export const AI_REGION_ALT_BODY = "The alt text generator runs on Google Gemini, and Google's terms don't let us offer it in the UK, Switzerland or the European Economic Area. The guide below still applies if you write alt text by hand."
export const AI_REGION_PANEL = 'Every other UIL4B tool works as normal where you are.'
export const AI_REGION_SCAN_NOTE = "Photo scanning runs on Google Gemini, and Google's terms don't let us offer it in the UK, Switzerland or the European Economic Area. You can still build and enhance prompts below."
