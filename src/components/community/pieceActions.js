import { createElement, useCallback, useEffect, useMemo, useState } from 'react'
import Menu from '../menu/Menu'
import { buildReportTarget, requestContentReport } from '../../utils/contentReport'
import { makerName } from '../../data/communityShowcase'
import { useSaves } from './useCommunityHub'

/** Sets the tab title after the shell has set its own for the route. */
export function usePageTitle(title) {
  useEffect(() => {
    const id = window.setTimeout(() => { document.title = title }, 0)
    return () => window.clearTimeout(id)
  }, [title])
}

export const pieceHref = (piece) => `/community/${piece.id}`

/** Save, copy a link and report, for the pages that list pieces. */
export function usePieceActions(toast) {
  const { saves, toggleSave } = useSaves()
  const save = useCallback(async (piece) => {
    const now = await toggleSave(piece.id)
    if (now === null) return
    toast?.(now ? 'Saved' : 'Removed from saved')
  }, [toggleSave, toast])
  const copyLink = useCallback(async (piece) => {
    const url = `${window.location.origin}${pieceHref(piece)}`
    try {
      await navigator.clipboard.writeText(url)
      toast?.('Link copied')
    } catch {
      toast?.('Could not copy the link. Copy it from the address bar after opening the piece.', 'error')
    }
  }, [toast])
  const report = useCallback((piece) => {
    const target = buildReportTarget({
      kind: 'design',
      id: piece.id,
      name: `${piece.title} by ${makerName(piece)}`,
      page: `${window.location.origin}${pieceHref(piece)}`,
    })
    if (!requestContentReport(target)) window.location.assign('/feedback')
  }, [])
  return { saves, save, copyLink, report }
}

/** The menu rows for one piece, shared by the tile and the detail page. */
export function pieceMenuItems(piece, actions) {
  const saved = actions.saves.has(piece.id)
  return [
    { id: 'save', label: saved ? 'Remove from saved' : 'Save', onSelect: () => actions.save(piece) },
    { id: 'copy', label: 'Copy link', onSelect: () => actions.copyLink(piece) },
    { id: 'report', label: 'Report', onSelect: () => actions.report(piece) },
  ]
}

/**
 * One menu for a whole list of tiles: a tile's "..." records which piece and
 * which button opened it, so a closed list holds no menus.
 */
export function useTileMenu(actions) {
  const [state, setState] = useState(null)
  const openFor = useCallback((piece, trigger, keyboard, at = 'first') => setState({ piece, trigger, keyboard, at }), [])
  const close = useCallback(() => setState(null), [])
  const items = useMemo(() => (state ? pieceMenuItems(state.piece, actions) : []), [state, actions])
  const menu = createElement(Menu, {
    open: !!state,
    onClose: close,
    anchor: state?.trigger || null,
    label: state ? `Actions for ${state.piece.title}` : 'Actions',
    items,
    viaKeyboard: !!state?.keyboard,
    startAt: state?.at || 'first',
    className: 'cm-menu',
  })
  return { openFor, menu, open: !!state }
}
