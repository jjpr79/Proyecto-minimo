import { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { createTenant, getUserTenants, deleteTenant } from './services/tenantService';
import { logAuditEvent } from './services/auditService';
import { ensureCurrentMemberProfile } from './services/memberService';
import { TenantWithRole } from './types';

interface OrganizationContextType {
  currentOrganization: TenantWithRole | null;
  userOrganizations: TenantWithRole[];
  isLoadingOrganization: boolean;
  setCurrentOrganization: (org: TenantWithRole) => void;
  createOrg: (name: string) => Promise<void>;
  deleteOrg: (tenantId: string) => Promise<void>;
  refreshOrganizations: () => Promise<void>;
}

const OrganizationContext = createContext<OrganizationContextType>({
  currentOrganization: null,
  userOrganizations: [],
  isLoadingOrganization: true,
  setCurrentOrganization: () => {},
  createOrg: async () => {},
  deleteOrg: async () => {},
  refreshOrganizations: async () => {},
});

export function OrganizationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [userOrganizations, setUserOrganizations] = useState<TenantWithRole[]>([]);
  const [currentOrganization, setCurrentOrganization] = useState<TenantWithRole | null>(null);
  const [isLoadingOrganization, setIsLoadingOrganization] = useState(true);

  const refreshOrganizations = async () => {
    if (!user) {
      setUserOrganizations([]);
      setCurrentOrganization(null);
      setIsLoadingOrganization(false);
      return;
    }
    
    setIsLoadingOrganization(true);
    try {
      const orgs = await getUserTenants(user.uid);
      setUserOrganizations(orgs);
      
      if (orgs.length > 0) {
        const savedTenantId = typeof window !== 'undefined' ? localStorage.getItem('saas_active_tenant_id') : null;
        setCurrentOrganization((prev) => {
          if (prev && orgs.some(o => o.id === prev.id)) {
            return orgs.find(o => o.id === prev.id)!;
          }
          if (savedTenantId && orgs.some(o => o.id === savedTenantId)) {
            return orgs.find(o => o.id === savedTenantId)!;
          }
          return orgs[0];
        });
      } else {
        setCurrentOrganization(null);
      }
    } catch (err) {
      console.error("[OrganizationContext] Error cargando tenants del usuario:", err);
      setUserOrganizations([]);
      setCurrentOrganization(null);
    } finally {
      setIsLoadingOrganization(false);
    }
  };

  useEffect(() => {
    refreshOrganizations();
  }, [user?.uid]);

  // Asegura proactivamente la integridad de los datos de membresía del usuario activo en el negocio seleccionado
  useEffect(() => {
    if (user && currentOrganization?.id) {
      ensureCurrentMemberProfile(currentOrganization.id, user).catch(() => {});
    }
  }, [user?.uid, currentOrganization?.id]);

  const createOrg = async (name: string) => {
    if (!user || !name.trim()) return;
    try {
      const fallbackDisplayName = user.displayName || (user.email ? user.email.split('@')[0] : undefined);
      const tenantId = await createTenant(
        name.trim(), 
        user.uid, 
        user.email || undefined, 
        fallbackDisplayName
      );
      await logAuditEvent(`Negocio creado: ${name.trim()}`, user.email || user.uid, tenantId);
      await refreshOrganizations();
    } catch (err) {
      console.error("[OrganizationContext] Error al crear tenant:", err);
      throw err;
    }
  };

  const deleteOrg = async (tenantId: string) => {
    if (!user) return;
    try {
      await deleteTenant(tenantId);
      await logAuditEvent(`Negocio eliminado: ${tenantId}`, user.email || user.uid, tenantId);
      await refreshOrganizations();
    } catch (err) {
      console.error("[OrganizationContext] Error al eliminar tenant:", err);
      throw err;
    }
  };

  const selectOrganization = (org: TenantWithRole) => {
    setCurrentOrganization(org);
    if (typeof window !== 'undefined' && org?.id) {
      localStorage.setItem('saas_active_tenant_id', org.id);
    }
  };

  return (
    <OrganizationContext.Provider value={{ 
      currentOrganization, 
      userOrganizations, 
      isLoadingOrganization, 
      setCurrentOrganization: selectOrganization, 
      createOrg,
      deleteOrg,
      refreshOrganizations
    }}>
      {children}
    </OrganizationContext.Provider>
  );
}

// Hook principal y alias canónico
export const useOrganization = () => useContext(OrganizationContext);
export const useTenant = useOrganization;
