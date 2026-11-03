import { db } from '../firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { GoogleWorkspaceIntegration, GoogleDriveItem, ListDriveItemsResult } from '../types';

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
 * Soporta búsqueda remota directa en todo el Drive del usuario y paginación con nextPageToken.
 */
export async function listDriveFolders(
  accessToken: string,
  options?: { pageToken?: string; searchTerm?: string; pageSize?: number }
): Promise<ListDriveItemsResult> {
  const { pageToken, searchTerm, pageSize = 50 } = options || {};

  let q = "mimeType = 'application/vnd.google-apps.folder' and trashed = false";
  if (searchTerm && searchTerm.trim()) {
    // Escapar comillas simples para evitar inyecciones en la sintaxis de query de Drive API
    const sanitized = searchTerm.trim().replace(/'/g, "\\'");
    q += ` and name contains '${sanitized}'`;
  }

  const queryParam = encodeURIComponent(q);
  let url = `https://www.googleapis.com/drive/v3/files?q=${queryParam}&fields=nextPageToken,files(id,name,iconLink)&pageSize=${pageSize}&orderBy=name`;
  if (pageToken) {
    url += `&pageToken=${encodeURIComponent(pageToken)}`;
  }

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
  const items: GoogleDriveItem[] = (data.files || []).map((f: any) => ({
    id: f.id,
    name: f.name || 'Carpeta sin nombre',
    iconLink: f.iconLink,
  }));

  return {
    items,
    nextPageToken: data.nextPageToken || undefined,
  };
}

/**
 * Consulta la API de Google Drive para listar hojas de cálculo accesibles.
 * Soporta búsqueda remota y paginación con nextPageToken.
 */
export async function listSpreadsheets(
  accessToken: string,
  options?: { pageToken?: string; searchTerm?: string; pageSize?: number }
): Promise<ListDriveItemsResult> {
  const { pageToken, searchTerm, pageSize = 50 } = options || {};

  let q = "mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false";
  if (searchTerm && searchTerm.trim()) {
    const sanitized = searchTerm.trim().replace(/'/g, "\\'");
    q += ` and name contains '${sanitized}'`;
  }

  const queryParam = encodeURIComponent(q);
  let url = `https://www.googleapis.com/drive/v3/files?q=${queryParam}&fields=nextPageToken,files(id,name,iconLink)&pageSize=${pageSize}&orderBy=name`;
  if (pageToken) {
    url += `&pageToken=${encodeURIComponent(pageToken)}`;
  }

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
  const items: GoogleDriveItem[] = (data.files || []).map((f: any) => ({
    id: f.id,
    name: f.name || 'Hoja sin nombre',
    iconLink: f.iconLink,
  }));

  return {
    items,
    nextPageToken: data.nextPageToken || undefined,
  };
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

/**
 * Crea una carpeta nueva en Google Drive del usuario.
 */
export async function createDriveFolder(
  accessToken: string,
  folderName: string
): Promise<GoogleDriveItem> {
  const sanitizedName = folderName.trim();
  if (!sanitizedName) {
    throw new Error('El nombre de la carpeta no puede estar vacío.');
  }

  const res = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: sanitizedName,
      mimeType: 'application/vnd.google-apps.folder',
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error('[workspaceService] Error creando carpeta en Drive:', res.status, errorText);
    if (res.status === 401) {
      throw new Error('AUTH_EXPIRED: Sesión de Google expirada. Vuelve a conectar.');
    }
    if (res.status === 403) {
      throw new Error('Permisos insuficientes para crear carpetas. Por favor reconecta tu cuenta de Google.');
    }
    throw new Error(`Error al crear carpeta en Google Drive (${res.status})`);
  }

  const data = await res.json();
  return {
    id: data.id,
    name: data.name || sanitizedName,
  };
}

/**
 * Crea una nueva hoja de cálculo vacía en Google Drive del usuario.
 */
export async function createSpreadsheet(
  accessToken: string,
  spreadsheetName: string
): Promise<GoogleDriveItem> {
  const sanitizedName = spreadsheetName.trim();
  if (!sanitizedName) {
    throw new Error('El nombre de la hoja de cálculo no puede estar vacío.');
  }

  const res = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: sanitizedName,
      mimeType: 'application/vnd.google-apps.spreadsheet',
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error('[workspaceService] Error creando hoja en Sheets/Drive:', res.status, errorText);
    if (res.status === 401) {
      throw new Error('AUTH_EXPIRED: Sesión de Google expirada. Vuelve a conectar.');
    }
    if (res.status === 403) {
      throw new Error('Permisos insuficientes para crear hojas de cálculo. Por favor reconecta tu cuenta de Google.');
    }
    throw new Error(`Error al crear hoja de cálculo (${res.status})`);
  }

  const data = await res.json();
  return {
    id: data.id,
    name: data.name || sanitizedName,
  };
}
