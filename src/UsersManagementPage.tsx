import { useState, useEffect } from 'react';
import { auth } from './firebase';
import { getAllUsersWithAdminStatus, toggleGlobalAdminStatus } from './services/userService';
import { logAuditEvent } from './services/auditService';
import { Shield, User, ArrowLeft, Edit2 } from 'lucide-react';

interface ManagedUser {
  uid: string;
  email: string;
  isGlobalAdmin: boolean;
}

export default function UsersManagementPage({ onBack, onEdit }: { onBack: () => void, onEdit: (uid: string) => void }) {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const usersList = await getAllUsersWithAdminStatus();
        setUsers(usersList.map(u => ({
          uid: u.uid,
          email: u.email,
          isGlobalAdmin: u.isGlobalAdmin,
        })));
      } catch (e) {
        console.error("[UsersManagementPage] Error cargando usuarios:", e);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const toggleAdmin = async (targetUser: ManagedUser) => {
    if (!auth.currentUser) return;
    if (targetUser.uid === auth.currentUser.uid) {
      alert("No puedes modificar tu propio rol de administrador.");
      return;
    }

    try {
      const willBeAdmin = !targetUser.isGlobalAdmin;
      await toggleGlobalAdminStatus(targetUser.uid, targetUser.email, willBeAdmin);
      
      await logAuditEvent(
        willBeAdmin 
          ? `Rol admin otorgado a: ${targetUser.email}` 
          : `Rol admin eliminado a: ${targetUser.email}`,
        auth.currentUser.email || 'Anónimo',
        targetUser.uid
      );

      setUsers(prev => prev.map(u => u.uid === targetUser.uid ? { ...u, isGlobalAdmin: willBeAdmin } : u));
    } catch (e) {
      console.error("[UsersManagementPage] Error actualizando rol:", e);
      alert("Error: No tienes permiso para realizar esta acción o la operación no está permitida.");
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Cargando usuarios...</div>;

  return (
    <div className="p-6">
      <button onClick={onBack} className="mb-4 flex items-center gap-2 p-2 hover:bg-slate-100 rounded-full transition-colors">
        <ArrowLeft className="w-6 h-6 text-slate-600" />
        <span className="font-semibold text-slate-900">Volver</span>
      </button>

      <h2 className="text-lg font-bold mb-4">Usuarios</h2>
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        {users.map(userItem => (
          <div key={userItem.uid} className="flex items-center justify-between p-4 border-b border-slate-100 last:border-0">
            <div className="flex items-center gap-3">
              <User className="w-8 h-8 p-1 bg-slate-100 rounded-full text-slate-500" />
              <div>
                <p className="font-medium text-sm">{userItem.email}</p>
                <p className="text-xs text-slate-500 font-mono">{userItem.uid.slice(0, 8)}...</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => onEdit(userItem.uid)}
                className="p-2 rounded-full transition-colors bg-slate-100 text-slate-600"
              >
                <Edit2 className="w-5 h-5" />
              </button>
              <button
                onClick={() => toggleAdmin(userItem)}
                className={`p-2 rounded-full transition-colors ${userItem.isGlobalAdmin ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-400'}`}
              >
                <Shield className="w-5 h-5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
