import { db } from '../firebase';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  query, 
  where, 
  serverTimestamp 
} from 'firebase/firestore';
import { UserProfile } from '../types';

/**
 * Obtiene el perfil de un usuario desde 'users/{uid}'.
 */
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    if (!snap.exists()) return null;
    return {
      uid: snap.id,
      ...snap.data()
    } as UserProfile;
  } catch (err) {
    console.error(`[userService] Error obteniendo perfil de ${uid}:`, err);
    return null;
  }
}

/**
 * Guarda o actualiza el perfil de un usuario en 'users/{uid}'.
 */
export async function saveUserProfile(uid: string, data: Partial<UserProfile>): Promise<void> {
  await setDoc(doc(db, 'users', uid), {
    ...data,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

/**
 * Comprueba si un usuario posee el rol de Administrador Global en 'admins/{uid}'.
 */
export async function checkIsGlobalAdmin(uid: string): Promise<boolean> {
  try {
    const adminDoc = await getDoc(doc(db, 'admins', uid));
    return adminDoc.exists();
  } catch (err) {
    console.error(`[userService] Error verificando rol global admin para ${uid}:`, err);
    return false;
  }
}

/**
 * Activa o revoca el rol de Administrador Global para un usuario.
 */
export async function toggleGlobalAdminStatus(uid: string, email: string, makeAdmin: boolean): Promise<void> {
  if (makeAdmin) {
    await setDoc(doc(db, 'admins', uid), {
      email,
      createdAt: serverTimestamp(),
    });
  } else {
    await deleteDoc(doc(db, 'admins', uid));
  }
}

/**
 * Lista todos los usuarios registrados junto con su bandera de administración global.
 * Utilizado por el panel de administración global.
 */
export async function getAllUsersWithAdminStatus(): Promise<(UserProfile & { isGlobalAdmin: boolean })[]> {
  const usersSnap = await getDocs(collection(db, 'users'));
  const adminsSnap = await getDocs(collection(db, 'admins'));
  const adminUids = new Set(adminsSnap.docs.map(d => d.id));

  return usersSnap.docs.map(d => {
    const data = d.data();
    return {
      uid: d.id,
      email: data.email || 'Sin email',
      displayName: data.displayName || data.username || '',
      photoURL: data.photoURL,
      username: data.username,
      phoneNumber: data.phoneNumber,
      googleDriveFolderId: data.googleDriveFolderId,
      isGlobalAdmin: adminUids.has(d.id),
    };
  });
}

/**
 * Busca un usuario por email utilizando el directorio seguro 'usersByEmail'.
 * Utiliza getDoc directo (O(1)) para prevenir bloqueos de 'Missing or insufficient permissions'.
 */
export async function findUserByEmail(email: string): Promise<UserProfile | null> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return null;

  try {
    // 1. Búsqueda directa O(1) en el directorio 'usersByEmail'
    try {
      const directorySnap = await getDoc(doc(db, 'usersByEmail', normalized));
      if (directorySnap.exists()) {
        const data = directorySnap.data();
        return {
          uid: data.uid || directorySnap.id,
          email: data.email || normalized,
          displayName: data.displayName || normalized.split('@')[0],
          photoURL: data.photoURL,
        } as UserProfile;
      }
    } catch (dirErr) {
      console.warn("[userService] Aviso en lectura de usersByEmail:", dirErr);
    }

    // 2. Consulta autorizada en la colección 'users'
    const q1 = query(collection(db, 'users'), where('email', '==', normalized));
    const snap1 = await getDocs(q1);

    if (!snap1.empty) {
      const docSnap = snap1.docs[0];
      const data = docSnap.data();
      const profile: UserProfile = {
        uid: docSnap.id,
        email: data.email || normalized,
        displayName: data.displayName || data.username || normalized.split('@')[0],
        photoURL: data.photoURL,
      };

      // Auto-poblar silenciosamente usersByEmail para optimizaciones futuras
      try {
        setDoc(doc(db, 'usersByEmail', normalized), {
          uid: profile.uid,
          email: profile.email,
          displayName: profile.displayName,
          photoURL: profile.photoURL || '',
          updatedAt: serverTimestamp(),
        }, { merge: true }).catch(() => {});
      } catch {
        // Silencioso
      }

      return profile;
    }

    // 3. Consulta secundaria por si el correo fue guardado con mayúsculas/minúsculas originales
    if (email.trim() !== normalized) {
      const q2 = query(collection(db, 'users'), where('email', '==', email.trim()));
      const snap2 = await getDocs(q2);
      if (!snap2.empty) {
        const docSnap = snap2.docs[0];
        const data = docSnap.data();
        return {
          uid: docSnap.id,
          email: data.email || email.trim(),
          displayName: data.displayName || data.username || email.trim().split('@')[0],
          photoURL: data.photoURL,
        } as UserProfile;
      }
    }

    return null;
  } catch (err: any) {
    console.error("[userService] Error buscando usuario por email:", err);
    return null;
  }
}
