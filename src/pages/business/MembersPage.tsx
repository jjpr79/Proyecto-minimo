import { useState } from 'react';
import { useAuth } from '../../AuthContext';
import { useOrganization } from '../../OrganizationContext';
import { useMembers } from '../../hooks/useMembers';
import { BusinessMember, MemberRole } from '../../services/memberService';
import MembersTable from '../../components/members/MembersTable';
import AddMemberModal from '../../components/members/AddMemberModal';
import RemoveMemberDialog from '../../components/members/RemoveMemberDialog';
import { ArrowLeft, UserPlus, Users, AlertCircle, Building2 } from 'lucide-react';

interface MembersPageProps {
  onBack: () => void;
  onNavigate?: (page: string) => void;
}

export default function MembersPage({ onBack, onNavigate }: MembersPageProps) {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<BusinessMember | null>(null);

  const {
    members,
    loading,
    error,
    adminCount,
    isCurrentMemberAdmin,
    addMember,
    removeMember,
  } = useMembers(currentOrganization?.id);

  // Si no hay un negocio activo seleccionado
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
  // El rol del usuario actual viene reflejado tanto en currentOrganization.role como en isCurrentMemberAdmin
  const canManageMembers = currentOrganization.role === 'admin' || isCurrentMemberAdmin;

  const handleAddMember = async (email: string, role: MemberRole) => {
    await addMember(email, role);
  };

  const handleRemoveMember = async (member: BusinessMember) => {
    await removeMember(member);
  };

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

      {/* Cabecera de la sección */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
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

        {canManageMembers && (
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-xl transition-colors shadow-sm inline-flex items-center justify-center gap-2 shrink-0"
          >
            <UserPlus className="w-4 h-4" />
            <span>Agregar miembro</span>
          </button>
        )}
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
        /* Estado vacío según especificación */
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
        /* Tabla de miembros */
        <MembersTable
          members={members}
          currentUserId={user?.uid}
          canManage={canManageMembers}
          adminCount={adminCount}
          onRemove={(member) => setMemberToRemove(member)}
        />
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
