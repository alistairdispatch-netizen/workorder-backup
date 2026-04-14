/**
 * OrderInfoPanel
 * Displays order basic info: unit, location, fault categories, contractor.
 */

import { useAuthStore } from '../store';

export default function OrderInfoPanel({ order }) {
  const { isGuest } = useAuthStore();

  if (!order) return null;

  return (
    <div className="card">
      <h3 className="text-sm font-semibold text-gray-600 mt-1 mb-3">基本資訊</h3>
      <div className="space-y-2 text-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
          <div className="text-gray-500">單位</div>
          <div className="font-medium">{order.unit_name || order.unit || '-'}</div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
          <div className="text-gray-500">地點</div>
          <div className="font-medium">{order.location_name || order.location || '-'}</div>
        </div>
        {order.fault_categories?.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
            <div className="text-gray-500">故障類別</div>
            <div className="flex flex-wrap gap-1">
              {order.fault_categories.map((fc, idx) => (
                <span key={idx} className="text-xs bg-gray-100 px-2 py-1 rounded">
                  {fc}
                </span>
              ))}
            </div>
          </div>
        )}
        {!isGuest() && order.contractor_unit_name && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
            <div className="text-gray-500">施工單位</div>
            <div className="font-medium">{order.contractor_unit_name}</div>
          </div>
        )}
      </div>
    </div>
  );
}
