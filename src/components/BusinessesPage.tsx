import { useState } from 'react';
import { useOrganization } from '../OrganizationContext';
import CreateOrganizationView from './CreateOrganizationView';

export default function BusinessesPage({ onBack }: { onBack: () => void }) {
  const { currentOrganization, userOrganizations, deleteOrg } = useOrganization();
  const [orgToDelete, setOrgToDelete] = useState<{ id: string; name: string } | null>(null);
  const [loading, setLoading] = useState(false);

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

  return (
    <div className="p-6">
      <button onClick={onBack} className="mb-4 text-sm text-slate-600 hover:text-slate-900">
        ← Volver
      </button>
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Mis Negocios</h1>
      
      <div className="grid gap-4 mb-8">
        {userOrganizations.map((org) => (
          <div 
            key={org.id} 
            className={`p-4 border rounded-lg flex items-center justify-between ${currentOrganization?.id === org.id ? 'border-blue-500 bg-blue-50' : 'border-slate-200'}`}
          >
            <div>
              <h3 className="font-semibold text-slate-900">{org.name}</h3>
              {currentOrganization?.id === org.id && <span className="text-xs font-medium text-blue-600">Negocio activo</span>}
            </div>
            {org.role === 'admin' && (
              <button 
                onClick={() => setOrgToDelete({ id: org.id, name: org.name })}
                className="text-xs text-red-600 hover:text-red-700 font-medium"
              >
                Eliminar Negocio
              </button>
            )}
          </div>
        ))}
      </div>

      {orgToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded-xl w-full max-w-sm">
            <h2 className="text-lg font-bold text-slate-900 mb-4">¿Eliminar {orgToDelete.name}?</h2>
            <p className="text-sm text-slate-600 mb-6">Esta acción no se puede deshacer.</p>
            <div className="flex gap-3">
              <button 
                onClick={() => setOrgToDelete(null)}
                className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
              >
                Cancelar
              </button>
              <button 
                onClick={handleDelete}
                disabled={loading}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {loading ? 'Eliminando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="border-t border-slate-200 pt-6">
        <h2 className="text-lg font-bold text-slate-900 mb-4">Crear nuevo negocio</h2>
        <CreateOrganizationView />
      </div>
    </div>
  );
}
