/**
 * Settings Page
 * Admin interface for managing units, locations, fault categories, and repair statuses.
 */

import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../api';
import { useMediaQuery } from '../hooks/useMediaQuery';

export default function SettingsPage() {
  const isMobile = useMediaQuery('(max-width: 767px)');
  const [settings, setSettings] = useState({
    units: [],
    locations: [],
    faultCategories: [],
    repairStatuses: [],
    contractors: [],
  });
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem('settings_active_tab') || searchParams.get('tab') || 'units');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  // Persist activeTab to localStorage
  useEffect(() => {
    localStorage.setItem('settings_active_tab', activeTab);
  }, [activeTab]);

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const [settingsRes, contractorRes] = await Promise.all([
        api.get('/settings/'),
        api.get('/contractor-units/')
      ]);
      setSettings({
        units: settingsRes.data.units || [],
        locations: settingsRes.data.locations || [],
        faultCategories: settingsRes.data.fault_categories || [],
        repairStatuses: settingsRes.data.repair_statuses || [],
        contractors: contractorRes.data || []
      });
    } catch (err) {
      setError('載入設定失敗');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdd = async (endpoint, data) => {
    try {
      await api.post(endpoint, data);
      await fetchSettings();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.detail || '新增失敗' };
    }
  };

  const handleUpdate = async (endpoint, id, data) => {
    try {
      await api.put(`${endpoint}/${id}`, data);
      await fetchSettings();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.detail || '更新失敗' };
    }
  };

  const handleDelete = async (endpoint, id) => {
    if (!confirm('確定要刪除嗎？')) return;
    try {
      await api.delete(`${endpoint}/${id}`);
      await fetchSettings();
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
    <div className="px-4 pb-4">
      <h2 className="text-lg font-semibold mb-4">系統設定</h2>

      {/* Tab bar: mobile only (< md) */}
      {isMobile && (
        <div className="flex border-b border-gray-200 mb-4 -mx-4 px-4 overflow-x-auto">
          {[
            { key: 'units', label: '單位' },
            { key: 'locations', label: '地點' },
            { key: 'faultCategories', label: '故障類別' },
            { key: 'repairStatuses', label: '處理狀態' },
            { key: 'contractors', label: '施工單位' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px whitespace-nowrap ${
                activeTab === key
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      {/* All screen sizes: render active tab only */}
      {renderTabContent(activeTab, settings, handleAdd, handleUpdate, handleDelete)}
    </div>
  );
}

// ─── Content renderer (mobile: single tab) ───────────────────────────────────

function renderTabContent(activeTab, settings, handleAdd, handleUpdate, handleDelete) {
  switch (activeTab) {
    case 'units':
      return (
        <SettingsList
          items={settings.units || []}
          endpoint="/categories/units"
          nameField="name"
          onAdd={(data) => handleAdd('/categories/units', data)}
          onUpdate={(id, data) => handleUpdate('/categories/units', id, data)}
          onDelete={(id) => handleDelete('/categories/units', id)}
          addTitle="新增單位"
        />
      );
    case 'locations':
      return (
        <SettingsList
          items={settings.locations || []}
          endpoint="/categories/locations"
          nameField="name"
          extraField={{ key: 'unit_id', label: '所屬單位' }}
          extraOptions={settings.units || []}
          onAdd={(data) => handleAdd('/categories/locations', data)}
          onUpdate={(id, data) => handleUpdate('/categories/locations', id, data)}
          onDelete={(id) => handleDelete('/categories/locations', id)}
          addTitle="新增地點"
        />
      );
    case 'faultCategories':
      return (
        <SettingsList
          items={settings.faultCategories || []}
          endpoint="/categories/fault-categories"
          nameField="name"
          onAdd={(data) => handleAdd('/categories/fault-categories', data)}
          onUpdate={(id, data) => handleUpdate('/categories/fault-categories', id, data)}
          onDelete={(id) => handleDelete('/categories/fault-categories', id)}
          addTitle="新增故障類別"
        />
      );
    case 'repairStatuses':
      return (
        <RepairStatusSettings
          items={settings.repairStatuses || []}
          onAdd={(data) => handleAdd('/categories/repair-statuses', data)}
          onUpdate={(id, data) => handleUpdate('/categories/repair-statuses', id, data)}
          onDelete={(id) => handleDelete('/categories/repair-statuses', id)}
        />
      );
    case 'contractors':
      return (
        <SettingsList
          items={settings.contractors || []}
          endpoint="/contractor-units"
          nameField="name"
          onAdd={(data) => handleAdd('/contractor-units', data)}
          onUpdate={(id, data) => handleUpdate('/contractor-units', id, data)}
          onDelete={(id) => handleDelete('/contractor-units', id)}
          addTitle="新增施工單位"
        />
      );
    default:
      return null;
  }
}

// ─── Content renderer (desktop: all sections) ────────────────────────────────

function renderAllSections(settings, handleAdd, handleUpdate, handleDelete) {
  return (
    <div className="space-y-8">
      <section>
        <h3 className="text-base font-semibold mb-3">單位</h3>
        <SettingsList
          items={settings.units || []}
          endpoint="/categories/units"
          nameField="name"
          onAdd={(data) => handleAdd('/categories/units', data)}
          onUpdate={(id, data) => handleUpdate('/categories/units', id, data)}
          onDelete={(id) => handleDelete('/categories/units', id)}
          addTitle="新增單位"
        />
      </section>

      <section>
        <h3 className="text-base font-semibold mb-3">地點</h3>
        <SettingsList
          items={settings.locations || []}
          endpoint="/categories/locations"
          nameField="name"
          extraField={{ key: 'unit_id', label: '所屬單位' }}
          extraOptions={settings.units || []}
          onAdd={(data) => handleAdd('/categories/locations', data)}
          onUpdate={(id, data) => handleUpdate('/categories/locations', id, data)}
          onDelete={(id) => handleDelete('/categories/locations', id)}
          addTitle="新增地點"
        />
      </section>

      <section>
        <h3 className="text-base font-semibold mb-3">故障類別</h3>
        <SettingsList
          items={settings.faultCategories || []}
          endpoint="/categories/fault-categories"
          nameField="name"
          onAdd={(data) => handleAdd('/categories/fault-categories', data)}
          onUpdate={(id, data) => handleUpdate('/categories/fault-categories', id, data)}
          onDelete={(id) => handleDelete('/categories/fault-categories', id)}
          addTitle="新增故障類別"
        />
      </section>

      <section>
        <h3 className="text-base font-semibold mb-3">處理狀態</h3>
        <RepairStatusSettings
          items={settings.repairStatuses || []}
          onAdd={(data) => handleAdd('/categories/repair-statuses', data)}
          onUpdate={(id, data) => handleUpdate('/categories/repair-statuses', id, data)}
          onDelete={(id) => handleDelete('/categories/repair-statuses', id)}
        />
      </section>

      <section>
        <h3 className="text-base font-semibold mb-3">施工單位</h3>
        <SettingsList
          items={settings.contractors || []}
          endpoint="/contractor-units"
          nameField="name"
          onAdd={(data) => handleAdd('/contractor-units', data)}
          onUpdate={(id, data) => handleUpdate('/contractor-units', id, data)}
          onDelete={(id) => handleDelete('/contractor-units', id)}
          addTitle="新增施工單位"
        />
      </section>
    </div>
  );
}

// Generic settings list component
function SettingsList({
  items,
  nameField,
  extraField,
  extraOptions,
  onAdd,
  onUpdate,
  onDelete,
  addTitle,
}) {
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newExtra, setNewExtra] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');

  const handleAdd = async () => {
    if (!newName.trim()) return;
    const data = extraField ? { name: newName, [extraField.key]: parseInt(newExtra) } : { name: newName };
    const result = await onAdd(data);
    if (result.success) {
      setNewName('');
      setNewExtra('');
      setIsAdding(false);
    } else {
      alert(result.error);
    }
  };

  const handleUpdate = async (id) => {
    if (!editName.trim()) return;
    const result = await onUpdate(id, { name: editName });
    if (result.success) {
      setEditingId(null);
    } else {
      alert(result.error);
    }
  };

  const startEdit = (item) => {
    setEditingId(item.id);
    setEditName(item[nameField]);
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const getUnitName = (unitId) => {
    const unit = extraOptions?.find(u => u.id === unitId);
    return unit?.name || '-';
  };

  return (
    <div className="space-y-3">
      {/* Add Form */}
      <div className="card bg-gray-50">
        {isAdding ? (
          <div className="space-y-3">
            {extraField && (
              <select
                value={newExtra}
                onChange={(e) => setNewExtra(e.target.value)}
                className="input"
              >
                <option value="">請選擇{extraField.label}</option>
                {extraOptions?.map((opt) => (
                  <option key={opt.id} value={opt.id}>{opt.name}</option>
                ))}
              </select>
            )}
            <div className="flex gap-2">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="input flex-1"
                placeholder={`輸入${nameField === 'name' ? '名稱' : nameField}`}
                autoFocus
              />
              <button onClick={handleAdd} className="btn btn-primary">儲存</button>
              <button onClick={() => setIsAdding(false)} className="btn btn-secondary">取消</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setIsAdding(true)} className="btn btn-primary">
            + {addTitle}
          </button>
        )}
      </div>

      {/* Items List */}
      <div className="space-y-2">
        {items.length === 0 ? (
          <p className="text-center text-gray-500 py-8">尚無資料</p>
        ) : (
          items.map((item) => (
            <div key={item.id} className="card flex items-center justify-between">
              {editingId === item.id ? (
                <div className="flex-1 flex gap-2">
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
                  <div>
                    <span className="font-medium">{item[nameField]}</span>
                    {extraField && (
                      <span className="text-sm text-gray-500 ml-2">({getUnitName(item[extraField.key])})</span>
                    )}
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

// Dedicated component for repair statuses with color picker
function RepairStatusSettings({ items, onAdd, onUpdate, onDelete }) {
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
      {/* Add Form */}
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
          <button onClick={() => setIsAdding(true)} className="btn btn-primary">
            + 新增處理狀態
          </button>
        )}
      </div>

      {/* Items List */}
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
