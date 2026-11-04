// THE BODY OF EVERY OTHER PRERENDERED ROUTE: A HEADING, AN INTRO AND, FOR A
// LEARN GUIDE, THE GUIDE.
//
// ── What was wrong ──────────────────────────────────────────────────────────
//
// Only `/` got a body (scripts/home-shell.mjs). Every tool, Learn and info
// route was served the generic skeleton: grey boxes and "Loading UIL4B". A
// crawler or answer engine that does not run JavaScript read nothing on any of
// them, including seven long guides whose whole value is their text.
//
// ── Where each piece comes from (nothing is typed here) ─────────────────────
//
//   guide h1 / intro   LEARN_ARTICLES `title` and `dek` — the two fields
//                      src/pages/LearnArticle.jsx renders under its own <h1>.
//   guide text         the guide's own component, rendered to static HTML by
//                      scripts/guide-html.mjs. Not extracted or re-typed: the
//                      figures in these guides are computed, so a text scrape
//                      would drop them.
//   every other route  the heading is the page name out of PAGE_TITLES and the
//                      intro is PAGE_DESCRIPTIONS — the head copy the route
//                      already ships. A tool page has no intro paragraph of its
//                      own (its h1 is a small label), so the head copy is the
//                      one description of the tool that exists as data.
//
// ── Why the guide text is visually hidden and the h1 and intro are not ──────
//
// The h1 and intro take the place of the skeleton's title and subtitle boxes,
// at the same position, so they paint with the first frame and the skeleton
// keeps its shape around them. The guide text is a long article whose real
// typography lives in a lazy stylesheet that arrives with the route chunk;
// painted from the render-blocking sheet alone it would flash unstyled and
// then be thrown away. So it is in the document, off-screen and out of the
// accessibility tree (`.boot-prose`), and the whole shell is replaced when
// React mounts. Replacing nodes is not a layout shift: nothing the visitor
// could see moves.
//
// Skeleton markup mirrors index.html's, as scripts/home-shell.mjs's does.
import { LEARN_ARTICLES } from '../src/data/learnIndex.js'
import { pageName } from '../src/data/routeMetaMap.js'
import { DEFAULT_DESCRIPTION, PAGE_DESCRIPTIONS, PAGE_TITLES } from '../src/data/routeMetaGated.js'
import { logoSvg } from '../src/config/brandLogo.js'
import { HOME_SHELL_ROUTES, ROOT_OPEN, AFTER_ROOT } from './home-shell.mjs'

const text = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const attr = (s) => text(s).replace(/"/g, '&quot;')

const norm = (p) => {
  const s = String(p || '/').split('?')[0].split('#')[0].toLowerCase()
  return s.length > 1 ? s.replace(/\/+$/, '') : s
}

/** The registry record for a `/learn/<slug>` route that is a registered guide. */
export function guideFor(route) {
  const m = /^\/learn\/([^/]+)$/.exec(norm(route))
  return m ? LEARN_ARTICLES.find((a) => a.slug === m[1]) : undefined
}

/** Does this route's shell get the heading-and-intro body? Not `/`, not the 404. */
export const wantsPageShell = (route) => !HOME_SHELL_ROUTES.has(norm(route)) && Boolean(PAGE_TITLES[norm(route)])

/**
 * A guide's rendered body made safe to sit in the shell. Ids are dropped:
 * a `#section` link into the page would otherwise scroll to this copy and stay
 * there when React replaces it, and the hidden copy has no use for them.
 */
export function stripForShell(html) {
  return html
    .replace(/\s(?:id|tabindex|aria-labelledby|aria-describedby)="[^"]*"/g, '')
}

/**
 * What the shell for a route says.
 *   { h1, intro, prose }  prose is trusted HTML (rendered by React) or ''.
 * `guideBodies` is `{ [slug]: html }` from scripts/guide-html.mjs.
 */
export function shellContentFor(route, guideBodies = {}) {
  const r = norm(route)
  const article = guideFor(r)
  if (article) {
    const body = guideBodies[article.slug]
    if (!body) throw new Error(`page-shell: no rendered body for the guide ${article.slug}`)
    const sources = (article.sources || [])
      .map((s) => `<li><a href="${attr(s.href)}">${text(s.label)}</a></li>`).join('')
    const prose = `<article>${stripForShell(body)}`
      + `<p><a href="${attr(article.toolTo)}">Use it in the ${text(article.toolLabel)}</a></p>`
      + (sources ? `<h2>Sources</h2><ul>${sources}</ul>` : '')
      + '</article>'
    return { h1: article.title, intro: article.dek, prose }
  }
  return {
    h1: pageName(PAGE_TITLES[r]) || PAGE_TITLES[r],
    intro: PAGE_DESCRIPTIONS[r] || DEFAULT_DESCRIPTION,
    prose: '',
  }
}

/** The `#root` contents for a route's shell. */
export function pageShellRoot({ h1, intro, prose }) {
  return `${ROOT_OPEN}
  <div class="boot-shell boot-shell-page" id="boot-shell">
    <span class="boot-status" role="status" aria-live="polite">Loading UIL4B</span>
    <div class="boot-decoration" aria-hidden="true">
      <div class="boot-nav">
        ${logoSvg({ attrs: 'class="boot-mark" aria-hidden="true" focusable="false"' })}
        <span class="boot-nav-lines"><i class="boot-line"></i><i class="boot-line"></i><i class="boot-line"></i></span>
        <span class="boot-actions"><i class="boot-action"></i><i class="boot-action"></i></span>
      </div>
    </div>
    <div class="boot-page">
      <h1 class="boot-h1">${text(h1)}</h1>
      <p class="boot-intro">${text(intro)}</p>${prose ? `
      <div class="boot-prose" aria-hidden="true">${prose}</div>` : ''}
    </div>
  </div>
</div>
`
}

/** Swap the generic skeleton for the route's. Throws, like applyHomeShell, if the anchors moved. */
export function applyPageShell(html, content) {
  const open = html.indexOf(ROOT_OPEN)
  const after = html.indexOf(AFTER_ROOT)
  if (open === -1 || after === -1 || after < open) {
    throw new Error(
      `page-shell: could not find ${ROOT_OPEN} … ${AFTER_ROOT} in the built shell. `
      + 'index.html has changed shape — fix the anchors rather than shipping a bare skeleton.',
    )
  }
  return html.slice(0, open) + pageShellRoot(content) + html.slice(after)
}

/** Read the written file back and prove the heading and intro are in it. */
export function assertPageShellApplied(html, content, where) {
  const wanted = [
    ['the h1', `<h1 class="boot-h1">${text(content.h1)}</h1>`],
    ['the intro', `<p class="boot-intro">${text(content.intro)}</p>`],
  ]
  if (content.prose) wanted.push(['the guide text', '<div class="boot-prose"'])
  const missing = wanted.filter(([, needle]) => !html.includes(needle)).map(([label]) => label)
  if (missing.length) {
    throw new Error(`page-shell: ${where} was written without ${missing.join(', ')}. A crawler would read only "Loading UIL4B".`)
  }
}
