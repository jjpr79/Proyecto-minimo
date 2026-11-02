import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth, db } from './firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  accessToken: string | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true, accessToken: null, signIn: async () => {}, signOut: async () => {}, refreshUser: async () => {} });

export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('https://www.googleapis.com/auth/drive.file');
googleProvider.setCustomParameters({
  prompt: 'select_account consent',
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log('[AUTH] onAuthStateChanged() - User detected:', user?.uid);
      try {
        if (user) {
          // Fetch user data from Firestore to get the stored photoURL
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          console.log('[AUTH] After getDoc(users/{uid}):', userDoc.exists());
          const userData = userDoc.exists() ? userDoc.data() : {};

          // Merge with auth user
          const mergedUser = {
            ...user,
            photoURL: userData.photoURL || user.photoURL,
          } as User;

          setUser(mergedUser);
        } else {
          setUser(null);
          setAccessToken(null);
        }
      } catch (error) {
        console.error("[AUTH] Error al cargar datos del usuario:", error);
      } finally {
        console.log('[AUTH] setLoading(false) in finally');
        setLoading(false);
      }
    });
    return unsubscribe;
  }, []);

  const signIn = async () => {
    console.log('[AUTH] signIn() started');
    try {
      console.log('[AUTH] Before signInWithPopup()');
      const result = await signInWithPopup(auth, googleProvider);
      console.log('[AUTH] After signInWithPopup()');
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        setAccessToken(credential.accessToken);
      }
    } catch (error: any) {
      console.error('[AUTH] signIn() error:', error);
      if (error.code === 'auth/popup-closed-by-user') {
        return;
      }
      throw error;
    }
  };

  const signOut = async () => {
    await auth.signOut();
    setAccessToken(null);
  };

  const refreshUser = async () => {
    if (auth.currentUser) {
      const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
      const userData = userDoc.exists() ? userDoc.data() : {};
      const mergedUser = {
        ...auth.currentUser,
        photoURL: userData.photoURL || auth.currentUser.photoURL,
      } as User;
      setUser(mergedUser);
    }
  };

  return <AuthContext.Provider value={{ user, loading, accessToken, signIn, signOut, refreshUser }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
