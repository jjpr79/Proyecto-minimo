import { User as UserIcon } from 'lucide-react';
import { User } from 'firebase/auth';

interface HeaderProps {
  user: User | null;
  onOpenSidebar: () => void;
  onSignIn: () => void;
  onNavigate: (page: string) => void;
}

export default function Header({ user, onOpenSidebar, onSignIn, onNavigate }: HeaderProps) {
  return (
    <header className="flex items-center justify-between gap-2 p-[5px] border-b border-slate-200 bg-white sticky top-0 z-10">
      <button onClick={() => onNavigate('home')} className="shrink-0 p-1 rounded-full hover:bg-slate-100 transition-colors" aria-label="Inicio">
        <img src="/src/assets/images/app_logo_1793149440150.jpg" alt="Logo" className="w-10 h-10 rounded-full" />
      </button>
      <div className="flex items-center gap-3 shrink-0">
        {user ? (
          <button
            onClick={onOpenSidebar}
            className="group relative"
          >
            {user.photoURL ? (
              <img src={user.photoURL} alt="Perfil" className="w-10 h-10 rounded-full" />
            ) : (
              <UserIcon className="w-10 h-10 p-2 bg-slate-100 rounded-full text-slate-600" />
            )}
          </button>
        ) : (
          <button
            onClick={onSignIn}
            className="p-2 bg-slate-100 rounded-full text-slate-600 hover:bg-slate-200 transition-colors"
          >
            <UserIcon className="w-6 h-6" />
          </button>
        )}
      </div>
    </header>
  );
}
