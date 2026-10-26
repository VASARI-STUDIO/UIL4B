// What happens to an image someone uploads to an AI tool, said before they
// upload it.
//
// Every dropzone that sends an image to Gemini (api/ai.js: the alt-text task
// and the photo scan) says so visibly, next to the dropzone, before anything is
// chosen — not in a tooltip and not after.
//
// The full statement of what the providers may do with a submission is the
// Terms, section 4 (src/pages/Terms.jsx, `terms.s4AiText`). The Alt Text page
// states where the image goes and links there (AI_IMAGE_SENT + AI_TERMS_PATH);
// the prompt generator's reference image still carries the longer
// AI_IMAGE_CONSENT sentence. ONE copy of each in one place so the tools cannot
// drift apart; tests/unit/ai-image-consent.test.js checks they name Google
// Gemini and the Terms section, not the exact words.
export const AI_IMAGE_SENT = 'Images you upload here are sent to Google Gemini to generate the text.'
export const AI_TERMS_PATH = '/terms#terms-s4'
export const AI_IMAGE_CONSENT =
  'Images you upload here are sent to Google Gemini to generate the text, and Google may use them to improve its products.'
