/**
 * OrderCard - 工單卡片元件
 * 顯示單筆工單的摘要資訊。
 * 響應式設計：Mobile 垂直堆疊 / Tablet 水平 / Desktop 雙欄柵格
 */
import { Link } from 'react-router-dom';

const formatDate = (dateStr) => {
  const date = new Date(dateStr);
  return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;
};

export default function OrderCard({ order, onDelete }) {
  const statusClass =
    order.status_name === "待處理"
      ? "bg-yellow-100 text-yellow-800"
      : order.status_name === "處理中"
      ? "bg-blue-100 text-blue-800"
      : order.status_name === "已完成"
      ? "bg-green-100 text-green-800"
      : "bg-gray-100 text-gray-800";

  return (
    <Link
      key={order.id}
      to={`/orders/${order.id}`}
      className="card block hover:shadow-md transition-shadow relative group"
    >
      {/* ── Header：工單編號 + 刪除按鈕 ── */}
      <div className="flex justify-between items-start mb-2">
        <span className="font-mono text-sm font-semibold text-primary-700">
          {order.order_number}
        </span>

        {/* 刪除按鈕：Desktop 直接顯示；Mobile hover 時顯示 */}
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDelete?.(order.id);
          }}
          className="text-gray-400 hover:text-red-500 transition-colors
                     opacity-0 group-hover:opacity-100 md:opacity-100
                     p-1 rounded focus:outline-none focus:ring-2 focus:ring-red-400"
          aria-label="刪除工單"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>

      {/* ── Mobile 狀態標籤（僅 Mobile 显示） ── */}
      {order.status_name && (
        <div className="md:hidden mb-2">
          <span className={`text-xs px-2 py-1 rounded-full ${statusClass}`}>
            {order.status_name}
          </span>
        </div>
      )}

      {/* ── 資訊區塊 ── */}
      <div className="space-y-1 text-sm">

        {/* Desktop 雙欄：單位 + 地點並排 */}
        <div className="hidden lg:grid lg:grid-cols-2 lg:gap-x-2">
          <div className="flex items-center gap-2 text-gray-600 truncate">
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <span className="truncate">{order.unit_name}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-600 truncate">
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="truncate">{order.location_name}</span>
          </div>
        </div>

        {/* Mobile / Tablet：垂直堆疊（單位 / 地點 / 狀態分行） */}
        <div className="lg:hidden space-y-1">
          <div className="flex items-center gap-2 text-gray-600">
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <span>{order.unit_name}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>{order.location_name}</span>
          </div>
        </div>

        {/* Tablet+ 狀態 Badge（md: 以上靠右） */}
        {order.status_name && (
          <div className="hidden md:flex md:justify-end">
            <span className={`text-xs px-2 py-1 rounded-full ${statusClass}`}>
              {order.status_name}
            </span>
          </div>
        )}

        {/* 故障描述：Mobile 截斷 30 字；Desktop/Tablet 截斷 50 字 */}
        <p className="text-gray-800 line-clamp-2
                       lg:truncate lg:overflow-hidden lg:text-ellipsis
                       max-lg:whitespace-nowrap max-lg:overflow-hidden max-lg:text-ellipsis"
           title={order.fault_description}>
          {/* Mobile 30 字截斷 */}
          <span className="inline lg:hidden">
            {order.fault_description.length > 30
              ? order.fault_description.slice(0, 30) + '…'
              : order.fault_description}
          </span>
          {/* Desktop/Tablet 50 字截斷 */}
          <span className="hidden max-lg:hidden">
            {order.fault_description.length > 50
              ? order.fault_description.slice(0, 50) + '…'
              : order.fault_description}
          </span>
        </p>

        <div className="flex items-center gap-2 text-gray-400 text-xs">
          <span>{formatDate(order.created_at)}</span>
        </div>
      </div>
    </Link>
  );
}
