// What /checkout tells a buyer when the payment session could not be made.
//
// The server's own `error` text is written for logs and for support, and a
// network or SDK failure carries whatever its library said. None of that
// reaches the page: a refusal is told by its status (or reason code) in the
// page's own words, and anything unrecognised reads as GENERIC. The raw text is
// for the console (see Checkout.jsx).

export const CHECKOUT_GENERIC = 'Checkout couldn’t start. Try again in a moment.'
const VERIFY_EMAIL = 'Verify your email address before you subscribe.'

// By HTTP status from api/create-checkout.js. Only refusals a buyer can act on
// are here; a 500, a 403 without a code and the rest stay generic.
const BY_STATUS = {
  400: 'Checkout couldn’t open with those details. Pick the billing period again, or try again in a moment.',
  401: 'Your sign-in has expired. Log in again to continue.',
  409: 'Checkout can’t open for this account right now. Nothing was charged.',
  429: 'Too many checkout attempts. Please wait a few minutes before trying again. Nothing was charged.',
  503: 'The price isn’t available right now. Try again in a moment. Nothing was charged.',
}

// An error whose message is already one of this page's own sentences (the
// payment form timing out, Stripe.js not loading) and is safe to show as is.
export function plainError(message) {
  return Object.assign(new Error(message), { plain: true })
}

// What the panel offers besides the sentence: 'log-in' replaces Try again (a
// retry with the same expired sign-in would fail the same way), '' leaves it.
export function checkoutErrorAction(err) {
  return err?.status === 401 && !err?.plain ? 'log-in' : ''
}

export function checkoutErrorText(err) {
  if (err?.plain) return err.message
  const text = err?.code === 'email-unverified'
    ? VERIFY_EMAIL
    : BY_STATUS[err?.status] || CHECKOUT_GENERIC
  // The id lets support find the exact server log line.
  return err?.correlationId ? `${text} Reference: ${err.correlationId}` : text
}
