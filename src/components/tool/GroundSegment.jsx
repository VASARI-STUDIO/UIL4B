// The Dark / Light specimen ground control of the type tools' shared bar. It
// lives apart from TypeToolsBar so that file exports only the item builder.
// Its styles are in type-tools-nav.css, which TypeToolsBar loads.
export default function GroundSegment({ ground, onGround, className }) {
  return (
    <div className={className ? `ttb-seg ${className}` : 'ttb-seg'} role="group" aria-label="Specimen ground">
      <button type="button" aria-pressed={ground === 'd'} onClick={() => onGround('d')}>
        <span className="ttb-sq ttb-sq--dark" aria-hidden="true" />Dark
      </button>
      <button type="button" aria-pressed={ground === 'l'} onClick={() => onGround('l')}>
        <span className="ttb-sq ttb-sq--light" aria-hidden="true" />Light
      </button>
    </div>
  )
}
