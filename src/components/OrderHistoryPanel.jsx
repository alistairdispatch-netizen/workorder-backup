/**
 * OrderHistoryPanel
 * Displays order timestamps: created and last updated.
 */

export default function OrderHistoryPanel({ order }) {
  if (!order) return null;

  const formatDateTime = (dateStr) => {
    const date = new Date(dateStr);
    return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  return (
    <div className="text-xs text-gray-400 space-y-1">
      <p>建立時間：{formatDateTime(order.created_at)}</p>
      <p>最後更新：{formatDateTime(order.last_updated)}</p>
    </div>
  );
}
