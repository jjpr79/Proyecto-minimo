import { db } from '../firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { GoogleWorkspaceIntegration, GoogleDriveItem } from '../types';

/**
 * Obtiene la configuración de Google Workspace asignada a un Tenant específico.
 * Fuente de verdad: 'tenants/{tenantId}/integrations/google'.
 */
export async function getTenantWorkspaceConfig(tenantId: string): Promise<GoogleWorkspaceIntegration | null> {
  try {
    const snap = await getDoc(doc(db, 'tenants', tenantId, 'integrations', 'google'));
    if (!snap.exists()) return null;
    return snap.data() as GoogleWorkspaceIntegration;
  } catch (err) {
    console.error(`[workspaceService] Error obteniendo configuración de Workspace para tenant ${tenantId}:`, err);
    return null;
  }
}

/**
 * Guarda o actualiza la configuración de Google Workspace para un Tenant.
 */
export async function saveTenantWorkspaceConfig(
  tenantId: string, 
  config: Partial<GoogleWorkspaceIntegration>, 
  userEmail?: string
): Promise<void> {
  const ref = doc(db, 'tenants', tenantId, 'integrations', 'google');
  await setDoc(ref, {
    ...config,
    updatedAt: serverTimestamp(),
    updatedBy: userEmail || 'Usuario',
  }, { merge: true });
}

/**
 * Consulta la API de Google Drive para listar carpetas accesibles (no en papelera).
 */
export async function listDriveFolders(accessToken: string): Promise<GoogleDriveItem[]> {
  const queryParam = encodeURIComponent("mimeType = 'application/vnd.google-apps.folder' and trashed = false");
  const url = `https://www.googleapis.com/drive/v3/files?q=${queryParam}&fields=files(id,name,iconLink)&pageSize=100&orderBy=name`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error('[workspaceService] Error listando carpetas de Drive:', res.status, errorText);
    if (res.status === 401) {
      throw new Error('AUTH_EXPIRED: Sesión de Google expirada. Vuelve a conectar.');
    }
    throw new Error(`Error al consultar carpetas de Google Drive (${res.status})`);
  }

  const data = await res.json();
  return (data.files || []).map((f: any) => ({
    id: f.id,
    name: f.name || 'Carpeta sin nombre',
    iconLink: f.iconLink,
  }));
}

/**
 * Consulta la API de Google Drive para listar hojas de cálculo accesibles.
 */
export async function listSpreadsheets(accessToken: string): Promise<GoogleDriveItem[]> {
  const queryParam = encodeURIComponent("mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false");
  const url = `https://www.googleapis.com/drive/v3/files?q=${queryParam}&fields=files(id,name,iconLink)&pageSize=100&orderBy=name`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error('[workspaceService] Error listando hojas de cálculo:', res.status, errorText);
    if (res.status === 401) {
      throw new Error('AUTH_EXPIRED: Sesión de Google expirada. Vuelve a conectar.');
    }
    throw new Error(`Error al consultar hojas de Google Sheets (${res.status})`);
  }

  const data = await res.json();
  return (data.files || []).map((f: any) => ({
    id: f.id,
    name: f.name || 'Hoja sin nombre',
    iconLink: f.iconLink,
  }));
}

/**
 * Valida la existencia y accesibilidad de un archivo o carpeta en Google Drive.
 * Detecta si el elemento fue eliminado, enviado a la papelera o si el token expiró.
 */
export async function validateDriveItem(
  itemId: string, 
  accessToken: string
): Promise<{ valid: boolean; name?: string; error?: string }> {
  try {
    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${itemId}?fields=id,name,trashed`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (res.status === 404) {
      return { valid: false, error: 'El archivo o carpeta fue eliminado en Google Drive.' };
    }
    if (res.status === 401) {
      return { valid: false, error: 'Token expirado. Reconecta tu cuenta de Google.' };
    }
    if (!res.ok) {
      return { valid: false, error: 'No se pudo acceder al recurso en Google Drive.' };
    }

    const data = await res.json();
    if (data.trashed) {
      return { valid: false, name: data.name, error: 'El elemento se encuentra en la papelera de reciclaje.' };
    }

    return { valid: true, name: data.name };
  } catch (err: any) {
    console.warn(`[workspaceService] Error validando item ${itemId}:`, err);
    return { valid: false, error: err?.message || 'Error de conexión con Google.' };
  }
}
