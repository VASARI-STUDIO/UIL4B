import { Link } from 'react-router-dom'
import { menuOpenKey } from '../menu/menuModel'
import { isInspiration, makerByHandle } from '../../data/communityShowcase'
import { pieceHref } from './pieceActions'

/** A render from the app's own files, as avif then webp. */
export function Picture({ image, alt, eager = false, className = '', size = 'thumb' }) {
  const file = image[size] || image.thumb
  return (
    <picture>
      <source type="image/avif" srcSet={file.avif} />
      <source type="image/webp" srcSet={file.webp} />
      <img
        className={className}
        src={file.webp}
        width={file.width}
        height={file.height}
        alt={alt}
        loading={eager ? 'eager' : 'lazy'}
      />
    </picture>
  )
}

const Heart = ({ on }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill={on ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z" />
  </svg>
)
const Dots = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <circle cx="5" cy="12" r="1.7" /><circle cx="12" cy="12" r="1.7" /><circle cx="19" cy="12" r="1.7" />
  </svg>
)

/** The "..." button; on a phone it is the only way to save, so it is always drawn. */
export function MoreButton({ piece, onOpen, className = 'cm-more' }) {
  return (
    <button
      type="button"
      className={className}
      aria-haspopup="menu"
      aria-label={`Actions for ${piece.title}`}
      onClick={(e) => onOpen(piece, e.currentTarget, e.detail === 0)}
      onKeyDown={(e) => {
        const at = menuOpenKey(e)
        if (!at) return
        e.preventDefault()
        onOpen(piece, e.currentTarget, true, at)
      }}
    >
      <Dots />
    </button>
  )
}

export function PieceTile({ piece, saved, onSave, onOpenMenu, showMaker = true }) {
  const maker = makerByHandle(piece.maker)
  return (
    <article className="cm-tile">
      <div className="cm-frame" data-fit={piece.fit || (isInspiration(piece) ? 'cover' : 'contain')} data-pos={piece.pos}>
        <Link to={pieceHref(piece)} className="cm-frame-link" aria-label={`${piece.title}, ${maker?.name || ''}`}>
          <Picture image={piece.image} alt={piece.alt} />
        </Link>
        <div className="cm-discs">
          <button
            type="button"
            className="cm-disc cm-heart"
            aria-pressed={saved}
            aria-label={saved ? `Remove ${piece.title} from saved` : `Save ${piece.title}`}
            onClick={() => onSave(piece)}
          >
            <Heart on={saved} />
          </button>
          <MoreButton piece={piece} onOpen={onOpenMenu} className="cm-disc cm-more" />
        </div>
      </div>
      <h3 className="cm-tile-title">{piece.title}</h3>
      <p className="cm-tile-meta">
        {showMaker && maker && <><Link to={`/u/${maker.handle}`} className="cm-maker-link">{maker.name}</Link>{' · '}</>}
        {piece.kind}
        <span className="cm-sample"> · Sample</span>
      </p>
    </article>
  )
}

export function PieceGrid({ pieces, actions, tileMenu, showMaker = true, label }) {
  return (
    <ul className="cm-grid" aria-label={label}>
      {pieces.map((piece) => (
        <li key={piece.id}>
          <PieceTile
            piece={piece}
            saved={actions.saves.has(piece.id)}
            onSave={actions.save}
            onOpenMenu={tileMenu.openFor}
            showMaker={showMaker}
          />
        </li>
      ))}
    </ul>
  )
}

export function SampleLine() {
  return (
    <p className="cm-sample-line">
      Every piece here is a sample from a made-up brand, made with UIL4B’s own exports. Work members share will sit beside them.
    </p>
  )
}
