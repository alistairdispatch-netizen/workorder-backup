/**
 * Order List Page
 * Displays paginated list of work orders with mobile-optimized cards.
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { useAuthStore } from '../store';
import OrderCard from '../components/OrderCard';
import PaginationControls from '../components/PaginationControls';
import FilterBar from '../components/FilterBar';

export default function OrderListPage() {
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const [sortBy, setSortBy] = useState("newest");
  const [filterUnit, setFilterUnit] = useState("");
  const [filterLocation, setFilterLocation] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [hasMore, setHasMore] = useState(true);
  const [repairStatuses, setRepairStatuses] = useState([]);

  const { user, isAdmin } = useAuthStore();

  const fetchOrders = async (pageNum = 0) => {
    setIsLoading(true);
    setError('');

    try {
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 3000));

      const response = await api.get(`/orders/?skip=${pageNum * 20}&limit=20`);;

      if (pageNum === 0) {
        setOrders(response.data);
      } else {
        setOrders(prev => [...prev, ...response.data]);
      }

      setHasMore(response.data.length === 20);
      setPage(pageNum);
    } catch (err) {
      setError('載入工單失敗');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders(0);
  }, []);

  // Fetch settings for filter dropdowns
  useEffect(() => {
    api.get('/settings/')
      .then(res => setRepairStatuses(res.data.repair_statuses || []))
      .catch(e => console.error('Failed to fetch settings', e));
  }, []);

  const loadMore = () => {
    if (hasMore && !isLoading) {
      fetchOrders(page + 1);
    }
  };

  const handleDelete = async (orderId) => {
    if (!confirm('確定要刪除此工單？')) return;

    try {
      await api.delete(`/orders/${orderId}`);
      setOrders(prev => prev.filter(o => o.id !== orderId));
    } catch (err) {
      alert('刪除失敗');
      console.error(err);
    }
  };

  return (
    <div className="p-4">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          {/* Left: 新增工單按鈕 */}
          {(user?.role === 'admin' || user?.role === 'user') && (
            <Link
              to="/orders/new"
              className="btn btn-primary flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              新增
            </Link>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <select
              value={filterUnit}
              onChange={(e) => setFilterUnit(e.target.value)}
              className="input py-1 text-sm"
            >
              <option value="">全部所別</option>
              {[...new Set(orders.map(o => o.unit_name).filter(Boolean))].map(u => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
            <select
              value={filterLocation}
              onChange={(e) => setFilterLocation(e.target.value)}
              className="input py-1 text-sm"
            >
              <option value="">全部地點</option>
              {[...new Set(orders.map(o => o.location_name).filter(Boolean))].map(l => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="input py-1 text-sm"
            >
              <option value="">全部狀態</option>
              {repairStatuses.map(s => (
                <option key={s.id || s.name} value={s.name}>{s.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Filter Bar (placeholder) */}
        <FilterBar />

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        {/* Loading State */}
        {isLoading && orders.length === 0 ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent"></div>
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-12">
            <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="text-gray-500">尚無工單</p>
          </div>
        ) : (
          <>
            {/* Order List — Responsive 3-column grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Sort orders */}
            {/* Apply filters */}
            {(() => {
              let filtered = orders;
              if (filterUnit) filtered = filtered.filter(o => o.unit_name === filterUnit);
              if (filterLocation) filtered = filtered.filter(o => o.location_name === filterLocation);
              if (filterStatus) filtered = filtered.filter(o => o.status_name === filterStatus);
              
              if (sortBy === 'status') {
                const statusOrder = { '待處理': 1, '處理中': 2, '已完成': 3, '已存封': 4 };
                filtered = filtered.slice().sort((a, b) => (statusOrder[a.status_name] || 99) - (statusOrder[b.status_name] || 99));
              }
              
              return filtered.map((order) => (
                <OrderCard key={order.id} order={order} onDelete={handleDelete} canDelete={isAdmin() || user?.id === order.creator_id} />
              ));
            })()}
            </div>

            {/* Pagination */}
            <PaginationControls
              hasMore={hasMore}
              isLoading={isLoading}
              onLoadMore={loadMore}
            />
          </>
        )}
      </div>
    </div>
  );
}
