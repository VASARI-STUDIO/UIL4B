// The community prompts whose output previews are Pro-only: the same ids whose
// rows in src/data/communityPrompts.js carry no text. Their poster, animation
// and built page are fetched from GET /api/ai?proAsset= by a Pro account
// (src/hooks/useProAsset.js) rather than read from public/.
//
// A copy, so a component can ask "is this preview locked?" without importing
// the prompt rows; tests/unit/pro-preview-ids.test.js keeps it equal to them.
export const PRO_PREVIEW_IDS = Object.freeze([
  'c-4', 'c-5', 'c-6', 'c-7', 'c-8', 'c-10', 'c-11', 'c-12', 'c-19', 'c-20',
])

export const isProPreview = (id) => PRO_PREVIEW_IDS.includes(id)
