import { TenantMember } from '../../types';
import { Trash2, ShieldCheck, User } from 'lucide-react';

interface MemberRowProps {
  member: TenantMember;
  isCurrentUser: boolean;
  canManage: boolean;
  adminCount: number;
  onRemove: (member: TenantMember) => void;
}

export default function MemberRow({
  member,
  isCurrentUser,
  canManage,
  adminCount,
  onRemove,
}: MemberRowProps) {
  const isSelfAdmin = isCurrentUser && member.role === 'admin';
  const isOnlyAdmin = member.role === 'admin' && adminCount <= 1;
  const isDeleteDisabled = isSelfAdmin || isOnlyAdmin;

  const getDeleteDisabledTooltip = () => {
    if (isSelfAdmin) return "Un administrador no puede eliminarse a sí mismo.";
    if (isOnlyAdmin) return "Debe existir al menos un administrador.";
    return "Eliminar miembro";
  };

  return (
    <tr className="border-b border-slate-100 hover:bg-slate-50/70 transition-colors">
      {/* Nombre */}
      <td className="py-3.5 px-4 text-sm font-medium text-slate-900">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 shrink-0">
            {member.role === 'admin' ? (
              <ShieldCheck className="w-4 h-4 text-blue-600" />
            ) : (
              <User className="w-4 h-4 text-slate-500" />
            )}
          </div>
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="truncate font-semibold text-slate-900">
              {member.displayName}
            </span>
            {isCurrentUser && (
              <span className="text-xs font-medium text-slate-400 shrink-0">
                (Tú)
              </span>
            )}
          </div>
        </div>
      </td>

      {/* Email */}
      <td className="py-3.5 px-4 text-sm text-slate-600 truncate max-w-xs">
        {member.email}
      </td>

      {/* Rol */}
      <td className="py-3.5 px-4 text-sm">
        {member.role === 'admin' ? (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            Admin
          </span>
        ) : (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            Member
          </span>
        )}
      </td>

      {/* Acciones */}
      <td className="py-3.5 px-4 text-sm text-right">
        {canManage ? (
          <div className="inline-block" title={getDeleteDisabledTooltip()}>
            <button
              type="button"
              onClick={() => onRemove(member)}
              disabled={isDeleteDisabled}
              className={`p-1.5 rounded-lg transition-colors inline-flex items-center justify-center ${
                isDeleteDisabled
                  ? 'text-slate-300 cursor-not-allowed'
                  : 'text-slate-400 hover:text-red-600 hover:bg-red-50'
              }`}
              aria-label={`Eliminar a ${member.displayName}`}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <span className="text-slate-300 text-xs">—</span>
        )}
      </td>
    </tr>
  );
}
