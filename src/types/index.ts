/**
 * Tipos canónicos del Core SaaS Multiempresa.
 * Define la fuente única de verdad para roles, membresías, tenants y usuarios.
 */

export type MemberRole = 'admin' | 'member';

export interface Tenant {
  id: string;
  name: string;
  slug?: string;
  createdBy: string;
  createdAt: any;
}

export interface TenantMember {
  uid: string;
  email: string;
  displayName: string;
  role: MemberRole;
  joinedAt: any;
}

export interface TenantWithRole extends Tenant {
  role: MemberRole;
}

// Alias de retrocompatibilidad transicional
export type Organization = Tenant;
export type BusinessMember = TenantMember;

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  username?: string;
  photoURL?: string;
  phoneNumber?: string;
  googleDriveFolderId?: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface AuditLogEntry {
  id: string;
  action: string;
  performedBy: string;
  target?: string;
  timestamp: any;
}

export interface GoogleWorkspaceIntegration {
  connected: boolean;
  driveFolderId?: string;
  driveFolderName?: string;
  spreadsheetId?: string;
  spreadsheetName?: string;
  updatedAt?: any;
  updatedBy?: string;
}

export interface GoogleDriveItem {
  id: string;
  name: string;
  mimeType?: string;
  iconLink?: string;
}

export interface ListDriveItemsResult {
  items: GoogleDriveItem[];
  nextPageToken?: string;
}
