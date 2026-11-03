/**
 * Capa de retrocompatibilidad para utilidades de organización/tenant.
 * Delega la lógica de negocio al servicio consolidado 'tenantService'.
 */

import { createTenant, getUserTenants, deleteTenant } from '../services/tenantService';
import { Organization, MemberRole } from '../types';

export type { Organization, MemberRole };
export type Member = {
  userId: string;
  role: MemberRole;
  joinedAt: any;
};

export async function createOrganization(name: string, userId: string): Promise<string> {
  return createTenant(name, userId);
}

export async function getUserOrganizations(userId: string) {
  return getUserTenants(userId);
}

export async function deleteOrganization(tenantId: string): Promise<void> {
  return deleteTenant(tenantId);
}
