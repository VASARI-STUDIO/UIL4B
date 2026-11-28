import { useEffect, useLayoutEffect } from 'react'
import useProUpgradeLayer from '../../hooks/useProUpgradeLayer'

// The sign-up layer's state and node, loaded on demand by ProLayerProvider so
// the plan data it reads stays out of the entry chunk. A request made before
// this module arrived is carried out once, on mount.
export default function ProLayerHost({ request, onRequestDone, onOpenChange }) {
  const layer = useProUpgradeLayer()

  useEffect(() => {
    if (!request) return
    layer.openLayer(request.opts)
    onRequestDone()
    // Runs once per request; openLayer is rebuilt every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request])

  // In the layout phase, so the page behind is no longer inert by the time the
  // dialog hands focus back to its opener on the next frame.
  useLayoutEffect(() => { onOpenChange(layer.open) }, [layer.open, onOpenChange])

  return layer.node
}
