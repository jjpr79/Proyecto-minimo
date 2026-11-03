import { useState } from 'react';
import { MemberRole } from '../../types';
import { X, UserPlus, AlertCircle } from 'lucide-react';

interface AddMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddMember: (email: string, role: MemberRole) => Promise<void>;
}

export default function AddMemberModal({
  isOpen,
  onClose,
  onAddMember,
}: AddMemberModalProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<MemberRole>('member');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleClose = () => {
    if (submitting) return;
    setEmail('');
    setRole('member');
    setErrorMessage(null);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setErrorMessage("Por favor, ingresa el correo electrónico.");
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      await onAddMember(cleanEmail, role);
      handleClose();
    } catch (err: any) {
      console.error("[AddMemberModal] Error al agregar miembro:", err);
      // Mapear el mensaje exacto según especificación
      if (err?.message?.includes("No existe una cuenta registrada") || err?.message?.includes("not-found")) {
        setErrorMessage("No existe una cuenta registrada con ese email.");
      } else {
        setErrorMessage(err?.message || "Ocurrió un error al intentar agregar el miembro.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-150">
      <div 
        className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {/* Encabezado */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <UserPlus className="w-4 h-4" />
            </div>
            <h2 id="modal-title" className="text-lg font-bold text-slate-900">
              Agregar miembro
            </h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={submitting}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-50"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div>
            <label htmlFor="member-email" className="block text-xs font-semibold text-slate-700 mb-1.5">
              Email del colaborador
            </label>
            <input
              id="member-email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errorMessage) setErrorMessage(null);
              }}
              placeholder="nombre@ejemplo.com"
              disabled={submitting}
              className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-50 transition-colors"
              required
              autoFocus
            />
            <p className="text-[11px] text-slate-500 mt-1">
              El usuario ya debe contar con una cuenta activa en la plataforma.
            </p>
          </div>

          <div>
            <label htmlFor="member-role" className="block text-xs font-semibold text-slate-700 mb-1.5">
              Rol asignado
            </label>
            <select
              id="member-role"
              value={role}
              onChange={(e) => setRole(e.target.value as MemberRole)}
              disabled={submitting}
              className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-50 bg-white transition-colors"
            >
              <option value="member">Member (Colaborador)</option>
              <option value="admin">Admin (Administrador)</option>
            </select>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={handleClose}
              disabled={submitting}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting || !email.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Buscando...</span>
                </>
              ) : (
                'Agregar miembro'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
