import { useState } from 'react';
import { useOrganization } from '../OrganizationContext';

export default function CreateOrganizationView() {
  const { createOrg } = useOrganization();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      await createOrg(name);
    } catch (error) {
      console.error("Error creating organization:", error);
      alert("Error al crear la organización");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-4 bg-slate-50">
      <form onSubmit={handleSubmit} className="w-full max-w-md p-8 bg-white rounded-xl border border-slate-200 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900 mb-6">Crea tu primera organización</h1>
        <div className="mb-4">
          <label className="block text-sm font-semibold text-slate-700 mb-2">Nombre de la organización</label>
          <input 
            type="text" 
            value={name} 
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600"
            placeholder="Ej: Mi Empresa"
            required
          />
        </div>
        <button 
          type="submit" 
          disabled={loading}
          className="w-full py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Creando...' : 'Crear Organización'}
        </button>
      </form>
    </div>
  );
}
