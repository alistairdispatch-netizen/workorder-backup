/**
 * MemberTable - 會員列表元件（響應式）
 * - Mobile: 卡片式列表
 * - Desktop (md:): 表格檢視
 */
import { useAuthStore } from '../../store';

function getRoleBadgeColor(role) {
  const colors = {
    admin: 'bg-purple-100 text-purple-800',
    user: 'bg-blue-100 text-blue-800',
    guest: 'bg-gray-100 text-gray-800',
  };
  return colors[role] || 'bg-gray-100 text-gray-800';
}

function getRoleLabel(role) {
  const labels = { admin: '管理者', user: '使用者', guest: '來賓' };
  return labels[role] || role;
}

export default function MemberTable({ members, onDelete, onUpdate }) {
  const { user: currentUser } = useAuthStore();

  // Empty state
  if (members.length === 0) {
    return <p className="text-center text-gray-500 py-8">尚無會員</p>;
  }

  return (
    <>
      {/* Desktop Table View (md:) */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 sticky top-0 z-10">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-700 whitespace-nowrap">帳號</th>
              <th className="text-left px-4 py-3 font-medium text-gray-700 whitespace-nowrap">Email</th>
              <th className="text-left px-4 py-3 font-medium text-gray-700 whitespace-nowrap">角色</th>
              <th className="text-left px-4 py-3 font-medium text-gray-700 whitespace-nowrap">狀態</th>
              <th className="text-left px-4 py-3 font-medium text-gray-700 whitespace-nowrap">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {members.map((member, idx) => (
              <tr key={member.id} className={idx % 2 === 1 ? 'odd:bg-gray-50' : ''}>
                {/* 帳號 */}
                <td className="px-4 py-3">
                  <span className="font-medium">{member.username}</span>
                </td>
                {/* Email */}
                <td className="px-4 py-3 text-gray-600">
                  {member.email || '-'}
                </td>
                {/* 角色 */}
                <td className="px-4 py-3">
                  {member.id !== currentUser.id ? (
                    <select
                      value={member.role}
                      onChange={async (e) => {
                        const result = await onUpdate(member.id, { role: e.target.value });
                        if (!result.success) alert(result.error);
                      }}
                      className="border border-gray-300 rounded px-2 py-1 text-sm bg-white"
                    >
                      <option value="user">使用者</option>
                      <option value="admin">管理者</option>
                      <option value="guest">來賓</option>
                    </select>
                  ) : (
                    <span className={`text-xs px-2 py-0.5 rounded-full ${getRoleBadgeColor(member.role)}`}>
                      {getRoleLabel(member.role)}
                    </span>
                  )}
                </td>
                {/* 狀態 */}
                <td className="px-4 py-3">
                  {member.id !== currentUser.id ? (
                    <button
                      onClick={() => onUpdate(member.id, { is_active: !member.is_active })}
                      className={`text-sm px-3 py-1 rounded ${
                        member.is_active
                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                          : 'bg-red-100 text-red-700 hover:bg-red-200'
                      } transition-colors`}
                    >
                      {member.is_active ? '啟用中' : '已停用'}
                    </button>
                  ) : (
                    <span className="text-xs text-gray-400">-</span>
                  )}
                </td>
                {/* 操作 */}
                <td className="px-4 py-3">
                  {member.id !== currentUser.id ? (
                    <button
                      onClick={() => onDelete(member.id)}
                      className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                      title="刪除"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  ) : (
                    <span className="text-xs text-gray-400">本人</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View (default, hidden on md:) */}
      <div className="md:hidden space-y-3">
        {members.map((member) => (
          <div key={member.id} className="card">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium">{member.username}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${getRoleBadgeColor(member.role)}`}>
                    {getRoleLabel(member.role)}
                  </span>
                  {!member.is_active && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-800">
                      已停用
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  建立時間：{new Date(member.created_at).toLocaleDateString('zh-TW')}
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-1">
                {member.id !== currentUser.id && (
                  <button
                    onClick={() => onDelete(member.id)}
                    className="p-2 text-gray-500 hover:text-red-600"
                    title="刪除"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* Quick Role Toggle (for non-current users) */}
            {member.id !== currentUser.id && (
              <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap gap-2">
                <select
                  value={member.role}
                  onChange={async (e) => {
                    const result = await onUpdate(member.id, { role: e.target.value });
                    if (!result.success) alert(result.error);
                  }}
                  className="text-sm border border-gray-300 rounded px-2 py-1"
                >
                  <option value="user">使用者</option>
                  <option value="admin">管理者</option>
                  <option value="guest">來賓</option>
                </select>
                <button
                  onClick={() => onUpdate(member.id, { is_active: !member.is_active })}
                  className={`text-sm px-3 py-1 rounded ${
                    member.is_active
                      ? 'bg-red-100 text-red-700'
                      : 'bg-green-100 text-green-700'
                  }`}
                >
                  {member.is_active ? '停用' : '啟用'}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
