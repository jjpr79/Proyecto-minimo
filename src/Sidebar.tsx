import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, X, LogOut, User as UserIcon, Shield, Zap } from 'lucide-react';
import { User, signOut } from 'firebase/auth';
import { auth, db } from './firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useEffect, useState } from 'react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onNavigate: (page: string) => void;
}

export default function Sidebar({ isOpen, onClose, user, onNavigate }: SidebarProps) {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    async function checkAdmin() {
      if (user) {
        try {
          const adminDoc = await getDoc(doc(db, 'admins', user.uid));
          setIsAdmin(adminDoc.exists());
        } catch (e) {
          console.error("Error checking admin status:", e);
          setIsAdmin(false);
        }
      }
    }
    checkAdmin();
  }, [user]);

  const activateAdmin = async () => {
    if (user) {
      try {
        await setDoc(doc(db, 'admins', user.uid), { createdAt: serverTimestamp() });
        setIsAdmin(true);
        alert("¡Estado de administrador activado!");
      } catch (e) {
        console.error("Error activating admin:", e);
        alert("Error al activar administrador");
      }
    }
  };

  if (!user) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black z-40"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-full w-[90%] bg-white z-50 shadow-2xl flex flex-col"
          >
            {/* Encabezado */}
            <div className="flex items-center justify-between p-[5px] border-b border-slate-100">
              <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <ArrowLeft className="w-6 h-6 text-slate-600" />
              </button>
              <h2 className="text-xl font-bold text-slate-900">Bienvenidos</h2>
              <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <X className="w-6 h-6 text-slate-600" />
              </button>
            </div>

            {/* Datos de Usuario */}
            <div className="p-8 bg-slate-900 text-white rounded-b-3xl mb-6">
              <div className="flex flex-col items-center gap-4">
                {user.photoURL ? (
                  <img src={user.photoURL} alt="Perfil" className="w-24 h-24 rounded-full border-4 border-slate-700" />
                ) : (
                  <div className="w-24 h-24 p-6 bg-slate-700 rounded-full text-slate-400">
                    <UserIcon className="w-full h-full" />
                  </div>
                )}
                <div className="text-center">
                  <p className="text-xl font-semibold">{user.displayName || 'Usuario'}</p>
                  <p className="text-sm text-slate-400 mt-1 break-all">{user.email}</p>
                  <p className="text-xs text-slate-500 mt-2 font-mono">ID: {user.uid.slice(0, 8)}...</p>
                </div>
              </div>
            </div>

            {/* Menú adicional */}
            <div className="px-6 py-2 flex flex-col gap-2">
              <button 
                onClick={() => { onNavigate('edit-profile'); onClose(); }} 
                className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-slate-900 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors text-left"
              >
                <UserIcon className="w-4 h-4" />
                Editar Perfil
              </button>
              {isAdmin && (
                <button onClick={() => { onNavigate('admin'); onClose(); }} className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-slate-900 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors text-left">
                  <Shield className="w-4 h-4" />
                  Administración
                </button>
              )}
              {user.email === 'jjpr79@gmail.com' && !isAdmin && (
                <button
                  onClick={activateAdmin}
                  className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-amber-900 bg-amber-100 rounded-lg hover:bg-amber-200 transition-colors"
                >
                  <Zap className="w-4 h-4" />
                  Activar Administrador
                </button>
              )}
            </div>

            {/* Pie de página (Sticky) */}
            <div className="mt-auto p-6 border-t border-slate-100">
              <button
                onClick={() => signOut(auth)}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Cerrar sesión
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
