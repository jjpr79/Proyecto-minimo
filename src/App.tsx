import { useState } from 'react';
import { useAuth } from './AuthContext';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from './firebase';
import { User } from 'lucide-react';
import AdminPage from './AdminPage';
import UsersManagementPage from './UsersManagementPage';
import EditUserPage from './EditUserPage';
import AuditLogPage from './AuditLogPage';
import Sidebar from './Sidebar';

export default function App() {
  const { user, loading } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState<'home' | 'admin' | 'admin-users' | 'admin-edit-user' | 'admin-historial' | 'edit-profile'>('home');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

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
          <>
            <header className="flex items-center justify-between gap-2 p-[5px] border-b border-slate-200">
              <div className="shrink-0">
                <img src="/src/assets/images/app_logo_1793149440150.jpg" alt="Logo" className="w-10 h-10 rounded-full" />
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {user ? (
                  <button
                    onClick={() => setIsSidebarOpen(true)}
                    className="group relative"
                  >
                    {user.photoURL ? (
                      <img src={user.photoURL} alt="Perfil" className="w-10 h-10 rounded-full" />
                    ) : (
                      <User className="w-10 h-10 p-2 bg-slate-100 rounded-full text-slate-600" />
                    )}
                  </button>
                ) : (
                  <button
                    onClick={() => signInWithPopup(auth, new GoogleAuthProvider())}
                    className="p-2 bg-slate-100 rounded-full text-slate-600 hover:bg-slate-200 transition-colors"
                  >
                    <User className="w-6 h-6" />
                  </button>
                )}
              </div>
            </header>
            <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} user={user} onNavigate={setCurrentPage} />
            <main className="flex-grow flex items-center justify-center p-6">
              <h1 className="text-4xl font-bold text-slate-900">
                {user ? `Hola, ${user.email}!` : 'Hola, mundo!'}
              </h1>
            </main>
          </>
        );
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {renderContent()}
      <footer className="px-6 py-4 border-t border-slate-200 text-center text-xs text-slate-500">
        <p>&copy; 2026 Minimalist Auth App. Todos los derechos reservados.</p>
        <div className="mt-2 flex justify-center gap-4">
          <a href="#" className="hover:underline">Contacto</a>
          <a href="#" className="hover:underline">Twitter</a>
          <a href="#" className="hover:underline">GitHub</a>
        </div>
      </footer>
    </div>
  );
}
