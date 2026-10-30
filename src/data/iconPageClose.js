// The words of the Icon and Emoji libraries' closing block, under every tab.
//
// One headline and one line for everyone, so nothing swaps while auth loads;
// only the second button follows the viewer (iconCloseSecondary). It never says
// "Log in": the one Log in on the page is the signed-out band above the grid.
// Kept apart from iconPackTiers.js so that table stays small for the modules
// that import it from the shell.
export const ICON_CLOSE_COPY = {
  heading: 'Now pick the colours and type.',
  body: 'Palettes, contrast checks, type scales and file conversion are in the same toolkit, free to try without an account.',
  primary: 'Open the Palette Builder',
  secondary: {
    anon: 'See the plans',
    free: 'See what Pro includes',
    paid: 'Open your workspace',
  },
}

/**
 * The second button of the closing block, by viewer.
 *
 * `known` is false while whether an account exists, or which plan it holds, is
 * still on its way. The answer is then a hidden stand-in holding the widest
 * label (the free viewer's), so the row is already its final width and nothing
 * moves when the real button arrives. `tier` is the output of viewerTier().
 */
export function iconCloseSecondary({ tier, known }) {
  const labels = ICON_CLOSE_COPY.secondary
  if (!known) return { placeholder: labels.free }
  if (tier === 'paid') return { label: labels.paid, to: '/projects' }
  return { label: tier === 'free' ? labels.free : labels.anon, to: '/plans' }
}
