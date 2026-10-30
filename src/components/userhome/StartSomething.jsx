import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useProject } from '../../contexts/ProjectContext'
import { createTools, toolRoute } from '../../data/toolTree'
import { CREATE_TOOL_SEARCH } from '../../data/toolIndex'
import { tintConfigFor } from '../../data/designDefaults'
import { generateTintScale } from '../../utils/colors'
import PhIcon from '../spectrum/PhIcon'
import ToolArt from '../spectrum/ToolArt'
import Glyph from './Glyph'
import { liveToolCount, numberWord } from './workspace'

// "Start something" — the quick-start rows: each tool is a /tools row with its drawn plate (ToolArt),
// the Palette Builder first with the working design's live ramp drawn in its plate, then the tools
// the grid has always offered, and a button that opens the Create menu.
//
// Every row is a link to a live route, read from the tool tree, so a renamed route fails the build
// instead of shipping a dead row. None of it needs an account, which is why a signed-out visitor
// landing here from the sales page gets the same rows.

// TWO CHOICES ARE OPEN. The page keeps its current behaviour for both; each is one line to change.
//
// SHOW_PALETTE_LIBRARY_TILE: true keeps the Palette Library row. false drops it; its destination
// (/discover/palettes) is still linked from "New in Discover".
const SHOW_PALETTE_LIBRARY_TILE = true
// TILE_COPY_FROM_TOOL_TREE: false keeps each row's own name and note (TILES below). true takes the
// name from the tool tree and the note from the tool search index, the words the /tools page uses.
const TILE_COPY_FROM_TOOL_TREE = false

// The rows in order, each with its current name and note. `art` is the ToolArt drawing; the library
// row has none of its own, so it draws the menu's tile for it.
const TILES = [
  { id: 'palette', label: 'Palette Builder', note: 'Start from a seed colour and the roles, ramp and tokens follow.', to: toolRoute('palette'), art: 'palette' },
  { id: 'gradient', label: 'Gradient', note: 'Two stops and an angle', to: toolRoute('gradient'), art: 'gradient' },
  { id: 'tint', label: 'Tint', note: 'Even ramp steps', to: toolRoute('tint'), art: 'tint' },
  { id: 'semantic', label: 'Semantic', note: 'Brand and state colours', to: toolRoute('semantic'), art: 'semantic' },
  { id: 'contrast', label: 'Contrast', note: 'Check any pair for AA', to: toolRoute('contrast'), art: 'contrast' },
  { id: 'icons', label: 'Icon set', note: 'Search, restyle, export', to: toolRoute('icons'), art: 'icons' },
  ...(SHOW_PALETTE_LIBRARY_TILE
    ? [{ id: 'palettes', label: 'Palette Library', note: 'Browse and load a system', to: '/discover/palettes', art: null }]
    : []),
]

const TREE_LABEL = new Map(createTools().map((t) => [t.id, t.label]))

/** A row's name and note: its own, or the tool tree's where TILE_COPY_FROM_TOOL_TREE is on. */
function copyOf(tile) {
  if (!TILE_COPY_FROM_TOOL_TREE) return { label: tile.label, note: tile.note }
  return {
    label: TREE_LABEL.get(tile.id) || tile.label,
    note: CREATE_TOOL_SEARCH[tile.id]?.description || tile.note,
  }
}

/**
 * Open the header's Create menu from the page.
 *
 * The header is a separate component and has no public "open this menu" call,
 * so this asks first — a cancelable `uil4b:open-menu` event the header can
 * answer with preventDefault() — and otherwise presses the same control a
 * person would: the Create trigger where the bar shows it, or the menu button
 * that opens the sheet (whose Create section is open by default) on a phone.
 */
function openCreateMenu() {
  const asked = new CustomEvent('uil4b:open-menu', { detail: { section: 'create' }, cancelable: true })
  if (!window.dispatchEvent(asked)) return
  const trigger = [...document.querySelectorAll('.pnav-trigger')]
    .find((b) => b.offsetParent !== null && b.textContent.trim().startsWith('Create'))
  if (trigger) {
    if (trigger.getAttribute('aria-expanded') !== 'true') trigger.click()
    trigger.focus()
    return
  }
  const sheet = document.querySelector('.pnav-mobile')
  if (sheet && sheet.offsetParent !== null && sheet.getAttribute('aria-expanded') !== 'true') sheet.click()
}

// `inLead` is the signed-out workspace, where this block moves up into the lead slot and the rows
// run in one column under the heading.
export default function StartSomething({ inLead = false }) {
  const { design } = useProject()

  // THE LIVE RAMP. The Palette Builder row draws the working design's current colours: its
  // palette when it has one, otherwise the eleven-stop ramp the Tint tool builds from its base — the
  // same ramp /learn/help shows as "what a new project starts from".
  const ramp = useMemo(() => {
    const colors = (design?.palette?.colors || []).filter(Boolean)
    if (colors.length > 1) return colors
    try { return generateTintScale(tintConfigFor(design)) } catch { return colors }
  }, [design])

  const count = liveToolCount()

  return (
    <section className={`uh-start${inLead ? ' uh-start--lead' : ''}`} aria-labelledby="uh-start-h">
      <div className="uh-start-head">
        <h2 id="uh-start-h" className="uh-start-h">Start something</h2>
        <button type="button" className="uh-alltools" aria-haspopup="menu" onClick={openCreateMenu}>
          <span>All {numberWord(count)} tools</span>
          <Glyph name="caret-right" size={12} className="uh-alltools-caret" />
        </button>
      </div>
      <ul className="spt-rows uh-tools">
        {TILES.map((tile) => {
          const { label, note } = copyOf(tile)
          return (
            <li key={tile.id}>
              <Link className="spt-row uh-tool" data-tool={tile.id} to={tile.to}>
                <span className="spt-thumb">
                  {tile.art
                    ? <ToolArt id={tile.art} size="thumb" colors={tile.id === 'palette' ? ramp : undefined} />
                    : (
                      <div className="spt-art spt-art--thumb" data-hue="colour" data-art={tile.id} aria-hidden="true">
                        <span className="spt-tile"><Glyph name="squares-four" size={18} /></span>
                      </div>
                    )}
                </span>
                <span className="spt-row-text">
                  <b className="uh-tool-name">{label}</b>
                  <span className="uh-tool-note">{note}</span>
                </span>
                <span className="spt-row-go" aria-hidden="true"><PhIcon name="arrow-up-right" /></span>
              </Link>
            </li>
          )
        })}
        {/* The phone shows only the first few rows; this row stands in for the rest and for the heading's button. */}
        <li className="uh-tool-all-item">
          <button type="button" className="uh-tool uh-tool--all" aria-haspopup="menu" onClick={openCreateMenu}>
            <span className="spt-row-text"><b className="uh-tool-name">All {numberWord(count)} tools</b></span>
            <Glyph name="caret-right" size={12} className="uh-alltools-caret" />
          </button>
        </li>
      </ul>
    </section>
  )
}
