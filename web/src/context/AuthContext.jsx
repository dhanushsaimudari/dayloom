import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  reauthenticateWithCredential,
  EmailAuthProvider,
  sendPasswordResetEmail
} from 'firebase/auth';
import { auth, isFirebaseConfigured, firebaseInitError } from '../services/firebase.js';
import { getUserProfile } from '../services/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [userSettings, setUserSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchProfileData = async () => {
    try {
      const data = await getUserProfile();
      if (data) {
        setUserProfile(data.profile || {});
        setUserSettings(data.settings || {});
      }
      return data;
    } catch (err) {
      console.warn('[AuthContext] Profile data fetch notice:', err.message);
      return null;
    }
  };

  useEffect(() => {
    if (!auth || !isFirebaseConfigured) {
      console.warn('[AuthContext] Firebase auth is unavailable. Skipping auth state listener.');
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        await fetchProfileData();
      } else {
        setCurrentUser(null);
        setUserProfile(null);
        setUserSettings(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const ensureAuthReady = () => {
    if (!auth || !isFirebaseConfigured) {
      throw new Error(
        'Firebase Authentication is not configured. Please supply valid VITE_FIREBASE_API_KEY environment variables to Dayloom.'
      );
    }
  };

  const login = async (email, password) => {
    ensureAuthReady();
    const res = await signInWithEmailAndPassword(auth, email, password);
    setCurrentUser(res.user);
    const profileData = await fetchProfileData();
    return { user: res.user, profileData };
  };

  const signup = async (email, password) => {
    ensureAuthReady();
    const res = await createUserWithEmailAndPassword(auth, email, password);
    setCurrentUser(res.user);
    const profileData = await fetchProfileData();
    return { user: res.user, profileData };
  };

  const loginWithGoogle = async () => {
    ensureAuthReady();
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const res = await signInWithPopup(auth, provider);
    setCurrentUser(res.user);
    const profileData = await fetchProfileData();
    return { user: res.user, profileData };
  };

  const logout = async () => {
    if (auth) {
      try {
        await firebaseSignOut(auth);
      } catch (e) {
        console.warn('[AuthContext] Firebase logout notice:', e.message);
      }
    }
    setCurrentUser(null);
    setUserProfile(null);
    setUserSettings(null);
  };

  const reauthenticate = async (password) => {
    ensureAuthReady();
    if (!auth.currentUser || !auth.currentUser.email) {
      throw new Error('No active authenticated session found.');
    }
    const credential = EmailAuthProvider.credential(auth.currentUser.email, password);
    return await reauthenticateWithCredential(auth.currentUser, credential);
  };

  const resetPassword = async (email) => {
    ensureAuthReady();
    if (!email || !email.trim()) {
      throw new Error('Please enter your email address to receive a password reset link.');
    }
    return await sendPasswordResetEmail(auth, email.trim());
  };

  const refreshProfile = () => fetchProfileData();

  const value = {
    currentUser,
    userProfile,
    userSettings,
    setUserSettings,
    loading,
    isFirebaseConfigured,
    firebaseInitError,
    login,
    signup,
    loginWithGoogle,
    logout,
    reauthenticate,
    resetPassword,
    refreshProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
