import { BusinessMember } from '../../services/memberService';
import MemberRow from './MemberRow';

interface MembersTableProps {
  members: BusinessMember[];
  currentUserId: string | null | undefined;
  canManage: boolean;
  adminCount: number;
  onRemove: (member: BusinessMember) => void;
}

export default function MembersTable({
  members,
  currentUserId,
  canManage,
  adminCount,
  onRemove,
}: MembersTableProps) {
  return (
    <div className="overflow-x-auto bg-white rounded-xl border border-slate-200 shadow-sm">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            <th scope="col" className="py-3.5 px-4">
              Nombre
            </th>
            <th scope="col" className="py-3.5 px-4">
              Email
            </th>
            <th scope="col" className="py-3.5 px-4">
              Rol
            </th>
            <th scope="col" className="py-3.5 px-4 text-right">
              Acciones
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {members.map((member) => (
            <MemberRow
              key={member.uid}
              member={member}
              isCurrentUser={currentUserId === member.uid}
              canManage={canManage}
              adminCount={adminCount}
              onRemove={onRemove}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
