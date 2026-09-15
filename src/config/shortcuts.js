// THE KEYS THE APP ACTUALLY BINDS, so a page cannot document a different one.
//
// /info's "Keyboard shortcuts" section and its getting-started list both told
// visitors to press Ctrl/⌘ + K for the COMMAND PALETTE. That palette is
// PillNav's, it opens on `/`, and PillNav guards the handler with
// `!e.metaKey && !e.ctrlKey` — so the documented chord is one that handler
// explicitly ignores, in two places on the page whose job is to explain the
// product.
//
// ⌘K IS BOUND, JUST NOT TO THAT. HomeCommandBar.jsx focuses the homepage search
// bar on ⌘K / Ctrl+K and prints a ⌘K keycap beside it, which is honest: that
// keycap names the control it is attached to, on the one page that has it. The
// defect was never "⌘K does nothing" — it was /info attributing the homepage
// bar's chord to a different, global control on every page. Do not delete that
// binding on the strength of this note.
//
// The fourth row was a plain invention: `?` promised to "show all shortcuts",
// and `?` is bound nowhere in src/ — there is no overlay for it to open.
//
// A help page whose instructions do not work is worse than no help page, and it
// is the kind of copy nobody re-reads: it was true of some earlier build, the
// binding moved, and the sentence stayed. So the sentence no longer holds the
// key — this file does, the handler reads it, the page prints it, and
// tests/unit/documented-shortcuts.test.js fails the build if a shortcut is
// documented that nothing binds.
//
// Modifier-free single keys, deliberately. Each is guarded at its binding by a
// check that the visitor is not typing in a field, which is what makes a bare
// key safe to claim.

/** Opens the command palette. PillNav.jsx binds it; /info prints it. */
export const SEARCH_KEY = '/'

/** Rolls a fresh random palette. Bound in PaletteBuilder.jsx on `e.code`. */
export const PALETTE_ROLL_KEY = 'Space'

/** Closes the topmost layer. Owned by usePopover.js and PillNav.jsx. */
export const DISMISS_KEY = 'Esc'

/**
 * Every shortcut the product is willing to document, in the order /info lists
 * them. `keys` renders as one <kbd> per entry; `what` is the description
 * already on the page, not new copy.
 *
 * A row here is a promise that the key is bound. Adding one without a binding
 * is what this file exists to prevent, so the guard test asserts each `binding`
 * string is present in the file named — the same mirror-plus-drift-test shape
 * used for plans.js and DESIGN.md.
 */
export const DOCUMENTED_SHORTCUTS = [
  {
    keys: [SEARCH_KEY],
    what: 'command palette',
    file: 'src/components/PillNav.jsx',
    // The handler reads SEARCH_KEY rather than a literal, which is the point of
    // this file — so the string to find is the constant, and the companion
    // assertion in the guard test is that PillNav has NOT gone back to `'/'`.
    binding: 'e.key === SEARCH_KEY',
  },
  {
    keys: [PALETTE_ROLL_KEY],
    what: 'random palette (Colour Studio)',
    file: 'src/pages/PaletteBuilder.jsx',
    binding: "e.code !== 'Space'",
  },
  {
    keys: [DISMISS_KEY],
    what: 'close any modal or popup',
    file: 'src/hooks/usePopover.js',
    binding: "e.key === 'Escape'",
  },
]
