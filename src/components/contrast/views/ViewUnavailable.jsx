// Shown inside the frame in place of a view whose chunk failed to download
// (offline, a stale deploy). The page around it, the colour fields and the
// numbers all keep working. PairExample hands it `onRetry`, which rebuilds that
// view's lazy component so the next try fetches the chunk again, and
// `onFailed`, which tells it to drop the picture role and the marking while
// this stub is showing.
import { useEffect } from 'react'
import { ToolButton } from '../../tool/ToolLayout'

export default function ViewUnavailable({ onRetry, onFailed }) {
  useEffect(() => {
    onFailed?.(true)
    return () => onFailed?.(false)
  }, [onFailed])
  return (
    <div className="cc-pv-fail" role="status">
      <p className="cc-lede">{"This view didn't load."}</p>
      {onRetry && <ToolButton onClick={onRetry}>Try again</ToolButton>}
    </div>
  )
}
