// The images the Palette Builder and Contrast Checker previews show.
//
// Every file under public/previews/<folder>/ is one entry here, with its credit,
// and the same entry is written out in public/previews/CREDITS.md. A test
// (tests/unit/preview-assets.test.js) fails on a file with no entry and on an
// entry with no licence, so an image cannot arrive uncredited.
//
// A recolourable image is a neutral render with a mask beside it: the mask is a
// greyscale-and-alpha PNG that is opaque where the palette's colour goes, and
// the example tints it at render time (src/components/palette/Recolour.jsx), so
// one file serves every palette. A fixed image has no mask and is never tinted.
//
// Plain data, no React.

export const PREVIEW_ASSETS = {
  'card-front': {
    folder: 'card',
    // The base name of the sized files: <file>-<width>.avif and .webp.
    file: 'card-front',
    widths: [640, 1080],
    // The pixel size of the largest file; the smaller ones keep its proportions.
    width: 1428,
    height: 827,
    alt: 'A brushed-metal payment card with a chip and a contactless symbol',
    // The card's face is the part the palette colours, grooves of the symbol included, so they stay a dark engraving in any colour; the chip is left out of the mask and stays gold. The corners are transparent.
    recolourable: true,
    mask: 'card-front-mask.png',
    // 16px wide, blurred, as a data URI: the first frame while the file loads.
    placeholder: 'data:image/webp;base64,UklGRmYAAABXRUJQVlA4WAoAAAAQAAAADwAACAAAQUxQSBgAAAABUNS2EcMfctsbzw0gIiZAWWROxzvJKAJWUDggKAAAANABAJ0BKhAACQADgFolpAACnbfvKIeAAP72Sp4DBpOTp+RNMeo8gAA=',
    credit: {
      source: 'Generated',
      author: 'Generated with OpenAI image generation via Codex CLI',
      licence: 'Generated image, made for UIL4B; no person depicted',
      url: '',
      changes: 'Cropped to the card with its corners made transparent, brightened so the face reads as a neutral light grey (the chip keeps its own colour and the contactless grooves are deepened), resized to 640 and 1080 pixels wide, and a mask of the face made from it.',
    },
  },
  'ferry-morning': {
    folder: 'ferry',
    file: 'ferry-morning',
    widths: [640, 1080],
    width: 1672,
    height: 941,
    alt: 'A cream and green harbour ferry pulling away from a sandstone wharf on calm water in the early morning',
    recolourable: false,
    placeholder: 'data:image/webp;base64,UklGRkIAAABXRUJQVlA4IDYAAADQAQCdASoQAAkAA4BaJZQAAxZfLMk4AAD+9kiF/6ItpYzyUFWCjScnSLfCLxd/2qDIO3xnAAA=',
    credit: {
      source: 'Generated',
      author: 'Generated with OpenAI image generation via Codex CLI',
      licence: 'Generated image, made for UIL4B; no person depicted',
      url: '',
      changes: 'Two small shapes on the upper deck and in the wheelhouse glass painted out, saturation lowered by a tenth, highlights held under 97 percent, and resized to 640 and 1080 pixels wide.',
    },
  },
  'ferry-morning-portrait': {
    folder: 'ferry',
    file: 'ferry-morning-portrait',
    widths: [480, 752],
    width: 752,
    height: 940,
    alt: 'A cream and green harbour ferry pulling away from a sandstone wharf on calm water in the early morning, cropped upright',
    recolourable: false,
    placeholder: 'data:image/webp;base64,UklGRmAAAABXRUJQVlA4IFQAAADQAwCdASoQABQAPu1kqk4ppaQiMAgBMB2JZwDE2CHfrXCHIn1QDwwA/uqK5kkFXupXhgQCHqgemjaCiIKJb4yrDND/tslGPwPfrkCHkQ4Ded87gAA=',
    credit: {
      source: 'Generated',
      author: 'Generated with OpenAI image generation via Codex CLI',
      licence: 'Generated image, made for UIL4B; no person depicted',
      url: '',
      changes: 'The upright 4 by 5 crop of the same picture, with the same retouching and grade, resized to 480 and 752 pixels wide.',
    },
  },
}

export const EXTENSIONS = ['avif', 'webp']

/** The public URL of one sized file of an asset. */
export const assetUrl = (asset, width, ext) => `/previews/${asset.folder}/${asset.file}-${width}.${ext}`

/** The public URL of an asset's mask. */
export const maskUrl = (asset) => `/previews/${asset.folder}/${asset.mask}`

/** A srcset string for one format: "<url> 640w, <url> 1080w". */
export const srcSet = (asset, ext) => asset.widths.map((w) => `${assetUrl(asset, w, ext)} ${w}w`).join(', ')

/** The path, relative to public/previews/, of every file an asset owns. */
export function assetFiles(asset) {
  const files = []
  for (const w of asset.widths) for (const ext of EXTENSIONS) files.push(`${asset.folder}/${asset.file}-${w}.${ext}`)
  if (asset.mask) files.push(`${asset.folder}/${asset.mask}`)
  return files
}
