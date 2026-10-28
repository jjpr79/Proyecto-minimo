import { useEffect, useState } from 'react';
import { db, auth } from './firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { ArrowLeft, Save, User as UserIcon, Check, AlertCircle } from 'lucide-react';
import { logAction } from './utils/audit';

interface UserData {
  email: string;
  displayName?: string;
  username?: string;
  photoURL?: string;
  phoneNumber?: string;
}

export default function EditUserPage({ userId, onBack }: { userId: string, onBack: () => void }) {
  const [user, setUser] = useState<UserData>({
    email: '',
    displayName: '',
    username: '',
    photoURL: '',
    phoneNumber: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; isError: boolean } | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function fetchData() {
      try {
        const docSnap = await getDoc(doc(db, 'users', userId));
        if (!isMounted) return;

        const authUser = auth.currentUser;
        if (docSnap.exists()) {
          const data = docSnap.data() as UserData;
          setUser({
            email: data.email || (authUser?.uid === userId ? authUser?.email || '' : ''),
            displayName: data.displayName || (authUser?.uid === userId ? authUser?.displayName || '' : ''),
            username: data.username || (authUser?.uid === userId && authUser?.email ? authUser.email.split('@')[0] : ''),
            photoURL: data.photoURL || (authUser?.uid === userId ? authUser?.photoURL || '' : ''),
            phoneNumber: data.phoneNumber || (authUser?.uid === userId ? authUser?.phoneNumber || '' : ''),
          });
        }
      } catch (err) {
        console.error("Error al cargar datos del usuario:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    fetchData();
    return () => { isMounted = false; };
  }, [userId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser || saving) return;

    setSaving(true);
    setStatusMessage(null);

    try {
      await setDoc(doc(db, 'users', userId), { ...user, updatedAt: serverTimestamp() }, { merge: true });
      await logAction(`Usuario editado: ${user.email || userId}`, auth.currentUser.email || 'Anónimo', userId);
      setStatusMessage({ text: "¡Cambios guardados correctamente!", isError: false });
    } catch (err: any) {
      setStatusMessage({ text: err?.message || "Error al guardar.", isError: true });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Cargando perfil...</div>;

  return (
    <div className="p-4 max-w-lg mx-auto w-full">
      <button onClick={onBack} className="mb-4 flex items-center gap-2 p-2 hover:bg-slate-100 rounded-full transition-colors">
        <ArrowLeft className="w-6 h-6 text-slate-600" />
        <span className="font-semibold text-slate-900">Volver</span>
      </button>

      <form onSubmit={handleSubmit} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col items-center justify-center pb-2">
            {user.photoURL ? (
              <img src={user.photoURL} alt="Perfil" className="w-20 h-20 rounded-full object-cover border-2 border-slate-200" />
            ) : (
              <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
                <UserIcon className="w-10 h-10" />
              </div>
            )}
        </div>

        {statusMessage && (
          <div className={`p-3 rounded-lg text-xs font-medium flex items-center gap-2 ${statusMessage.isError ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
            {statusMessage.isError ? <AlertCircle className="w-4 h-4" /> : <Check className="w-4 h-4" />}
            <span>{statusMessage.text}</span>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Nombre</label>
          <input type="text" value={user.displayName || ''} onChange={(e) => setUser({ ...user, displayName: e.target.value })} className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500" />
        </div>
        
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Usuario</label>
          <input type="text" value={user.username || ''} onChange={(e) => setUser({ ...user, username: e.target.value })} className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500" />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Correo electrónico</label>
          <input type="email" value={user.email || ''} disabled className="w-full px-3 py-2 text-sm border rounded-lg bg-slate-50 cursor-not-allowed" />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">URL Imagen</label>
          <input type="text" value={user.photoURL || ''} onChange={(e) => setUser({ ...user, photoURL: e.target.value })} className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500" />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Teléfono</label>
          <input type="tel" value={user.phoneNumber || ''} onChange={(e) => setUser({ ...user, phoneNumber: e.target.value })} className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500" />
        </div>

        <button type="submit" disabled={saving} className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-lg transition-colors shadow-sm disabled:opacity-60 flex items-center justify-center gap-2">
          {saving ? 'Guardando...' : <><Save className="w-4 h-4" /> Guardar Cambios</>}
        </button>
      </form>
    </div>
  );
}
