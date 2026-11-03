import { useState } from 'react';
import { useAuth } from '../AuthContext';
import { useTenant } from '../OrganizationContext';
import { uploadToDrive } from '../utils/drive';
import { getTenantWorkspaceConfig } from '../services/workspaceService';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { UploadCloud, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

export default function ImageUploader() {
  const { user, accessToken } = useAuth();
  const { currentOrganization } = useTenant();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!accessToken) {
      setStatus({
        type: 'error',
        message: 'Sesión de Google no disponible. Vuelve a iniciar sesión con Google.'
      });
      return;
    }

    setLoading(true);
    setStatus(null);

    try {
      // 1. Priorizar carpeta de Google Workspace del negocio activo
      let targetFolderId: string | undefined;
      let targetFolderName = '';

      if (currentOrganization?.id) {
        const workspaceConfig = await getTenantWorkspaceConfig(currentOrganization.id);
        if (workspaceConfig?.driveFolderId) {
          targetFolderId = workspaceConfig.driveFolderId;
          targetFolderName = workspaceConfig.driveFolderName || 'Carpeta del Negocio';
        }
      }

      // 2. Si no hay carpeta en el negocio, recurrir a la del perfil personal
      if (!targetFolderId) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        targetFolderId = userDoc.data()?.googleDriveFolderId;
        targetFolderName = 'Carpeta Personal';
      }

      if (!targetFolderId) {
        setStatus({
          type: 'error',
          message: 'No hay ninguna carpeta de Google Drive configurada. Conéctala en Integraciones de tu negocio o en tu perfil.'
        });
        return;
      }

      await uploadToDrive(file, targetFolderId, accessToken);
      setStatus({
        type: 'success',
        message: `¡"${file.name}" se subió exitosamente a Google Drive (${targetFolderName})!`
      });
      // Limpiar input file
      e.target.value = '';
    } catch (err: any) {
      console.error('Error al subir a Google Drive:', err);
      setStatus({
        type: 'error',
        message: err?.message || 'Error al subir el archivo a Google Drive.'
      });
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="mt-6 w-full max-w-md bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
      <div className="flex items-center gap-2 mb-2">
        <UploadCloud className="w-5 h-5 text-blue-600" />
        <h3 className="text-sm font-semibold text-slate-800">Subir archivo a Google Drive</h3>
      </div>
      <p className="text-xs text-slate-500 mb-3">
        {currentOrganization
          ? `Sube imágenes directamente a la carpeta conectada de "${currentOrganization.name}".`
          : 'Sube imágenes a tu carpeta personal de Google Drive.'}
      </p>

      {status && (
        <div
          className={`mb-3 p-2.5 rounded-lg text-xs flex items-center gap-2 ${
            status.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {status.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
          )}
          <span>{status.message}</span>
        </div>
      )}

      <div className="relative">
        <input
          type="file"
          onChange={handleUpload}
          disabled={loading}
          accept="image/*"
          className="block w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50 cursor-pointer"
        />
        {loading && (
          <div className="mt-2 flex items-center gap-2 text-xs text-blue-600 font-medium">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Subiendo a Google Drive...</span>
          </div>
        )}
      </div>
    </div>
  );
}
