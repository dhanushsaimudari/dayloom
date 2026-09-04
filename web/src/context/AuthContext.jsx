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
import { auth } from '../services/firebase.js';
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

  const login = async (email, password) => {
    const res = await signInWithEmailAndPassword(auth, email, password);
    setCurrentUser(res.user);
    const profileData = await fetchProfileData();
    return { user: res.user, profileData };
  };

  const signup = async (email, password) => {
    const res = await createUserWithEmailAndPassword(auth, email, password);
    setCurrentUser(res.user);
    const profileData = await fetchProfileData();
    return { user: res.user, profileData };
  };

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const res = await signInWithPopup(auth, provider);
    setCurrentUser(res.user);
    const profileData = await fetchProfileData();
    return { user: res.user, profileData };
  };

  const logout = async () => {
    try {
      await firebaseSignOut(auth);
    } catch (e) {
      console.warn('[AuthContext] Firebase logout notice:', e.message);
    }
    setCurrentUser(null);
    setUserProfile(null);
    setUserSettings(null);
  };

  const reauthenticate = async (password) => {
    if (!auth.currentUser || !auth.currentUser.email) {
      throw new Error('No active authenticated session found.');
    }
    const credential = EmailAuthProvider.credential(auth.currentUser.email, password);
    return await reauthenticateWithCredential(auth.currentUser, credential);
  };

  const resetPassword = async (email) => {
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
