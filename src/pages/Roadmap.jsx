import PillNav from '../components/PillNav'
import SpectrumFooter from '../components/spectrum/SpectrumFooter'
import VoteList, { IdeaLine } from '../components/spectrum/VoteList'
import { useToolVotes } from '../hooks/useToolVotes'
import { createTools } from '../data/toolTree'
import { CREATE_TOOL_SEARCH } from '../data/toolIndex'
import { listTools, voteWord } from '../utils/roadmapItems'
import '../styles/home-tokens.css'
import '../styles/pages/spectrum-tools.css'
// This page's own rules on the V3 marketing sheet (imported once in main.jsx), shared with /sitemap.
import '../styles/pages/map-v3.css'

// /roadmap: every tool that is in beta or still being built, with a public vote
// count, then the tools that went live in the last 90 days. Voting needs an account.
const LIST = listTools(createTools(), { describe: (id) => CREATE_TOOL_SEARCH[id]?.description || '', shipped: true })

function Meta({ votes, nothing }) {
  if (nothing) return null
  if (votes.phase === 'loading') return <p className="mk-body rm-meta">Loading the counts&hellip;</p>
  if (votes.phase === 'error') return <p className="mk-body rm-meta">Counts unavailable right now.</p>
  if (votes.total === 0) return <p className="mk-body rm-meta">No votes yet. Yours would be the first.</p>
  return <p className="mk-body rm-meta"><b>{votes.total.toLocaleString('en-AU')}</b> {voteWord(votes.total)} so far, counted at {votes.asOf}.</p>
}

export default function Roadmap() {
  const votes = useToolVotes(LIST)
  const nothing = LIST.open.length === 0
  return (
    <div className="spectrum spt mkt mk-map mk-road">
      <PillNav variant="spectrum" />
      <div className="mk-spacer" aria-hidden="true" />
      <main id="main" tabIndex={-1}>
        <section className="mk-intro mk-intro--solo mk-wrap" aria-labelledby="rm-h1">
          <div className="mk-intro-copy">
            <h1 className="rm-h1" id="rm-h1">Vote for the tools you want next.</h1>
            <p className="mk-lead">
              {nothing
                ? 'Every tool we started is live, so there’s nothing to vote on right now.'
                : 'These tools are in beta or still being built. Sign in to vote for the ones you’d use: one vote per tool, and you can take it back any time.'}
            </p>
            <Meta votes={votes} nothing={nothing} />
          </div>
        </section>

        <section className="mk-sec mk-sec--last mk-wrap" aria-label="The roadmap">
          <div className="mk-group">
            <header className="mk-rail">
              <h2 className="mk-t22">Open for votes</h2>
              {!nothing && <p className="mk-body mk-gdesc">Most votes first. The order is set when the page loads, so rows don&rsquo;t jump while you vote.</p>}
            </header>
            <div>{nothing ? <IdeaLine /> : <VoteList items={votes.items} votes={votes} label="Tools you can vote for" />}</div>
          </div>
          {votes.shipped.length > 0 && (
            <div className="mk-group">
              <header className="mk-rail">
                <h2 className="mk-t22">Shipped</h2>
                <p className="mk-body mk-gdesc">Live in the last 90 days. Voting closed when each one went live.</p>
              </header>
              <div><VoteList items={votes.shipped} votes={votes} shipped label="Shipped in the last 90 days" /></div>
            </div>
          )}
          <div className="mk-group">
            <header className="mk-rail"><h2 className="mk-t22">How voting works</h2></header>
            <dl className="rm-dl">
              <div><dt>Who can vote</dt><dd>Anyone signed in to a free UI L4B account. Everyone can see the counts.</dd></div>
              <div><dt>What a vote does</dt><dd>It shows us what you&rsquo;d use.</dd></div>
              <div><dt>When a tool ships</dt><dd>Voting on it closes. It stays here under Shipped, with its final count, for 90 days.</dd></div>
            </dl>
          </div>
        </section>
      </main>
      <SpectrumFooter />
    </div>
  )
}
