import { NavLink } from 'react-router-dom'

// The free cap's refusal, rendered where it was thrown.
//
// ProjectContext throws "Free plan saves up to 3 projects — go Pro for
// unlimited." and this component renders that sentence — the message is the
// context's, not typed here, so the cap and its wording have one owner. What
// this adds is the two things a vanishing toast could not carry: it stays until
// the person acts on it, and the "go Pro" it mentions is a link they can
// follow. The link text is the one the type-scale save menu already uses for
// the same edge, so every surface says one thing.
//
// Lived in Projects.jsx (#436) until the Palette Builder's save menu needed the
// same treatment — its doSave was still sending the refusal out as the success
// toast. Its two rules are in global.css, because pages/projects.css only ships
// with the /projects chunk and the homepage renders the palette tool.
export default function SaveRefusal({ message, testId }) {
  return (
    <p className="uh-save-refusal" role="alert" data-testid={testId}>
      <span>{message}</span>{' '}
      <NavLink to="/plans" className="uh-quota-link">See what Pro adds</NavLink>
    </p>
  )
}
