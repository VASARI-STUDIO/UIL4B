// Loaded through Vite's SSR loader by scripts/guide-html.mjs, never shipped.
//
// Renders each Learn guide's body component to static HTML. The module list
// comes from the registry's own `file` field via a glob, so there is no second
// slug-to-component map to keep in step with the one LearnArticle.jsx renders.
import { renderToStaticMarkup } from 'react-dom/server'
import { StaticRouter } from 'react-router-dom'

const modules = import.meta.glob('../src/data/learn/*.jsx', { eager: true })

/** The static HTML of the guide module named `file` (e.g. `typeScales.jsx`). */
export function renderGuideBody(file) {
  const mod = modules[`../src/data/learn/${file}`]
  if (!mod?.default) throw new Error(`guide-render: no module src/data/learn/${file}`)
  const Body = mod.default
  return renderToStaticMarkup(
    <StaticRouter location="/learn">
      <Body />
    </StaticRouter>,
  )
}
