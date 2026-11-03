import { useState, useEffect } from 'react';
import { GoogleDriveItem } from '../../types';
import { listDriveFolders, createDriveFolder } from '../../services/workspaceService';
import { Folder, FolderPlus, Search, X, RefreshCw, Check, AlertCircle, ChevronDown } from 'lucide-react';

interface DriveFolderSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  accessToken: string | null;
  currentFolderId?: string;
  onSelectFolder: (folder: GoogleDriveItem) => void;
  onReconnect: () => void;
}

export default function DriveFolderSelectorModal({
  isOpen,
  onClose,
  accessToken,
  currentFolderId,
  onSelectFolder,
  onReconnect,
}: DriveFolderSelectorModalProps) {
  const [folders, setFolders] = useState<GoogleDriveItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [nextPageToken, setNextPageToken] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Estados para creación rápida de carpeta
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Debounce del input de búsqueda (350 ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
    }, 350);

    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Carga inicial y ante cambios en el término de búsqueda
  useEffect(() => {
    if (isOpen && accessToken) {
      loadFolders(debouncedSearch);
    }
  }, [isOpen, accessToken, debouncedSearch]);

  // Limpiar estados al cerrar el modal
  useEffect(() => {
    if (!isOpen) {
      setSearchTerm('');
      setDebouncedSearch('');
      setNextPageToken(undefined);
      setError(null);
      setShowCreateForm(false);
      setNewFolderName('');
      setCreateError(null);
    }
  }, [isOpen]);

  const handleCreateFolder = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const name = newFolderName.trim();
    if (!name || !accessToken || isCreating) return;

    setIsCreating(true);
    setCreateError(null);
    try {
      const created = await createDriveFolder(accessToken, name);
      // Insertar al inicio de la lista
      setFolders((prev) => [created, ...prev]);
      // Seleccionar inmediatamente
      onSelectFolder(created);
      onClose();
    } catch (err: any) {
      console.error('[DriveFolderSelectorModal] Error al crear carpeta:', err);
      setCreateError(err?.message || 'Error al crear la carpeta en Google Drive.');
    } finally {
      setIsCreating(false);
    }
  };

  const loadFolders = async (search: string) => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const res = await listDriveFolders(accessToken, {
        searchTerm: search || undefined,
        pageSize: 50,
      });
      setFolders(res.items);
      setNextPageToken(res.nextPageToken);
    } catch (err: any) {
      console.error('[DriveFolderSelectorModal] Error:', err);
      if (err?.message?.includes('AUTH_EXPIRED') || err?.message?.includes('401')) {
        setError('Tu sesión de Google Workspace ha expirado. Por favor reconecta tu cuenta.');
      } else {
        setError(err?.message || 'Error al obtener las carpetas de Google Drive.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLoadMore = async () => {
    if (!accessToken || !nextPageToken || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await listDriveFolders(accessToken, {
        searchTerm: debouncedSearch || undefined,
        pageToken: nextPageToken,
        pageSize: 50,
      });
      setFolders((prev) => [...prev, ...res.items]);
      setNextPageToken(res.nextPageToken);
    } catch (err: any) {
      console.error('[DriveFolderSelectorModal] Error cargando más carpetas:', err);
      setError('No se pudieron cargar más carpetas. Intenta de nuevo.');
    } finally {
      setLoadingMore(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-150">
      <div 
        className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="drive-selector-title"
      >
        {/* Encabezado */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Folder className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 id="drive-selector-title" className="text-lg font-bold text-slate-900">
                Seleccionar Carpeta de Fotos
              </h2>
              <p className="text-xs text-slate-500">
                Busca en todo tu Drive o navega por tus carpetas
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Buscador y Controles */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
          <div className="relative flex-grow">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar en todo Google Drive..."
              className="w-full pl-9 pr-8 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                title="Limpiar búsqueda"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => loadFolders(debouncedSearch)}
            disabled={loading}
            title="Recargar carpetas"
            className="p-2 text-slate-600 hover:text-blue-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            type="button"
            onClick={() => {
              setShowCreateForm((prev) => !prev);
              setCreateError(null);
            }}
            title="Crear nueva carpeta en Google Drive"
            className={`px-3 py-2 text-xs font-semibold rounded-xl border transition-colors flex items-center gap-1.5 shrink-0 ${
              showCreateForm
                ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                : 'bg-white text-blue-700 border-blue-200 hover:bg-blue-50'
            }`}
          >
            <FolderPlus className="w-4 h-4" />
            <span className="hidden sm:inline">Nueva carpeta</span>
          </button>
        </div>

        {/* Formulario desplegable para crear nueva carpeta */}
        {showCreateForm && (
          <form 
            onSubmit={handleCreateFolder}
            className="p-3 bg-blue-50/80 border-b border-blue-100 flex flex-col gap-2 animate-in fade-in duration-100"
          >
            <div className="flex items-center justify-between text-xs font-semibold text-blue-900">
              <span className="flex items-center gap-1.5">
                <FolderPlus className="w-4 h-4 text-blue-600" />
                Crear nueva carpeta en Google Drive
              </span>
              <button
                type="button"
                onClick={() => {
                  setShowCreateForm(false);
                  setNewFolderName('');
                  setCreateError(null);
                }}
                className="text-slate-400 hover:text-slate-600 text-xs font-normal"
              >
                Cancelar
              </button>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Nombre de la carpeta (ej. Fotos Productos)"
                className="flex-grow px-3 py-2 text-xs bg-white border border-blue-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 placeholder-slate-400"
                disabled={isCreating}
                autoFocus
              />
              <button
                type="submit"
                disabled={!newFolderName.trim() || isCreating}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition-colors disabled:opacity-50 flex items-center gap-1.5 shrink-0 shadow-sm"
              >
                {isCreating ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Creando...</span>
                  </>
                ) : (
                  <span>Crear y seleccionar</span>
                )}
              </button>
            </div>
            {createError && (
              <p className="text-[11px] text-red-600 font-medium">{createError}</p>
            )}
          </form>
        )}

        {/* Lista de Carpetas */}
        <div className="flex-grow overflow-y-auto p-4 space-y-1.5 min-h-[220px]">
          {error ? (
            <div className="p-6 text-center">
              <div className="w-12 h-12 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <AlertCircle className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-slate-900 mb-1">{error}</p>
              <button
                type="button"
                onClick={onReconnect}
                className="mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-xl transition-colors shadow-sm"
              >
                Reconectar con Google
              </button>
            </div>
          ) : loading ? (
            <div className="p-12 text-center text-slate-500">
              <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm font-medium">
                {debouncedSearch ? 'Buscando coincidencias en Google Drive...' : 'Cargando tus carpetas...'}
              </p>
            </div>
          ) : folders.length === 0 ? (
            <div className="p-10 text-center text-slate-500">
              <Folder className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-800">
                {debouncedSearch ? 'No se encontraron carpetas coincidentes' : 'No tienes carpetas creadas en tu Drive'}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {debouncedSearch ? 'Prueba con otro término de búsqueda' : 'Crea una carpeta en tu Google Drive y pulsa recargar'}
              </p>
            </div>
          ) : (
            <>
              {folders.map((folder) => {
                const isSelected = folder.id === currentFolderId;
                return (
                  <button
                    key={folder.id}
                    type="button"
                    onClick={() => {
                      onSelectFolder(folder);
                      onClose();
                    }}
                    className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-center justify-between group ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50/70 text-blue-950 font-semibold'
                        : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50/80 text-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xl shrink-0">📁</span>
                      <span className="truncate text-sm">{folder.name}</span>
                    </div>
                    {isSelected ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 bg-blue-100/70 px-2.5 py-1 rounded-full shrink-0">
                        <Check className="w-3.5 h-3.5" />
                        Seleccionada
                      </span>
                    ) : (
                      <span className="text-xs font-medium text-slate-400 group-hover:text-blue-600 transition-colors shrink-0">
                        Seleccionar
                      </span>
                    )}
                  </button>
                );
              })}

              {/* Botón Cargar más carpetas si existe paginación */}
              {nextPageToken && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                    className="w-full py-2.5 px-4 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
                  >
                    {loadingMore ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" />
                        <span>Cargando más carpetas...</span>
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-4 h-4 text-slate-500" />
                        <span>Cargar más carpetas</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Pie */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <span>
            {folders.length} {folders.length === 1 ? 'carpeta mostrada' : 'carpetas mostradas'}
            {nextPageToken ? ' (más disponibles)' : ''}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
