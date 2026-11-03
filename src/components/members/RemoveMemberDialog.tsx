import { useState } from 'react';
import { BusinessMember } from '../../services/memberService';
import { AlertTriangle, X } from 'lucide-react';

interface RemoveMemberDialogProps {
  member: BusinessMember | null;
  onClose: () => void;
  onConfirm: (member: BusinessMember) => Promise<void>;
}

export default function RemoveMemberDialog({
  member,
  onClose,
  onConfirm,
}: RemoveMemberDialogProps) {
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!member) return null;

  const handleClose = () => {
    if (submitting) return;
    setErrorMessage(null);
    onClose();
  };

  const handleConfirm = async () => {
    setSubmitting(true);
    setErrorMessage(null);
    try {
      await onConfirm(member);
      handleClose();
    } catch (err: any) {
      console.error("[RemoveMemberDialog] Error al eliminar:", err);
      setErrorMessage(err?.message || "Error al eliminar el miembro.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-150">
      <div 
        className="w-full max-w-sm bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <button
              type="button"
              onClick={handleClose}
              disabled={submitting}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-50"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <h3 id="dialog-title" className="text-lg font-bold text-slate-900 mb-1.5">
            ¿Eliminar este miembro?
          </h3>
          <p className="text-sm text-slate-600 mb-2">
            Perderá acceso inmediatamente al negocio.
          </p>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl mb-4 text-xs">
            <p className="font-semibold text-slate-800">{member.displayName}</p>
            <p className="text-slate-500 truncate">{member.email}</p>
            <p className="text-slate-400 mt-1 uppercase text-[10px] tracking-wider font-semibold">
              Rol: {member.role}
            </p>
          </div>

          {errorMessage && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
              {errorMessage}
            </div>
          )}

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleClose}
              disabled={submitting}
              className="flex-1 py-2.5 px-4 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={submitting}
              className="flex-1 py-2.5 px-4 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Eliminando...</span>
                </>
              ) : (
                'Eliminar'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
