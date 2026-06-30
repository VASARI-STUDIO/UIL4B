import { CATEGORY_MAP } from '../../data/discoverCategories'

// Renders a category's ported SVG glyph at a given size. Decorative by default
// (the category label always travels with it as real text), so aria-hidden.
export default function CategoryGlyph({ category, size = 18 }) {
  const cat = CATEGORY_MAP[category]
  if (!cat) return null
  const g = cat.glyph(size)
  return (
    <svg
      width={g.size}
      height={g.size}
      viewBox={g.viewBox}
      fill={g.fill}
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {g.paths.map((p, i) => {
        if (p.circle) return <circle key={i} cx={p.circle[0]} cy={p.circle[1]} r={p.circle[2]} />
        if (p.points) return <polyline key={i} points={p.points} />
        return <path key={i} d={p.d} />
      })}
    </svg>
  )
}
