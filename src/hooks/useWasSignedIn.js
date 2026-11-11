import { useState } from 'react'

// Whether the account was signed in at any point while this page was open, so a
// sign-out from the page can tell itself from a link opened signed out.
export function useWasSignedIn(signedIn) {
  const [was, setWas] = useState(signedIn)
  if (signedIn && !was) setWas(true)
  return was
}
