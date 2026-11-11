// A mailto: link that answers a feedback or help item from the owner's own mail
// app. The address came from a public form, so it is only used when it is one
// plain address: no spaces, commas, angle brackets or query characters that a
// mail app would read as extra recipients or headers. Anything else gives null
// and the caller shows the address as text only.
const PLAIN_ADDRESS = /^[A-Za-z0-9.!#$%&'*+/=^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/

export function replyMailto({ email, subject, type } = {}) {
  const address = typeof email === 'string' ? email.trim() : ''
  if (!address || address.length > 254 || !PLAIN_ADDRESS.test(address)) return null
  const topic = String(subject || '').replace(/[\r\n]+/g, ' ').trim().slice(0, 120)
    || (type === 'help' ? 'your help request' : 'your feedback')
  return `mailto:${address}?subject=${encodeURIComponent(`Re: ${topic}`)}`
}
