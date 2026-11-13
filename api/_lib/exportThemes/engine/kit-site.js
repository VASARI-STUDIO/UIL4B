// The one piece of the UI kit site a theme's own pages call: putting a state on a specimen. The site files themselves are not built by the server export.
import { esc } from './brand.js';

// Put a state on the element marked data-target in a specimen: its class and its attributes, as the client script does.
export function applyState(html, st) {
  return html.replace(/<([a-z]+)([^>]*\bdata-target\b[^>]*)>/, (m, tag, attrs) => {
    let a = attrs;
    if (st.cls) a = /\bclass="/.test(a) ? a.replace(/\bclass="([^"]*)"/, (x, c) => `class="${(c + ' ' + st.cls).trim()}"`) : a + ` class="${st.cls}"`;
    for (const [k, v] of Object.entries(st.attr || {})) a = a.replace(new RegExp(`\s${k}(="[^"]*")?(?=[\s>/]|$)`), '') + (v === '' ? ` ${k}` : ` ${k}="${esc(v)}"`);
    return `<${tag}${a}>`;
  });
}
