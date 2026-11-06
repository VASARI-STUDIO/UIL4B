import { ToolBack } from './ToolLayout'
import ToolIcon from './ToolIcon'
import TypeToolsNav from './TypeToolsNav'
import GroundSegment from './GroundSegment'
import '../../styles/pages/type-tools-nav.css'

// The shared tool bar of the three type tools (Font Gallery, Font Pair, Type
// Scale): a round Back, the project chip, the switcher with the project's
// current answers, and the specimen ground control.
//
// It is a list of ToolLayout items, so the bar keeps the app's overflow rule
// (a toolbar never wraps; what does not fit folds into More). Spread it first
// in `items`, give ToolLayout `back={false}` (the bar draws its own Back), and
// put the tool's own actions after it:
//
//   <ToolLayout back={false} items={[...typeToolsBarItems({ ... }), ...own]} />
//
// typeToolsBarItems({
//   current        'gallery' | 'pair' | 'scale': the page being shown
//   heading        { family, weight } | null: the project's heading face
//   body           { family, weight } | null: the project's body face
//   scale          the scale ratio as a number
//   headingStack   CSS font-family for the heading answer
//   bodyStack      CSS font-family for the body answer
//   projectName    the open project's name; empty shows the sample, "Kerbside · Sample"
//   ground         'd' | 'l': the specimen ground; omit with onGround to leave the control out
//   onGround       (ground) => void
// })
//
// Item priorities: Back and the switcher never leave the row (99), the ground
// control folds into More as a Dark/Light pair (4), the project chip leaves
// first (-1). The ground control carries no `align`: the tool decides where
// its right-hand group starts.

const SAMPLE_PROJECT = 'Kerbside'

export function typeToolsBarItems({
  current, heading, body, scale, headingStack, bodyStack, projectName, ground, onGround,
}) {
  const name = (projectName || '').trim()
  const items = [
    {
      id: 'ttb-back',
      priority: 99,
      menu: false,
      render: () => <span className="ttb-back"><ToolBack /></span>,
    },
    {
      id: 'ttb-chip',
      priority: -1,
      menu: false,
      render: () => (
        <span className="ttb-chip">
          <ToolIcon name="bicycle" size={16} className="ttb-chip-ico" />
          <span className="ttb-chip-name">{name || SAMPLE_PROJECT}</span>
          {!name && <span className="ttb-chip-tag">&nbsp;·&nbsp;Sample</span>}
        </span>
      ),
    },
    {
      id: 'ttb-switcher',
      measure: `${heading?.family}|${heading?.weight}|${body?.family}|${scale}`,
      priority: 99,
      menu: false,
      render: () => (
        <TypeToolsNav
          current={current}
          heading={heading}
          body={body}
          scale={scale}
          headingStack={headingStack}
          bodyStack={bodyStack}
        />
      ),
    },
  ]
  if (onGround) {
    items.push({
      id: 'ttb-ground',
      priority: 4,
      render: () => <GroundSegment ground={ground} onGround={onGround} />,
      menu: () => (
        <div className="ttb-menu-ground">
          <span className="ttb-menu-label">Specimen ground</span>
          <GroundSegment ground={ground} onGround={onGround} className="ttb-seg--full" />
        </div>
      ),
    })
  }
  return items
}
