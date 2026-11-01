// Render every Learn guide's body component to static HTML, for the prerender.
//
// The guides are JSX and bare Node cannot import them, so this starts a Vite
// server in middleware mode (no port opened, no file watcher) and loads
// scripts/guide-render.entry.jsx through its SSR loader. That uses the same JSX
// and React plugin the real build does, and each guide renders from the same
// component LearnArticle.jsx mounts — nothing is scraped or retyped.
//
// Vite is imported inside the function so a test that only wants
// scripts/prerender.mjs's pure helpers does not pay for it.
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { LEARN_ARTICLES } from '../src/data/learnIndex.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

/** `{ [slug]: html }` for every registered guide. */
export async function renderGuideBodies() {
  const { createServer } = await import('vite')
  const { default: react } = await import('@vitejs/plugin-react')
  const server = await createServer({
    root,
    configFile: false,
    plugins: [react()],
    appType: 'custom',
    logLevel: 'error',
    server: { middlewareMode: true, hmr: false, watch: null },
  })
  try {
    const mod = await server.ssrLoadModule('/scripts/guide-render.entry.jsx')
    return Object.fromEntries(LEARN_ARTICLES.map((a) => [a.slug, mod.renderGuideBody(a.file)]))
  } finally {
    await server.close()
  }
}
