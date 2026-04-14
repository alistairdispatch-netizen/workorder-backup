/**
 * OrderStatusBadge
 * Displays the order status as a colored pill.
 */

export default function OrderStatusBadge({ statusName }) {
  if (!statusName) return null;

  const colorMap = {
    '待處理': 'bg-yellow-100 text-yellow-800',
    '處理中': 'bg-blue-100 text-blue-800',
    '已完成': 'bg-green-100 text-green-800',
  };

  const className = colorMap[statusName] || 'bg-gray-100 text-gray-800';

  return (
    <span className={`text-xs px-2 py-1 rounded-full ${className}`}>
      {statusName}
    </span>
  );
}
