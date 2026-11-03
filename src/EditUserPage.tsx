import { useEffect, useState, useRef } from 'react';
import { auth } from './firebase';
import { updateProfile } from 'firebase/auth';
import { 
  ArrowLeft, 
  Save, 
  User as UserIcon, 
  Check, 
  AlertCircle, 
  Camera, 
  Loader2, 
  Trash2, 
  FolderCheck,
  FolderOpen
} from 'lucide-react';
import { logAuditEvent } from './services/auditService';
import { getUserProfile, saveUserProfile } from './services/userService';
import { UserProfile, GoogleDriveItem } from './types';
import { useAuth } from './AuthContext';
import { useOrganization } from './OrganizationContext';
import { uploadToDrive, getDriveImageUrl } from './utils/drive';
import { getTenantWorkspaceConfig } from './services/workspaceService';
import DriveFolderSelectorModal from './components/integrations/DriveFolderSelectorModal';

/**
 * Función auxiliar para comprimir y optimizar una imagen a DataURL
 * en caso de carga directa local sin carpeta en la nube.
 */
function compressImage(file: File, maxWidth = 400, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(event.target?.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
}

export default function EditUserPage({ userId, onBack }: { userId: string, onBack: () => void }) {
  const [user, setUser] = useState<UserProfile>({
    uid: userId,
    email: '',
    displayName: '',
    username: '',
    photoURL: '',
    phoneNumber: '',
    googleDriveFolderId: '',
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; isError: boolean } | null>(null);

  // Integración de Google Workspace y Drive
  const { accessToken, signIn, refreshUser } = useAuth();
  const { currentOrganization } = useOrganization();
  const [workspaceDriveFolder, setWorkspaceDriveFolder] = useState<{ id: string; name: string } | null>(null);
  const [isDriveModalOpen, setIsDriveModalOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Cargar datos de perfil y configuración de Workspace
  useEffect(() => {
    let isMounted = true;
    async function fetchData() {
      try {
        const profile = await getUserProfile(userId);
        if (!isMounted) return;

        const authUser = auth.currentUser;
        if (profile) {
          setUser({
            uid: userId,
            email: profile.email || (authUser?.uid === userId ? authUser?.email || '' : ''),
            displayName: profile.displayName || (authUser?.uid === userId ? authUser?.displayName || '' : ''),
            username: profile.username || (authUser?.uid === userId && authUser?.email ? authUser.email.split('@')[0] : ''),
            photoURL: profile.photoURL || (authUser?.uid === userId ? authUser?.photoURL || '' : ''),
            phoneNumber: profile.phoneNumber || (authUser?.uid === userId ? authUser?.phoneNumber || '' : ''),
            googleDriveFolderId: profile.googleDriveFolderId || '',
          });
        }

        // Consultar si el negocio actual tiene carpeta de Google Drive configurada
        if (currentOrganization?.id) {
          const wsConfig = await getTenantWorkspaceConfig(currentOrganization.id);
          if (isMounted && wsConfig?.driveFolderId) {
            setWorkspaceDriveFolder({
              id: wsConfig.driveFolderId,
              name: wsConfig.driveFolderName || currentOrganization.name,
            });
          }
        }
      } catch (err) {
        console.error("Error al cargar datos del usuario:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    fetchData();
    return () => { isMounted = false; };
  }, [userId, currentOrganization?.id]);

  // Manejador moderno de cambio de foto de perfil
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    setStatusMessage(null);

    try {
      let finalPhotoURL = '';

      // Determinar si podemos subir directamente a Google Drive
      const targetFolderId = user.googleDriveFolderId || workspaceDriveFolder?.id;

      if (accessToken && targetFolderId) {
        // Subida a Google Drive mediante la integración activa
        const driveResult = await uploadToDrive(file, targetFolderId, accessToken);
        finalPhotoURL = await getDriveImageUrl(driveResult.id, accessToken);
      } else {
        // Almacenamiento local optimizado en base64 de alta resolución
        finalPhotoURL = await compressImage(file, 400, 0.85);
      }

      const updatedUser = { ...user, photoURL: finalPhotoURL };
      setUser(updatedUser);

      // Guardar inmediatamente en Firestore
      await saveUserProfile(userId, updatedUser);

      // Sincronizar Firebase Auth si es el usuario actual
      if (auth.currentUser && auth.currentUser.uid === userId) {
        await updateProfile(auth.currentUser, {
          photoURL: finalPhotoURL,
        });
        await refreshUser();
      }

      setStatusMessage({ 
        text: accessToken && targetFolderId 
          ? "¡Foto de perfil actualizada y guardada en Google Drive!" 
          : "¡Foto de perfil actualizada correctamente!", 
        isError: false 
      });
    } catch (err: any) {
      console.error('Error al actualizar imagen de perfil:', err);
      setStatusMessage({ text: `Error al procesar imagen: ${err?.message || 'Error desconocido'}`, isError: true });
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemovePhoto = async () => {
    if (!user.photoURL) return;
    setUploadingImage(true);
    setStatusMessage(null);
    try {
      const updatedUser = { ...user, photoURL: '' };
      setUser(updatedUser);
      await saveUserProfile(userId, updatedUser);

      if (auth.currentUser && auth.currentUser.uid === userId) {
        await updateProfile(auth.currentUser, { photoURL: '' });
        await refreshUser();
      }
      setStatusMessage({ text: "Foto de perfil eliminada.", isError: false });
    } catch (err: any) {
      setStatusMessage({ text: `Error al quitar foto: ${err?.message}`, isError: true });
    } finally {
      setUploadingImage(false);
    }
  };

  const handleFolderSelected = async (folder: GoogleDriveItem) => {
    const updatedUser = { ...user, googleDriveFolderId: folder.id };
    setUser(updatedUser);
    setIsDriveModalOpen(false);
    try {
      await saveUserProfile(userId, updatedUser);
      setStatusMessage({ text: `Carpeta de Google Drive vinculada: "${folder.name}"`, isError: false });
    } catch (err: any) {
      console.error("Error guardando carpeta:", err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser || saving) return;

    setSaving(true);
    setStatusMessage(null);

    try {
      await saveUserProfile(userId, user);
      if (auth.currentUser.uid === userId) {
        await updateProfile(auth.currentUser, {
          displayName: user.displayName || '',
        });
        await refreshUser();
      }
      await logAuditEvent(`Usuario editado: ${user.email || userId}`, auth.currentUser.email || 'Anónimo', userId);
      setStatusMessage({ text: "¡Cambios guardados correctamente!", isError: false });
    } catch (err: any) {
      setStatusMessage({ text: err?.message || "Error al guardar.", isError: true });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500 font-medium">Cargando perfil...</div>;

  const currentFolderDisplayName = user.googleDriveFolderId 
    ? "Carpeta personal de Drive" 
    : workspaceDriveFolder?.name 
      ? `Negocio: ${workspaceDriveFolder.name}` 
      : null;

  return (
    <div className="p-4 max-w-lg mx-auto w-full">
      {/* Botón superior de retroceso */}
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors py-1.5 px-2.5 rounded-lg hover:bg-slate-100"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver</span>
        </button>
        <span className="text-xs font-medium text-slate-400">ID: {userId.slice(0, 8)}...</span>
      </div>

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Editar Perfil</h2>
          <p className="text-xs text-slate-500 mt-0.5">Actualiza tu información personal y foto de perfil.</p>
        </div>

        {/* Sección moderna de Foto de Perfil */}
        <div className="flex flex-col items-center justify-center p-4 bg-slate-50/80 rounded-xl border border-dashed border-slate-200">
          <div className="relative group">
            {user.photoURL ? (
              <img 
                src={user.photoURL} 
                alt="Perfil" 
                className="w-24 h-24 rounded-full object-cover border-2 border-white shadow-md" 
              />
            ) : (
              <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center text-slate-400 border-2 border-slate-200 shadow-sm">
                <UserIcon className="w-12 h-12 stroke-[1.5]" />
              </div>
            )}

            {/* Overlay interactivo para cambiar foto */}
            <button
              type="button"
              disabled={uploadingImage}
              onClick={() => fileInputRef.current?.click()}
              className="absolute inset-0 rounded-full bg-slate-900/40 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-0 cursor-pointer"
              title="Cambiar foto de perfil"
            >
              <Camera className="w-6 h-6 mb-0.5" />
              <span className="text-[10px] font-medium">Cambiar</span>
            </button>

            {/* Badge de carga */}
            {uploadingImage && (
              <div className="absolute inset-0 rounded-full bg-slate-900/60 text-white flex flex-col items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            )}
          </div>

          {/* Input de archivo oculto */}
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
          />

          {/* Acciones de foto */}
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              disabled={uploadingImage}
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 text-xs font-medium rounded-lg hover:bg-slate-50 transition-colors shadow-2xs flex items-center gap-1.5"
            >
              <Camera className="w-3.5 h-3.5 text-blue-600" />
              <span>{user.photoURL ? 'Cambiar Foto' : 'Subir Foto'}</span>
            </button>

            {user.photoURL && (
              <button
                type="button"
                disabled={uploadingImage}
                onClick={handleRemovePhoto}
                className="px-2.5 py-1.5 text-slate-500 hover:text-red-600 text-xs font-medium rounded-lg hover:bg-red-50 transition-colors flex items-center gap-1"
                title="Quitar foto actual"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Quitar</span>
              </button>
            )}
          </div>

          {/* Información y selector visual de Google Drive integrado */}
          {accessToken ? (
            <div className="mt-3 w-full pt-3 border-t border-slate-200/60 flex items-center justify-between text-xs text-slate-600">
              <div className="flex items-center gap-1.5 truncate">
                <FolderCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="truncate">
                  {currentFolderDisplayName 
                    ? `Guardando en: ${currentFolderDisplayName}` 
                    : 'Google Drive conectado'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsDriveModalOpen(true)}
                className="shrink-0 text-blue-600 hover:text-blue-700 font-medium hover:underline text-[11px] inline-flex items-center gap-1 ml-2"
              >
                <FolderOpen className="w-3.5 h-3.5" />
                <span>Elegir carpeta</span>
              </button>
            </div>
          ) : (
            <p className="mt-2 text-[11px] text-slate-400 text-center">
              Las fotos se optimizan y guardan automáticamente en tu perfil.
            </p>
          )}
        </div>

        {/* Mensaje de estado */}
        {statusMessage && (
          <div className={`p-3 rounded-xl text-xs font-medium flex items-center gap-2 ${
            statusMessage.isError 
              ? 'bg-red-50 text-red-700 border border-red-200' 
              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
          }`}>
            {statusMessage.isError ? <AlertCircle className="w-4 h-4 shrink-0" /> : <Check className="w-4 h-4 shrink-0" />}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* Campos del perfil */}
        <div className="space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Nombre Completo</label>
            <input 
              type="text" 
              value={user.displayName || ''} 
              onChange={(e) => setUser({ ...user, displayName: e.target.value })} 
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" 
              placeholder="Tu nombre completo"
            />
          </div>
          
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Nombre de Usuario</label>
            <input 
              type="text" 
              value={user.username || ''} 
              onChange={(e) => setUser({ ...user, username: e.target.value })} 
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" 
              placeholder="Ej: usuario123"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Correo Electrónico</label>
            <input 
              type="email" 
              value={user.email || ''} 
              disabled 
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 text-slate-500 cursor-not-allowed" 
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Teléfono</label>
            <input 
              type="tel" 
              value={user.phoneNumber || ''} 
              onChange={(e) => setUser({ ...user, phoneNumber: e.target.value })} 
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" 
              placeholder="+1 234 567 890"
            />
          </div>
        </div>

        {/* Botón de guardar cambios */}
        <button 
          type="submit" 
          disabled={saving || uploadingImage} 
          className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-lg transition-colors shadow-sm disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Guardando...</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>Guardar Cambios</span>
            </>
          )}
        </button>
      </form>

      {/* Modal interactivo para seleccionar carpeta de Google Drive */}
      {isDriveModalOpen && (
        <DriveFolderSelectorModal
          isOpen={isDriveModalOpen}
          onClose={() => setIsDriveModalOpen(false)}
          accessToken={accessToken}
          currentFolderId={user.googleDriveFolderId || workspaceDriveFolder?.id}
          onSelectFolder={handleFolderSelected}
          onReconnect={signIn}
        />
      )}
    </div>
  );
}
