import { useState, useCallback } from 'react'
import VerticalPanelTile, { VptGrid } from '../library/VerticalPanelTile'
import GalleryPreviewDialog from '../library/GalleryPreviewDialog'
import { gradientCss } from '../../data/gradientGallery'
import { gradientMeta } from '../../utils/galleryMeta'
import { useLoginPrompt } from '../../contexts/LoginPromptContext'

// The browse grid on /discover/gradients. The rows come from the page that
// renders it: swatches are plain CSS backgrounds, likes live in localStorage.
// A tile opens the preview dialog, which holds the stops, the text contrast and
// the hand-off to the Gradient Generator (the ?gs= URL scheme).

const LIKES_KEY = 'vs-gradient-likes'

function loadLikes() {
  try { return new Set(JSON.parse(localStorage.getItem(LIKES_KEY) || '[]')) } catch { return new Set() }
}

export default function GradientGalleryGrid({ toast, gradients = [], labelledBy }) {
  const [likes, setLikes] = useState(loadLikes)
  const [previewAt, setPreviewAt] = useState(null)
  const closePreview = useCallback(() => setPreviewAt(null), [])
  const { requireLogin } = useLoginPrompt()

  // Likes belong to an account: signed out, a press asks to sign in first and
  // the like lands once it succeeds. The stored set is read again after the
  // wait, because signing in may have merged the account's likes into it, and
  // written before the state, because a popup grid can close during sign-in.
  const toggleLike = useCallback(async (id) => {
    if (!await requireLogin('like gradients', { free: true, signup: true })) return
    const next = loadLikes()
    if (next.has(id)) next.delete(id)
    else next.add(id)
    try { localStorage.setItem(LIKES_KEY, JSON.stringify([...next])) } catch { /* quota / disabled */ }
    setLikes(next)
  }, [requireLogin])

  const copyCss = useCallback((g) => {
    const css = `background: ${gradientCss(g.type, g.angle, g.stops)};`
    navigator.clipboard.writeText(css).then(() => {
      toast?.(`Copied ${g.name} CSS`)
    }).catch(() => {
      toast?.('Failed to copy')
    })
  }, [toast])

  const actionsOf = (g) => [
    { key: 'css', label: 'Copy CSS', ariaLabel: `Copy ${g.name} CSS`, onClick: () => copyCss(g) },
    {
      key: 'like',
      label: likes.has(g.id) ? 'Liked' : 'Like',
      ariaLabel: likes.has(g.id) ? `Unlike ${g.name}` : `Like ${g.name}`,
      onClick: () => toggleLike(g.id),
    },
  ]

  return (
    <>
      <VptGrid labelledBy={labelledBy}>
        {gradients.map((g, i) => (
          <VerticalPanelTile
            key={g.id}
            name={g.name}
            meta={gradientMeta(g)}
            mediaStyle={{ background: gradientCss(g.type, g.angle, g.stops) }}
            onOpen={() => setPreviewAt(i)}
            liked={likes.has(g.id)}
            onLike={() => toggleLike(g.id)}
          />
        ))}
      </VptGrid>
      {previewAt != null && gradients[previewAt] && (
        <GalleryPreviewDialog
          kind="gradient"
          items={gradients}
          index={previewAt}
          onIndex={setPreviewAt}
          onClose={closePreview}
          metaOf={gradientMeta}
          actionsOf={actionsOf}
          toast={toast}
        />
      )}
    </>
  )
}
