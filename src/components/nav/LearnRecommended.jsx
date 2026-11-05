import { Link } from 'react-router-dom'
import NavIcon from '../NavIcon'
import { LEARN_ARTICLE_ICONS } from '../../data/toolTree'
import { useWorkspace } from '../../contexts/WorkspaceContext'
import { recommendGuide } from './learnRecommendation'

// The Learn pane's suggested guide: the same flat row as the Discover pane's
// suggested gallery (it shares the pnav-reco classes), with the guide's glyph,
// its short name and a line saying why it was picked. The pick follows the
// visitor's recent tools (see learnRecommendation.js), so it changes as they work.

export default function LearnRecommended({ path, onPick }) {
  const recent = useWorkspace()?.recent
  const pick = recommendGuide({ recent, path })
  if (!pick) return null
  const { guide, fromTool } = pick
  return (
    <div className="pnav-reco" data-guide={guide.slug}>
      <p className="pnav-reco-eyebrow">{fromTool ? `Since you used ${fromTool.label}` : 'A guide to start with'}</p>
      <Link className="pnav-reco-link" to={guide.route} onClick={onPick} data-pnav-menuitem>
        <span className="pnav-reco-prev pnav-reco-prev--glyph" aria-hidden="true"><NavIcon id={LEARN_ARTICLE_ICONS[guide.slug] || 'principles'} /></span>
        <span className="pnav-reco-name">{guide.navLabel}</span>
        <svg className="pnav-reco-arrow" viewBox="0 0 12 12" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M2.5 6h7M6.5 3l3 3-3 3" />
        </svg>
      </Link>
    </div>
  )
}
