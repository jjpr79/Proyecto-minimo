import { useState } from 'react';
import { useAuth } from '../AuthContext';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../firebase';
import Header from './Header';
import Footer from './Footer';
import Sidebar from '../Sidebar';

export default function Layout({ children, onNavigate }: { children: React.ReactNode, onNavigate: (page: string) => void }) {
  const { user } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Header 
        user={user} 
        onOpenSidebar={() => setIsSidebarOpen(true)} 
        onSignIn={() => signInWithPopup(auth, new GoogleAuthProvider())}
        onNavigate={onNavigate}
      />
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
