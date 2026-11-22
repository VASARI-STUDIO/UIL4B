// Lane modules: some themes are written as several lane-<name>.js files beside their index.js. The engine's own version finds them on disk;
// here each theme imports its lanes by name (so the bundler traces them) and passes the modules in, in file-name order. Later lanes win on a clash.
// A lane may export any of: guidelines {id: fn}, uikit {id: fn}, guide {id: fn} and guideCss(ctx) (the style guide), css(ctx) -> string, brandBook, bookCss, readMe, sheets, fonts [meta.fonts entries].
export function mergeLanes(mods) {
  const out = { guidelines: {}, uikit: {}, guide: {}, guideCss: [], css: [], fonts: [], brandBook: null, bookCss: null, readMe: null, sheets: null, guideSite: null, kitSite: null };
  for (const m of mods) {
    Object.assign(out.guidelines, m.guidelines || {});
    Object.assign(out.uikit, m.uikit || {});
    Object.assign(out.guide, m.guide || {});
    if (typeof m.guideCss === 'function') out.guideCss.push(m.guideCss);
    if (typeof m.css === 'function') out.css.push(m.css);
    if (Array.isArray(m.fonts)) out.fonts.push(...m.fonts);
    for (const k of ['brandBook', 'bookCss', 'readMe', 'sheets', 'guideSite', 'kitSite']) if (m[k]) out[k] = m[k];
  }
  return out;
}

// The css function a laned theme exports: its own base css, then each lane's.
export function laneCss(baseCss, L) {
  return (ctx) => [baseCss(ctx), ...L.css.map((f) => f(ctx))].join('\n');
}

// The css the style guide adds on top of the theme's own: what the lanes' guideCss functions return.
export function laneGuideCss(L) {
  return (ctx) => L.guideCss.map((f) => f(ctx)).join('\n');
}
