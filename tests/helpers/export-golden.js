// Renders every sample project through the three document generators exactly as
// the product calls them with no template chosen, so the golden test and the
// script that captured the fixture read one list and cannot drift apart.
import fs from 'node:fs'
import path from 'node:path'
import { buildDesignSystemBook } from '../../src/utils/designSystemBook.js'
import { buildBrandGuidelines } from '../../src/utils/brandGuidelines.js'
import { renderUiKit } from '../../src/utils/uiKitExport.js'
import { readLogo } from '../../src/utils/brandLogo.js'
import { SAMPLES, FIXED_DATE } from './export-samples.js'

export const KIT_TEMPLATE_PATH = 'src/templates/kit/studio.html'
// Line endings are normalised to LF: git stores LF, but a Windows checkout with
// core.autocrlf turns the file into CRLF on disk, which would change every kit's
// sha256 and make the fixture pass on one platform and fail on another.
export const readKitTemplate = (file = KIT_TEMPLATE_PATH) => fs.readFileSync(path.resolve(file), 'utf8').replace(/\r\n?/g, '\n')

// { 'book/northbeam': '<!doctype html>...', 'kit-pro/halcyon': ... }
export function renderAll({ kitTemplate = readKitTemplate(), options = {} } = {}) {
  const out = {}
  for (const [id, sample] of Object.entries(SAMPLES)) {
    out[`book/${id}`] = buildDesignSystemBook(sample.design, { projectName: sample.name, date: FIXED_DATE, ...options.book })
    out[`guidelines/${id}`] = buildBrandGuidelines(sample.design, { projectName: sample.name, date: FIXED_DATE, ...options.guidelines })
    for (const tier of ['free', 'pro']) {
      out[`kit-${tier}/${id}`] = renderUiKit(sample.design, {
        tier,
        template: kitTemplate,
        logo: tier === 'pro' ? readLogo(sample.design) : null,
        date: FIXED_DATE,
        ...options.kit,
      }).html
    }
  }
  return out
}
