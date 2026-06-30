import Discover from './Discover'

// /discover/gradients — the gradient library. NOT a fork: it's the shared
// Discover surface scoped to a single category via the `forcedType` prop, which
// renders the focused (toolbar + grid only) variant. Keeps one source of truth
// for the card, modal, saves, search and Murphy's-law states.
export default function DiscoverGradients({ toast }) {
  return <Discover toast={toast} forcedType="gradients" />
}
