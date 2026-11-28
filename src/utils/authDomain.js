// Which host serves the Firebase sign-in helper (/__/auth/*).
//
// On the production hosts it is the site itself: vercel.json proxies /__/auth/*
// and /__/firebase/* to the Firebase project, so Google's account chooser names
// this site and the sign-in stays first-party. Previews, localhost and test
// builds have no such proxy, so they keep the project's own firebaseapp.com host.

export const FIREBASE_AUTH_DOMAIN = 'uil4b-357c5.firebaseapp.com'
export const OWN_AUTH_HOSTS = ['uil4b.com', 'www.uil4b.com']

export function authDomainFor(hostname, envDomain) {
  if (OWN_AUTH_HOSTS.includes(hostname)) return hostname
  return envDomain || FIREBASE_AUTH_DOMAIN
}
