import { Users, Clock } from 'lucide-react';

export default function AdminPage({ onBack, onNavigateToSection }: { onBack: () => void, onNavigateToSection: (section: string) => void }) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="flex items-center justify-between gap-2 p-[5px] border-b border-slate-200">
        <div className="shrink-0">
          <img src="/src/assets/images/app_logo_1793149440150.jpg" alt="Logo" className="w-10 h-10 rounded-full" />
        </div>
        <div className="font-bold text-lg">Administración</div>
        <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full">
          ✕
        </button>
      </header>

      <main className="flex-grow p-6">
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
