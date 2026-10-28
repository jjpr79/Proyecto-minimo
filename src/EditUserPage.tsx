import { useEffect, useState } from 'react';
import { db, auth } from './firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { ArrowLeft, Save } from 'lucide-react';
import { logAction } from './utils/audit';

interface UserData {
  email: string;
  displayName?: string;
  photoURL?: string;
  phoneNumber?: string;
  driveFolderId?: string;
}

export default function EditUserPage({ userId, onBack }: { userId: string, onBack: () => void }) {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const docSnap = await getDoc(doc(db, 'users', userId));
      if (docSnap.exists()) {
        setUser(docSnap.data() as UserData);
      }
      setLoading(false);
    }
    fetchData();
  }, [userId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !auth.currentUser) return;
    try {
      await updateDoc(doc(db, 'users', userId), { ...user });
      await logAction(`Usuario editado: ${user.email}`, auth.currentUser.email || 'Anónimo', userId);
      alert("Usuario actualizado");
      onBack();
    } catch (e) {
      alert("Error actualizando usuario");
    }
  };

  if (loading) return <div className="p-8">Cargando...</div>;

  return (
    <div className="min-h-screen flex flex-col">
      <header className="flex items-center justify-between gap-2 p-[5px] border-b border-slate-200">
        <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="font-bold">Editar Usuario</div>
        <div className="w-10"></div>
      </header>

      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium">Nombre</label>
          <input type="text" value={user?.displayName || ''} onChange={e => setUser({...user!, displayName: e.target.value})} className="w-full p-2 border rounded" />
        </div>
        <div>
          <label className="block text-sm font-medium">Correo</label>
          <input type="email" value={user?.email || ''} disabled className="w-full p-2 border rounded bg-slate-50" />
        </div>
        <div>
          <label className="block text-sm font-medium">URL Imagen</label>
          <input type="text" value={user?.photoURL || ''} onChange={e => setUser({...user!, photoURL: e.target.value})} className="w-full p-2 border rounded" />
        </div>
        <div>
          <label className="block text-sm font-medium">Teléfono</label>
          <input type="tel" value={user?.phoneNumber || ''} onChange={e => setUser({...user!, phoneNumber: e.target.value})} className="w-full p-2 border rounded" />
        </div>
        <div>
          <label className="block text-sm font-medium">Drive Folder ID</label>
          <input type="text" value={user?.driveFolderId || ''} onChange={e => setUser({...user!, driveFolderId: e.target.value})} className="w-full p-2 border rounded" />
        </div>
        <button type="submit" className="w-full flex items-center justify-center gap-2 p-3 bg-blue-600 text-white rounded-lg">
          <Save className="w-4 h-4" /> Guardar Cambios
        </button>
      </form>
    </div>
  );
}
