import { db } from '../firebase';
import { 
  collection, 
  doc, 
  getDoc, 
  writeBatch, 
  serverTimestamp, 
  query, 
  collectionGroup, 
  where, 
  getDocs 
} from 'firebase/firestore';
import { Tenant, TenantWithRole } from '../types';

/**
 * Crea un nuevo Tenant y su membresía de administrador inicial atómicamente.
 * Fuente única de verdad para membresía: subcolección 'tenants/{tenantId}/members/{userId}'.
 */
export async function createTenant(
  name: string, 
  userId: string, 
  userEmail?: string, 
  userDisplayName?: string
): Promise<string> {
  const tenantId = doc(collection(db, 'tenants')).id;
  const batch = writeBatch(db);

  const tenantRef = doc(db, 'tenants', tenantId);
  const memberRef = doc(db, 'tenants', tenantId, 'members', userId);

  const resolvedEmail = userEmail || '';
  const resolvedDisplayName = userDisplayName || (resolvedEmail ? resolvedEmail.split('@')[0] : 'Administrador');

  // 1. Documento raíz del Tenant (tenantId como identificador canónico único)
  batch.set(tenantRef, {
    name,
    createdAt: serverTimestamp(),
    createdBy: userId,
  });

  // 2. Membresía inicial del creador como administrador del Tenant
  batch.set(memberRef, {
    userId,
    role: 'admin',
    joinedAt: serverTimestamp(),
    email: resolvedEmail,
    displayName: resolvedDisplayName,
  });

  await batch.commit();
  return tenantId;
}

/**
 * Obtiene los detalles de un Tenant específico por ID.
 */
export async function getTenantById(tenantId: string): Promise<Tenant | null> {
  try {
    const snap = await getDoc(doc(db, 'tenants', tenantId));
    if (!snap.exists()) return null;
    const data = snap.data();
    return {
      id: snap.id,
      name: data.name,
      createdBy: data.createdBy,
      createdAt: data.createdAt,
    };
  } catch (err) {
    console.error(`[tenantService] Error obteniendo tenant ${tenantId}:`, err);
    return null;
  }
}

/**
 * Obtiene todos los Tenants en los que el usuario posee una membresía activa.
 * Utiliza una consulta optimizada collectionGroup('members') y paraleliza las lecturas.
 */
export async function getUserTenants(userId: string): Promise<TenantWithRole[]> {
  try {
    const q = query(
      collectionGroup(db, 'members'), 
      where('userId', '==', userId)
    );
    const querySnapshot = await getDocs(q);

    // Mapeo concurrente de tenants desde membresías activas (fuente única de verdad)
    const tenantPromises = querySnapshot.docs.map(async (docSnap) => {
      const tenantId = docSnap.ref.parent.parent?.id;
      if (!tenantId) return null;

      try {
        const tenantDoc = await getDoc(doc(db, 'tenants', tenantId));
        if (tenantDoc.exists()) {
          const tenantData = tenantDoc.data();
          return {
            id: tenantId,
            name: tenantData.name || 'Sin nombre',
            createdBy: tenantData.createdBy || '',
            createdAt: tenantData.createdAt || null,
            role: docSnap.data().role || 'member',
          } as TenantWithRole;
        }
      } catch (err) {
        console.warn(`[tenantService] Error leyendo documento del tenant ${tenantId}:`, err);
      }
      return null;
    });

    const results = await Promise.all(tenantPromises);
    return results.filter((t): t is TenantWithRole => t !== null);
  } catch (error) {
    console.error("[tenantService] Error al obtener tenants del usuario:", error);
    return [];
  }
}

/**
 * Elimina un Tenant y limpia todas sus subcolecciones (members e integrations) para evitar recursos huérfanos.
 */
export async function deleteTenant(tenantId: string): Promise<void> {
  const batch = writeBatch(db);

  // 1. Obtener y eliminar todas las membresías del tenant
  const membersSnapshot = await getDocs(collection(db, 'tenants', tenantId, 'members'));
  membersSnapshot.docs.forEach((memberDoc) => {
    batch.delete(memberDoc.ref);
  });

  // 2. Obtener y eliminar todas las integraciones del tenant para prevenir recursos huérfanos
  const integrationsSnapshot = await getDocs(collection(db, 'tenants', tenantId, 'integrations'));
  integrationsSnapshot.docs.forEach((integrationDoc) => {
    batch.delete(integrationDoc.ref);
  });

  // 3. Eliminar el documento padre del Tenant
  batch.delete(doc(db, 'tenants', tenantId));

  // 4. Ejecutar la transacción de eliminación atómica
  await batch.commit();
}
