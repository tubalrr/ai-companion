/* AI Companion — Firebase Authentication
 * Optional Firebase Auth client.
 *
 * Before enabling:
 * 1. Create a Firebase project.
 * 2. Enable Authentication providers in Firebase Console.
 * 3. Replace the placeholder firebaseConfig values below.
 * 4. Add your GitHub Pages domain to Firebase Authentication > Settings > Authorized domains.
 *
 * Firebase web config is not a password/secret. Never place Admin SDK credentials
 * or service-account private keys in this file.
 */

import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";

const firebaseConfig = window.AI_COMPANION_FIREBASE_CONFIG || {
  apiKey: "YOUR_FIREBASE_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.firebasestorage.app",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_FIREBASE_APP_ID"
};

const isConfigured = Object.values(firebaseConfig).every(
  value => typeof value === "string" &&
    value.length > 0 &&
    !value.startsWith("YOUR_")
);

let app = null;
let auth = null;

if (isConfigured) {
  app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  auth = getAuth(app);
}

const requireAuth = () => {
  if (!auth) {
    throw new Error("Firebase Authentication is not configured.");
  }
  return auth;
};

export const firebaseAuth = {
  isConfigured,

  get currentUser() {
    return auth?.currentUser || null;
  },

  onAuthStateChanged(callback) {
    return requireAuth() && onAuthStateChanged(auth, callback);
  },

  async signInWithGoogle() {
    const provider = new GoogleAuthProvider();
    return signInWithPopup(requireAuth(), provider);
  },

  async signIn(email, password) {
    return signInWithEmailAndPassword(requireAuth(), email, password);
  },

  async signUp(email, password, displayName = "") {
    const credential = await createUserWithEmailAndPassword(
      requireAuth(),
      email,
      password
    );

    if (displayName.trim()) {
      await updateProfile(credential.user, {
        displayName: displayName.trim()
      });
    }

    return credential;
  },

  async signOut() {
    return signOut(requireAuth());
  }
};

window.AICompanionFirebaseAuth = firebaseAuth;
