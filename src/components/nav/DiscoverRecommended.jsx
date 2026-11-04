import { Link } from 'react-router-dom'
import NavIcon from '../NavIcon'
import { LIBRARY_LEAD } from '../../data/libraryTotals'
import { useWorkspace } from '../../contexts/WorkspaceContext'
import { recommendGallery } from './discoverRecommendation'

// The Discover pane's suggested gallery: one flat row under the library counts,
// a small look at what is inside, the gallery's name and a line saying why it
// was picked. The pick follows the visitor's recent tools (see
// discoverRecommendation.js), so it changes as they work.

function Preview({ id }) {
  if (id === 'palette-library') {
    return (
      <span className="pnav-reco-prev pnav-reco-prev--strip" aria-hidden="true">
        {LIBRARY_LEAD.palette.colors.slice(0, 4).map((hex, i) => <span key={`${hex}-${i}`} style={{ background: hex }} />)}
      </span>
    )
  }
  if (id === 'gradient-gallery') {
    const stops = LIBRARY_LEAD.gradient.stops.map((s) => `${s.color} ${s.position}%`).join(', ')
    return <span className="pnav-reco-prev pnav-reco-prev--fill" aria-hidden="true" style={{ backgroundImage: `linear-gradient(90deg, ${stops})` }} />
  }
  if (id === 'font-gallery') {
    return <span className="pnav-reco-prev pnav-reco-prev--type" aria-hidden="true">Ag</span>
  }
  return <span className="pnav-reco-prev pnav-reco-prev--glyph" aria-hidden="true"><NavIcon id={id} /></span>
}

export default function DiscoverRecommended({ path, onPick }) {
  const recent = useWorkspace()?.recent
  const pick = recommendGallery({ recent, path })
  if (!pick) return null
  const { gallery, fromTool } = pick
  return (
    <div className="pnav-reco" data-gallery={gallery.id}>
      <p className="pnav-reco-eyebrow">{fromTool ? `Since you used ${fromTool.label}` : 'A gallery to start with'}</p>
      <Link className="pnav-reco-link" to={gallery.route} onClick={onPick} data-pnav-menuitem>
        <Preview id={gallery.id} />
        <span className="pnav-reco-name">{gallery.label}</span>
        <svg className="pnav-reco-arrow" viewBox="0 0 12 12" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M2.5 6h7M6.5 3l3 3-3 3" />
        </svg>
      </Link>
    </div>
  )
}
