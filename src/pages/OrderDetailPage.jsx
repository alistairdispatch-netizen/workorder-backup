/**
 * Order Detail Page
 * Displays full order details with photos, worker field hidden from guests.
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api, { exportOrderPdf } from '../api';
import { useAuthStore } from '../store';
import PhotoGrid from '../components/PhotoGrid';
import OrderStatusBadge from '../components/OrderStatusBadge';
import OrderInfoPanel from '../components/OrderInfoPanel';
import OrderHistoryPanel from '../components/OrderHistoryPanel';

export default function OrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAdmin, isGuest } = useAuthStore();

  const [order, setOrder] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchOrder();
  }, [id]);

  const fetchOrder = async () => {
    setIsLoading(true);
    setError('');

    try {
      await new Promise(resolve => setTimeout(resolve, 3000));
      const response = await api.get(`/orders/${id}`);
      setOrder(response.data);
    } catch (err) {
      if (err.response?.status === 404) {
        setError('工單不存在');
      } else if (err.response?.status === 403) {
        setError('無權限查看此工單');
      } else {
        setError('載入工單失敗');
      }
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('確定要刪除此工單嗎？')) return;

    try {
      await api.delete(`/orders/${id}`);
      navigate('/orders');
    } catch (err) {
      alert('刪除失敗');
      console.error(err);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
        <Link to="/orders" className="btn btn-secondary mt-4">返回列表</Link>
      </div>
    );
  }

  if (!order) return null;

  const canEdit = (isAdmin() || user.id === order.creator_id) && !isGuest();
  const canDelete = false;

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Link to="/orders" className="p-2 -ml-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h2 className="font-mono text-lg font-semibold">{order.order_number}</h2>
        </div>
        <OrderStatusBadge statusName={order.status_name} />
      </div>

      {/* Simple 2-column layout */}
      <div className="space-y-4">
        {/* Row 1: Basic Info + Fault Description (2 columns) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <OrderInfoPanel order={order} />

          <div className="card">
            <h3 className="text-sm font-medium text-gray-500 mb-2">故障描述</h3>
            <p className="text-gray-800 whitespace-pre-wrap">{order.fault_description}</p>
          </div>
        </div>

        {/* Row 2: Handling Method */}
        {order.handling_method && (
          <div className="card">
            <h3 className="text-sm font-medium text-gray-500 mb-2">處理方式</h3>
            <p className="text-gray-800 whitespace-pre-wrap">{order.handling_method}</p>
          </div>
        )}

        {/* Row 3: Photos */}
        {order.photos && order.photos.length > 0 && (
          <PhotoGrid photos={order.photos} orderId={order.id} onPhotosChange={fetchOrder} />
        )}

        {/* Row 4: History */}
        <OrderHistoryPanel order={order} />
      </div>

      {/* Action Buttons - outside the grid */}
      <div className="flex gap-2 flex-wrap mt-4">
        <button
          onClick={async () => {
            try {
              await exportOrderPdf(id);
            } catch (e) {
              alert('匯出失敗');
            }
          }}
          className="btn btn-secondary flex-1 text-center"
        >
          📄 匯出 PDF
        </button>
        {canEdit && (
          <Link to={`/orders/${id}/edit`} className="btn btn-primary flex-1 text-center">
            編輯
          </Link>
        )}
        {canDelete && (
          <button onClick={handleDelete} className="btn btn-danger">
            刪除
          </button>
        )}
      </div>
    </div>
  );
}
