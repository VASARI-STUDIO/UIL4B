// The words of a typed icon search: lower-cased and split on whitespace, so "Arrow  up" is ["arrow", "up"].
export const typedWords = (q) => String(q || '').toLowerCase().split(/\s+/).filter(Boolean)
