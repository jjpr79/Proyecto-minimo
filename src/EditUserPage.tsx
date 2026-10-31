import { useEffect, useState } from 'react';
import { db, auth } from './firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { ArrowLeft, Save, User as UserIcon, Check, AlertCircle } from 'lucide-react';
import { logAction } from './utils/audit';
import { useAuth } from './AuthContext';
import { uploadToDrive, getDriveImageUrl } from './utils/drive';

interface UserData {
  email: string;
  displayName?: string;
  username?: string;
  photoURL?: string;
  phoneNumber?: string;
  googleDriveFolderId?: string;
}

export default function EditUserPage({ userId, onBack }: { userId: string, onBack: () => void }) {
  const [user, setUser] = useState<UserData>({
    email: '',
    displayName: '',
    username: '',
    photoURL: '',
    phoneNumber: '',
    googleDriveFolderId: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const { accessToken, signIn, refreshUser } = useAuth();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    console.log('File selected:', file);
    console.log('AccessToken available:', !!accessToken);
    console.log('FolderId available:', !!user.googleDriveFolderId);

    if (!file || !accessToken || !user.googleDriveFolderId) {
      if (!user.googleDriveFolderId) {
        setStatusMessage({ text: "Primero configura tu carpeta de Drive.", isError: true });
      }
      return;
    }

    setSaving(true);
    try {
      console.log('Starting upload...');
      const result = await uploadToDrive(file, user.googleDriveFolderId, accessToken);
      const imageUrl = await getDriveImageUrl(result.id, accessToken);
      
      const updatedData = { ...user, photoURL: imageUrl };
      setUser(updatedData);
      
      await setDoc(doc(db, 'users', userId), { ...updatedData, updatedAt: serverTimestamp() }, { merge: true });
      await refreshUser();
      setStatusMessage({ text: "¡Imagen subida y perfil actualizado!", isError: false });
    } catch (err: any) {
      console.error('Upload error details:', err);
      setStatusMessage({ text: `Error: ${err.message}`, isError: true });
    } finally {
      setSaving(false);
    }
  };

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
            googleDriveFolderId: data.googleDriveFolderId || '',
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

        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 mb-4">
          <p className="text-xs font-semibold text-slate-600 mb-2">Estado de Google Drive</p>
          {accessToken ? (
            <div className="flex items-center gap-2 text-emerald-700 text-xs font-medium">
              <Check className="w-4 h-4" />
              <span>Conectado correctamente</span>
            </div>
          ) : (
            <button 
              type="button" 
              onClick={signIn}
              className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 text-xs font-medium rounded-lg hover:bg-slate-50 transition-colors"
            >
              Conectar con Google Drive
            </button>
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
          <label className="block text-xs font-semibold text-slate-600 mb-1">Imagen de Perfil</label>
          <input type="file" onChange={handleFileChange} className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500" accept="image/*" />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Teléfono</label>
          <input type="tel" value={user.phoneNumber || ''} onChange={(e) => setUser({ ...user, phoneNumber: e.target.value })} className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500" />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">ID de carpeta de Google Drive</label>
          <input type="text" value={user.googleDriveFolderId || ''} onChange={(e) => setUser({ ...user, googleDriveFolderId: e.target.value })} className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="Ej: 1ABC...xyz" />
        </div>

        <button type="submit" disabled={saving} className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-lg transition-colors shadow-sm disabled:opacity-60 flex items-center justify-center gap-2">
          {saving ? 'Guardando...' : <><Save className="w-4 h-4" /> Guardar Cambios</>}
        </button>
      </form>
    </div>
  );
}
