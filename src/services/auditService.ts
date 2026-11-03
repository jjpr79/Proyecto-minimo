import { db } from '../firebase';
import { collection, addDoc, getDocs, query, serverTimestamp } from 'firebase/firestore';
import { AuditLogEntry } from '../types';

/**
 * Registra una acción relevante en el sistema para trazabilidad.
 */
export async function logAuditEvent(action: string, performedBy: string, target?: string): Promise<void> {
  try {
    await addDoc(collection(db, 'auditLogs'), {
      action,
      performedBy,
      target: target || '',
      timestamp: serverTimestamp(),
    });
  } catch (e) {
    console.error("[auditService] Error registrando auditoría:", e);
  }
}

/**
 * Obtiene el historial completo de auditoría ordenado cronológicamente.
 */
export async function getAuditLogs(): Promise<AuditLogEntry[]> {
  try {
    const logsSnap = await getDocs(query(collection(db, 'auditLogs')));
    const logData = logsSnap.docs.map(d => ({
      id: d.id,
      ...d.data(),
    })) as AuditLogEntry[];

    // Orden descendente por marca temporal
    logData.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
    return logData;
  } catch (e) {
    console.error("[auditService] Error obteniendo logs de auditoría:", e);
    return [];
  }
}
