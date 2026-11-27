import { makeCtx } from '../../api/_lib/exportThemes/engine/pages.js';
import loaders from '../../api/_lib/exportThemes/node-loaders.js';
import * as catalogue from '../../api/_lib/exportThemes/themes/05-specimen/index.js';

// The slot a guide shows when the project has no logo: the engine's own UIL4B watermark (engine/logo.js), never plain text.
// The engine draws it at a fixed pixel size; here it fills whatever box the guide gives the logo.
let slot;
export function watermark(width = 220) {
  slot ||= makeCtx(catalogue, 'slot', 'guidelines', loaders).logo;
  const html = slot.html('colour', {width}).replace(/width:[\d.]+px;height:[\d.]+px;/, 'width:100%;height:100%;');
  return `<div class="mark-slot">${html}</div>`;
}
