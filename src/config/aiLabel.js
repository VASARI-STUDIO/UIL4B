// The one label put on text an AI model wrote, wherever this app shows it
// (alt text, generated prompts, the Brand Starter result). ONE string in one
// place, so every tool says the same thing and a test can pin it.
//
// It is on screen only. Copied alt text, copied prompts and the CSV are the
// user's to use as written: a prefix on those would end up inside an `alt`
// attribute or an image prompt, so the label stays with the result on the
// page and out of the clipboard.
export const AI_GENERATED_LABEL = 'AI-generated'
