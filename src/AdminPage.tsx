import { Users, Clock, ArrowLeft } from 'lucide-react';

export default function AdminPage({ onBack, onNavigateToSection }: { onBack: () => void, onNavigateToSection: (section: string) => void }) {
  return (
    <div className="p-6">
      <button onClick={onBack} className="mb-4 flex items-center gap-2 p-2 hover:bg-slate-100 rounded-full transition-colors">
        <ArrowLeft className="w-6 h-6 text-slate-600" />
        <span className="font-semibold text-slate-900">Volver</span>
      </button>
      
      <main>
        <div className="grid grid-cols-1 gap-4">
          <button
            onClick={() => onNavigateToSection('admin-users')}
            className="flex items-center gap-4 p-6 bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
              <Users className="w-8 h-8" />
            </div>
            <div className="text-left">
              <h2 className="font-semibold text-lg">Gestión de Usuarios</h2>
              <p className="text-sm text-slate-500">Administrar cuentas y roles</p>
            </div>
          </button>
          <button
            onClick={() => onNavigateToSection('admin-historial')}
            className="flex items-center gap-4 p-6 bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="p-3 bg-slate-50 text-slate-600 rounded-lg">
              <Clock className="w-8 h-8" />
            </div>
            <div className="text-left">
              <h2 className="font-semibold text-lg">Historial de Cambios</h2>
              <p className="text-sm text-slate-500">Registro de actividades</p>
            </div>
          </button>
        </div>
      </main>
    </div>
  );
}
