import { useState } from 'react';
import { useAuth } from '../AuthContext';
import { useOrganization } from '../OrganizationContext';
import Header from './Header';
import Footer from './Footer';
import Sidebar from '../Sidebar';

export default function Layout({ children, onNavigate }: { children: React.ReactNode, onNavigate: (page: string) => void }) {
  const { user, signIn } = useAuth();
  const { currentOrganization } = useOrganization();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const path = window.location.pathname;

  const renderBreadcrumbs = () => {
    const parts = path.split('/').filter(Boolean);
    if (parts.length === 0) return null;

    return (
      <nav className="px-4 py-2 text-xs text-slate-500 flex items-center gap-1 bg-white border-b border-slate-100">
        <button onClick={() => onNavigate('home')} className="hover:text-blue-600">Inicio</button>
        {parts.map((part, index) => {
          const isLast = index === parts.length - 1;
          const label = part === 'negocios' ? 'Negocios' : (currentOrganization && currentOrganization.slug === part ? currentOrganization.name : part.charAt(0).toUpperCase() + part.slice(1));
          
          return (
            <span key={index} className="flex items-center gap-1">
              <span>&gt;</span>
              {isLast ? <span className="font-semibold text-slate-800">{label}</span> : <span>{label}</span>}
            </span>
          );
        })}
      </nav>
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Header 
        user={user} 
        onOpenSidebar={() => setIsSidebarOpen(true)} 
        onSignIn={signIn}
        onNavigate={onNavigate}
      />
      {renderBreadcrumbs()}
      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
        user={user} 
        onNavigate={onNavigate} 
      />
      <main className="flex-grow">
        {children}
      </main>
      <Footer />
    </div>
  );
}
