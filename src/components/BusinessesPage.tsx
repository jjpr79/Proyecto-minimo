import { useState } from 'react';
import { useOrganization } from '../OrganizationContext';
import { Building2, Users, Trash2, Plus, X, Check } from 'lucide-react';

export default function BusinessesPage({ onBack, onNavigate }: { onBack: () => void, onNavigate?: (page: string) => void }) {
  const { currentOrganization, userOrganizations, deleteOrg, setCurrentOrganization, createOrg } = useOrganization();
  const [orgToDelete, setOrgToDelete] = useState<{ id: string; name: string } | null>(null);
  const [loading, setLoading] = useState(false);

  // Estado para el popup de creación de negocio
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!orgToDelete) return;
    setLoading(true);
    try {
      await deleteOrg(orgToDelete.id);
      setOrgToDelete(null);
    } catch (error) {
      alert("Error al eliminar el negocio.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrgName.trim() || isCreating) return;
    setIsCreating(true);
    setCreateError(null);
    try {
      await createOrg(newOrgName.trim());
      setNewOrgName('');
      setIsCreateModalOpen(false);
    } catch (error: any) {
      console.error("Error creating organization:", error);
      setCreateError(error?.message || "Error al crear el negocio.");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      {/* Botón Volver y Encabezado */}
      <div className="mb-6">
        <button 
          onClick={onBack} 
          className="inline-flex items-center text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors mb-3"
        >
          ← Volver
        </button>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Mis Negocios</h1>
            <p className="text-sm text-slate-500 mt-0.5">Administra tus empresas u organizaciones y sus miembros</p>
          </div>
        </div>
      </div>
      
      {/* Cuadrícula de negocios: 2 columnas en celular, 3 en tablets, 4 en desktop */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
        {userOrganizations.map((org) => {
          const isActive = currentOrganization?.id === org.id;
          return (
            <div 
              key={org.id} 
              className={`relative flex flex-col justify-between p-3.5 sm:p-4 rounded-xl border transition-all min-h-[160px] ${
                isActive 
                  ? 'border-blue-500 bg-blue-50/40 ring-2 ring-blue-500/20 shadow-sm' 
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
              }`}
            >
              {/* Parte superior de la tarjeta */}
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className={`p-2 rounded-lg ${isActive ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'}`}>
                    <Building2 className="w-4 h-4" />
                  </div>
                  {isActive && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                      <Check className="w-3 h-3" />
                      Activo
                    </span>
                  )}
                </div>

                <h3 
                  onClick={() => setCurrentOrganization(org)}
                  className="font-semibold text-slate-900 text-sm leading-snug line-clamp-2 break-words cursor-pointer hover:text-blue-600 transition-colors"
                  title={org.name}
                >
                  {org.name}
                </h3>
                <p className="text-[11px] text-slate-500 capitalize mt-0.5">
                  {org.role === 'admin' ? 'Administrador' : 'Miembro'}
                </p>
              </div>

              {/* Botones de acción al pie de la tarjeta */}
              <div className="pt-3 mt-2 border-t border-slate-100 flex items-center justify-between gap-1.5">
                <button 
                  type="button"
                  onClick={() => {
                    setCurrentOrganization(org);
                    if (onNavigate) onNavigate('business-members');
                  }}
                  className="flex-1 inline-flex items-center justify-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium py-1.5 px-2 rounded-lg hover:bg-blue-100/60 transition-colors"
                  title="Gestionar miembros"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Miembros</span>
                </button>

                {org.role === 'admin' && (
                  <button 
                    type="button"
                    onClick={() => setOrgToDelete({ id: org.id, name: org.name })}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Eliminar negocio"
                    aria-label="Eliminar negocio"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {/* Última tarjeta: Agregar negocio */}
        <button
          type="button"
          onClick={() => {
            setCreateError(null);
            setNewOrgName('');
            setIsCreateModalOpen(true);
          }}
          className="flex flex-col items-center justify-center p-4 rounded-xl border-2 border-dashed border-slate-300 hover:border-blue-500 bg-slate-50/50 hover:bg-blue-50/40 text-slate-600 hover:text-blue-600 transition-all min-h-[160px] cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-full bg-white shadow-sm border border-slate-200 group-hover:border-blue-300 group-hover:bg-blue-600 group-hover:text-white flex items-center justify-center mb-2.5 transition-colors text-slate-600">
            <Plus className="w-5 h-5" />
          </div>
          <span className="text-xs sm:text-sm font-semibold">Agregar negocio</span>
          <span className="text-[11px] text-slate-400 group-hover:text-blue-500/80 mt-0.5">Crear nueva empresa</span>
        </button>
      </div>

      {/* Popup / Modal para Crear Negocio */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div 
            className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-slate-100 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cabecera del modal */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                  <Building2 className="w-5 h-5" />
                </div>
                <h2 className="text-lg font-bold text-slate-900">Agregar negocio</h2>
              </div>
              <button 
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Formulario */}
            <form onSubmit={handleCreateSubmit} className="p-6">
              <p className="text-xs text-slate-500 mb-4">
                Ingresa el nombre de la nueva empresa u organización para crearla y empezar a gestionar a tu equipo.
              </p>

              <div className="mb-5">
                <label htmlFor="new-org-name" className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Nombre del negocio
                </label>
                <input 
                  id="new-org-name"
                  type="text" 
                  value={newOrgName} 
                  onChange={(e) => setNewOrgName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Ej: Mi Empresa S.A."
                  autoFocus
                  required
                />
              </div>

              {createError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
                  {createError}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button 
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  disabled={isCreating}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={isCreating || !newOrgName.trim()}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 shadow-sm"
                >
                  {isCreating ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Creando...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      <span>Crear Negocio</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Confirmación para Eliminar Negocio */}
      {orgToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded-2xl w-full max-w-sm shadow-2xl border border-slate-100">
            <h2 className="text-lg font-bold text-slate-900 mb-2">¿Eliminar {orgToDelete.name}?</h2>
            <p className="text-xs text-slate-600 mb-6 leading-relaxed">
              Esta acción no se puede deshacer. Se eliminarán los vínculos de los miembros y la configuración asociada a este negocio.
            </p>
            <div className="flex gap-3">
              <button 
                type="button"
                onClick={() => setOrgToDelete(null)}
                disabled={loading}
                className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
              >
                Cancelar
              </button>
              <button 
                type="button"
                onClick={handleDelete}
                disabled={loading}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Eliminando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
