// The Palette Builder's previews, painted with the palette the user is about to
// export. Each scene is an example (src/components/palette/examples/): its own
// product built around one drawn artefact, loaded as its own chunk.
//
// This component only wraps the example and marks its roles. The example is
// pure: it takes nothing but what it draws, holds no state and reads no context.
// The colours arrive as --pv-* custom properties on the scene root
// (palettePreviewRoles.js `pvVars`), the layout is a container query on that
// root, and nothing is scaled: text is its true pixel size at every width.
//
// `data-role` marks the elements a colour role paints. The legend under the
// stage reads it to outline "where this colour lands", and a role that fails
// its floor outlines its elements by default. A role may be shared:
// data-role="primary success" is both.
import { useEffect, useRef } from 'react'
import { pvVars } from '../../utils/palettePreviewRoles'
import { EXAMPLES } from './examples/registry'
import { sceneById } from '../../data/palettePreviewScenes'
import '../../styles/pages/palette-preview.css'

/**
 * @param {object} props
 * @param {object} props.roles derivePaletteRoles() output for the palette
 * @param {string[]} props.labels the five slot names, in BRAND_ROLES order
 * @param {string} props.sceneId one of PREVIEW_SCENES
 * @param {string|null} props.highlight a role to outline, or null
 * @param {string} [props.state] the State menu's pick, for an example that has states
 * @param {(roles: string[], adjusted: string[]) => void} props.onRoles the roles
 *   this scene paints, and those it painted as text in an adjusted colour
 */
export default function PreviewScene({ roles, labels, sceneId, highlight = null, onRoles, state }) {
  const scene = sceneById(sceneId)
  const Body = EXAMPLES[scene.id]
  const rootRef = useRef(null)
  const failKey = roles.fails.map((f) => f.role).join(',')

  // Mark every role-bearing element: which are in the highlighted role, and
  // which carry a role that fails its floor. Containers (an element holding
  // another role-bearing one) never dim, or the highlighted child would dim
  // with them. A failing role is flagged on one element, the largest it paints
  // at this width, so a chart of twelve bars shows one outline rather than
  // twelve. The marks are redone when the scene is resized, because a layout
  // change can hide the element that was flagged, and when the roles change,
  // because an example may paint a brand colour as text a step darker (or
  // lighter) to keep it readable: it marks that element data-adjusted, and the
  // legend says so on the chip.
  useEffect(() => {
    const root = rootRef.current
    if (!root) return undefined
    const failing = failKey ? failKey.split(',') : []
    const mark = () => {
      const els = [...root.querySelectorAll('[data-role]')]
      const used = new Set()
      const adjusted = new Set()
      const flagged = new Set()
      for (const role of failing) {
        let best = null
        let area = 0
        for (const el of els) {
          if (!el.dataset.role.split(' ').includes(role)) continue
          const r = el.getBoundingClientRect()
          if (r.width * r.height > area) { best = el; area = r.width * r.height }
        }
        if (best) flagged.add(best)
      }
      for (const el of els) {
        const rs = el.dataset.role.split(' ')
        rs.forEach((r) => used.add(r))
        if (el.dataset.adjusted === 'true') rs.forEach((r) => adjusted.add(r))
        const isLeaf = !el.querySelector('[data-role]')
        if (highlight && rs.includes(highlight)) el.dataset.hit = 'on'
        else if (highlight && isLeaf) el.dataset.hit = 'off'
        else delete el.dataset.hit
        if (flagged.has(el)) el.dataset.fail = 'on'
        else delete el.dataset.fail
      }
      if (onRoles) onRoles([...used], [...adjusted])
    }
    mark()
    if (typeof ResizeObserver === 'undefined' || !failKey) return undefined
    const ro = new ResizeObserver(mark)
    ro.observe(root)
    return () => ro.disconnect()
  }, [highlight, scene.id, state, failKey, onRoles, roles])

  return (
    <div
      ref={rootRef}
      className="pvs"
      style={pvVars(roles)}
      data-scene={scene.id}
      data-mode={roles.mode}
      data-preview-scene={scene.name}
      role="img"
      aria-label={`${scene.name} preview using your palette, ${roles.mode} theme`}
    >
      <Body roles={roles} labels={labels} state={state} />
    </div>
  )
}
