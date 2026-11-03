import { useState, useEffect } from 'react';
import { useAuth } from '../../AuthContext';
import { useOrganization } from '../../OrganizationContext';
import { GoogleWorkspaceIntegration, GoogleDriveItem } from '../../types';
import { 
  getTenantWorkspaceConfig, 
  saveTenantWorkspaceConfig, 
  validateDriveItem 
} from '../../services/workspaceService';
import DriveFolderSelectorModal from '../../components/integrations/DriveFolderSelectorModal';
import SheetsSelectorModal from '../../components/integrations/SheetsSelectorModal';
import { 
  ArrowLeft, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  Folder, 
  FileSpreadsheet, 
  Sparkles, 
  Building2, 
  ExternalLink 
} from 'lucide-react';

interface IntegrationsPageProps {
  onBack: () => void;
  onNavigate?: (page: string) => void;
}

export default function IntegrationsPage({ onBack, onNavigate }: IntegrationsPageProps) {
  const { user, accessToken, signIn } = useAuth();
  const { currentOrganization } = useOrganization();

  const [config, setConfig] = useState<GoogleWorkspaceIntegration | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Estados de validación en vivo
  const [driveValidation, setDriveValidation] = useState<{ valid: boolean; error?: string } | null>(null);
  const [sheetsValidation, setSheetsValidation] = useState<{ valid: boolean; error?: string } | null>(null);
  const [validating, setValidating] = useState(false);

  // Modales
  const [isDriveModalOpen, setIsDriveModalOpen] = useState(false);
  const [isSheetsModalOpen, setIsSheetsModalOpen] = useState(false);

  // Carga de configuración de Workspace para el tenant activo
  useEffect(() => {
    async function loadConfig() {
      if (!currentOrganization) {
        setConfig(null);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const data = await getTenantWorkspaceConfig(currentOrganization.id);
        setConfig(data || { connected: !!accessToken });
      } catch (err) {
        console.error('[IntegrationsPage] Error cargando configuración:', err);
      } finally {
        setLoading(false);
      }
    }
    loadConfig();
  }, [currentOrganization?.id, accessToken]);

  // Validación de recursos seleccionados en Drive/Sheets
  useEffect(() => {
    async function validateResources() {
      if (!accessToken || !config) return;
      setValidating(true);

      if (config.driveFolderId) {
        const res = await validateDriveItem(config.driveFolderId, accessToken);
        setDriveValidation(res);
      } else {
        setDriveValidation(null);
      }

      if (config.spreadsheetId) {
        const res = await validateDriveItem(config.spreadsheetId, accessToken);
        setSheetsValidation(res);
      } else {
        setSheetsValidation(null);
      }

      setValidating(false);
    }

    if (config?.driveFolderId || config?.spreadsheetId) {
      validateResources();
    }
  }, [config?.driveFolderId, config?.spreadsheetId, accessToken]);

  if (!currentOrganization) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <button
          onClick={onBack}
          className="mb-6 flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver</span>
        </button>
        <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center shadow-sm">
          <div className="w-12 h-12 bg-slate-100 text-slate-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">No hay un negocio seleccionado</h2>
          <p className="text-sm text-slate-500 max-w-md mx-auto mb-6">
            Selecciona un negocio para administrar sus integraciones con Google Workspace.
          </p>
          {onNavigate && (
            <button
              onClick={() => onNavigate('negocios')}
              className="py-2.5 px-5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-xl transition-colors shadow-sm"
            >
              Ir a Mis Negocios
            </button>
          )}
        </div>
      </div>
    );
  }

  const handleSelectFolder = async (folder: GoogleDriveItem) => {
    if (!currentOrganization) return;
    setSaving(true);
    try {
      const updated: GoogleWorkspaceIntegration = {
        ...config,
        connected: true,
        driveFolderId: folder.id,
        driveFolderName: folder.name,
      };
      await saveTenantWorkspaceConfig(currentOrganization.id, updated, user?.email || undefined);
      setConfig(updated);
      setDriveValidation({ valid: true });
    } catch (err) {
      console.error('[IntegrationsPage] Error guardando carpeta:', err);
      alert('Error al guardar la carpeta seleccionada.');
    } finally {
      setSaving(false);
    }
  };

  const handleSelectSpreadsheet = async (sheet: GoogleDriveItem) => {
    if (!currentOrganization) return;
    setSaving(true);
    try {
      const updated: GoogleWorkspaceIntegration = {
        ...config,
        connected: true,
        spreadsheetId: sheet.id,
        spreadsheetName: sheet.name,
      };
      await saveTenantWorkspaceConfig(currentOrganization.id, updated, user?.email || undefined);
      setConfig(updated);
      setSheetsValidation({ valid: true });
    } catch (err) {
      console.error('[IntegrationsPage] Error guardando hoja:', err);
      alert('Error al guardar la hoja de cálculo seleccionada.');
    } finally {
      setSaving(false);
    }
  };

  const isConfiguredForCatalog = Boolean(config?.driveFolderId && config?.spreadsheetId && driveValidation?.valid !== false && sheetsValidation?.valid !== false);

  return (
    <div className="p-6 max-w-5xl mx-auto w-full">
      {/* Botón Volver */}
      <button
        onClick={onBack}
        className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Volver</span>
      </button>

      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Integraciones</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Negocio activo: <span className="font-semibold text-slate-700">{currentOrganization.name}</span>
          </p>
        </div>

        {/* Estado global de Google Workspace */}
        <div className="flex items-center gap-2 shrink-0">
          {accessToken ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Google Workspace Conectado</span>
            </div>
          ) : (
            <button
              onClick={signIn}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium transition-colors shadow-sm"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Conectar Google Workspace</span>
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-500">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm font-medium">Cargando integraciones del negocio...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Banner de Próximo Producto: Constructor de Catálogos */}
          <div className={`p-5 rounded-2xl border transition-all ${
            isConfiguredForCatalog 
              ? 'bg-gradient-to-r from-blue-50/80 to-indigo-50/80 border-blue-200' 
              : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="flex-grow min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-sm font-bold text-slate-900">
                    Fuente de Datos para el Constructor de Catálogos
                  </h3>
                  {isConfiguredForCatalog && (
                    <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                      Listo para sincronizar
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  El próximo catálogo del negocio se generará automáticamente combinando los datos y precios de tu hoja de cálculo con las fotos de productos de tu carpeta de Google Drive.
                </p>

                <div className="mt-3 flex flex-wrap items-center gap-4 text-xs font-medium text-slate-700">
                  <div className="flex items-center gap-1.5">
                    <span className="text-base">📁</span>
                    <span>Fotos:</span>
                    <span className="font-semibold text-slate-900">
                      {config?.driveFolderName || 'Pendiente de configurar'}
                    </span>
                  </div>
                  <span className="text-slate-300">•</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-base">📊</span>
                    <span>Datos:</span>
                    <span className="font-semibold text-slate-900">
                      {config?.spreadsheetName || 'Pendiente de configurar'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tarjetas de Integración */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Tarjeta 1: Google Drive */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                      <Folder className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-base">Google Drive</h3>
                      <p className="text-xs text-slate-500">Almacenamiento de fotos de productos</p>
                    </div>
                  </div>
                  {config?.driveFolderId ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Conectado
                    </span>
                  ) : (
                    <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                      Sin carpeta
                    </span>
                  )}
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-4">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Carpeta de fotos seleccionada
                  </label>
                  {config?.driveFolderName ? (
                    <div className="flex items-center gap-2 text-slate-900 font-semibold text-sm">
                      <span className="text-lg">📁</span>
                      <span className="truncate">{config.driveFolderName}</span>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">
                      Aún no has seleccionado una carpeta para las fotos.
                    </p>
                  )}

                  {/* Alerta de validación en caso de carpeta eliminada */}
                  {driveValidation && !driveValidation.valid && (
                    <div className="mt-3 p-2.5 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2 text-xs text-amber-800">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                      <div>
                        <p className="font-semibold">Atención:</p>
                        <p>{driveValidation.error || 'La carpeta configurada no se encuentra disponible.'}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setIsDriveModalOpen(true)}
                  disabled={saving}
                  className="w-full py-2.5 px-4 bg-white border border-slate-300 hover:bg-slate-50 hover:border-slate-400 text-slate-800 font-medium text-sm rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2"
                >
                  <Folder className="w-4 h-4 text-blue-600" />
                  <span>{config?.driveFolderId ? 'Cambiar carpeta' : 'Seleccionar carpeta'}</span>
                </button>
              </div>
            </div>

            {/* Tarjeta 2: Google Sheets */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                      <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-base">Google Sheets</h3>
                      <p className="text-xs text-slate-500">Hoja de inventario, stock y precios</p>
                    </div>
                  </div>
                  {config?.spreadsheetId ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Conectado
                    </span>
                  ) : (
                    <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                      Sin hoja
                    </span>
                  )}
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-4">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Hoja de cálculo seleccionada
                  </label>
                  {config?.spreadsheetName ? (
                    <div className="flex items-center gap-2 text-slate-900 font-semibold text-sm">
                      <span className="text-lg">📊</span>
                      <span className="truncate">{config.spreadsheetName}</span>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">
                      Aún no has seleccionado una hoja de cálculo con tu catálogo.
                    </p>
                  )}

                  {/* Alerta de validación en caso de hoja eliminada */}
                  {sheetsValidation && !sheetsValidation.valid && (
                    <div className="mt-3 p-2.5 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2 text-xs text-amber-800">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                      <div>
                        <p className="font-semibold">Atención:</p>
                        <p>{sheetsValidation.error || 'La hoja configurada no se encuentra disponible.'}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setIsSheetsModalOpen(true)}
                  disabled={saving}
                  className="w-full py-2.5 px-4 bg-white border border-slate-300 hover:bg-slate-50 hover:border-slate-400 text-slate-800 font-medium text-sm rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span>{config?.spreadsheetId ? 'Cambiar hoja' : 'Seleccionar hoja'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Selector Modal de Carpetas Drive */}
      <DriveFolderSelectorModal
        isOpen={isDriveModalOpen}
        onClose={() => setIsDriveModalOpen(false)}
        accessToken={accessToken}
        currentFolderId={config?.driveFolderId}
        onSelectFolder={handleSelectFolder}
        onReconnect={signIn}
      />

      {/* Selector Modal de Google Sheets */}
      <SheetsSelectorModal
        isOpen={isSheetsModalOpen}
        onClose={() => setIsSheetsModalOpen(false)}
        accessToken={accessToken}
        currentSpreadsheetId={config?.spreadsheetId}
        onSelectSpreadsheet={handleSelectSpreadsheet}
        onReconnect={signIn}
      />
    </div>
  );
}
