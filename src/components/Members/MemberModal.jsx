/**
 * MemberModal - 新增會員表單彈窗
 */
import { useState } from 'react';

export default function MemberModal({ onSubmit, onClose, isSubmitting }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('user');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      alert('請填寫所有欄位');
      return;
    }
    onSubmit({ username: username.trim(), password: password.trim(), role });
  };

  return (
    <div className="card mb-4 bg-gray-50">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium">新增會員</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">帳號</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="input"
            placeholder="輸入帳號"
            minLength={3}
            required
          />
        </div>
        <div>
          <label className="label">密碼</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input"
            placeholder="輸入密碼"
            minLength={6}
            required
          />
        </div>
        <div>
          <label className="label">角色</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="input"
          >
            <option value="user">使用者</option>
            <option value="admin">管理者</option>
            <option value="guest">來賓</option>
          </select>
        </div>
        <div className="flex gap-2">
          <button type="submit" disabled={isSubmitting} className="btn btn-primary flex-1">
            {isSubmitting ? '新增中...' : '新增'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary flex-1"
          >
            取消
          </button>
        </div>
      </form>
    </div>
  );
}
