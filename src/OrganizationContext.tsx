import { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { Organization, getUserOrganizations, createOrganization, deleteOrganization } from './utils/organization';
import { logAction } from './utils/audit';

interface OrganizationContextType {
  currentOrganization: (Organization & { role: 'admin' | 'member' }) | null;
  userOrganizations: (Organization & { role: 'admin' | 'member' })[];
  isLoadingOrganization: boolean;
  setCurrentOrganization: (org: Organization & { role: 'admin' | 'member' }) => void;
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
  const [userOrganizations, setUserOrganizations] = useState<(Organization & { role: 'admin' | 'member' })[]>([]);
  const [currentOrganization, setCurrentOrganization] = useState<(Organization & { role: 'admin' | 'member' }) | null>(null);
  const [isLoadingOrganization, setIsLoadingOrganization] = useState(true);

  const refreshOrganizations = async () => {
    console.log('[ORG] refreshOrganizations() started');
    if (!user) {
      setUserOrganizations([]);
      setCurrentOrganization(null);
      setIsLoadingOrganization(false);
      return;
    }
    
    setIsLoadingOrganization(true);
    try {
      const orgs = await getUserOrganizations(user.uid);
      console.log('[ORG] After getUserOrganizations():', orgs.length);
      setUserOrganizations(orgs);
      
      if (orgs.length > 0) {
        setCurrentOrganization((prev) => {
          if (!prev) return orgs[0];
          const exists = orgs.find(o => o.id === prev.id);
          return exists || orgs[0];
        });
      } else {
        setCurrentOrganization(null);
      }
    } catch (err) {
      console.error("[ORG] Error cargando organizaciones:", err);
      setUserOrganizations([]);
      setCurrentOrganization(null);
    } finally {
      console.log('[ORG] setIsLoadingOrganization(false) in finally');
      setIsLoadingOrganization(false);
    }
  };

  useEffect(() => {
    refreshOrganizations();
  }, [user?.uid]);

  const createOrg = async (name: string) => {
    if (!user || !name.trim()) return;
    try {
      const tenantId = await createOrganization(name.trim(), user.uid);
      await logAction(`Negocio creado: ${name.trim()}`, user.email || user.uid, tenantId);
      await refreshOrganizations();
    } catch (err) {
      console.error("Error al crear negocio:", err);
      throw err;
    }
  };

  const deleteOrg = async (tenantId: string) => {
    if (!user) return;
    try {
      await deleteOrganization(tenantId);
      await logAction(`Negocio eliminado: ${tenantId}`, user.email || user.uid, tenantId);
      await refreshOrganizations();
    } catch (err) {
      console.error("Error al eliminar negocio:", err);
      throw err;
    }
  };

  return (
    <OrganizationContext.Provider value={{ 
      currentOrganization, 
      userOrganizations, 
      isLoadingOrganization, 
      setCurrentOrganization, 
      createOrg,
      deleteOrg,
      refreshOrganizations
    }}>
      {children}
    </OrganizationContext.Provider>
  );
}

export const useOrganization = () => useContext(OrganizationContext);
