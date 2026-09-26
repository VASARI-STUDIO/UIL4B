import { useId } from 'react'
import { useProject } from '../contexts/ProjectContext'
import { IDENTITY_NAME_MAX, IDENTITY_DESCRIPTION_MAX } from '../utils/kitIdentity'
import BrandLogoField from './BrandLogoField'

// The Pro UI kit's personalisation: a name, an optional description and the
// logo. All three are written into the working design, so they follow the
// account and a saved project like every other design choice. The kit's
// renderer reads and cleans them (utils/kitIdentity.js); the fields hold what
// was typed, so a trailing space survives while someone is still typing.
export default function KitIdentityFields() {
  const { design, updateDesign } = useProject()
  const id = useId()
  const raw = design?.identity && typeof design.identity === 'object' ? design.identity : {}
  const value = (v) => (typeof v === 'string' ? v : '')
  const set = (key) => (e) => updateDesign({ identity: { [key]: e.target.value } })

  return (
    <>
      <div className="exp-identity" role="group" aria-labelledby={`${id}-title`}>
        <span className="exp-identity-title" id={`${id}-title`}>Identity</span>
        <label className="exp-field" htmlFor={`${id}-name`}>
          <span className="exp-field-label">Name</span>
          <input
            id={`${id}-name`}
            type="text"
            value={value(raw.name)}
            onChange={set('name')}
            maxLength={IDENTITY_NAME_MAX}
            autoComplete="off"
            spellCheck="false"
          />
        </label>
        <label className="exp-field" htmlFor={`${id}-desc`}>
          <span className="exp-field-label">Description <span className="exp-field-opt">Optional</span></span>
          <textarea
            id={`${id}-desc`}
            rows={2}
            value={value(raw.description)}
            onChange={set('description')}
            maxLength={IDENTITY_DESCRIPTION_MAX}
          />
        </label>
      </div>
      <BrandLogoField use="kit" />
    </>
  )
}
