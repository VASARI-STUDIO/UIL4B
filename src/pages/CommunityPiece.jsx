import { Link, useParams } from 'react-router-dom'
import { MoreButton, Picture, PieceGrid } from '../components/community/pieceUi'
import { usePageTitle, usePieceActions, useTileMenu } from '../components/community/pieceActions'
import { isInspiration, makerByHandle, moreFor, pieceById } from '../data/communityShowcase'
import '../styles/pages/community.css'

const Back = () => (
  <Link to="/community" className="cm-back">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m15 6-6 6 6 6" /></svg>
    Community
  </Link>
)

export function MakerMark({ maker, size = 40 }) {
  return (
    <span className="cm-mark" style={{ '--cm-mark': maker.mark, '--cm-mark-on': maker.on || '#fff', '--cm-mark-size': `${size}px` }} aria-hidden="true">{maker.name.charAt(0)}</span>
  )
}

function NotFound() {
  usePageTitle('UI L4B | Piece not found')
  return (
    <div className="cm-page">
      <Back />
      <div className="cm-empty cm-empty-page">
        <h1 className="cm-empty-h">We couldn’t find that piece</h1>
        <p className="cm-empty-t">The link may be wrong, or the piece is no longer here.</p>
        <Link to="/community" className="cm-btn cm-btn-tonal">Browse the showcase</Link>
      </div>
    </div>
  )
}

export default function CommunityPiece({ toast }) {
  const { id } = useParams()
  const piece = pieceById(id)
  if (!piece) return <NotFound />
  return <Piece key={piece.id} piece={piece} toast={toast} />
}

function Piece({ piece, toast }) {
  const actions = usePieceActions(toast)
  const tileMenu = useTileMenu(actions)
  const maker = makerByHandle(piece.maker)
  const more = moreFor(piece)
  const saved = actions.saves.has(piece.id)
  const inspiration = isInspiration(piece)
  usePageTitle(`${piece.title} by ${maker.name} | UI L4B`)

  const primary = inspiration ? (
    <button type="button" className="cm-btn cm-btn-ink" onClick={() => actions.save(piece)}>{saved ? 'Saved' : 'Save'}</button>
  ) : (
    <Link to="/create/palette" className="cm-btn cm-btn-ink">Open in Palette Builder</Link>
  )

  return (
    <div className="cm-page cm-detail">
      <Back />
      <div className="cm-d-grid">
        <div className="cm-d-render" data-fit={inspiration ? 'cover' : 'contain'}>
          <Picture image={piece.image} alt={piece.alt} size="large" eager />
        </div>
        <div className="cm-d-rail">
          <h1 className="cm-d-h1">{piece.title}</h1>
          <div className="cm-d-maker">
            <MakerMark maker={maker} />
            <div>
              <Link to={`/u/${maker.handle}`} className="cm-d-maker-name">{maker.name}</Link>
              <p className="cm-d-maker-line">{maker.line}</p>
            </div>
          </div>
          <dl className="cm-facts">
            <div><dt>Kind</dt><dd>{piece.kind}</dd></div>
            {piece.look && <div><dt>Export look</dt><dd>{piece.look.name}{piece.look.pro && <span className="cm-pro"> Pro</span>}</dd></div>}
            {piece.madeIn && <div><dt>Made in</dt><dd>{piece.madeIn}</dd></div>}
            {piece.colours && (
              <div>
                <dt>Colours</dt>
                <dd>
                  <ul className="cm-swatches">
                    {piece.colours.map((c) => (
                      <li key={c}><span className="cm-sw" tabIndex={0} role="img" aria-label={c} data-hex={c} style={{ background: c }} /></li>
                    ))}
                  </ul>
                </dd>
              </div>
            )}
            {piece.credit && <div><dt>Credit</dt><dd>{piece.credit.own ? `${maker.name}’s own photo` : ''}</dd></div>}
          </dl>
          <div className="cm-d-actions">{primary}</div>
          <div className="cm-d-secondary">
            {!inspiration && <button type="button" className="cm-btn cm-btn-text" aria-pressed={saved} onClick={() => actions.save(piece)}>{saved ? 'Saved' : 'Save'}</button>}
            <button type="button" className="cm-btn cm-btn-text" onClick={() => actions.copyLink(piece)}>Copy link</button>
            <button type="button" className="cm-btn cm-btn-text" onClick={() => actions.report(piece)}>Report</button>
          </div>
          <p className="cm-d-sample">Sample piece. {maker.name} is a made-up brand.</p>
        </div>
      </div>

      <section className="cm-more-sec" aria-labelledby="cm-more-h">
        <h2 id="cm-more-h" className="cm-h2">{more.head}</h2>
        <PieceGrid pieces={more.pieces} actions={actions} tileMenu={tileMenu} label={more.head} />
        <p className="cm-more-link"><Link to={`/u/${maker.handle}`}>{`See ${maker.name}’s profile`}</Link></p>
      </section>
      {tileMenu.menu}

      <div className="cm-bar">
        {primary}
        <MoreButton piece={piece} onOpen={tileMenu.openFor} className="cm-bar-more" />
      </div>
    </div>
  )
}
