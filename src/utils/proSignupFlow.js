// True while the Pro sign-up layer is open. An account made there is on its way
// to checkout, so the app skips the onboarding redirect for it (App.jsx reads
// this where it routes brand-new accounts).
let active = false

export const beginProSignup = () => { active = true }
export const endProSignup = () => { active = false }
export const isProSignup = () => active
