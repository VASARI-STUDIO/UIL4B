// A picture on a print page, drawn as an svg: the print documents allow no <img>, and the only pictures a server export carries are the
// neutral plates ctx.mockup returns (a data: svg of the scene's size). The viewBox is read from that plate, so the picture keeps its aspect
// whatever the page sets as its width and height. src, alt, style and cls arrive escaped, as the pages build them.
const sizeOf = (src) => {
  let t = String(src);
  try { t = decodeURIComponent(t); } catch { /* an undecodable src keeps its text, and the picture its unit square */ }
  const m = /viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(t);
  return m ? [m[1], m[2]] : ['1', '1'];
};

export function plateImg(src, alt, style = '', cls = '') {
  const [w, h] = sizeOf(src);
  const par = /object-fit:\s*cover/.test(style) ? 'xMidYMid slice' : 'none';
  return `<svg class="pl${cls ? ' ' + cls : ''}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${alt}"${style ? ` style="${style}"` : ''}><image href="${src}" width="100%" height="100%" preserveAspectRatio="${par}"/></svg>`;
}
