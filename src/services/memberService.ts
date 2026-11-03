import { db, auth } from '../firebase';
import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  deleteDoc, 
  updateDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { MemberRole, TenantMember, UserProfile } from '../types';
import { findUserByEmail as lookupUserByEmail } from './userService';

export type BusinessMember = TenantMember;

/**
 * Busca un usuario registrado por email utilizando userService.
 */
export async function findUserByEmail(email: string): Promise<UserProfile | null> {
  const normalized = email.trim().toLowerCase();
  const user = await lookupUserByEmail(normalized);
  if (user) return user;

  // Fallback para el usuario activo en sesión
  if (auth.currentUser && auth.currentUser.email?.toLowerCase() === normalized) {
    return {
      uid: auth.currentUser.uid,
      email: auth.currentUser.email,
      displayName: auth.currentUser.displayName || auth.currentUser.email.split('@')[0],
    };
  }

  return null;
}

/**
 * Obtiene la lista completa de miembros de un tenant ('tenants/{tenantId}/members').
 * La subcolección es la única fuente de verdad.
 */
export async function getBusinessMembers(tenantId: string): Promise<TenantMember[]> {
  try {
    const membersSnap = await getDocs(collection(db, 'tenants', tenantId, 'members'));
    const members: TenantMember[] = [];

    for (const memberDoc of membersSnap.docs) {
      const data = memberDoc.data();
      const uid = data.userId || memberDoc.id;
      let email = data.email || '';
      let displayName = data.displayName || '';

      // Si el documento de membresía no tiene email o displayName, intentar resolver desde users/{uid}
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
            // Manejo de reglas restrictivas
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

    // Ordenamiento: administradores primero, luego colaboradores alfabéticamente
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
 * Agrega un nuevo miembro a un tenant existente.
 * Escribe exclusivamente en la subcolección 'tenants/{tenantId}/members/{userId}'.
 */
export async function addMemberToBusiness(
  tenantId: string, 
  user: { uid: string; email: string; displayName?: string }, 
  role: MemberRole
): Promise<void> {
  try {
    const memberRef = doc(db, 'tenants', tenantId, 'members', user.uid);
    
    // Cumple con la regla isValidMember (userId, role, joinedAt)
    await setDoc(memberRef, {
      userId: user.uid,
      role,
      joinedAt: serverTimestamp(),
      email: user.email,
      displayName: user.displayName || user.email.split('@')[0],
    });
  } catch (error: any) {
    console.error("[memberService] Error al agregar miembro:", error);
    throw error;
  }
}

/**
 * Actualiza el rol de un miembro con validación de invariante: no degradar al último admin.
 */
export async function updateMemberRole(
  tenantId: string,
  targetMember: TenantMember,
  newRole: MemberRole,
  allMembers: TenantMember[]
): Promise<void> {
  if (targetMember.role === newRole) return;

  // Invariante: No degradar al último administrador
  if (targetMember.role === 'admin' && newRole === 'member') {
    const adminCount = allMembers.filter(m => m.role === 'admin').length;
    if (adminCount <= 1) {
      throw new Error("Debe existir al menos un administrador.");
    }
  }

  const memberRef = doc(db, 'tenants', tenantId, 'members', targetMember.uid);
  await updateDoc(memberRef, {
    role: newRole,
  });
}

/**
 * Elimina a un miembro de un tenant validando las invariantes de administración.
 */
export async function removeMemberFromBusiness(
  tenantId: string, 
  memberToRemove: TenantMember, 
  allMembers: TenantMember[],
  currentUserId: string | null
): Promise<void> {
  // Invariante 1: Un administrador NO puede eliminarse a sí mismo
  if (memberToRemove.role === 'admin' && memberToRemove.uid === currentUserId) {
    throw new Error("Un administrador no puede eliminarse a sí mismo.");
  }

  // Invariante 2: Siempre debe existir al menos un administrador en el tenant
  if (memberToRemove.role === 'admin') {
    const adminCount = allMembers.filter(m => m.role === 'admin').length;
    if (adminCount <= 1) {
      throw new Error("Debe existir al menos un administrador.");
    }
  }

  try {
    await deleteDoc(doc(db, 'tenants', tenantId, 'members', memberToRemove.uid));
  } catch (error: any) {
    console.error("[memberService] Error al eliminar miembro:", error);
    throw error;
  }
}
