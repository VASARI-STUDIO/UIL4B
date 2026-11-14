import { useAuth } from '../contexts/AuthContext'
import { useLoginPrompt } from '../contexts/LoginPromptContext'
import '../styles/pages/reading-end.css'

// The close of a reading page for a signed-out visitor: one line on what an
// account keeps and one outline control. Signed in, or while the account is
// still resolving, it draws nothing, so the page does not jump.
export default function ReadingEnd() {
  const { user, loading } = useAuth()
  const { openLogin } = useLoginPrompt()
  if (loading || user) return null
  return (
    <section className="rd-end" aria-labelledby="rd-end-h">
      <h2 id="rd-end-h">Save your work and pick it up on any device.</h2>
      <p>Every tool works signed out. An account lets you save and carry settings to another device.</p>
      <button type="button" className="ui-pill ui-pill-out ui-pill-lg" aria-haspopup="dialog" onClick={() => openLogin({ signup: true })}>
        Create a free account
      </button>
    </section>
  )
}
