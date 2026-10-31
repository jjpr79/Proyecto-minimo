import { useState } from 'react';
import { useAuth } from '../AuthContext';
import { uploadToDrive } from '../utils/drive';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

export default function ImageUploader() {
  const { user, accessToken } = useAuth();
  const [folderId, setFolderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !accessToken || !user) return;

    // Fetch folder ID from DB if not loaded
    let fId = folderId;
    if (!fId) {
      const docSnap = await getDoc(doc(db, 'users', user.uid));
      fId = docSnap.data()?.googleDriveFolderId;
      setFolderId(fId);
    }

    if (!fId) {
      alert("Por favor configura tu ID de carpeta en tu perfil.");
      return;
    }

    if (window.confirm(`¿Subir ${file.name} a Google Drive?`)) {
      setLoading(true);
      try {
        await uploadToDrive(file, fId, accessToken);
        alert("¡Archivo subido correctamente!");
      } catch (err) {
        console.error(err);
        alert("Error al subir el archivo.");
      } finally {
        setLoading(false);
      }
    }
  };

  if (!user) return null;
  return (
    <div className="mt-4">
      <label className="block text-sm font-medium text-slate-700">Subir imagen a Google Drive:</label>
      <input type="file" onChange={handleUpload} disabled={loading} className="mt-1" accept="image/*" />
    </div>
  );
}
