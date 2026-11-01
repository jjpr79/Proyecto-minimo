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
  getDocs 
} from 'firebase/firestore';

export interface Organization {
  id: string;
  name: string;
  createdAt: any;
  createdBy: string;
}

export interface Member {
  userId: string;
  role: 'admin' | 'member';
  joinedAt: any;
}

export async function createOrganization(name: string, userId: string): Promise<string> {
  const tenantId = doc(collection(db, 'tenants')).id;
  const batch = writeBatch(db);

  const tenantRef = doc(db, 'tenants', tenantId);
  const memberRef = doc(db, 'tenants', tenantId, 'members', userId);

  batch.set(tenantRef, {
    name,
    createdAt: serverTimestamp(),
    createdBy: userId,
    memberIds: [userId],
  });

  batch.set(memberRef, {
    userId,
    role: 'admin',
    joinedAt: serverTimestamp(),
  });

  await batch.commit();
  return tenantId;
}

export async function getUserOrganizations(userId: string): Promise<(Organization & { role: 'admin' | 'member' })[]> {
  try {
    const q = query(collectionGroup(db, 'members'), where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    
    const orgs: (Organization & { role: 'admin' | 'member' })[] = [];
    
    for (const docSnap of querySnapshot.docs) {
      const tenantId = docSnap.ref.parent.parent?.id;
      if (tenantId) {
        try {
          const tenantDoc = await getDoc(doc(db, 'tenants', tenantId));
          if (tenantDoc.exists()) {
            orgs.push({
              id: tenantId,
              ...tenantDoc.data(),
              role: docSnap.data().role,
            } as Organization & { role: 'admin' | 'member' });
          }
        } catch (docError) {
          console.warn("No se pudo leer el documento de la organización:", tenantId, docError);
        }
      }
    }
    
    return orgs;
  } catch (error) {
    console.error("Error al obtener organizaciones del usuario:", error);
    return [];
  }
}
