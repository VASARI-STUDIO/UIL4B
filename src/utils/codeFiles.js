// The Code files of the export dialog: how each is named, typed and built. The
// download, the copy and the preview all read this one table, so they cannot
// disagree about what a file is called or holds. Plain functions with no React
// in them; the generators load on demand, so nobody pays for one they never open.
// The names come from exportFileName.js, the one source for every file name.
//
//   css, json       designTokens.js   {p}.tokens.css / {p}.tokens.json
//   tailwind        tailwindTheme.js  {p}-tailwind.css
//   contrast        contrastPairs.js  {p}-contrast-pairs.csv
//   contrast-json   contrastPairs.js  {p}-contrast-pairs.json

import { fileName } from './exportFileName.js'

export const CODE_FILES = Object.freeze({
  css: Object.freeze({
    mime: 'text/css;charset=utf-8',
    name: (project) => fileName(project, 'tokens', 'css'),
    build: async (design, o) => (await import('./designTokens.js')).buildTokensCss(design, o),
  }),
  json: Object.freeze({
    mime: 'application/json;charset=utf-8',
    name: (project) => fileName(project, 'tokens', 'json'),
    build: async (design, o) => (await import('./designTokens.js')).buildTokensJson(design, o),
  }),
  tailwind: Object.freeze({
    mime: 'text/css;charset=utf-8',
    name: (project) => fileName(project, 'tailwind', 'css'),
    build: async (design, o) => (await import('./tailwindTheme.js')).buildTailwindCss(design, o),
  }),
  contrast: Object.freeze({
    mime: 'text/csv;charset=utf-8',
    name: (project) => fileName(project, 'contrast-pairs', 'csv'),
    // A CSV has no place for a credit line, so the watermark is not read.
    build: async (design) => (await import('./contrastPairs.js')).buildContrastPairsCsv(design),
  }),
  'contrast-json': Object.freeze({
    mime: 'application/json;charset=utf-8',
    name: (project) => fileName(project, 'contrast-pairs', 'json'),
    build: async (design, { projectName }) => (await import('./contrastPairs.js')).buildContrastPairsJson(design, { projectName }),
  }),
})

/** True for a format id this module builds. */
export const isCodeFile = (id) => Object.hasOwn(CODE_FILES, id)

/** The file's name for a project, given by the name as typed. */
export const codeFileName = (id, project) => CODE_FILES[id].name(project)

/** The file's text. `watermark` adds the free-tier credit where the file has a place for it. */
export const buildCodeFile = (id, design, { projectName = 'Design System', watermark = true } = {}) =>
  CODE_FILES[id].build(design, { projectName, watermark })
