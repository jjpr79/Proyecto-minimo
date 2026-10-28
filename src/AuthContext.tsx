import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, db } from './firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

const AuthContext = createContext<{ user: User | null; loading: boolean }>({ user: null, loading: true });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Timeout de seguridad: si auth tarda más de 5 segundos, forzar carga
    const safetyTimeout = setTimeout(() => {
      console.log("Safety timeout reached, forcing loading false.");
      setLoading(false);
    }, 5000);

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      clearTimeout(safetyTimeout);
      console.log("Auth state changed, user:", user);
      try {
        setUser(user);
        if (user) {
          console.log("Syncing user profile...");
          await setDoc(doc(db, 'users', user.uid), {
            email: user.email,
            displayName: user.displayName || '',
            photoURL: user.photoURL || '',
            createdAt: serverTimestamp(),
          }, { merge: true });
          console.log("User profile synced.");
        }
      } catch (e) {
        console.error("Error creating user profile:", e);
      } finally {
        console.log("Setting loading to false.");
        setLoading(false);
      }
    });
    return () => {
      clearTimeout(safetyTimeout);
      unsubscribe();
    };
  }, []);

  return <AuthContext.Provider value={{ user, loading }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
