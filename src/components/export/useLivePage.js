import { useEffect, useState } from 'react'
import { loadAuthSdk } from '../../utils/firebaseAccess'
import { brandHash, cachedPreview, fetchPagePreview, previewKey } from './exportPreviewClient'

// One page of a theme drawn with the person's brand, from the server (exportPreviewClient). Resolves to
//   { status: 'idle' }                nothing asked (not enabled, or no page)
//   { status: 'loading' }             asked, no answer yet
//   { status: 'ok', html }            the page, for a sandboxed frame
//   { status: 'upgrade' | 'unavailable' }   the stock picture stays
// A page already answered is read from the client's memory at once. `brand` should be memoised by the caller: the key carries
// its hash, so a new object with the same content does not ask again.
export default function useLivePage({ enabled, theme, page, brand }) {
  const key = enabled && page ? previewKey(theme, page, brandHash(brand)) : ''
  const [answer, setAnswer] = useState({ key: '', status: 'idle' })
  const hit = key ? cachedPreview(theme, page, brand) : null

  useEffect(() => {
    if (!key || hit) return undefined
    let live = true
    fetchPagePreview({ theme, page, brand }, { loadAuth: loadAuthSdk }).then((a) => { if (live) setAnswer({ key, ...a }) })
    return () => { live = false }
  }, [key, hit, theme, page, brand])

  if (!key) return { status: 'idle' }
  if (hit) return hit
  return answer.key === key ? answer : { status: 'loading' }
}
