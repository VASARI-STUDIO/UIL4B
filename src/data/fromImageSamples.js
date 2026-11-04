// The sample photos in the From image dialog, for a visitor with no photo of
// their own. Files and licence notes: public/samples/from-image/CREDITS.md.
// `label` names what is in that photo, so the tile says what you will get.
const DIR = '/samples/from-image'

export const FROM_IMAGE_SAMPLES = [
  { id: 'market', label: 'Market stall', file: 'market.webp', thumb: 'market-thumb.webp', alt: 'A market stall of oranges, tomatoes, herbs and flowers' },
  { id: 'coast', label: 'Coast at dusk', file: 'coast.webp', thumb: 'coast-thumb.webp', alt: 'A rocky headland over a calm sea at dusk' },
  { id: 'interior', label: 'Blue door', file: 'interior.webp', thumb: 'interior-thumb.webp', alt: 'A sunlit cream hall with one blue door' },
  { id: 'leaf', label: 'Green leaf', file: 'leaf.webp', thumb: 'leaf-thumb.webp', alt: 'A close-up of a green leaf with water drops' },
].map((s) => ({
  ...s,
  src: `${DIR}/${s.file}`,
  thumbSrc: `${DIR}/${s.thumb}`,
  // Shown as one line under the photo once a sample is loaded.
  credit: 'Sample image made for UIL4B',
}))
