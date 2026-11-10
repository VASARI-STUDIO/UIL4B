// Open the header's Create menu from the page.
//
// The header is a separate component with no public "open this menu" call, so this asks first (a cancelable
// `uil4b:open-menu` event the header can answer with preventDefault()) and otherwise presses the same control a
// person would: the Create trigger where the bar shows it, or the menu button that opens the sheet (whose Create
// section is open by default) on a phone.
export default function openCreateMenu() {
  const asked = new CustomEvent('uil4b:open-menu', { detail: { section: 'create' }, cancelable: true })
  if (!window.dispatchEvent(asked)) return
  const trigger = [...document.querySelectorAll('.pnav-trigger')]
    .find((b) => b.offsetParent !== null && b.textContent.trim().startsWith('Create'))
  if (trigger) {
    if (trigger.getAttribute('aria-expanded') !== 'true') trigger.click()
    trigger.focus()
    return
  }
  const sheet = document.querySelector('.pnav-mobile')
  if (sheet && sheet.offsetParent !== null && sheet.getAttribute('aria-expanded') !== 'true') sheet.click()
}
