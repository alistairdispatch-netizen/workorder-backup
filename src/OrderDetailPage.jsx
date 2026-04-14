/**
 * Order Detail Page
 * Displays full order details with photos, worker field hidden from guests.
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../api';
import { useAuthStore } from '../store';
import PhotoGrid from '../components/PhotoGrid';
import { exportOrderPdf } from '../api';

export default function OrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAdmin, isGuest } = useAuthStore();
  
  const [order, setOrder] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pdfLoading, setPdfLoading] = useState(false);
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

  const handleExportPdf = async () => {
    setPdfLoading(true);
    try {
      await exportOrderPdf(id);
    } catch (err) {
      alert('下載失敗');
      console.error(err);
    } finally {
      setPdfLoading(false);
    }
  };

  const formatDateTime = (dateStr) => {
    const date = new Date(dateStr);
    return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
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

  const canEdit = (isAdmin() || user.id === order.created_by) && !isGuest();
  const canDelete = (isAdmin() || user.id === order.created_by) && !isGuest();

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
        {order.repair_status && (
          <span className="text-sm px-3 py-1 rounded-full bg-blue-100 text-blue-800">
            {order.repair_status.name}
          </span>
        )}
      </div>

      {/* Order Info Card */}
      <div className="card mb-4">
        <div className="space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-2">
            <div className="text-gray-500">單位</div>
            <div className="font-medium">{order.unit_name || order.unit || '-'}</div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="text-gray-500">地點</div>
            <div className="font-medium">{order.location_name || order.location || '-'}</div>
          </div>
          {order.fault_categories?.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              <div className="text-gray-500">故障類別</div>
              <div className="flex flex-wrap gap-1">
                {order.fault_categories.map((fc) => (
                  <span key={fc.id} className="text-xs bg-gray-100 px-2 py-1 rounded">
                    {fc.name}
                  </span>
                ))}
              </div>
            </div>
          )}
          {/* Worker - hidden from guests */}
          {!isGuest() && order.worker && (
            <div className="grid grid-cols-2 gap-2">
              <div className="text-gray-500">施工者</div>
              <div className="font-medium">{order.worker}</div>
            </div>
          )}
        </div>
      </div>

      {/* Fault Description */}
      <div className="card mb-4">
        <h3 className="text-sm font-medium text-gray-500 mb-2">故障描述</h3>
        <p className="text-gray-800 whitespace-pre-wrap">{order.fault_description}</p>
      </div>

      {/* Handling Method */}
      {order.handling_method && (
        <div className="card mb-4">
          <h3 className="text-sm font-medium text-gray-500 mb-2">處理方式</h3>
          <p className="text-gray-800 whitespace-pre-wrap">{order.handling_method}</p>
        </div>
      )}

      {/* Photos */}
      {order.photos && order.photos.length > 0 && (
        <PhotoGrid
          photos={order.photos}
          orderId={order.id}
          onPhotosChange={fetchOrder}
        />
      )}

      {/* Timestamps */}
      <div className="text-xs text-gray-400 space-y-1">
        <p>建立時間：{formatDateTime(order.created_at)}</p>
        <p>最後更新：{formatDateTime(order.updated_at)}</p>
      </div>

      {/* Actions */}
      <div className="flex gap-2 mt-6">
        {canEdit && (
          <>
            <button
              onClick={handleExportPdf}
              disabled={pdfLoading}
              className="btn btn-secondary flex-1 text-center"
            >
              {pdfLoading ? '處理中...' : '📄 匯出 PDF'}
            </button>
            <Link to={`/orders/${id}/edit`} className="btn btn-primary flex-1 text-center">
              編輯
            </Link>
          </>
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
