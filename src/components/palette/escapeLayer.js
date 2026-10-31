// The dialog's Escape layers, shared with a scene that opens its own sheet.
//
// useModalDialog closes on Escape in the capture phase. A layer (a menu, a sheet)
// registers itself in `layerRef` while it is open, so the dialog's Escape closes
// just that layer, and listens in the capture phase itself to consume the key:
// the dialog, and the Palette Builder's window handler, both leave the dialog
// open, and a second Escape finds no layer and closes it.
import { createContext, useContext, useEffect, useRef } from 'react'

export const EscapeLayerContext = createContext(null)

/** Registers `close` as the layer Escape closes first while `open`. */
export function useEscapeLayer(layerRef, open, close) {
  useEffect(() => {
    if (!open) return undefined
    layerRef.current = close
    const onKey = (e) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return
      e.preventDefault()
      e.stopPropagation()
      close()
    }
    document.addEventListener('keydown', onKey, true)
    return () => {
      document.removeEventListener('keydown', onKey, true)
      if (layerRef.current === close) layerRef.current = null
    }
  }, [layerRef, open, close])
}

/** The same layer, for a scene: the dialog hands its layer ref down through context. */
export function useSceneEscape(open, close) {
  const spare = useRef(null)
  useEscapeLayer(useContext(EscapeLayerContext) || spare, open, close)
}
