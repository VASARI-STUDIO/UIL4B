import { useEffect, useState } from 'react'
import { NO_BUILTIN_ICONS, builtinIcons, loadBuiltinIcons } from '../utils/iconsBuiltin'

/**
 * The built-in icon set, `{ icons, packs }`, empty until public/icons-data.js has
 * loaded (and if it never does). It starts the load on mount and re-renders the
 * caller when the data lands, so a memo that lists `.icons` as a dependency
 * recomputes. See src/utils/iconsBuiltin.js.
 */
export default function useBuiltinIcons() {
  const [data, setData] = useState(builtinIcons)
  useEffect(() => {
    if (data) return undefined
    let live = true
    loadBuiltinIcons().then((d) => { if (live) setData(d === NO_BUILTIN_ICONS ? null : d) })
    return () => { live = false }
  }, [data])
  return data || NO_BUILTIN_ICONS
}
