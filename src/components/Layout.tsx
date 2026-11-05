import { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { useOrganization } from '../OrganizationContext';
import Header from './Header';
import Footer from './Footer';
import Sidebar from '../Sidebar';
import { ChevronRight } from 'lucide-react';

export default function Layout({ children, onNavigate }: { children: React.ReactNode, onNavigate: (page: string) => void }) {
  const { user, signIn } = useAuth();
  const { currentOrganization } = useOrganization();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentPath, setCurrentPath] = useState(
    typeof window !== 'undefined' ? window.location.pathname : '/'
  );

  // Sincronización reactiva con los cambios de URL del historial del navegador (pushState / popstate)
  useEffect(() => {
    const syncPath = () => {
      setCurrentPath(window.location.pathname);
    };

    window.addEventListener('popstate', syncPath);

    // Interceptar pushState y replaceState para reaccionar inmediatamente en SPA
    const originalPushState = window.history.pushState;
    const originalReplaceState = window.history.replaceState;

    window.history.pushState = function (...args) {
      originalPushState.apply(this, args);
      syncPath();
    };

    window.history.replaceState = function (...args) {
      originalReplaceState.apply(this, args);
      syncPath();
    };

    syncPath();

    return () => {
      window.removeEventListener('popstate', syncPath);
      window.history.pushState = originalPushState;
      window.history.replaceState = originalReplaceState;
    };
  }, []);

  const renderBreadcrumbs = () => {
    if (currentPath === '/') return null;

    interface BreadcrumbItem {
      label: string;
      action?: () => void;
    }

    const items: BreadcrumbItem[] = [
      { label: 'Inicio', action: () => onNavigate('home') }
    ];

    const parts = currentPath.split('/').filter(Boolean);

    if (parts[0] === 'negocios' || parts[0] === 'business') {
      items.push({ 
        label: 'Negocios', 
        action: parts.length > 1 ? () => onNavigate('negocios') : undefined 
      });

      if (parts.length > 1) {
        const orgName = currentOrganization?.name || 'Negocio';
        // Si hay una sección hija (ej. miembros o integraciones)
        if (parts.length > 2) {
          items.push({ label: orgName, action: () => onNavigate('home') });
          const section = parts[2];
          const sectionLabel = section === 'miembros' || section === 'members' 
            ? 'Miembros' 
            : section === 'integraciones' 
            ? 'Integraciones' 
            : section.charAt(0).toUpperCase() + section.slice(1);
          items.push({ label: sectionLabel });
        } else {
          items.push({ label: orgName });
        }
      }
    } else if (parts[0] === 'admin') {
      items.push({ 
        label: 'Administración', 
        action: parts.length > 1 ? () => onNavigate('admin') : undefined 
      });
      if (parts[1] === 'usuarios') {
        items.push({ label: 'Usuarios' });
      } else if (parts[1] === 'editar-usuario') {
        items.push({ label: 'Editar Usuario' });
      } else if (parts[1] === 'historial') {
        items.push({ label: 'Historial' });
      }
    } else if (parts[0] === 'perfil') {
      items.push({ label: 'Perfil' });
      if (parts[1] === 'editar') {
        items.push({ label: 'Editar' });
      }
    } else {
      parts.forEach((p) => {
        items.push({ label: p.charAt(0).toUpperCase() + p.slice(1) });
      });
    }

    return (
      <nav 
        aria-label="Migas de pan"
        className="px-4 py-2.5 text-xs text-slate-500 flex items-center gap-1.5 bg-white border-b border-slate-100 flex-wrap"
      >
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <span key={index} className="inline-flex items-center gap-1.5">
              {index > 0 && (
                <ChevronRight className="w-3 h-3 text-slate-400 shrink-0" />
              )}
              {isLast || !item.action ? (
                <span className={isLast ? "font-semibold text-slate-800" : "text-slate-600"}>
                  {item.label}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={item.action}
                  className="hover:text-blue-600 hover:underline transition-colors cursor-pointer"
                >
                  {item.label}
                </button>
              )}
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
