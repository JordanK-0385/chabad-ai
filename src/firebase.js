import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey:        import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:    import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:     import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  appId:         import.meta.env.VITE_FIREBASE_APP_ID,
};

export const firebaseReady = !!firebaseConfig.apiKey && firebaseConfig.apiKey !== "undefined" && firebaseConfig.apiKey.length > 5;

let app = null, auth = null, db = null, googleProvider = null;

if (firebaseReady) {
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    googleProvider = new GoogleAuthProvider();
  } catch (e) {
    console.warn("Firebase init failed:", e.message);
  }
} else {
  console.warn("Firebase non configuré — variables .env.local manquantes");
}

export { auth, db, googleProvider };

export function signInWithGoogle() {
  if (!auth || !googleProvider) return Promise.reject(new Error("Firebase non configuré"));
  return signInWithPopup(auth, googleProvider);
}

export function doSignOut() {
  if (!auth) return Promise.resolve();
  return signOut(auth);
}

export function onAuthChange(cb) {
  if (!auth) { cb(null); return () => {}; }
  return onAuthStateChanged(auth, cb);
}
