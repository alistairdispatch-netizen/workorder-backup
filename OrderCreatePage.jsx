/**
 * Order Create Page
 * Uses the shared OrderForm component.
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import OrderForm from '../components/OrderForm';
import api from '../api';

export default function OrderCreatePage() {
  const [settings, setSettings] = useState({ units: [], locations: [], faultCategories: [], repairStatuses: [] });
  const [contractorUnits, setContractorUnits] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchSettings();
    fetchContractorUnits();
  }, []);

  const fetchSettings = async () => {
    try {
      await new Promise((resolve) => setTimeout(resolve, 3000));
      const response = await api.get('/settings/');
      setSettings({
        ...response.data,
        faultCategories: response.data.fault_categories || [],
        repairStatuses: response.data.repair_statuses || [],
      });
    } catch (err) {
      setError('載入設定失敗');
      console.error(err);
    } finally {
      setIsLoading(false);
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

      const selectedUnit = settings.units?.find((u) => u.id === parseInt(selectedUnitId));
      const selectedLocation = settings.locations?.find((l) => l.id === parseInt(selectedLocationId));
      const selectedFaultCats = selectedCategories.map((id) => {
        const cat = settings.faultCategories?.find((c) => c.id === id);
        return cat ? cat.name : null;
      }).filter(Boolean);

      const payload = {
        unit: selectedUnit?.name || '',
        location: selectedLocation?.name || '',
        fault_categories: selectedFaultCats,
        fault_description: data.fault_description,
        treatment: data.handling_method || null,
        contractor_unit_id: data.contractor_unit_id ? parseInt(data.contractor_unit_id) : null,
      };

      const response = await api.post('/orders/', payload);
      window.location.href = `/orders/${response.data.id}`;
    } catch (err) {
      setError(err.response?.data?.detail || '建立工單失敗');
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

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link to="/orders" className="p-2 -ml-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h2 className="text-lg font-semibold">新增工單</h2>
      </div>

      <OrderForm
        order={null}
        settings={settings}
        contractorUnits={contractorUnits}
        isSubmitting={isSubmitting}
        error={error}
        onSubmit={onSubmit}
      />
    </div>
  );
}
