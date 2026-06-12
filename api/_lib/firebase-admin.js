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
let credentialStatus = 'missing' // 'ok' | 'invalid-json' | 'missing'

function ensureApp() {
  if (initialised || getApps().length) {
    initialised = true
    return
  }
  const projectId =
    process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || 'uil4b'
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
  let serviceAccount = null
  if (raw) {
    try {
      serviceAccount = JSON.parse(raw)
      if (serviceAccount?.type === 'service_account' && serviceAccount?.private_key) {
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
    initializeApp({ projectId })
  }
  initialised = true
}

// Human-readable explanation of why verifyIdToken would fail, surfaced in API
// error responses so misconfiguration is diagnosable from the browser.
export function credentialProblem() {
  ensureApp()
  if (credentialStatus === 'ok') return null
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
