/**
 * Members Page
 * Admin interface for managing system members (max 5).
 */

import { useState, useEffect } from 'react';
import api from '../api';
import MemberTable from '../components/Members/MemberTable';
import MemberModal from '../components/Members/MemberModal';

export default function MembersPage() {
  const [members, setMembers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 3000));
      const response = await api.get('/members/');
      setMembers(response.data);
    } catch (err) {
      setError('載入會員失敗');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdd = async ({ username, password, role }) => {
    setIsSubmitting(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 3000));
      await api.post('/members/register', { username, password, role });
      await fetchMembers();
      setShowAddForm(false);
    } catch (err) {
      alert(err.response?.data?.detail || '新增會員失敗');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (memberId, data) => {
    try {
      await new Promise(resolve => setTimeout(resolve, 3000));
      await api.put(`/members/${memberId}`, data);
      await fetchMembers();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.detail || '更新失敗' };
    }
  };

  const handleDelete = async (memberId) => {
    if (!confirm('確定要刪除此會員嗎？')) return;
    try {
      await new Promise(resolve => setTimeout(resolve, 3000));
      await api.delete(`/members/${memberId}`);
      await fetchMembers();
    } catch (err) {
      alert(err.response?.data?.detail || '刪除失敗');
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">會員管理</h2>
        <span className="text-sm text-gray-500">({members.length}/5)</span>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      {/* Add Button */}
      {!showAddForm && members.length < 5 && (
        <button
          onClick={() => setShowAddForm(true)}
          className="btn btn-primary w-full mb-4"
        >
          + 新增會員
        </button>
      )}

      {members.length >= 5 && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-lg mb-4 text-sm">
          會員人數已達上限（5人），請先刪除現有會員後再新增。
        </div>
      )}

      {/* Add Form Modal */}
      {showAddForm && (
        <MemberModal
          onSubmit={handleAdd}
          onClose={() => setShowAddForm(false)}
          isSubmitting={isSubmitting}
        />
      )}

      {/* Members List */}
      <MemberTable
        members={members}
        onDelete={handleDelete}
        onUpdate={handleUpdate}
      />
    </div>
  );
}
