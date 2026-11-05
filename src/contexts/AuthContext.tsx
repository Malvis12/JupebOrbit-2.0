import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { UserProfile } from '../types';

interface AuthContextType {
  user: User | null;
  userData: UserProfile | null;
  loading: boolean;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  signUpWithEmail: (email: string, pass: string, username: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateProfileData: (data: Partial<UserProfile>) => Promise<void>;
  // Admin helper methods
  isAdmin: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeDoc: (() => void) | null = null;
    let isMounted = true;

    // Safety timeout: 8 seconds for slower networks
    const safetyTimeout = setTimeout(() => {
      if (isMounted) {
        setLoading(false);
      }
    }, 8000);

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      if (!isMounted) return;
      clearTimeout(safetyTimeout);
      setUser(currentUser);

      if (unsubscribeDoc) {
        unsubscribeDoc();
        unsubscribeDoc = null;
      }

      if (currentUser) {
        try {
          const userRef = doc(db, 'users', currentUser.uid);
          unsubscribeDoc = onSnapshot(userRef, (snapshot) => {
            if (!isMounted) return;
            if (snapshot.exists()) {
              setUserData({ uid: currentUser.uid, ...snapshot.data() } as UserProfile);
            } else {
              setUserData(null);
            }
            setLoading(false);
          }, (err) => {
            console.warn('Firestore user snapshot warning:', err);
            if (isMounted) setLoading(false);
          });
        } catch (e) {
          console.warn('User doc error:', e);
          if (isMounted) setLoading(false);
        }
      } else {
        setUserData(null);
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      clearTimeout(safetyTimeout);
      unsubscribeAuth();
      if (unsubscribeDoc) unsubscribeDoc();
    };
  }, []);

  const signInWithEmail = async (email: string, pass: string) => {
    await signInWithEmailAndPassword(auth, email, pass);
  };

  const signUpWithEmail = async (email: string, pass: string, username: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    const userRef = doc(db, 'users', cred.user.uid);
    await setDoc(userRef, {
      username: username || 'Student',
      email: cred.user.email,
      onboardingComplete: false,
      dailyStreak: 1,
      aggregateScore: 0,
      combination: ['Physics', 'Chemistry', 'Mathematics'],
      createdAt: new Date().toISOString()
    }, { merge: true });
  };

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    const userRef = doc(db, 'users', result.user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      await setDoc(userRef, {
        username: result.user.displayName || 'Student',
        email: result.user.email,
        onboardingComplete: false,
        dailyStreak: 1,
        aggregateScore: 0,
        combination: ['Physics', 'Chemistry', 'Mathematics'],
        createdAt: new Date().toISOString()
      });
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  const updateProfileData = async (data: Partial<UserProfile>) => {
    if (!user) return;
    const userRef = doc(db, 'users', user.uid);
    await setDoc(userRef, data, { merge: true });
  };

  // Admin helper method
  const isAdmin = () => {
    return userData?.role === 'admin';
  };

  return (
    <AuthContext.Provider value={{
      user,
      userData,
      loading,
      signInWithEmail,
      signUpWithEmail,
      signInWithGoogle,
      logout,
      resetPassword,
      updateProfileData,
      isAdmin
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};