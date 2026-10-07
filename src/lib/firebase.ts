import { initializeApp } from 'firebase/app';
import { browserSessionPersistence, connectAuthEmulator, initializeAuth } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';

export const usingEmulators = import.meta.env.DEV && import.meta.env.VITE_USE_EMULATORS === 'true';
const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyC67Qs_Nta9gn1ODkWmswskovkY_INZ26Q',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'filaflow-a856b.firebaseapp.com',
  projectId: usingEmulators ? 'demo-filaflow' : (import.meta.env.VITE_FIREBASE_PROJECT_ID || 'filaflow-a856b'),
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'filaflow-a856b.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '901464461518',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:901464461518:web:93c14a44e897a8c24b809f',
};

const app = initializeApp(config);
export const auth = initializeAuth(app, { persistence: browserSessionPersistence });
export const db = getFirestore(app);
auth.languageCode = 'es';

if (usingEmulators) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
}
