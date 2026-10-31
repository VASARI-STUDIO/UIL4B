// The Code files of the export dialog: how each is named, typed and built. The
// download, the copy and the preview all read this one table, so they cannot
// disagree about what a file is called or holds. Plain functions with no React
// in them; the generators load on demand, so nobody pays for one they never open.
//
//   css, json       designTokens.js   {slug}.tokens.css / .tokens.json
//   tailwind        tailwindTheme.js  {slug}-tailwind.css
//   contrast        contrastPairs.js  {slug}-contrast-pairs.csv
//   contrast-json   contrastPairs.js  {slug}-contrast-pairs.json

export const CODE_FILES = Object.freeze({
  css: Object.freeze({
    mime: 'text/css;charset=utf-8',
    name: (slug) => `${slug}.tokens.css`,
    build: async (design, o) => (await import('./designTokens.js')).buildTokensCss(design, o),
  }),
  json: Object.freeze({
    mime: 'application/json;charset=utf-8',
    name: (slug) => `${slug}.tokens.json`,
    build: async (design, o) => (await import('./designTokens.js')).buildTokensJson(design, o),
  }),
  tailwind: Object.freeze({
    mime: 'text/css;charset=utf-8',
    name: (slug) => `${slug}-tailwind.css`,
    build: async (design, o) => (await import('./tailwindTheme.js')).buildTailwindCss(design, o),
  }),
  contrast: Object.freeze({
    mime: 'text/csv;charset=utf-8',
    name: (slug) => `${slug}-contrast-pairs.csv`,
    // A CSV has no place for a credit line, so the watermark is not read.
    build: async (design) => (await import('./contrastPairs.js')).buildContrastPairsCsv(design),
  }),
  'contrast-json': Object.freeze({
    mime: 'application/json;charset=utf-8',
    name: (slug) => `${slug}-contrast-pairs.json`,
    build: async (design, { projectName }) => (await import('./contrastPairs.js')).buildContrastPairsJson(design, { projectName }),
  }),
})

/** True for a format id this module builds. */
export const isCodeFile = (id) => Object.hasOwn(CODE_FILES, id)

/** The file's name for a project slug. */
export const codeFileName = (id, slug) => CODE_FILES[id].name(slug)

/** The file's text. `watermark` adds the free-tier credit where the file has a place for it. */
export const buildCodeFile = (id, design, { projectName = 'Design System', watermark = true } = {}) =>
  CODE_FILES[id].build(design, { projectName, watermark })
