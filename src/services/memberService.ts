import { db, auth } from '../firebase';
import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  deleteDoc, 
  query, 
  where, 
  serverTimestamp, 
  updateDoc, 
  arrayUnion, 
  arrayRemove 
} from 'firebase/firestore';

export type MemberRole = 'admin' | 'member';

export interface BusinessMember {
  uid: string;
  email: string;
  displayName: string;
  role: MemberRole;
  joinedAt: any;
}

export interface UserLookupResult {
  uid: string;
  email: string;
  displayName: string;
}

/**
 * Busca un usuario registrado por su correo electrónico en la colección 'users'.
 */
export async function findUserByEmail(email: string): Promise<UserLookupResult | null> {
  const normalized = email.trim().toLowerCase();

  try {
    // 1. Búsqueda por email normalizado (minúsculas)
    const q1 = query(collection(db, 'users'), where('email', '==', normalized));
    const snap1 = await getDocs(q1);

    if (!snap1.empty) {
      const docSnap = snap1.docs[0];
      const data = docSnap.data();
      return {
        uid: docSnap.id,
        email: data.email || normalized,
        displayName: data.displayName || data.username || (data.email ? data.email.split('@')[0] : 'Usuario'),
      };
    }

    // 2. Búsqueda por email con formato original (por si no se guardó en minúsculas)
    if (email.trim() !== normalized) {
      const q2 = query(collection(db, 'users'), where('email', '==', email.trim()));
      const snap2 = await getDocs(q2);
      if (!snap2.empty) {
        const docSnap = snap2.docs[0];
        const data = docSnap.data();
        return {
          uid: docSnap.id,
          email: data.email || email.trim(),
          displayName: data.displayName || data.username || (data.email ? data.email.split('@')[0] : 'Usuario'),
        };
      }
    }

    // 3. Fallback de resolución: si el email coincide con el usuario autenticado actual
    if (auth.currentUser && auth.currentUser.email?.toLowerCase() === normalized) {
      return {
        uid: auth.currentUser.uid,
        email: auth.currentUser.email,
        displayName: auth.currentUser.displayName || auth.currentUser.email.split('@')[0],
      };
    }

    return null;
  } catch (error: any) {
    console.error("[memberService] Error al buscar usuario por email:", error);
    // Si falla por permisos en colección /users, propagamos el error para retroalimentación
    if (error?.code === 'permission-denied') {
      throw new Error("Permisos insuficientes para buscar en el directorio de usuarios.");
    }
    throw error;
  }
}

/**
 * Obtiene la lista completa de miembros de un negocio dado su ID (tenantId).
 */
export async function getBusinessMembers(businessId: string): Promise<BusinessMember[]> {
  try {
    const membersSnap = await getDocs(collection(db, 'tenants', businessId, 'members'));
    const members: BusinessMember[] = [];

    for (const memberDoc of membersSnap.docs) {
      const data = memberDoc.data();
      const uid = data.userId || memberDoc.id;
      let email = data.email || '';
      let displayName = data.displayName || '';

      // Si el documento de membresía no cuenta con email o displayName (ej: creados en versiones anteriores),
      // intentamos resolverlos desde users/{uid} o desde la sesión actual
      if (!email || !displayName) {
        if (auth.currentUser && auth.currentUser.uid === uid) {
          email = email || auth.currentUser.email || '';
          displayName = displayName || auth.currentUser.displayName || (email ? email.split('@')[0] : 'Tú');
        } else {
          try {
            const userSnap = await getDoc(doc(db, 'users', uid));
            if (userSnap.exists()) {
              const uData = userSnap.data();
              email = email || uData.email || '';
              displayName = displayName || uData.displayName || uData.username || '';
            }
          } catch {
            // Si las reglas no permiten leer users/{uid} de terceros, usamos valores legibles por defecto
          }
        }
      }

      members.push({
        uid,
        email: email || 'Sin email registrado',
        displayName: displayName || (email ? email.split('@')[0] : 'Usuario'),
        role: (data.role === 'admin' ? 'admin' : 'member') as MemberRole,
        joinedAt: data.joinedAt || null,
      });
    }

    // Ordenar: primero administradores, luego miembros alfabéticamente por displayName
    members.sort((a, b) => {
      if (a.role === 'admin' && b.role !== 'admin') return -1;
      if (a.role !== 'admin' && b.role === 'admin') return 1;
      return a.displayName.localeCompare(b.displayName);
    });

    return members;
  } catch (error: any) {
    console.error("[memberService] Error al obtener miembros:", error);
    throw error;
  }
}

/**
 * Agrega un nuevo miembro a un negocio existente.
 */
export async function addMemberToBusiness(
  businessId: string, 
  user: UserLookupResult, 
  role: MemberRole
): Promise<void> {
  try {
    const memberRef = doc(db, 'tenants', businessId, 'members', user.uid);
    
    // Guardamos la membresía cumpliendo estrictamente con isValidMember en firestore.rules
    // (userId, role, joinedAt) además de almacenar email y displayName para consultas rápidas
    await setDoc(memberRef, {
      userId: user.uid,
      role,
      joinedAt: serverTimestamp(),
      email: user.email,
      displayName: user.displayName,
    });

    // Mantener sincronizado el arreglo auxiliar memberIds en tenants/{businessId} si existe
    try {
      await updateDoc(doc(db, 'tenants', businessId), {
        memberIds: arrayUnion(user.uid),
      });
    } catch (e) {
      console.warn("[memberService] No se pudo actualizar memberIds en el documento del negocio:", e);
    }
  } catch (error: any) {
    console.error("[memberService] Error al agregar miembro:", error);
    throw error;
  }
}

/**
 * Elimina a un miembro de un negocio validando las reglas de integridad de negocio.
 */
export async function removeMemberFromBusiness(
  businessId: string, 
  memberToRemove: BusinessMember, 
  allMembers: BusinessMember[],
  currentUserId: string | null
): Promise<void> {
  // Invariante 1: Un administrador NO puede eliminarse a sí mismo
  if (memberToRemove.role === 'admin' && memberToRemove.uid === currentUserId) {
    throw new Error("Un administrador no puede eliminarse a sí mismo.");
  }

  // Invariante 2: Siempre debe existir al menos un administrador en el negocio
  if (memberToRemove.role === 'admin') {
    const adminCount = allMembers.filter(m => m.role === 'admin').length;
    if (adminCount <= 1) {
      throw new Error("Debe existir al menos un administrador.");
    }
  }

  try {
    // 1. Eliminar documento de la subcolección members
    await deleteDoc(doc(db, 'tenants', businessId, 'members', memberToRemove.uid));

    // 2. Remover del arreglo memberIds si está configurado
    try {
      await updateDoc(doc(db, 'tenants', businessId), {
        memberIds: arrayRemove(memberToRemove.uid),
      });
    } catch (e) {
      console.warn("[memberService] No se pudo actualizar memberIds al eliminar:", e);
    }
  } catch (error: any) {
    console.error("[memberService] Error al eliminar miembro:", error);
    throw error;
  }
}
