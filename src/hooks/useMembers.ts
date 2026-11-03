import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../AuthContext';
import { TenantMember, MemberRole } from '../types';
import { 
  getBusinessMembers, 
  findUserByEmail, 
  addMemberToBusiness, 
  removeMemberFromBusiness,
  updateMemberRole
} from '../services/memberService';

export function useMembers(tenantId: string | null | undefined) {
  const { user } = useAuth();
  const [members, setMembers] = useState<TenantMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMembers = useCallback(async () => {
    if (!tenantId) {
      setMembers([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await getBusinessMembers(tenantId);
      setMembers(data);
    } catch (err: any) {
      console.error("[useMembers] Error cargando miembros:", err);
      setError(err?.message || "Error al cargar la lista de miembros.");
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  // Información derivada del estado actual
  const adminCount = useMemo(() => {
    return members.filter(m => m.role === 'admin').length;
  }, [members]);

  const currentMember = useMemo(() => {
    if (!user) return null;
    return members.find(m => m.uid === user.uid) || null;
  }, [members, user]);

  const isCurrentMemberAdmin = useMemo(() => {
    return currentMember?.role === 'admin';
  }, [currentMember]);

  /**
   * Agrega un nuevo miembro por email validando existencia previa y rol.
   */
  const addMember = async (email: string, role: MemberRole): Promise<void> => {
    if (!tenantId) throw new Error("No hay un negocio seleccionado.");

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) throw new Error("Debes ingresar un correo electrónico.");

    // 1. Validar si ya es miembro actual del tenant
    const existing = members.find(m => m.email.toLowerCase() === normalizedEmail);
    if (existing) {
      throw new Error("Este usuario ya es miembro de este negocio.");
    }

    // 2. Buscar usuario registrado en el sistema
    const foundUser = await findUserByEmail(normalizedEmail);
    if (!foundUser) {
      throw new Error("No existe una cuenta registrada con ese email.");
    }

    // 3. Verificar también por UID
    if (members.some(m => m.uid === foundUser.uid)) {
      throw new Error("Este usuario ya es miembro de este negocio.");
    }

    // 4. Crear membresía
    await addMemberToBusiness(tenantId, foundUser, role);

    // 5. Actualizar lista
    await fetchMembers();
  };

  /**
   * Actualiza el rol de un miembro respetando la invariante del último administrador.
   */
  const changeMemberRole = async (member: TenantMember, newRole: MemberRole): Promise<void> => {
    if (!tenantId) throw new Error("No hay un negocio seleccionado.");
    await updateMemberRole(tenantId, member, newRole, members);
    await fetchMembers();
  };

  /**
   * Elimina un miembro aplicando las invariantes de administración.
   */
  const removeMember = async (memberToRemove: TenantMember): Promise<void> => {
    if (!tenantId) throw new Error("No hay un negocio seleccionado.");
    await removeMemberFromBusiness(tenantId, memberToRemove, members, user?.uid || null);
    await fetchMembers();
  };

  return {
    members,
    loading,
    error,
    adminCount,
    currentMember,
    isCurrentMemberAdmin,
    addMember,
    changeMemberRole,
    removeMember,
    refreshMembers: fetchMembers,
  };
}
