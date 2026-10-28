import { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import AdminPage from './AdminPage';
import UsersManagementPage from './UsersManagementPage';
import EditUserPage from './EditUserPage';
import AuditLogPage from './AuditLogPage';
import Layout from './components/Layout';

export default function App() {
  const { user, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState<'home' | 'admin' | 'admin-users' | 'admin-edit-user' | 'admin-historial' | 'edit-profile'>('home');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  useEffect(() => {
    const routeMap: Record<string, string> = {
      'home': '/',
      'admin': '/admin',
      'admin-users': '/admin/usuarios',
      'admin-edit-user': '/admin/editar-usuario',
      'admin-historial': '/admin/historial',
      'edit-profile': '/perfil/editar'
    };
    const newPath = routeMap[currentPage] || '/';
    if (window.location.pathname !== newPath) {
      window.history.pushState(null, '', newPath);
    }
  }, [currentPage]);

  if (loading) return <div>Loading...</div>;

  const renderContent = () => {
    switch (currentPage) {
      case 'admin':
        return <AdminPage onBack={() => setCurrentPage('home')} onNavigateToSection={setCurrentPage} />;
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
      default:
        return (
          <main className="flex-grow flex items-center justify-center p-6">
            <h1 className="text-4xl font-bold text-slate-900">
              {user ? `Hola, ${user.email}!` : 'Hola, mundo!'}
            </h1>
          </main>
        );
    }
  };

  return (
    <Layout onNavigate={setCurrentPage}>
      {renderContent()}
    </Layout>
  );
}
