import { NavLink } from 'react-router-dom'
import '../../styles/pages/type-tools-nav.css'

// The switcher between the three type tools. Each link shows the project's
// current answer for that tool (heading face, body face, scale), so the bar
// states the project while it moves between tools.

const RATIO_WORDS = [
  [1.067, 'Minor second'], [1.125, 'Major second'], [1.2, 'Minor third'], [1.25, 'Major third'],
  [1.333, 'Perfect fourth'], [1.414, 'Augmented fourth'], [1.5, 'Perfect fifth'], [1.618, 'Golden'], [2, 'Octave'],
]

function ratioWord(ratio) {
  const hit = RATIO_WORDS.find(([v]) => Math.abs(v - ratio) < 0.002)
  return hit ? hit[1] : 'Custom'
}

// `heading` and `body` are { family, weight }; `scale` is the ratio number.
export default function TypeToolsNav({ current, heading, body, scale, headingStack, bodyStack }) {
  const headName = heading?.family || 'Heading'
  const bodyName = body?.family || 'Body'
  const word = ratioWord(scale)
  const ratio = Number(scale) ? String(Number(Number(scale).toFixed(3))) : ''
  const links = [
    {
      id: 'gallery', to: '/create/font-gallery', label: 'Heading', short: 'Gallery',
      name: `Font Gallery, heading ${headName}${heading?.weight ? ` ${heading.weight}` : ''}`,
      value: <span style={{ fontFamily: headingStack, fontWeight: heading?.weight || 700 }}>{headName}{heading?.weight ? <span className="ttn-wt"> {heading.weight}</span> : null}</span>,
      shortValue: headName,
    },
    {
      id: 'pair', to: '/create/font-pair', label: 'Body', short: 'Pair',
      name: `Font Pair, body ${bodyName}`,
      value: <span style={{ fontFamily: bodyStack, fontWeight: 500 }}>{bodyName}</span>,
      shortValue: bodyName,
    },
    {
      id: 'scale', to: '/create/type-scale', label: 'Scale', short: 'Scale',
      name: `Type Scale, scale ${word} ${ratio}`,
      value: <span>{word}<span className="ttn-wt"> <span className="ttn-mono">{ratio}</span></span></span>,
      shortValue: ratio,
    },
  ]
  return (
    <nav className="ttn" aria-label="Type tools">
      {links.map((l) => (
        <NavLink
          key={l.id}
          to={l.to}
          className="ttn-link"
          aria-label={l.name}
          aria-current={current === l.id ? 'page' : undefined}
        >
          <span className="ttn-l"><span className="ttn-lw">{l.label}</span><span className="ttn-ls">{l.short}</span></span>
          <span className="ttn-v"><span className="ttn-vw">{l.value}</span><span className="ttn-vs">{l.shortValue}</span></span>
        </NavLink>
      ))}
    </nav>
  )
}
