import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, X, LogOut, User as UserIcon, Shield, Zap, Building2, Sparkles, ChevronDown } from 'lucide-react';
import { User, signOut } from 'firebase/auth';
import { auth } from './firebase';
import { useEffect, useState } from 'react';
import { useOrganization } from './OrganizationContext';
import { checkIsGlobalAdmin, toggleGlobalAdminStatus } from './services/userService';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onNavigate: (page: string) => void;
}

export default function Sidebar({ isOpen, onClose, user, onNavigate }: SidebarProps) {
  const { currentOrganization, userOrganizations, setCurrentOrganization } = useOrganization();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; isError: boolean } | null>(null);

  useEffect(() => {
    async function checkAdmin() {
      if (user) {
        const adminStatus = await checkIsGlobalAdmin(user.uid);
        setIsAdmin(adminStatus);
      }
    }
    if (isOpen) {
      checkAdmin();
      setStatusMessage(null);
    }
  }, [user, isOpen]);

  const activateAdmin = async () => {
    if (!user || isActivating) return;
    setIsActivating(true);
    setStatusMessage(null);
    try {
      await toggleGlobalAdminStatus(user.uid, user.email || '', true);
      setIsAdmin(true);
      setStatusMessage({ text: "¡Estado de administrador activado!", isError: false });
    } catch (e: any) {
      console.error("Error activating admin:", e);
      setStatusMessage({ text: e?.message || "Error al activar administrador", isError: true });
    } finally {
      setIsActivating(false);
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
            className="fixed top-0 right-0 h-full w-[90%] md:w-[400px] bg-white z-50 shadow-2xl flex flex-col"
          >
            {/* Encabezado */}
            <div className="flex items-center justify-between p-[5px] border-b border-slate-100 shrink-0">
              <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <ArrowLeft className="w-6 h-6 text-slate-600" />
              </button>
              <h2 className="text-xl font-bold text-slate-900">Bienvenidos</h2>
              <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <X className="w-6 h-6 text-slate-600" />
              </button>
            </div>

            {/* Área con barra de desplazamiento (Scrollable) */}
            <div className="flex-1 overflow-y-auto min-h-0">
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
                  <div className="text-center w-full">
                    <p className="text-xl font-semibold">{user.displayName || 'Usuario'}</p>
                    <p className="text-sm text-slate-400 mt-1 break-all">{user.email}</p>
                    
                    {/* Selector de Negocio */}
                    <div className="w-full mt-4">
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                          <Building2 className="w-4 h-4" />
                        </div>
                        <select
                          value={currentOrganization?.id || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === '__add_org__') {
                              onNavigate('negocios');
                              onClose();
                            } else {
                              const selected = userOrganizations.find((o) => o.id === val);
                              if (selected) {
                                setCurrentOrganization(selected);
                              }
                            }
                          }}
                          className="w-full pl-9 pr-8 py-2 text-xs font-medium text-slate-200 bg-slate-800 border border-slate-700 rounded-lg hover:border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer transition-colors"
                          aria-label="Seleccionar negocio"
                        >
                          {userOrganizations.length > 0 ? (
                            userOrganizations.map((org) => (
                              <option key={org.id} value={org.id} className="bg-slate-900 text-slate-200 py-1">
                                {org.name} {currentOrganization?.id === org.id ? '(Actual)' : ''}
                              </option>
                            ))
                          ) : (
                            <option value="" disabled className="bg-slate-900 text-slate-400">
                              Sin negocios
                            </option>
                          )}
                          <option value="__add_org__" className="bg-slate-900 text-blue-400 font-semibold py-1">
                            + Agregar negocio
                          </option>
                        </select>
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                          <ChevronDown className="w-4 h-4" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Menú adicional */}
              <div className="px-6 py-2 pb-6 flex flex-col gap-2">
                <button 
                  onClick={() => { onNavigate('edit-profile'); onClose(); }} 
                  className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-slate-900 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors text-left"
                >
                  <UserIcon className="w-4 h-4" />
                  Editar Perfil
                </button>
                <button 
                  onClick={() => { onNavigate('negocios'); onClose(); }} 
                  className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-slate-900 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors text-left"
                >
                  <Building2 className="w-4 h-4" />
                  Mis Negocios
                </button>
                {currentOrganization && (
                  <button 
                    onClick={() => { onNavigate('business-integrations'); onClose(); }} 
                    className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-slate-900 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors text-left"
                  >
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                    Integraciones (Workspace)
                  </button>
                )}
                {isAdmin && (
                  <button onClick={() => { onNavigate('admin'); onClose(); }} className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-slate-900 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors text-left">
                    <Shield className="w-4 h-4" />
                    Administración
                  </button>
                )}
                {user.email === 'jjpr79@gmail.com' && !isAdmin && (
                  <button
                    onClick={activateAdmin}
                    disabled={isActivating}
                    className="flex items-center justify-between px-4 py-3 text-sm font-medium text-amber-900 bg-amber-100 rounded-lg hover:bg-amber-200 transition-colors disabled:opacity-60"
                  >
                    <span className="flex items-center gap-3">
                      <Zap className="w-4 h-4 text-amber-700" />
                      {isActivating ? 'Activando...' : 'Activar Administrador'}
                    </span>
                    {isActivating && (
                      <span className="w-4 h-4 border-2 border-amber-700 border-t-transparent rounded-full animate-spin" />
                    )}
                  </button>
                )}
                {statusMessage && (
                  <div className={`p-3 rounded-lg text-xs font-medium ${statusMessage.isError ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
                    {statusMessage.text}
                  </div>
                )}
              </div>
            </div>

            {/* Pie de página fijo con botón Cerrar sesión */}
            <div className="shrink-0 p-[5px] border-t border-slate-100 bg-white">
              <button
                onClick={() => signOut(auth)}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-medium text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"
              >
                <LogOut className="w-3.5 h-3.5" />
                Cerrar sesión
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
