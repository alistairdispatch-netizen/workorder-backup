import { useState } from 'react';

export default function StatusSettings({ items, onAdd, onUpdate, onDelete }) {
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#38a169');
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('#38a169');

  const colorOptions = [
    { label: '🟢 綠色', value: '#38a169' },
    { label: '🟡 黃色', value: '#d69e2e' },
    { label: '🔴 紅色', value: '#e53e3e' },
    { label: '⚪ 灰色', value: '#718096' },
    { label: '🔵 藍色', value: '#3182ce' },
  ];

  const handleAdd = async () => {
    if (!newName.trim()) return;
    const result = await onAdd({ name: newName.trim(), color: newColor });
    if (result.success) {
      setNewName('');
      setNewColor('#38a169');
      setIsAdding(false);
    } else {
      alert(result.error);
    }
  };

  const handleUpdate = async (id) => {
    if (!editName.trim()) return;
    const result = await onUpdate(id, { name: editName.trim(), color: editColor });
    if (result.success) {
      setEditingId(null);
    } else {
      alert(result.error);
    }
  };

  const startEdit = (item) => {
    setEditingId(item.id);
    setEditName(item.name || '');
    setEditColor(item.color || '#38a169');
  };

  const cancelEdit = () => setEditingId(null);

  return (
    <div className="space-y-3">
      <div className="card bg-gray-50">
        {isAdding ? (
          <div className="space-y-3">
            <div className="flex gap-2">
              <select
                value={newColor}
                onChange={(e) => setNewColor(e.target.value)}
                className="input w-40"
              >
                {colorOptions.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="input flex-1"
                placeholder="輸入狀態名稱"
                autoFocus
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={handleAdd} className="btn btn-primary">儲存</button>
              <button onClick={() => setIsAdding(false)} className="btn btn-secondary">取消</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setIsAdding(true)} className="btn btn-primary w-full">
            + 新增處理狀況
          </button>
        )}
      </div>

      <div className="space-y-2">
        {items.length === 0 ? (
          <p className="text-center text-gray-500 py-8">尚無資料</p>
        ) : (
          items.map((item) => (
            <div key={item.id} className="card flex items-center justify-between">
              {editingId === item.id ? (
                <div className="flex-1 flex gap-2">
                  <select
                    value={editColor}
                    onChange={(e) => setEditColor(e.target.value)}
                    className="input w-40"
                  >
                    {colorOptions.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="input flex-1"
                    autoFocus
                  />
                  <button onClick={() => handleUpdate(item.id)} className="btn btn-primary text-sm">儲存</button>
                  <button onClick={cancelEdit} className="btn btn-secondary text-sm">取消</button>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block w-4 h-4 rounded"
                      style={{ backgroundColor: item.color || '#888888' }}
                    />
                    <span className="font-medium">{item.name}</span>
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
