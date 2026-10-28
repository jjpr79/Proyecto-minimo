import { useState, useEffect } from 'react';
import { db, auth } from './firebase';
import { collection, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { Shield, User, ArrowLeft, Edit2 } from 'lucide-react';
import { logAction } from './utils/audit';

interface UserData {
  uid: string;
  email: string;
  isAdmin: boolean;
}

export default function UsersManagementPage({ onBack, onEdit }: { onBack: () => void, onEdit: (uid: string) => void }) {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const usersSnap = await getDocs(collection(db, 'users'));
        const adminsSnap = await getDocs(collection(db, 'admins'));
        const adminUids = new Set(adminsSnap.docs.map(d => d.id));

        const userData = usersSnap.docs.map(d => ({
          uid: d.id,
          email: d.data().email || 'Sin email',
          isAdmin: adminUids.has(d.id)
        }));
        setUsers(userData);
      } catch (e) {
        console.error("Error fetching data:", e);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const toggleAdmin = async (user: UserData) => {
    if (!auth.currentUser) return;
    try {
      if (user.isAdmin) {
        await deleteDoc(doc(db, 'admins', user.uid));
        await logAction(`Rol admin eliminado a: ${user.email}`, auth.currentUser.email || 'Anónimo', user.uid);
      } else {
        await setDoc(doc(db, 'admins', user.uid), { createdAt: new Date() });
        await logAction(`Rol admin otorgado a: ${user.email}`, auth.currentUser.email || 'Anónimo', user.uid);
      }
      setUsers(prev => prev.map(u => u.uid === user.uid ? { ...u, isAdmin: !u.isAdmin } : u));
    } catch (e) {
      console.error("Error actualizando rol:", e);
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
        {users.map(user => (
          <div key={user.uid} className="flex items-center justify-between p-4 border-b border-slate-100 last:border-0">
            <div className="flex items-center gap-3">
              <User className="w-8 h-8 p-1 bg-slate-100 rounded-full text-slate-500" />
              <div>
                <p className="font-medium text-sm">{user.email}</p>
                <p className="text-xs text-slate-500 font-mono">{user.uid.slice(0, 8)}...</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => onEdit(user.uid)}
                className="p-2 rounded-full transition-colors bg-slate-100 text-slate-600"
              >
                <Edit2 className="w-5 h-5" />
              </button>
              <button
                onClick={() => toggleAdmin(user)}
                className={`p-2 rounded-full transition-colors ${user.isAdmin ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-400'} ${user.email === 'jjpr79@gmail.com' ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={user.email === 'jjpr79@gmail.com'}
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
