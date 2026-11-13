import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  User as FirebaseUser,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

export const SCOPES = ['https://www.googleapis.com/auth/gmail.send'];

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const googleAuthProvider = new GoogleAuthProvider();
SCOPES.forEach((scope) => googleAuthProvider.addScope(scope));
googleAuthProvider.setCustomParameters({ prompt: 'consent select_account' });

// In-memory cache ONLY (never localStorage or sessionStorage)
let cachedAccessToken: string | null = null;
let cachedGmailEmail: string | null = null;

onAuthStateChanged(auth, (user: FirebaseUser | null) => {
  if (!user) {
    cachedAccessToken = null;
    cachedGmailEmail = null;
  }
});

export const googleSignIn = async (): Promise<{
  user: FirebaseUser;
  accessToken: string;
}> => {
  const result = await signInWithPopup(auth, googleAuthProvider);
  const credential = GoogleAuthProvider.credentialFromResult(result);
  if (!credential?.accessToken) {
    throw new Error('Failed to get Gmail access token from Google sign-in.');
  }
  cachedAccessToken = credential.accessToken;
  cachedGmailEmail = result.user.email || null;
  return { user: result.user, accessToken: credential.accessToken };
};

export const getAccessToken = (): string | null => cachedAccessToken;

export const getConnectedGmailEmail = (): string | null => cachedGmailEmail;

export const clearAccessToken = (): void => {
  cachedAccessToken = null;
  cachedGmailEmail = null;
};

export const firebaseSignOut = async (): Promise<void> => {
  cachedAccessToken = null;
  cachedGmailEmail = null;
  await auth.signOut();
};
