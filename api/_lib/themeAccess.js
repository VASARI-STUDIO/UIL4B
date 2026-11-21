// The one function that decides whether a plan may have an export, and a test can walk the whole table through it. The live page
// preview (api/_lib/exportPreview.js) calls it. The themed file route (api/_lib/exportThemeRoute.js, serveThemeExport) does not: it
// checks `plan.id !== 'pro' && isThemeExportPro(row, theme)` itself, against the same table in src/data/exportThemes.js, so the two
// agree about what is Pro because they read one table. A document export (api/_lib/exportDocument.js) serves only formats flagged `pro`
// in src/config/exportFormats.js and reads the plan itself.
//
//   assertThemeAccess(plan, { theme, row, format }) -> { ok: true } | { ok: false, status, code }
//
// A request that names a theme or a row is a themed export. `format` is then the file format of its row ('pdf', 'html', 'zip') and the
// verdict comes from src/data/exportThemes.js (isThemeExportPro). A request that names neither is a document, and `format` is an id in
// src/config/exportFormats.js, whose `pro` flag decides it.
//
// FAIL CLOSED. A theme, row or format outside the tables is 400 (never ok), a missing or odd plan counts as Free, and Pro is only
// ever `plan.id === 'pro'` as planForUser answered it from the account. Nothing the request carries can say it is Pro: the caller
// passes the plan it read from the user document, and this reads nothing else.
//
//   unknown_theme | unknown_row | unknown_format   400
//   pro_required                                   403

import { EXPORT_THEMES, isThemeExportPro, isThemeRowFormat, themeHasRow } from '../../src/data/exportThemes.js'
import { EXPORT_FORMATS } from '../../src/config/exportFormats.js'

const deny = (status, code) => ({ ok: false, status, code })

/**
 * @param plan  the plan planForUser returned for the verified account (only `id === 'pro'` is Pro)
 * @param ask   { theme, row, format }, as the request named them
 */
export function assertThemeAccess(plan, { theme, row, format } = {}) {
  const pro = plan !== null && typeof plan === 'object' && plan.id === 'pro'

  if (theme !== undefined || row !== undefined) {
    if (typeof theme !== 'string' || !EXPORT_THEMES.some((t) => t.id === theme)) return deny(400, 'unknown_theme')
    if (typeof row !== 'string' || !themeHasRow(theme, row)) return deny(400, 'unknown_row')
    if (!isThemeRowFormat(row, format)) return deny(400, 'unknown_format')
    if (isThemeExportPro(row, theme) && !pro) return deny(403, 'pro_required')
    return { ok: true }
  }

  const known = typeof format === 'string' ? EXPORT_FORMATS.find((f) => f.id === format) : undefined
  if (!known || !known.live) return deny(400, 'unknown_format')
  if (known.pro && !pro) return deny(403, 'pro_required')
  return { ok: true }
}
