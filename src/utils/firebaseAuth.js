import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js';
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
} from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js';
import { FIREBASE_CONFIG } from '../firebaseConfig.js';

let authPromise = null;

async function getFirebaseAuth() {
  if (!authPromise) {
    authPromise = (async () => {
      let config = FIREBASE_CONFIG;
      if (!config || !config.apiKey) {
        const res = await fetch('/__/firebase/init.json');
        if (!res.ok) throw new Error('Configuration Firebase introuvable.');
        config = await res.json();
      }
      const app = getApps().length ? getApps()[0] : initializeApp(config);
      return getAuth(app);
    })();
  }
  return authPromise;
}

export function translateAuthError(err) {
  const code = err?.code || '';
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/user-not-found':
    case 'auth/wrong-password':
      return 'Email ou mot de passe incorrect.';
    case 'auth/invalid-email':
      return 'Adresse email invalide.';
    case 'auth/email-already-in-use':
      return 'Un compte existe déjà avec cette adresse email.';
    case 'auth/weak-password':
      return 'Le mot de passe doit contenir au moins 6 caractères.';
    case 'auth/popup-closed-by-user':
      return 'Fenêtre de connexion Google fermée avant validation.';
    case 'auth/unauthorized-domain':
      return 'Domaine non autorisé dans Firebase Authentication (Settings > Authorized domains).';
    case 'auth/too-many-requests':
      return 'Trop de tentatives. Veuillez réessayer dans quelques minutes.';
    default:
      return err?.message || 'Erreur d’authentification.';
  }
}

export async function subscribeAuth(callback) {
  const auth = await getFirebaseAuth();
  return onAuthStateChanged(auth, callback);
}

export async function loginWithEmail(email, password) {
  const auth = await getFirebaseAuth();
  const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
  return cred.user;
}

export async function registerWithEmail(fullName, email, password) {
  const auth = await getFirebaseAuth();
  const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
  if (fullName && fullName.trim()) {
    await updateProfile(cred.user, { displayName: fullName.trim() });
  }
  return cred.user;
}

export async function loginWithGoogle() {
  const auth = await getFirebaseAuth();
  const provider = new GoogleAuthProvider();
  const cred = await signInWithPopup(auth, provider);
  return cred.user;
}

export async function resetPassword(email) {
  const auth = await getFirebaseAuth();
  await sendPasswordResetEmail(auth, email.trim());
}

export async function logoutUser() {
  const auth = await getFirebaseAuth();
  await signOut(auth);
}
