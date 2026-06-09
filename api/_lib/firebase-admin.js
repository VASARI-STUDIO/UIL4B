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

function ensureApp() {
  if (initialised || getApps().length) {
    initialised = true
    return
  }
  const projectId =
    process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || 'uil4b'
  try {
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
      ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
      : null
    if (serviceAccount) {
      initializeApp({ credential: cert(serviceAccount), projectId })
    } else {
      initializeApp({ projectId })
    }
  } catch {
    initializeApp({ projectId })
  }
  initialised = true
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
