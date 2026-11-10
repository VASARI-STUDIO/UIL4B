import GalleryEndGate, { GateFadeCards } from '../library/GalleryEndGate'
import { reportUpgradeGate } from '../../contexts/ProModalContext'
import { GALLERY_GATE_COPY } from '../../data/galleryGateCopy'
import { hasPromptPreview } from '../../data/promptPreviewAssets'
import { promptStandinSrc } from '../../utils/lockedStandin'

// The closing gate of the community prompt library, under the overview and at
// the end of a list: the shared GalleryEndGate with this gallery's words
// (data/galleryGateCopy).
//
// The faded rows are the locked prompts' soft stand-in pictures
// (utils/lockedStandin), never the real posters, and the component is handed
// ids only: no title or text of a locked prompt reaches it. With no stand-in to
// show, the rows are neutral text bars.
//
//   tier         'anonymous' | 'free' (galleryTier); a Pro viewer has no gate.
//   shown        how many prompts this viewer can open.
//   total        how many the library holds.
//   viaAccount   how many of the locked ones a free account opens (zero from
//                the free rung up). Above zero, the gate offers the account.
//   accountOpens how many prompts a free account opens in all.
//   locked       the locked rows, for their ids.
//   onLogin      opens the page's sign-in flow.
const FADE_CELLS = 6

export default function PromptGate({ id, tier, shown, total, viaAccount, accountOpens, locked, onLogin }) {
  const copy = GALLERY_GATE_COPY.prompts
  const stand = locked.filter((p) => hasPromptPreview(p.id)).slice(0, FADE_CELLS).map((p) => promptStandinSrc(p.id))
  const fade = stand.length
    ? <GateFadeCards shape="poster" srcs={stand} min={280} />
    : <GateFadeCards shape="lines" count={FADE_CELLS} min={280} />
  if (tier === 'anonymous' && viaAccount > 0) {
    return (
      <GalleryEndGate
        kind="anon"
        id={id}
        heading={copy.anon.heading(accountOpens)}
        body={copy.anon.body(shown, total, accountOpens)}
        primary={{ label: copy.anon.action, onClick: onLogin }}
        secondary={{ label: copy.anon.secondary, to: '/plans' }}
        fade={fade}
      />
    )
  }
  const more = total - shown
  return (
    <GalleryEndGate
      kind="pro"
      id={id}
      heading={copy.pro.heading(more)}
      body={copy.pro.body(shown, total, more)}
      primary={{ label: copy.pro.action, to: '/plans', onClick: () => reportUpgradeGate('prompt-library-community-lock') }}
      fade={fade}
    />
  )
}
