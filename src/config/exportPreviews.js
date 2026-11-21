// The page pictures of each export theme, row by row. The pages themselves (ids, labels, sizes) are src/config/exportPreviews.json,
// written by `node scripts/library/exportThemePreviews.mjs --pages`; this module reads it and says which file to show.
//
// A Free pair (isThemeExportPro false) has its pictures in public/export-themes/pages/<theme>/<row>/, at 1x (`<n>.webp`) and 2x
// (`<n>@2x.webp`). A Pro pair has only a watermarked 1x there: the clean 2x is server-only, and a Pro account fetches it from
// GET /api/ai?export=preview (api/_lib/exportPreview.js), which needs the bearer token. So `publicPreviewSrc` never returns a
// path to a clean Pro picture, whatever density is asked for.

import { isThemeExportPro, themeHasRow } from '../data/exportThemes.js'
import manifest from './exportPreviews.json' with { type: 'json' }

/** The routes' rows, in the order the dialog lists its files. */
export const PREVIEW_ROWS = Object.freeze(['slides', 'ui-kit', 'book'])

/** The pages of a theme's row, in order: [{ n, id, label, w, h }] with w and h the 1x display size. Empty for a theme or row it lacks. */
export function previewPages(theme, row) {
  if (typeof theme !== 'string' || typeof row !== 'string') return []
  if (!Object.hasOwn(manifest.themes, theme) || !Object.hasOwn(manifest.themes[theme], row)) return []
  return manifest.themes[theme][row]
}

/** True when the clean picture of this pair is behind the Pro check (a Pro pair), false when its pictures are all public. */
export const needsGatedPreview = (theme, row) => themeHasRow(theme, row) && isThemeExportPro(row, theme)

/**
 * The public file of page `n` of a pair at a density (1 or 2), or '' when there is none. A Free pair has both. A Pro pair has only the
 * watermarked 1x, so a 2x asked of it is '' (the caller fetches the clean one from the endpoint, or stays on the 1x).
 */
export function publicPreviewSrc(theme, row, n, dpr = 1) {
  if (!previewPages(theme, row).some((p) => p.n === n)) return ''
  const gated = needsGatedPreview(theme, row)
  if (dpr === 2 && gated) return ''
  return `/export-themes/pages/${theme}/${row}/${n}${dpr === 2 ? '@2x' : ''}.webp`
}

/** The endpoint path of the clean 2x of a page of a Pro pair (the request must carry the bearer token), or '' for a Free pair. */
export const gatedPreviewPath = (theme, row, n) => (
  needsGatedPreview(theme, row) && previewPages(theme, row).some((p) => p.n === n)
    ? `/api/ai?export=preview&theme=${encodeURIComponent(theme)}&row=${encodeURIComponent(row)}&n=${n}&dpr=2`
    : ''
)
