// The browser half of the UI kit export: gathers the template, the publisher
// mark and every font file, then hands them to the pure renderer in
// utils/uiKitExport.js. Loaded on demand from the export panel, so none of this
// (the template is about 75 KB) reaches anyone who never exports a kit.

import template from '../templates/uiKit.html?raw'
import { renderUiKit, kitFontRequests } from './uiKitExport.js'
import { loadKitFonts, loadPublisherFonts } from './kitFonts.js'
import { fetchFontCatalog } from './googleFonts.js'
import { readLogo } from './brandLogo.js'

async function catalogWithin(ms, signal) {
  try {
    return await Promise.race([
      fetchFontCatalog({ signal }).then((c) => c.fonts || []),
      new Promise((resolve) => setTimeout(() => resolve([]), ms)),
    ])
  } catch { return [] }
}

/**
 * Build the kit. `tier` comes from the account's verified entitlement; a Pro
 * kit's name, description and logo are read from the design itself.
 * `onStage('fonts' | 'building')` reports progress for the panel's label.
 * Resolves { blob, filename, missing } — `missing` lists families that could
 * not be embedded, which the document itself also states.
 */
export async function buildUiKit(design, { tier, onStage = () => {}, signal } = {}) {
  onStage('fonts')
  const [catalog, publisher, mark] = await Promise.all([
    catalogWithin(2500, signal),
    loadPublisherFonts({ signal }),
    fetch('/favicon.svg', { signal }).then((r) => (r.ok ? r.text() : '')).catch(() => ''),
  ])
  const fonts = await loadKitFonts(kitFontRequests(design), { signal, catalog })
  onStage('building')
  const { html, filename, missing } = renderUiKit(design, {
    tier,
    template,
    markSvg: mark,
    fonts,
    ...publisher,
    logo: tier === 'pro' ? readLogo(design) : null,
  })
  return { blob: new Blob([html], { type: 'text/html;charset=utf-8' }), filename, missing }
}
