import { useEffect } from 'react'

// Marks inline <code> short enough to be one token, so the stylesheet can keep
// it on one line.
//
// CSS cannot select by text length, and the two kinds of inline code want
// opposite wrapping. A short token such as `--accent-strong` must never break
// mid-token (the hyphens are break opportunities, so it splits after "--"). A
// long declaration such as `clamp(1.5rem, 1.1479rem + 0.0939vw, 2.5rem)` must
// be allowed to wrap anywhere, or it overflows a phone column.
//
// Blocks inside <pre> are left alone: they scroll rather than wrap. Code that a
// component renders after mount (measured tables) is picked up by the observer.

/** Inline code up to this many characters counts as a single token. */
export const SHORT_CODE_MAX = 20

/** Set or clear `data-short` on every inline <code> under `root`. */
export function markShortCode(root) {
  for (const el of root.querySelectorAll('code')) {
    if (el.closest('pre')) continue
    const short = el.textContent.trim().length <= SHORT_CODE_MAX
    if (short !== el.hasAttribute('data-short')) el.toggleAttribute('data-short', short)
  }
}

export default function useShortCode(ref) {
  useEffect(() => {
    const root = ref.current
    if (!root) return undefined
    markShortCode(root)
    // Child and text changes only: toggling the attribute is not observed, so
    // marking cannot re-trigger itself.
    const observer = new MutationObserver(() => markShortCode(root))
    observer.observe(root, { childList: true, subtree: true, characterData: true })
    return () => observer.disconnect()
  }, [ref])
}
