import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

// Firebase config — these are client-side keys (not secret).
// Replace with your own Firebase project config.
// IMPORTANT: Set Firestore region to australia-southeast1 (Sydney)
// when creating the database in Firebase Console.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyADQoAyU3qwAls2bUW6rfE1csZa0Ud6EKE',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'uil4b-357c5.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'uil4b-357c5',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'uil4b-357c5.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '30029260768',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:30029260768:web:1125a25d6a19765180ad85',
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)

// Google OAuth client ID (public, not secret). Used for both the Firebase
// popup flow and Google Identity Services One Tap. Must also be registered in
// Firebase Console → Authentication → Sign-in method → Google → Web SDK config.
export const GOOGLE_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  '30029260768-7vestvvslbrqt1tbdbvi9poa8fgn7gqp.apps.googleusercontent.com'

export const googleProvider = new GoogleAuthProvider()
googleProvider.setCustomParameters({ prompt: 'select_account' })
export const db = getFirestore(app)
export default app
