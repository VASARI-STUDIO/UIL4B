import LibrarySearch from './LibrarySearch'

// The control block that sits between a Library masthead and its grid: search,
// then any number of filter groups, then an optional action.
//
// It is STICKY, which the Palette Library already was and the Gradient Library
// was not. That asymmetry is the whole argument for this component: on a page
// of ~100 cards the filters scroll away exactly when you start wanting them,
// and whether that happened depended on which of the two pages you were on.
//
// `children` are the filter groups. Keeping them as children rather than a
// `filters` prop lets a surface pass one group, three, or none without the
// component guessing what a filter is — the Gradient Library needs mood AND
// type, the Palette Library needs one combined set, and the Font Gallery needs
// category plus sort.

// `extra` is a second row INSIDE the sticky container, for controls that change
// how the results are rendered rather than which results there are — the Font
// Gallery's preview text and specimen size. It belongs in the toolbar rather
// than under it because pinning the search row while the rest scrolled out from
// under it is a fault that tool already had once and fixed.

export default function LibraryToolbar({
  search,
  action,
  extra,
  children,
  className = '',
}) {
  return (
    <div className={`lbry-toolbar${className ? ` ${className}` : ''}`}>
      <div className="lbry-toolbar-row">
        {search && (
          <LibrarySearch
            value={search.value}
            onChange={search.onChange}
            onFocus={search.onFocus}
            placeholder={search.placeholder}
            label={search.label}
          />
        )}
        {children && <div className="lbry-toolbar-filters">{children}</div>}
        {action && <div className="lbry-toolbar-action">{action}</div>}
      </div>
      {extra && <div className="lbry-toolbar-row lbry-toolbar-row--extra">{extra}</div>}
    </div>
  )
}
