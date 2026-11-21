// The crawlable link blocks as static HTML, for the served shells.
//
// The data and the shape come from src/data/crawlLinks.js (crawlBlock), the
// same call src/components/CrawlLinks.jsx renders, so a block in the shell and
// the block on the hydrated page are one list drawn twice. These are real
// anchors outside every `inert` and `aria-hidden` wrapper: they are the
// links a visitor with no JavaScript, and a crawler, can follow.
import { crawlBlock } from '../src/data/crawlLinks.js'

const text = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const attr = (s) => text(s).replace(/"/g, '&quot;')

/** The block for a route as an HTML string, or '' for a route with none. */
export function crawlHtml(route) {
  const block = crawlBlock(route)
  if (!block) return ''
  const groups = block.sections.map((s) => `
        <div class="crawl-group">
          <h2 class="crawl-h">${text(s.heading)}</h2>
          <ul class="crawl-list">${s.links.map((l) => `<li><a class="crawl-link" href="${attr(l.href)}">${text(l.text)}</a></li>`).join('')}</ul>
        </div>`).join('')
  return `<nav class="${attr(block.className)}" aria-label="${attr(block.label)}">${groups}
      </nav>`
}
