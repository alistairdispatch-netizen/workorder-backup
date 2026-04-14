/**
 * OrderForm Component
 * Reusable order form - controlled by parent via react-hook-form
 */

import { useForm } from 'react-hook-form';
import { useAuthStore } from '../store';

export default function OrderForm({
  mode = 'create',
  title = '工單',
  backTo = '/orders',
  settings,
  contractorUnits = [],
  selectedUnitId,
  setSelectedUnitId,
  selectedLocationId,
  setSelectedLocationId,
  selectedCategories,
  setSelectedCategories,
  selectedContractorUnitId,
  setSelectedContractorUnitId,
  register,
  handleSubmit,
  errors,
  onSubmit,
  isSubmitting = false,
  error,
}) {
  const { isAdmin } = useAuthStore();

  const filteredLocations = settings?.locations?.filter(
    (l) => l.unit_id === parseInt(selectedUnitId)
  ) || [];

  const toggleCategory = (catId) => {
    if (!selectedCategories) return;
    if (selectedCategories.includes(catId)) {
      setSelectedCategories(selectedCategories.filter((id) => id !== catId));
    } else {
      setSelectedCategories([...selectedCategories, catId]);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* LEFT COLUMN */}
        <div className="card space-y-4">
          {/* 單位 */}
          <div>
            <label className="label">單位 <span className="text-red-500">*</span></label>
            <select
              {...register('unit_id', { required: '請選擇單位' })}
              className="input"
              value={selectedUnitId}
              onChange={(e) => {
                setSelectedUnitId(e.target.value);
                setSelectedLocationId('');
              }}
            >
              <option value="">請選擇單位</option>
              {settings?.units?.map((unit) => (
                <option key={unit.id} value={unit.id}>{unit.name}</option>
              ))}
            </select>
            {errors.unit_id && (
              <p className="text-red-500 text-sm mt-1">{errors.unit_id.message}</p>
            )}
          </div>

          {/* 地點 */}
          <div>
            <label className="label">地點 <span className="text-red-500">*</span></label>
            <select
              {...register('location_id', { required: '請選擇地點' })}
              className="input"
              value={selectedLocationId}
              onChange={(e) => setSelectedLocationId(e.target.value)}
              disabled={!selectedUnitId}
            >
              <option value="">請先選擇單位</option>
              {filteredLocations.map((loc) => (
                <option key={loc.id} value={loc.id}>{loc.name}</option>
              ))}
            </select>
            {errors.location_id && (
              <p className="text-red-500 text-sm mt-1">{errors.location_id.message}</p>
            )}
          </div>

          {/* 故障類別 */}
          {settings?.fault_categories?.length > 0 && (
            <div>
              <label className="label">故障類別</label>
              <div className="flex flex-wrap gap-2">
                {settings.fault_categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => toggleCategory(cat.id)}
                    className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                      selectedCategories?.includes(cat.id)
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN */}
        <div className="card space-y-4">
          {/* 故障描述 */}
          <div>
            <label className="label">故障描述 <span className="text-red-500">*</span></label>
            <textarea
              {...register('fault_description', { required: '請填寫故障描述' })}
              className="input min-h-[120px]"
              placeholder="請詳細描述故障情況..."
            />
            {errors.fault_description && (
              <p className="text-red-500 text-sm mt-1">{errors.fault_description.message}</p>
            )}
          </div>

          {/* 處理方式 */}
          <div>
            <label className="label">處理方式</label>
            <textarea
              {...register('handling_method')}
              className="input min-h-[80px]"
              placeholder="記錄處理方式..."
            />
          </div>

          {/* 施工單位（管理員可選） */}
          {isAdmin && contractorUnits?.length > 0 && (
            <div>
              <label className="label">施工單位</label>
              <select
                {...register('contractor_unit_id')}
                className="input"
                value={selectedContractorUnitId}
                onChange={(e) => setSelectedContractorUnitId(e.target.value)}
              >
                <option value="">請選擇施工單位</option>
                {contractorUnits.map((unit) => (
                  <option key={unit.id} value={unit.id}>{unit.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-2 pt-4">
        <button
          type="button"
          onClick={() => window.history.back()}
          className="btn btn-secondary flex-1"
        >
          取消
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="btn btn-primary flex-1"
        >
          {isSubmitting ? '處理中...' : (mode === 'create' ? '建立工單' : '儲存')}
        </button>
      </div>
    </form>
  );
}
