import { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useOrganization } from './OrganizationContext';
import AdminPage from './AdminPage';
import UsersManagementPage from './UsersManagementPage';
import EditUserPage from './EditUserPage';
import AuditLogPage from './AuditLogPage';
import BusinessesPage from './components/BusinessesPage';
import Layout from './components/Layout';
import ImageUploader from './components/ImageUploader';
import MembersPage from './pages/business/MembersPage';
import { Building2, Users } from 'lucide-react';

export default function App() {
  const { user, loading } = useAuth();
  const { currentOrganization, userOrganizations, isLoadingOrganization, createOrg } = useOrganization();
  const [currentPage, setCurrentPage] = useState<'home' | 'admin' | 'admin-users' | 'admin-edit-user' | 'admin-historial' | 'edit-profile' | 'negocios' | 'business-members'>('home');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const [orgName, setOrgName] = useState('');
  const [isSubmittingOrg, setIsSubmittingOrg] = useState(false);
  const [orgError, setOrgError] = useState<string | null>(null);

  const handleNavigate = (page: string) => {
    setCurrentPage(page as any);
  };

  useEffect(() => {
    const routeMap: Record<string, string> = {
      'home': '/',
      'admin': '/admin',
      'admin-users': '/admin/usuarios',
      'admin-edit-user': '/admin/editar-usuario',
      'admin-historial': '/admin/historial',
      'edit-profile': '/perfil/editar',
      'negocios': '/negocios',
      'business-members': currentOrganization ? `/business/${currentOrganization.id}/members` : '/negocios'
    };
    const newPath = routeMap[currentPage] || '/';
    if (window.location.pathname !== newPath) {
      window.history.pushState(null, '', newPath);
    }
  }, [currentPage, currentOrganization?.id]);

  if (loading || (user && isLoadingOrganization)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500 font-medium">
        Cargando...
      </div>
    );
  }

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgName.trim() || isSubmittingOrg) return;
    setIsSubmittingOrg(true);
    setOrgError(null);
    try {
      await createOrg(orgName.trim());
      setOrgName('');
    } catch (err: any) {
      setOrgError(err?.message || 'Error al crear la organización. Intenta nuevamente.');
    } finally {
      setIsSubmittingOrg(false);
    }
  };

  const renderContent = () => {
    switch (currentPage) {
      case 'admin':
        return <AdminPage onBack={() => setCurrentPage('home')} onNavigateToSection={handleNavigate} />;
      case 'admin-users':
        return (
          <UsersManagementPage 
            onBack={() => setCurrentPage('admin')} 
            onEdit={(uid) => { setSelectedUserId(uid); setCurrentPage('admin-edit-user'); }} 
          />
        );
      case 'admin-edit-user':
        return selectedUserId ? <EditUserPage userId={selectedUserId} onBack={() => setCurrentPage('admin-users')} /> : null;
      case 'edit-profile':
        return user ? <EditUserPage userId={user.uid} onBack={() => setCurrentPage('home')} /> : null;
      case 'admin-historial':
        return <AuditLogPage onBack={() => setCurrentPage('admin')} />;
      case 'negocios':
        return <BusinessesPage onBack={() => setCurrentPage('home')} onNavigate={handleNavigate} />;
      case 'business-members':
        return <MembersPage onBack={() => setCurrentPage('home')} onNavigate={handleNavigate} />;
      default:
        if (user && !currentOrganization && userOrganizations.length === 0) {
          return (
            <div className="flex-grow flex items-center justify-center p-6">
              <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-center w-12 h-12 bg-blue-50 text-blue-600 rounded-xl mb-4 mx-auto">
                  <Building2 className="w-6 h-6" />
                </div>
                <h2 className="text-xl font-bold text-center text-slate-900 mb-2">
                  Crear tu Negocio
                </h2>
                <p className="text-xs text-slate-500 text-center mb-6">
                  Para comenzar a utilizar la plataforma, ingresa el nombre de tu negocio o espacio de trabajo.
                </p>

                {orgError && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
                    {orgError}
                  </div>
                )}

                <form onSubmit={handleCreateOrg} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Nombre del Negocio
                    </label>
                    <input
                      type="text"
                      value={orgName}
                      onChange={(e) => setOrgName(e.target.value)}
                      placeholder="Ej: Mi Empresa S.A.S."
                      disabled={isSubmittingOrg}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isSubmittingOrg || !orgName.trim()}
                    className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-lg transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isSubmittingOrg ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Creando...</span>
                      </>
                    ) : (
                      'Crear Negocio'
                    )}
                  </button>
                </form>
              </div>
            </div>
          );
        }

        return (
          <main className="flex-grow flex flex-col items-center justify-center p-6">
            <h1 className="text-4xl font-bold text-slate-900 text-center">
              {user ? `Hola, ${user.email}!` : 'Hola, mundo!'}
            </h1>
            {currentOrganization && (
              <div className="flex flex-col items-center gap-2 mt-2">
                <p className="text-sm font-medium text-slate-500">
                  Negocio: <span className="text-slate-800 font-semibold">{currentOrganization.name}</span>
                </p>
                <button
                  type="button"
                  onClick={() => setCurrentPage('business-members')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Gestionar Miembros</span>
                </button>
              </div>
            )}
            {user && <ImageUploader />}
          </main>
        );
    }
  };

  return (
    <Layout onNavigate={handleNavigate}>
      {renderContent()}
    </Layout>
  );
}
