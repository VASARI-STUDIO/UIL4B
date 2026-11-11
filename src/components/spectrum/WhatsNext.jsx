import { Link } from 'react-router-dom'
import VoteList from './VoteList'
import { useToolVotes } from '../../hooks/useToolVotes'
import { createTools } from '../../data/toolTree'
import { CREATE_TOOL_SEARCH } from '../../data/toolIndex'
import { listTools } from '../../utils/roadmapItems'

// The /tools foot: the group that replaces the "In beta" and "In the workshop"
// sentences while roadmap voting is on. Rendered only behind TOOL_VOTES_ON.
const LIST = listTools(createTools(), { describe: (id) => CREATE_TOOL_SEARCH[id]?.description || '' })

export default function WhatsNext() {
  const votes = useToolVotes(LIST)
  const settled = votes.phase === 'ready'
  const nothing = LIST.open.length === 0
  const note = nothing ? null
    : settled && votes.total === 0 ? 'In beta or still being built. No one has voted yet.'
      : 'In beta or still being built. Vote for the ones you’d use.'
  return (
    <div className="spt-group spt-group--vote" id="whats-next">
      <header>
        <h3>What&rsquo;s next</h3>
        {note && <p>{note}</p>}
        <Link to="/roadmap">See the full roadmap</Link>
      </header>
      <div>
        <VoteList items={votes.items} compact votes={votes} label="Tools you can vote for" />
      </div>
    </div>
  )
}
