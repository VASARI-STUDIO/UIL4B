import { getOwnerHandle, getFlair } from '../utils/constants'

// Renders a user's name with two optional identity signals:
//   • Owner treatment — for site owner(s), the name is upgraded to a canonical
//     handle, bolded, and given a 👑 with a "Site owner" tooltip on hover/focus.
//   • Flair — a small tag (Designer, Developer, Top Community Sharer, …) shown
//     after the name when the user has one set.
// Presentation-only and safe to drop anywhere a name string is shown.
export default function UserName({
  name,
  email,
  flair,
  bold = false,
  className = '',
}) {
  const owner = getOwnerHandle(email)
  const shown = owner?.name || name || (email ? email.split('@')[0] : 'User')
  const flairDef = getFlair(flair)
  const strong = bold || !!owner

  return (
    <span className={`uname${strong ? ' uname--bold' : ''}${className ? ` ${className}` : ''}`}>
      {owner ? (
        <span className="uname-owner" tabIndex={0} aria-label={`${shown}, ${owner.title}`}>
          <span className="uname-text">{shown}</span>
          <span className="uname-crown" aria-hidden="true">{owner.crown}</span>
          <span className="uname-tip" role="tooltip">{owner.title}</span>
        </span>
      ) : (
        <span className="uname-text">{shown}</span>
      )}
      {flairDef && (
        <span className={`flair flair--${flairDef.tone}`}>{flairDef.label}</span>
      )}
    </span>
  )
}
