// Firebase Configuration & Authentication + Cloud Firestore Service for LedgerFlow
import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  signOut,
  sendPasswordResetEmail,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Official Hardcoded Firebase Configuration for LedgerFlow
export const firebaseConfig = {
  apiKey: "AIzaSyBGNgfLAAVn6MAMUnNLV_vLmppoa4_adno",
  authDomain: "ledger-flow-a16d0.firebaseapp.com",
  projectId: "ledger-flow-a16d0",
  storageBucket: "ledger-flow-a16d0.firebasestorage.app",
  messagingSenderId: "1080242233860",
  appId: "1:1080242233860:web:b4093e40b9de4f7f4a4b51",
  measurementId: "G-3PY5RDC872"
};

export function getActiveFirebaseConfig() {
  return firebaseConfig;
}

export function isFirebaseConfigured() {
  return true;
}

// Global Firebase Instances
let appInstance = null;
let authInstance = null;
let dbInstance = null;

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

function getFirebaseApp() {
  if (!appInstance) {
    appInstance = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  }
  return appInstance;
}

export function getFirebaseAuth() {
  if (!authInstance) {
    authInstance = getAuth(getFirebaseApp());
  }
  return authInstance;
}

export function getFirebaseFirestore() {
  if (!dbInstance) {
    try {
      dbInstance = getFirestore(getFirebaseApp());
    } catch (e) {
      console.warn('Firestore initialization warning:', e);
    }
  }
  return dbInstance;
}

// 1. Sign Up with Email & Password
export async function signUpWithEmail(email, password, displayName = '') {
  const auth = getFirebaseAuth();
  const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
  if (displayName && displayName.trim() && userCredential.user) {
    try {
      await updateProfile(userCredential.user, { displayName: displayName.trim() });
    } catch (e) {
      console.warn('Failed to set initial displayName:', e);
    }
  }
  return userCredential.user;
}

// 2. Sign In with Email & Password
export async function signInWithEmail(email, password) {
  const auth = getFirebaseAuth();
  const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
  return userCredential.user;
}

// 3. Sign In / Sign Up with Google (Popup)
export async function signInWithGoogle() {
  const auth = getFirebaseAuth();
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

// 4. Sign Out
export async function logOut() {
  const auth = getFirebaseAuth();
  if (auth) {
    await signOut(auth);
  }
}

// 5. Send Password Reset Email
export async function sendResetEmail(email) {
  const auth = getFirebaseAuth();
  await sendPasswordResetEmail(auth, email.trim());
}

// 6. Listen to Auth State Changes
export function subscribeToAuthState(callback) {
  const auth = getFirebaseAuth();
  return onAuthStateChanged(auth, (user) => {
    callback(user, true);
  });
}

// 7. Cloud Push: Save Ledger directly to Firebase Cloud Firestore
export async function saveLedgerToFirestore(uid, data) {
  if (!uid) return null;
  const db = getFirebaseFirestore();
  if (!db) return null;
  try {
    const docRef = doc(db, "ledgers", uid);
    const payload = {
      uid,
      transactions: Array.isArray(data.transactions) ? data.transactions : [],
      currency: data.currency || { code: 'NGN', symbol: '₦', label: 'NGN (₦)' },
      updatedAt: data.updatedAt || new Date().toISOString()
    };
    await setDoc(docRef, payload, { merge: true });
    return payload.updatedAt;
  } catch (err) {
    console.warn('Firestore cloud push error:', err);
    throw err;
  }
}

// 8. Cloud Pull: Retrieve Ledger directly from Firebase Cloud Firestore
export async function fetchLedgerFromFirestore(uid) {
  if (!uid) return null;
  const db = getFirebaseFirestore();
  if (!db) return null;
  try {
    const docRef = doc(db, "ledgers", uid);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data();
    }
    return null;
  } catch (err) {
    console.warn('Firestore cloud pull error:', err);
    return null;
  }
}
