import { useState } from 'react';
import { useAuth } from '../../AuthContext';
import { useOrganization } from '../../OrganizationContext';
import { useMembers } from '../../hooks/useMembers';
import { TenantMember, MemberRole } from '../../types';
import AddMemberModal from '../../components/members/AddMemberModal';
import RemoveMemberDialog from '../../components/members/RemoveMemberDialog';
import { ArrowLeft, UserPlus, Users, AlertCircle, Building2, Plus, ShieldCheck, User as UserIcon, Trash2 } from 'lucide-react';

interface MembersPageProps {
  onBack: () => void;
  onNavigate?: (page: string) => void;
}

export default function MembersPage({ onBack, onNavigate }: MembersPageProps) {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<TenantMember | null>(null);

  const {
    members,
    loading,
    error,
    adminCount,
    isCurrentMemberAdmin,
    addMember,
    removeMember,
  } = useMembers(currentOrganization?.id, currentOrganization?.createdBy);

  // Si no hay un negocio activo seleccionado
  if (!currentOrganization) {
    return (
      <div className="p-4 sm:p-6 max-w-4xl mx-auto">
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
            Selecciona un negocio activo en la sección de Mis Negocios para gestionar sus miembros y colaboradores.
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

  // Comprobar si el usuario tiene privilegios para administrar miembros (Admin del negocio)
  const canManageMembers = currentOrganization.role === 'admin' || isCurrentMemberAdmin;

  const handleAddMember = async (email: string, role: MemberRole) => {
    await addMember(email, role);
  };

  const handleRemoveMember = async (member: TenantMember) => {
    await removeMember(member);
  };

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto w-full">
      {/* Botón Volver */}
      <button
        onClick={onBack}
        className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Volver</span>
      </button>

      {/* Cabecera de la sección */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <h1 className="text-2xl font-bold text-slate-900">Miembros</h1>
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
            {members.length} {members.length === 1 ? 'miembro' : 'miembros'}
          </span>
        </div>
        <p className="text-xs text-slate-500">
          Negocio activo: <span className="font-semibold text-slate-700">{currentOrganization.name}</span>
        </p>
      </div>

      {/* Banner de error si ocurre en la carga */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Estado de carga */}
      {loading ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-500">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm font-medium">Cargando colaboradores...</p>
        </div>
      ) : members.length === 0 ? (
        /* Estado vacío */
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm">
          <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Users className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">
            Aún no hay miembros
          </h2>
          <p className="text-sm text-slate-500 max-w-md mx-auto mb-6">
            Agrega colaboradores para que puedan acceder a este negocio.
          </p>
          {canManageMembers && (
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="py-2.5 px-5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-xl transition-colors shadow-sm inline-flex items-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              <span>Agregar miembro</span>
            </button>
          )}
        </div>
      ) : (
        /* Cuadrícula de miembros: 2 columnas en celular, 3 en tablets, 4 en desktop */
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
          {members.map((member) => {
            const isCurrentUser = user?.uid === member.uid;
            const isCreator = currentOrganization?.createdBy === member.uid;
            const isSelfAdmin = isCurrentUser && member.role === 'admin';
            const isOnlyAdmin = member.role === 'admin' && adminCount <= 1;
            const isDeleteDisabled = isSelfAdmin || isOnlyAdmin || isCreator;

            const getDeleteDisabledTooltip = () => {
              if (isCreator) return "El propietario y fundador del negocio no puede ser eliminado.";
              if (isSelfAdmin) return "Un administrador no puede eliminarse a sí mismo.";
              if (isOnlyAdmin) return "Debe existir al menos un administrador.";
              return "Eliminar miembro";
            };

            return (
              <div
                key={member.uid}
                className="relative flex flex-col justify-between p-3.5 sm:p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm transition-all min-h-[160px]"
              >
                {/* Parte superior de la tarjeta */}
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className={`p-2 rounded-lg ${
                      isCreator 
                        ? 'bg-purple-50 text-purple-600' 
                        : member.role === 'admin' 
                        ? 'bg-blue-50 text-blue-600' 
                        : 'bg-slate-100 text-slate-700'
                    }`}>
                      {isCreator || member.role === 'admin' ? (
                        <ShieldCheck className="w-4 h-4" />
                      ) : (
                        <UserIcon className="w-4 h-4" />
                      )}
                    </div>
                    <span
                      className={`inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                        isCreator
                          ? 'text-purple-700 bg-purple-50 border border-purple-200'
                          : member.role === 'admin'
                          ? 'text-blue-700 bg-blue-100'
                          : 'text-slate-600 bg-slate-100'
                      }`}
                    >
                      {isCreator ? 'Propietario' : member.role === 'admin' ? 'Admin' : 'Miembro'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h3
                      className="font-semibold text-slate-900 text-sm leading-snug line-clamp-2 break-words"
                      title={member.displayName}
                    >
                      {member.displayName}
                    </h3>
                    {isCurrentUser && (
                      <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                        (Tú)
                      </span>
                    )}
                  </div>
                  <p 
                    className="text-[11px] text-slate-500 truncate mt-1"
                    title={member.email}
                  >
                    {member.email}
                  </p>
                </div>

                {/* Pie de la tarjeta */}
                <div className="pt-2.5 mt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 capitalize">
                    {isCreator ? 'Propietario' : member.role === 'admin' ? 'Gestor' : 'Colaborador'}
                  </span>

                  {canManageMembers && (
                    <div title={getDeleteDisabledTooltip()}>
                      <button
                        type="button"
                        onClick={() => setMemberToRemove(member)}
                        disabled={isDeleteDisabled}
                        className={`p-1.5 rounded-lg transition-colors inline-flex items-center justify-center ${
                          isDeleteDisabled
                            ? 'text-slate-300 cursor-not-allowed'
                            : 'text-slate-400 hover:text-red-600 hover:bg-red-50'
                        }`}
                        aria-label={`Eliminar a ${member.displayName}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Última tarjeta: Agregar miembro */}
          {canManageMembers && (
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="flex flex-col items-center justify-center p-4 rounded-xl border-2 border-dashed border-slate-300 hover:border-blue-500 bg-slate-50/50 hover:bg-blue-50/40 text-slate-600 hover:text-blue-600 transition-all min-h-[160px] cursor-pointer group"
            >
              <div className="w-10 h-10 rounded-full bg-white shadow-sm border border-slate-200 group-hover:border-blue-300 group-hover:bg-blue-600 group-hover:text-white flex items-center justify-center mb-2.5 transition-colors text-slate-600">
                <Plus className="w-5 h-5" />
              </div>
              <span className="text-xs sm:text-sm font-semibold">Agregar miembro</span>
              <span className="text-[11px] text-slate-400 group-hover:text-blue-500/80 mt-0.5">Invitar colaborador</span>
            </button>
          )}
        </div>
      )}

      {/* Modal para Agregar Miembro */}
      <AddMemberModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddMember={handleAddMember}
      />

      {/* Modal de Confirmación de Eliminación */}
      <RemoveMemberDialog
        member={memberToRemove}
        onClose={() => setMemberToRemove(null)}
        onConfirm={handleRemoveMember}
      />
    </div>
  );
}
