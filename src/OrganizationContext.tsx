import { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { Organization, getUserOrganizations, createOrganization } from './utils/organization';

interface OrganizationContextType {
  currentOrganization: (Organization & { role: 'admin' | 'member' }) | null;
  userOrganizations: (Organization & { role: 'admin' | 'member' })[];
  isLoadingOrganization: boolean;
  setCurrentOrganization: (org: Organization & { role: 'admin' | 'member' }) => void;
  createOrg: (name: string) => Promise<void>;
  refreshOrganizations: () => Promise<void>;
}

const OrganizationContext = createContext<OrganizationContextType>({
  currentOrganization: null,
  userOrganizations: [],
  isLoadingOrganization: true,
  setCurrentOrganization: () => {},
  createOrg: async () => {},
  refreshOrganizations: async () => {},
});

export function OrganizationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [userOrganizations, setUserOrganizations] = useState<(Organization & { role: 'admin' | 'member' })[]>([]);
  const [currentOrganization, setCurrentOrganization] = useState<(Organization & { role: 'admin' | 'member' }) | null>(null);
  const [isLoadingOrganization, setIsLoadingOrganization] = useState(true);

  const refreshOrganizations = async () => {
    if (!user) {
      setUserOrganizations([]);
      setCurrentOrganization(null);
      setIsLoadingOrganization(false);
      return;
    }
    
    setIsLoadingOrganization(true);
    const orgs = await getUserOrganizations(user.uid);
    setUserOrganizations(orgs);
    
    // Set default organization if none selected
    if (orgs.length > 0 && !currentOrganization) {
      setCurrentOrganization(orgs[0]);
    } else if (orgs.length === 0) {
      setCurrentOrganization(null);
    }
    setIsLoadingOrganization(false);
  };

  useEffect(() => {
    refreshOrganizations();
  }, [user]);

  const createOrg = async (name: string) => {
    if (!user) return;
    await createOrganization(name, user.uid);
    await refreshOrganizations();
  };

  return (
    <OrganizationContext.Provider value={{ 
      currentOrganization, 
      userOrganizations, 
      isLoadingOrganization, 
      setCurrentOrganization, 
      createOrg,
      refreshOrganizations
    }}>
      {children}
    </OrganizationContext.Provider>
  );
}

export const useOrganization = () => useContext(OrganizationContext);
