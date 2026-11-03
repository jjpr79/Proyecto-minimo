import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../AuthContext';
import { 
  BusinessMember, 
  MemberRole, 
  getBusinessMembers, 
  findUserByEmail, 
  addMemberToBusiness, 
  removeMemberFromBusiness 
} from '../services/memberService';

export function useMembers(businessId: string | null | undefined) {
  const { user } = useAuth();
  const [members, setMembers] = useState<BusinessMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMembers = useCallback(async () => {
    if (!businessId) {
      setMembers([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await getBusinessMembers(businessId);
      setMembers(data);
    } catch (err: any) {
      console.error("[useMembers] Error cargando miembros:", err);
      setError(err?.message || "Error al cargar la lista de miembros.");
    } finally {
      setLoading(false);
    }
  }, [businessId]);

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
    if (!businessId) throw new Error("No hay un negocio seleccionado.");

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) throw new Error("Debes ingresar un correo electrónico.");

    // 1. Validar si ya es miembro actual del negocio
    const existing = members.find(m => m.email.toLowerCase() === normalizedEmail);
    if (existing) {
      throw new Error("Este usuario ya es miembro de este negocio.");
    }

    // 2. Buscar usuario registrado en el sistema
    const foundUser = await findUserByEmail(normalizedEmail);
    if (!foundUser) {
      throw new Error("No existe una cuenta registrada con ese email.");
    }

    // Verificar también por UID
    if (members.some(m => m.uid === foundUser.uid)) {
      throw new Error("Este usuario ya es miembro de este negocio.");
    }

    // 3. Crear membresía
    await addMemberToBusiness(businessId, foundUser, role);

    // 4. Actualizar estado local
    await fetchMembers();
  };

  /**
   * Elimina un miembro aplicando las invariantes de negocio.
   */
  const removeMember = async (memberToRemove: BusinessMember): Promise<void> => {
    if (!businessId) throw new Error("No hay un negocio seleccionado.");

    await removeMemberFromBusiness(businessId, memberToRemove, members, user?.uid || null);

    // Actualizar estado local
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
    removeMember,
    refreshMembers: fetchMembers,
  };
}
