// Shared Firebase Admin initialisation for serverless functions.
// Files in /api/_lib are NOT deployed as routes (underscore-prefixed).
//
// For full security (ID-token verification + privileged Firestore writes) set
// FIREBASE_SERVICE_ACCOUNT_KEY in Vercel to the JSON of a service account key.
// Without it, the app falls back to application-default credentials, which is
// enough for reads in some environments but NOT for verifyIdToken.

import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { getAuth } from 'firebase-admin/auth'

let initialised = false
let credentialStatus = 'missing' // 'ok' | 'init-failed' | 'invalid-json' | 'missing'

function ensureApp() {
  if (initialised || getApps().length) {
    initialised = true
    return
  }
  const projectId =
    process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || 'uil4b-357c5'
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
  let serviceAccount = null
  if (raw) {
    try {
      serviceAccount = JSON.parse(raw)
      if (serviceAccount?.type === 'service_account' && serviceAccount?.private_key) {
        // Env vars frequently mangle the PEM line breaks. Normalise escaped
        // "\n" sequences back into real newlines so cert() can read the key —
        // the single most common cause of verifyIdToken failing in production.
        if (typeof serviceAccount.private_key === 'string') {
          serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n')
        }
        credentialStatus = 'ok'
      } else {
        credentialStatus = 'invalid-json'
        serviceAccount = null
      }
    } catch {
      credentialStatus = 'invalid-json'
    }
  }
  try {
    if (serviceAccount) {
      initializeApp({ credential: cert(serviceAccount), projectId: serviceAccount.project_id || projectId })
    } else {
      initializeApp({ projectId })
    }
  } catch {
    // cert() rejected the parsed key — almost always a mangled private_key.
    // Record it so credentialProblem() can explain, then fall back so the app
    // still boots.
    if (serviceAccount) credentialStatus = 'init-failed'
    try { initializeApp({ projectId }) } catch { /* already initialised */ }
  }
  initialised = true
}

// Human-readable explanation of why verifyIdToken would fail, surfaced in API
// error responses so misconfiguration is diagnosable from the browser.
export function credentialProblem() {
  ensureApp()
  if (credentialStatus === 'ok') return null
  if (credentialStatus === 'init-failed') {
    return 'FIREBASE_SERVICE_ACCOUNT_KEY was parsed but Firebase rejected it — usually the private_key line breaks were mangled when pasting it into the environment variable. Re-generate the key (Firebase Console → Project Settings → Service Accounts → Generate new private key) and paste the raw .json contents exactly, unmodified.'
  }
  if (credentialStatus === 'invalid-json') {
    return 'FIREBASE_SERVICE_ACCOUNT_KEY is set but is not the service account JSON. In Firebase Console → Project Settings → Service Accounts, click "Generate new private key" and paste the entire contents of the downloaded .json file (it starts with {"type":"service_account",...}) — not the code snippet shown on that page.'
  }
  return 'FIREBASE_SERVICE_ACCOUNT_KEY is not set in the server environment. Generate a private key in Firebase Console → Project Settings → Service Accounts and paste the .json file contents into Vercel.'
}

export function adminDb() {
  ensureApp()
  return getFirestore()
}

export function adminAuth() {
  ensureApp()
  return getAuth()
}

export const FieldValueIncrement = async (n) => {
  const { FieldValue } = await import('firebase-admin/firestore')
  return FieldValue.increment(n)
}
