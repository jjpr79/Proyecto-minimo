import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export async function logAction(action: string, performedBy: string, target: string) {
  try {
    await addDoc(collection(db, 'auditLogs'), {
      action,
      performedBy,
      target,
      timestamp: serverTimestamp(),
    });
  } catch (e) {
    console.error("Error logging action:", e);
  }
}
