/**
 * Order Edit Page
 * Uses the shared OrderForm component.
 */

import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import OrderForm from '../components/OrderForm';
import api from '../api';

export default function OrderEditPage() {
  const { id } = useParams();

  const [order, setOrder] = useState(null);
  const [settings, setSettings] = useState({ units: [], locations: [], faultCategories: [], repairStatuses: [] });
  const [contractorUnits, setContractorUnits] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([fetchOrder(), fetchSettings(), fetchContractorUnits()]).finally(
      () => setIsLoading(false)
    );
  }, [id]);

  const fetchOrder = async () => {
    try {
      await new Promise((resolve) => setTimeout(resolve, 3000));
      const response = await api.get(`/orders/${id}`);
      setOrder(response.data);
    } catch (err) {
      setError('載入工單失敗');
      console.error(err);
    }
  };

  const fetchSettings = async () => {
    try {
      const response = await api.get('/settings/all/');
      setSettings({
        ...response.data,
        faultCategories: response.data.fault_categories || [],
        repairStatuses: response.data.repair_statuses || [],
      });
    } catch (err) {
      console.error(err);
    }
  };

  const fetchContractorUnits = async () => {
    try {
      const response = await api.get('/contractor-units/');
      setContractorUnits(response.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const onSubmit = async ({ selectedUnitId, selectedLocationId, selectedCategories, ...data }) => {
    setIsSubmitting(true);
    setError('');

    try {
      await new Promise((resolve) => setTimeout(resolve, 3000));

      const payload = {
        location_id: parseInt(selectedLocationId),
        fault_category_ids: selectedCategories,
        fault_description: data.fault_description,
        handling_method: data.handling_method || null,
        worker: data.worker || null,
        repair_status_id: data.repair_status_id ? parseInt(data.repair_status_id) : null,
      };

      await api.put(`/orders/${id}`, payload);
      window.location.href = `/orders/${id}`;
    } catch (err) {
      setError(err.response?.data?.detail || '更新工單失敗');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="p-4">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          無法載入工單
        </div>
        <Link to="/orders" className="btn btn-secondary mt-4">返回列表</Link>
      </div>
    );
  }

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link to={`/orders/${id}`} className="p-2 -ml-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h2 className="text-lg font-semibold">編輯工單</h2>
      </div>

      <OrderForm
        order={order}
        settings={settings}
        contractorUnits={contractorUnits}
        isSubmitting={isSubmitting}
        error={error}
        onSubmit={onSubmit}
        onPhotosChange={fetchOrder}
      />
    </div>
  );
}
