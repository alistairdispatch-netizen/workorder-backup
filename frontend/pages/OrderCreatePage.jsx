/**
 * Order Create Page
 * Form for creating new work orders.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import api from '../api';
import { useAuthStore } from '../store';
import OrderForm from '../components/OrderForm';

export default function OrderCreatePage() {
  const navigate = useNavigate();
  const { isAdmin } = useAuthStore();

  const [settings, setSettings] = useState({ units: [], locations: [], faultCategories: [], repairStatuses: [] });
  const [contractorUnits, setContractorUnits] = useState([]);
  const [selectedUnitId, setSelectedUnitId] = useState('');
  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedContractorUnitId, setSelectedContractorUnitId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const { register, handleSubmit, formState: { errors } } = useForm();

  useEffect(() => {
    fetchSettings();
    fetchContractorUnits();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await api.get('/settings/');
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
      setContractorUnits(response.data);
    } catch (err) {
      console.error(err);
    }
  };

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    setError('');

    try {
      const selectedUnit = settings.units?.find(u => u.id === parseInt(selectedUnitId));
      const selectedLocation = settings.locations?.find(l => l.id === parseInt(selectedLocationId));
      const selectedFaultCats = selectedCategories.map(id => {
        const cat = settings.faultCategories?.find(c => c.id === id);
        return cat ? cat.name : null;
      }).filter(Boolean);

      const payload = {
        unit: selectedUnit?.name || '',
        location: selectedLocation?.name || '',
        fault_categories: selectedFaultCats,
        fault_description: data.fault_description,
        treatment: data.handling_method || null,
      };

      if (selectedContractorUnitId) {
        payload.contractor_unit_id = parseInt(selectedContractorUnitId);
      }

      const response = await api.post('/orders/', payload);
      navigate('/orders/' + response.data.id);
    } catch (err) {
      setError(err.response?.data?.detail || 'Create order failed');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <OrderForm
      mode="create"
      title="新增工單"
      backTo="/orders"
      isAdmin={isAdmin()}
      settings={settings}
      contractorUnits={contractorUnits}
      selectedUnitId={selectedUnitId}
      setSelectedUnitId={setSelectedUnitId}
      selectedLocationId={selectedLocationId}
      setSelectedLocationId={setSelectedLocationId}
      selectedCategories={selectedCategories}
      setSelectedCategories={setSelectedCategories}
      selectedContractorUnitId={selectedContractorUnitId}
      setSelectedContractorUnitId={setSelectedContractorUnitId}
      register={register}
      handleSubmit={handleSubmit}
      errors={errors}
      onSubmit={onSubmit}
      isSubmitting={isSubmitting}
      error={error}
    />
  );
}
