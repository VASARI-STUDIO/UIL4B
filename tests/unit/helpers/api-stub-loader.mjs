// A module loader hook for unit tests that run a REAL api/ route handler without
// Firebase or Stripe in the room. Only the two modules that reach outside the
// process are replaced; the route, its _lib helpers and the rate limiter load
// for real.
//
//   register('./helpers/api-stub-loader.mjs', import.meta.url)
//
//   api/_lib/firebase-admin.js  ->  adminAuth() / adminDb() / credentialProblem()
//                                   answer from globalThis.__FB__ { auth, db, credentialProblem }
//   api/_lib/stripe.js          ->  getStripeServer() answers globalThis.__STRIPE__
//
// The fakes themselves live in ./api-fakes.js.

const STUBS = {
  'stub:firebase-admin': `
    export const adminAuth = () => globalThis.__FB__.auth
    export const adminDb = () => globalThis.__FB__.db
    export const credentialProblem = () => globalThis.__FB__.credentialProblem ?? null
    export const adminStorageBucket = async () => { throw new Error('storage is not stubbed') }
    export const FieldValueIncrement = async () => { throw new Error('FieldValueIncrement is not stubbed') }
  `,
  'stub:stripe': 'export const getStripeServer = () => globalThis.__STRIPE__',
}

export async function resolve(specifier, context, nextResolve) {
  const resolved = await nextResolve(specifier, context)
  if (/\/api\/_lib\/firebase-admin\.js$/.test(resolved.url)) return { url: 'stub:firebase-admin', shortCircuit: true }
  if (/\/api\/_lib\/stripe\.js$/.test(resolved.url)) return { url: 'stub:stripe', shortCircuit: true }
  return resolved
}

export async function load(url, context, nextLoad) {
  if (STUBS[url]) return { format: 'module', source: STUBS[url], shortCircuit: true }
  return nextLoad(url, context)
}
