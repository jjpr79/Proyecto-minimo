/**
 * Capa de retrocompatibilidad para auditoría.
 * Delega al servicio centralizado 'auditService'.
 */

import { logAuditEvent } from '../services/auditService';

export async function logAction(action: string, performedBy: string, target?: string) {
  return logAuditEvent(action, performedBy, target);
}
