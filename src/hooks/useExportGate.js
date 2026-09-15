import { useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useLoginPrompt } from '../contexts/LoginPromptContext'

// COPYING A VALUE IS FREE FOREVER. TAKING A FILE AWAY NEEDS AN ACCOUNT.
//
// Founder decision, 2026-09-15: "make users have to make an account to use alot
// of the extra feature". The line he picked, from a measured map of what the
// product actually gated, is EXPORT AND DOWNLOAD — and the measurement is why
// the line sits there rather than somewhere else.
//
// Measured signed out across all fourteen /create tools, by pressing each
// page's own take-away control and watching for the login dialog: only TWO
// asked for an account — /create/palette ("Save / export") and /create/type-scale
// ("Save to a project"). Everything else handed over its artefact to nobody in
// particular. Meanwhile saving, the AI tools, community submissions and
// checkout had all been gated for months. So the product already believed that
// keeping work needed an account, and had simply never applied that to the file
// you walk away with.
//
// WHAT THIS DELIBERATELY DOES NOT GATE, because the distinction is the whole
// design and getting it wrong would cost more than it earns:
//
//   * Using a tool. Every tool stays fully usable signed out. This is the
//     founder's "gate depth, not the tools", and /info's promise — "No account
//     needed — open any tool and start working" — stays literally true.
//   * COPYING. Copy CSS, copy a hex, copy an SVG snippet, copy an emoji: all
//     free, permanently. A copy is ephemeral and it is how someone decides the
//     tool is worth an account in the first place. Gating it would tax the
//     evaluation rather than the value.
//   * A user's own data. Settings' "export my data" is a privacy commitment,
//     not a feature, and is already behind auth. Admin's CSVs are behind admin
//     verification. Neither goes near this gate.
//
// FREE, NOT PRO. `free: true` is passed through to the dialog so it presents a
// free account rather than a purchase — the Pro split on export FORMATS is a
// separate, older thing (see exportFormats.js, where `pro` gates the book and
// the brand-guidelines deck). A visitor meeting this gate is being asked to
// sign up, not to pay, and the dialog says so.
//
// The reason string follows the convention every other gate in this app uses —
// a short lowercase verb phrase naming the action, rendered by LoginPopup as
// "log in to <reason>". Existing ones: 'save this palette', 'submit a design to
// the community', 'save icons'. No new marketing sentence is written here or at
// any call site; the phrase is the action.

/**
 * Returns a gate: `await gate('export the converted file')` resolves true when
 * the download may proceed and false when the visitor dismissed the dialog.
 *
 * Signed in, it resolves true without rendering anything, so the fast path for
 * everyone who has an account costs one boolean.
 */
export default function useExportGate() {
  const { user } = useAuth()
  const { requireLogin } = useLoginPrompt()

  return useCallback(async (reason) => {
    if (user) return true
    // requireLogin resolves to the user on success and null on dismiss. The
    // caller must treat false as "stop", NOT as "download anyway" — which is
    // why every call site reads `if (!(await gate(...))) return` rather than
    // ignoring the result.
    const signedIn = await requireLogin(reason, { free: true })
    return !!signedIn
  }, [user, requireLogin])
}
