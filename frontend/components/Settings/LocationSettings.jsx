import { useState } from 'react';

export default function LocationSettings({ items, units, onAdd, onUpdate, onDelete }) {
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newUnitId, setNewUnitId] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editUnitId, setEditUnitId] = useState('');

  const getUnitName = (unitId) => {
    const unit = units?.find(u => u.id === unitId);
    return unit?.name || '-';
  };

  const handleAdd = async () => {
    if (!newName.trim()) return;
    const data = { name: newName, unit_id: parseInt(newUnitId) };
    const result = await onAdd(data);
    if (result.success) {
      setNewName('');
      setNewUnitId('');
      setIsAdding(false);
    } else {
      alert(result.error);
    }
  };

  const handleUpdate = async (id) => {
    if (!editName.trim()) return;
    const result = await onUpdate(id, { name: editName, unit_id: parseInt(editUnitId) });
    if (result.success) {
      setEditingId(null);
    } else {
      alert(result.error);
    }
  };

  const startEdit = (item) => {
    setEditingId(item.id);
    setEditName(item.name);
    setEditUnitId(item.unit_id || '');
  };

  const cancelEdit = () => setEditingId(null);

  return (
    <div className="space-y-3">
      <div className="card bg-gray-50">
        {isAdding ? (
          <div className="space-y-3">
            <select
              value={newUnitId}
              onChange={(e) => setNewUnitId(e.target.value)}
              className="input"
            >
              <option value="">請選擇所屬單位</option>
              {units?.map((opt) => (
                <option key={opt.id} value={opt.id}>{opt.name}</option>
              ))}
            </select>
            <div className="flex gap-2">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="input flex-1"
                placeholder="輸入地點名稱"
                autoFocus
              />
              <button onClick={handleAdd} className="btn btn-primary">儲存</button>
              <button onClick={() => setIsAdding(false)} className="btn btn-secondary">取消</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setIsAdding(true)} className="btn btn-primary w-full">
            + 新增地點
          </button>
        )}
      </div>

      <div className="space-y-2">
        {items.length === 0 ? (
          <p className="text-center text-gray-500 py-8">尚無資料</p>
        ) : (
          items.map((item) => (
            <div key={item.id} className="card flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {editingId === item.id ? (
                <div className="flex-1 flex flex-col sm:flex-row gap-2 w-full">
                  <select
                    value={editUnitId}
                    onChange={(e) => setEditUnitId(e.target.value)}
                    className="input sm:w-40"
                  >
                    <option value="">請選擇所屬單位</option>
                    {units?.map((opt) => (
                      <option key={opt.id} value={opt.id}>{opt.name}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="input flex-1"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button onClick={() => handleUpdate(item.id)} className="btn btn-primary text-sm flex-1 sm:flex-none">儲存</button>
                    <button onClick={cancelEdit} className="btn btn-secondary text-sm flex-1 sm:flex-none">取消</button>
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <span className="font-medium">{item.name}</span>
                    <span className="text-sm text-gray-500 ml-2">({getUnitName(item.unit_id)})</span>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => startEdit(item)} className="p-2 text-gray-500 hover:text-primary-600">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button onClick={() => onDelete(item.id)} className="p-2 text-gray-500 hover:text-red-600">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
