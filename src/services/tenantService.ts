import { db } from '../firebase';
import { 
  collection, 
  doc, 
  getDoc, 
  setDoc,
  writeBatch, 
  serverTimestamp, 
  query, 
  collectionGroup, 
  where, 
  getDocs,
  limit 
} from 'firebase/firestore';
import { Tenant, TenantWithRole } from '../types';
import { generateSlug } from '../utils/slug';

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

  const baseSlug = generateSlug(name) || 'negocio';
  let finalSlug = baseSlug;
  let counter = 1;
  let slugExists = true;
  
  // Verificación de unicidad O(1) contra la colección 'slugs' (sin consultar la colección 'tenants')
  while (slugExists) {
    try {
      const slugDoc = await getDoc(doc(db, 'slugs', finalSlug));
      if (!slugDoc.exists()) {
        slugExists = false;
      } else {
        finalSlug = `${baseSlug}-${counter}`;
        counter++;
      }
    } catch {
      slugExists = false;
    }
  }

  const tenantRef = doc(db, 'tenants', tenantId);
  const memberRef = doc(db, 'tenants', tenantId, 'members', userId);
  const slugRef = doc(db, 'slugs', finalSlug);

  const resolvedEmail = userEmail || '';
  const resolvedDisplayName = userDisplayName || (resolvedEmail ? resolvedEmail.split('@')[0] : 'Administrador');

  // 1. Documento raíz del Tenant
  batch.set(tenantRef, {
    name,
    slug: finalSlug,
    createdAt: serverTimestamp(),
    createdBy: userId,
  });

  // 2. Registro en el índice público de slugs
  batch.set(slugRef, {
    tenantId,
    createdAt: serverTimestamp(),
  });

  // 3. Membresía inicial del creador como administrador del Tenant
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
      slug: data.slug,
      createdBy: data.createdBy,
      createdAt: data.createdAt,
    };
  } catch (err) {
    console.error(`[tenantService] Error obteniendo tenant ${tenantId}:`, err);
    return null;
  }
}

/**
 * Obtiene los detalles de un Tenant específico por Slug.
 */
export async function getTenantBySlug(slug: string): Promise<Tenant | null> {
  try {
    // 1. Búsqueda O(1) en el índice de slugs
    const slugDoc = await getDoc(doc(db, 'slugs', slug));
    if (slugDoc.exists()) {
      const tenantId = slugDoc.data().tenantId;
      if (tenantId) {
        return await getTenantById(tenantId);
      }
    }

    // 2. Fallback secundario para tenants creados previamente
    try {
      const q = query(collection(db, 'tenants'), where('slug', '==', slug), limit(1));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const docSnap = snapshot.docs[0];
        const data = docSnap.data();
        return {
          id: docSnap.id,
          name: data.name,
          slug: data.slug,
          createdBy: data.createdBy,
          createdAt: data.createdAt,
        };
      }
    } catch {
      // Ignorar si no tiene permisos de listado general
    }
    return null;
  } catch (err) {
    console.error(`[tenantService] Error obteniendo tenant por slug ${slug}:`, err);
    return null;
  }
}

/**
 * Obtiene todos los Tenants en los que el usuario posee una membresía activa o es el creador/propietario.
 * Incluye auto-recuperación (Self-healing) si el creador fue eliminado accidentalmente de la membresía.
 */
export async function getUserTenants(userId: string): Promise<TenantWithRole[]> {
  try {
    const q = query(
      collectionGroup(db, 'members'), 
      where('userId', '==', userId)
    );
    const querySnapshot = await getDocs(q);

    // Mapeo concurrente de tenants desde membresías activas
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
            slug: tenantData.slug,
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
    const memberTenants = results.filter((t): t is TenantWithRole => t !== null);
    const tenantIdsSet = new Set(memberTenants.map(t => t.id));

    // Auto-recuperación: Búsqueda de tenants donde el usuario es el creador original
    try {
      const creatorQuery = query(collection(db, 'tenants'), where('createdBy', '==', userId));
      const creatorSnapshot = await getDocs(creatorQuery);

      for (const tDoc of creatorSnapshot.docs) {
        if (!tenantIdsSet.has(tDoc.id)) {
          const tData = tDoc.data();
          console.log(`[tenantService] Auto-recuperando membresía de propietario para el tenant ${tDoc.id}...`);

          // Re-vincular membresía de administrador/propietario en Firestore
          try {
            await setDoc(doc(db, 'tenants', tDoc.id, 'members', userId), {
              userId,
              role: 'admin',
              joinedAt: serverTimestamp(),
            }, { merge: true });
          } catch (restoreErr) {
            console.warn(`[tenantService] No se pudo escribir membresía auto-recuperada en ${tDoc.id}:`, restoreErr);
          }

          memberTenants.push({
            id: tDoc.id,
            name: tData.name || 'Sin nombre',
            slug: tData.slug,
            createdBy: tData.createdBy || userId,
            createdAt: tData.createdAt || null,
            role: 'admin',
          });
          tenantIdsSet.add(tDoc.id);
        }
      }
    } catch (creatorErr) {
      console.warn("[tenantService] Aviso en verificación de tenants propios:", creatorErr);
    }

    return memberTenants;
  } catch (error) {
    console.error("[tenantService] Error al obtener tenants del usuario:", error);
    return [];
  }
}

/**
 * Elimina un Tenant y limpia todas sus membresías de manera atómica con batch.
 */
export async function deleteTenant(tenantId: string): Promise<void> {
  const batch = writeBatch(db);

  // 1. Obtener todas las membresías del tenant
  const membersSnapshot = await getDocs(collection(db, 'tenants', tenantId, 'members'));
  membersSnapshot.docs.forEach((memberDoc) => {
    batch.delete(memberDoc.ref);
  });

  // 2. Eliminar el documento del Tenant
  batch.delete(doc(db, 'tenants', tenantId));

  // 3. Ejecutar la operación atómica
  await batch.commit();
}
