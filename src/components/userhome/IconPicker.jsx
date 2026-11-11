import Glyph from './Glyph'
import useProjectIcons from '../../hooks/useProjectIcons'
import { PROJECT_GLYPHS, projectIcon } from './workspace'

// The project's icon, chosen on the project's own page. The workspace shows the chosen glyph as a
// badge on the lead card; picking one moved here from a pencil over that card's picture. The icon is
// stored ON the project (`project.icon`), so it syncs with it.
export default function IconPicker({ project }) {
  const { pickIcon } = useProjectIcons()
  const current = projectIcon(project.id, project.icon)
  return (
    <div className="uh-iconpick" role="group" aria-label={`Icon for ${project.name}`}>
      <span className="uh-iconpick-label" aria-hidden="true">Icon</span>
      {PROJECT_GLYPHS.map((g) => {
        const name = g.replace(/-/g, ' ')
        return (
          <button
            key={g}
            type="button"
            className="uh-iconpick-btn"
            aria-label={`Use the ${name} icon`}
            aria-pressed={current.glyph === g}
            title={name}
            onClick={() => pickIcon(project.id, g)}
          >
            <Glyph name={g} size={18} />
          </button>
        )
      })}
    </div>
  )
}
