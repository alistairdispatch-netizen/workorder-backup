/**
 * Order Edit Page
 * Form for editing existing work orders.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import api from '../api';
import { useAuthStore } from '../store';

// ---------------------------------------------------------------------------
// Utility: format bytes
// ---------------------------------------------------------------------------
function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ---------------------------------------------------------------------------
// ExistingPhotosSection — shows & soft-deletes photos
// Mark for deletion → saved on form submit; restore available before save
// ---------------------------------------------------------------------------
function ExistingPhotosSection({ photos = [], onDeleted, deletedPhotoIds = [], onMarkDelete, onRestore }) {
  const [lightboxPhoto, setLightboxPhoto] = useState(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setLightboxPhoto(null);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (lightboxPhoto) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [lightboxPhoto]);

  const handleMarkDelete = (photo) => {
    if (!confirm('確定要刪除這張照片？')) return;
    onMarkDelete(photo.id);
  };

  // Visible photos = all photos minus soft-deleted ones
  const visiblePhotos = photos.filter(p => !deletedPhotoIds.includes(p.id));
  const beforePhotos = visiblePhotos.filter(p => p.photo_type === 'before');
  const afterPhotos  = visiblePhotos.filter(p => p.photo_type === 'after');

  // Marked-for-deletion photos (for restore section)
  const markedPhotos = photos.filter(p => deletedPhotoIds.includes(p.id));

  if (photos.length === 0) return null;

  return (
    <>
      <div className="card">
        <h3 className="text-sm font-medium text-gray-500 mb-3">現有照片</h3>

        {beforePhotos.length > 0 && (
          <div className="mb-4">
            <h4 className="text-xs text-gray-500 mb-2">施工前</h4>
            <div className="grid grid-cols-2 gap-2">
              {beforePhotos.map((photo) => (
                <div key={photo.id} className="relative group">
                  <button
                    onClick={() => setLightboxPhoto(photo)}
                    className="w-full aspect-square overflow-hidden rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 block"
                  >
                    <img
                      src={photo.file_url}
                      alt={`施工前 ${photo.photo_number}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                  <button
                    onClick={() => handleMarkDelete(photo)}
                    className="absolute top-1 right-1 w-7 h-7 bg-black/60 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-xs transition-colors"
                    aria-label="刪除"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {afterPhotos.length > 0 && (
          <div>
            <h4 className="text-xs text-gray-500 mb-2">施工後</h4>
            <div className="grid grid-cols-2 gap-2">
              {afterPhotos.map((photo) => (
                <div key={photo.id} className="relative group">
                  <button
                    onClick={() => setLightboxPhoto(photo)}
                    className="w-full aspect-square overflow-hidden rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 block"
                  >
                    <img
                      src={photo.file_url}
                      alt={`施工後 ${photo.photo_number}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                  <button
                    onClick={() => handleMarkDelete(photo)}
                    className="absolute top-1 right-1 w-7 h-7 bg-black/60 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-xs transition-colors"
                    aria-label="刪除"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Marked-for-deletion section: dimmed with restore button */}
        {markedPhotos.length > 0 && (
          <div className="mt-4 pt-4 border-t border-red-200">
            <h4 className="text-xs text-red-500 mb-2">待刪除的照片（儲存後才會刪除）</h4>
            <div className="grid grid-cols-2 gap-2">
              {markedPhotos.map((photo) => (
                <div key={photo.id} className="relative group opacity-60">
                  <div className="w-full aspect-square overflow-hidden rounded-lg">
                    <img
                      src={photo.file_url}
                      alt={`待刪除 ${photo.photo_number}`}
                      className="w-full h-full object-cover grayscale"
                    />
                  </div>
                  <button
                    onClick={() => onRestore(photo.id)}
                    className="absolute bottom-1 right-1 px-2 py-0.5 bg-green-600 hover:bg-green-700 text-white text-xs rounded-full transition-colors"
                    aria-label="復原"
                  >
                    ↩ 復原
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={() => setLightboxPhoto(null)}
        >
          <button
            onClick={() => setLightboxPhoto(null)}
            className="absolute top-4 right-4 p-2 text-white hover:bg-white/20 rounded-full transition-colors"
            aria-label="關閉"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div
            className="relative max-w-full max-h-full p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={lightboxPhoto.file_path}
              alt={`${lightboxPhoto.photo_type === 'before' ? '施工前' : '施工後'} ${lightboxPhoto.photo_number}`}
              className="max-w-screen-sm max-h-[75vh] object-contain rounded-lg"
            />
            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
              <span className="text-white text-sm bg-black/50 px-3 py-1 rounded-full">
                {lightboxPhoto.photo_type === 'before' ? '施工前' : '施工後'} #{lightboxPhoto.photo_number}
              </span>
              {!deletedPhotoIds.includes(lightboxPhoto.id) ? (
                <button
                  onClick={() => handleMarkDelete(lightboxPhoto)}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-full text-sm font-medium transition-colors"
                >
                  刪除
                </button>
              ) : (
                <button
                  onClick={() => onRestore(lightboxPhoto.id)}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-full text-sm font-medium transition-colors"
                >
                  ↩ 復原
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// UploadPhotoSection — queue-based: files are NOT uploaded until form is saved
// Each file carries its photoType (captured at add time).
// Parent receives updates via onFilesQueued(currentQueue).
// ---------------------------------------------------------------------------
function UploadPhotoSection({ onFilesQueued, uploadingItemId = null, uploadProgressMap = {} }) {
  const { isAdmin, isGuest } = useAuthStore();

  const [photoType, setPhotoType] = useState('before');
  const [previewFiles, setPreviewFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const canUpload = isAdmin() && !isGuest();

  // Notify parent whenever queue changes
  const notifyParent = useCallback((files) => {
    if (onFilesQueued) onFilesQueued(files);
  }, [onFilesQueued]);

  const handleFiles = useCallback((files) => {
    const currentPhotoType = photoType; // capture at selection time
    const validFiles = Array.from(files).filter(f => {
      if (!f.type.startsWith('image/')) return false;
      if (f.size > 10 * 1024 * 1024) {
        alert(`「${f.name}」超過 10MB 限制`);
        return false;
      }
      return true;
    });

    const newPreviews = validFiles.map((file) => ({
      id: Math.random().toString(36).slice(2),
      file,
      photoType: currentPhotoType, // captured at add time
      preview: URL.createObjectURL(file),
      status: 'queued', // queued | uploading | done | error
      progress: 0,
      name: file.name,
      size: file.size,
    }));

    setPreviewFiles((prev) => {
      const updated = [...prev, ...newPreviews];
      notifyParent(updated);
      return updated;
    });
  }, [photoType, notifyParent]);

  const removePreview = (id) => {
    setPreviewFiles((prev) => {
      const item = prev.find((p) => p.id === id);
      if (item?.preview) URL.revokeObjectURL(item.preview);
      const updated = prev.filter((p) => p.id !== id);
      notifyParent(updated);
      return updated;
    });
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  // Merge upload progress from parent into display
  const getItemStatus = (item) => {
    if (uploadingItemId === item.id) return 'uploading';
    if (uploadProgressMap[item.id] === 'done') return 'done';
    if (uploadProgressMap[item.id] === 'error') return 'error';
    return item.status;
  };

  const getItemProgress = (item) => {
    return uploadProgressMap[`${item.id}_progress`] ?? item.progress;
  };

  return (
    <div className="mt-4">
      <label className="label">上傳照片</label>

      <div className="mb-3 flex items-center gap-3">
        <select
          value={photoType}
          onChange={(e) => setPhotoType(e.target.value)}
          className="input flex-1 md:hidden"
        >
          <option value="before">施工前</option>
          <option value="after">施工後</option>
        </select>

        <div className="hidden md:flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          {['before', 'after'].map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setPhotoType(type)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                photoType === type
                  ? 'bg-white text-primary-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {type === 'before' ? '施工前' : '施工後'}
            </button>
          ))}
        </div>
      </div>

      {canUpload && (
        <>
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`
              hidden lg:flex flex-col items-center justify-center
              border-2 border-dashed rounded-xl p-8 mb-3
              transition-colors cursor-pointer
              ${isDragging
                ? 'border-primary-500 bg-primary-50'
                : 'border-gray-300 hover:border-primary-400 hover:bg-gray-50'}
            `}
            onClick={() => fileInputRef.current?.click()}
          >
            <svg className="w-10 h-10 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            <p className="text-sm text-gray-600">
              拖曳照片到此處，或 <span className="text-primary-600 font-medium">點擊上傳</span>
            </p>
            <p className="text-xs text-gray-400 mt-1">JPG / PNG / WebP，最大 10MB</p>
          </div>

          <div className="lg:hidden mb-3">
            <label className="btn btn-outline w-full cursor-pointer text-center">
              <svg className="w-4 h-4 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              選擇照片
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => handleFiles(e.target.files)}
              />
            </label>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </>
      )}

      {previewFiles.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-2 gap-3 mt-3">
          {previewFiles.map((item) => {
            const displayStatus = getItemStatus(item);
            const displayProgress = getItemProgress(item);

            return (
              <div key={item.id} className="relative group">
                <div className="aspect-square overflow-hidden rounded-lg bg-gray-100 border border-gray-200">
                  <img
                    src={item.preview}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />

                  {/* Queued: show "待上傳" badge */}
                  {displayStatus === 'queued' && (
                    <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center gap-1">
                      <span className="bg-yellow-400 text-yellow-900 text-xs font-semibold px-2 py-0.5 rounded-full">
                        待上傳
                      </span>
                      <span className="text-white text-xs opacity-80">
                        {item.photoType === 'before' ? '施工前' : '施工後'}
                      </span>
                    </div>
                  )}

                  {displayStatus === 'uploading' && (
                    <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center">
                      <div className="flex md:hidden flex-col items-center gap-1">
                        <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span className="text-white text-xs">{displayProgress}%</span>
                      </div>
                      <div className="hidden md:flex flex-col items-center gap-2 w-3/4">
                        <div className="w-full bg-white/30 rounded-full h-2">
                          <div
                            className="bg-primary-500 h-2 rounded-full transition-all"
                            style={{ width: `${displayProgress}%` }}
                          />
                        </div>
                        <span className="text-white text-xs truncate max-w-full">{item.name}</span>
                      </div>
                    </div>
                  )}

                  {displayStatus === 'done' && (
                    <div className="absolute inset-0 bg-green-600/70 flex items-center justify-center">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}

                  {displayStatus === 'error' && (
                    <div className="absolute inset-0 bg-red-600/70 flex flex-col items-center justify-center gap-1">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      <span className="text-white text-xs">上傳失敗</span>
                    </div>
                  )}

                  {/* Remove button (only for queued items) */}
                  {displayStatus === 'queued' && (
                    <>
                      <button
                        type="button"
                        onClick={() => removePreview(item.id)}
                        className="md:hidden absolute top-1 right-1 w-7 h-7 bg-black/60 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-xs transition-colors"
                        aria-label="移除"
                      >
                        ✕
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`移除「${item.name}」？`)) removePreview(item.id);
                        }}
                        className="hidden md:flex absolute inset-0 items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-label="移除"
                      >
                        <span className="w-8 h-8 bg-white/90 hover:bg-red-600 text-gray-700 hover:text-white rounded-full flex items-center justify-center text-sm font-bold transition-colors">
                          ✕
                        </span>
                      </button>
                    </>
                  )}
                </div>

                <p className="hidden md:block text-xs text-gray-500 mt-1 truncate" title={item.name}>
                  {item.name} · {formatBytes(item.size)}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// OrderEditPage
// ---------------------------------------------------------------------------
export default function OrderEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAdmin, isGuest } = useAuthStore();

  const [order, setOrder] = useState(null);
  const [settings, setSettings] = useState({ units: [], locations: [], faultCategories: [], repairStatuses: [] });
  const [contractorUnits, setContractorUnits] = useState([]);
  const [selectedUnitId, setSelectedUnitId] = useState();
  const [selectedLocationId, setSelectedLocationId] = useState();
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedContractorUnitId, setSelectedContractorUnitId] = useState();
  const [photos, setPhotos] = useState([]);
  const [deletedPhotoIds, setDeletedPhotoIds] = useState([]);

  // Upload queue (set by UploadPhotoSection callback)
  const [pendingUploadFiles, setPendingUploadFiles] = useState([]);
  // Track upload progress per item id for UI feedback
  const [uploadingItemId, setUploadingItemId] = useState(null);
  const [uploadProgressMap, setUploadProgressMap] = useState({});

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState();

  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  // Fetch order and settings
  useEffect(() => {
    Promise.all([fetchOrder(), fetchSettings(), fetchContractorUnits()]).finally(() => setIsLoading(false));
  }, [id]);

  const fetchOrder = async () => {
    try {
      const response = await api.get(`/orders/${id}`);
      const orderData = response.data;
      setOrder(orderData);
      setPhotos(orderData.photos || []);
      setDeletedPhotoIds([]);

      reset({
        fault_description: orderData.fault_description || '',
        handling_method: orderData.treatment || '',
        worker: orderData.contractor || '',
        repair_status_id: orderData.status || '',
      });

      const matchedUnit = settings.units?.find(u => u.name === orderData.unit);
      const matchedLocation = settings.locations?.find(l => l.name === orderData.location);
      const categoryIds = [];
      if (Array.isArray(orderData.fault_categories)) {
        orderData.fault_categories.forEach(catName => {
          const matched = settings.faultCategories?.find(fc => fc.name === catName);
          if (matched) categoryIds.push(matched.id);
        });
      }

      setSelectedUnitId(matchedUnit ? matchedUnit.id.toString() : '');
      setSelectedLocationId(matchedLocation ? matchedLocation.id.toString() : '');
      setSelectedCategories(categoryIds.length > 0 ? categoryIds : []);

      if (orderData.contractor) {
        const matchedCU = contractorUnits.find(cu => cu.name === orderData.contractor);
        setSelectedContractorUnitId(matchedCU ? matchedCU.id.toString() : '');
      }
    } catch (err) {
      console.error(err);
    }
  };

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

  useEffect(() => {
    if (!order || !settings.units?.length) return;

    const matchedUnit = settings.units?.find(u => u.name === order.unit);
    const matchedLocation = settings.locations?.find(l => l.name === order.location);

    const categoryIds = [];
    if (Array.isArray(order.fault_categories)) {
      order.fault_categories.forEach(catName => {
        const matched = settings.faultCategories?.find(fc => fc.name === catName);
        if (matched) categoryIds.push(matched.id);
      });
    }

    setSelectedUnitId(matchedUnit ? matchedUnit.id.toString() : '');
    setSelectedLocationId(matchedLocation ? matchedLocation.id.toString() : '');
    setSelectedCategories(categoryIds.length > 0 ? categoryIds : []);

    if (order.contractor) {
      const matchedCU = contractorUnits.find(cu => cu.name === order.contractor);
      setSelectedContractorUnitId(matchedCU ? matchedCU.id.toString() : '');
    }
  }, [settings, order, contractorUnits]);

  const filteredLocations = settings.locations?.filter(l => l.unit_id === parseInt(selectedUnitId)) || [];

  const toggleCategory = (categoryId) => {
    setSelectedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(c => c !== categoryId)
        : [...prev, categoryId]
    );
  };

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    setError('');

    try {
      const selectedUnit = settings.units?.find(u => u.id === parseInt(selectedUnitId));
      const selectedLocation = settings.locations?.find(l => l.id === parseInt(selectedLocationId));

      const categoryNames = selectedCategories.map(cid => {
        const cat = settings.faultCategories?.find(fc => fc.id === cid);
        return cat ? cat.name : null;
      }).filter(Boolean);

      const payload = {
        unit: selectedUnit?.name || order.unit,
        location: selectedLocation?.name || order.location,
        fault_categories: categoryNames,
        fault_description: data.fault_description,
        treatment: data.handling_method || null,
        status: data.repair_status_id || order.status,
      };

      if (isAdmin() && data.worker) {
        payload.contractor = data.worker;
      }

      if (selectedContractorUnitId) {
        payload.contractor_unit_id = parseInt(selectedContractorUnitId);
      }

      // Step 1: Delete marked photos
      for (const photoId of deletedPhotoIds) {
        await api.delete(`/orders/photos/${photoId}`);
      }

      // Step 2: Upload queued photos one by one
      for (const item of pendingUploadFiles) {
        setUploadingItemId(item.id);

        try {
          const formData = new FormData();
          formData.append('file', item.file);

          await new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();

            xhr.upload.addEventListener('progress', (e) => {
              if (e.lengthComputable) {
                const pct = Math.round((e.loaded / e.total) * 100);
                setUploadProgressMap(prev => ({ ...prev, [`${item.id}_progress`]: pct }));
              }
            });

            xhr.addEventListener('load', () => {
              if (xhr.status >= 200 && xhr.status < 300) {
                resolve();
              } else {
                reject(new Error(`Upload failed: ${xhr.status}`));
              }
            });

            xhr.addEventListener('error', () => reject(new Error('Network error')));

            xhr.open('POST', `/api/orders/${id}/photos?photo_type=${item.photoType}`);
            const token = localStorage.getItem('access_token');
            if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);

            xhr.send(formData);
          });

          setUploadProgressMap(prev => ({ ...prev, [item.id]: 'done' }));
        } catch (uploadErr) {
          console.error(`上傳失敗: ${item.name}`, uploadErr);
          setUploadProgressMap(prev => ({ ...prev, [item.id]: 'error' }));
          // Continue uploading remaining files even if one fails
        }

        setUploadingItemId(null);
      }

      // Step 3: Save form data
      await api.put(`/orders/${id}`, payload);
      navigate(`/orders/${id}`);
    } catch (err) {
      setError(err.response?.status === 500 ? '網路錯誤，請稍後再試' : (err.response?.data?.detail || err.message || '更新工單失敗'));
      console.error(err);
    } finally {
      setIsSubmitting(false);
      setUploadingItemId(null);
    }
  };

  const handleMarkDelete = (photoId) => {
    setDeletedPhotoIds(prev => [...prev, photoId]);
  };

  const handleRestore = (photoId) => {
    setDeletedPhotoIds(prev => prev.filter(id => id !== photoId));
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent"></div>
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

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Unit (read-only for users) */}
        <div>
          <label className="label">單位</label>
          <select
            value={selectedUnitId}
            onChange={(e) => {
              setSelectedUnitId(e.target.value);
              setSelectedLocationId('');
            }}
            className="input"
            disabled={!isAdmin()}
          >
            <option value="">請選擇單位</option>
            {settings.units?.map((unit) => (
              <option key={unit.id} value={unit.id}>{unit.name}</option>
            ))}
          </select>
        </div>

        {/* Location */}
        <div>
          <label className="label">地點</label>
          <select
            value={selectedLocationId}
            onChange={(e) => setSelectedLocationId(e.target.value)}
            className="input"
            required
            disabled={!selectedUnitId}
          >
            <option value="">請選擇地點</option>
            {filteredLocations.map((loc) => (
              <option key={loc.id} value={loc.id}>{loc.name}</option>
            ))}
          </select>
        </div>

        {/* Fault Categories */}
        {settings.faultCategories?.length > 0 && (
          <div>
            <label className="label">故障類別</label>
            <div className="flex flex-wrap gap-2">
              {settings.faultCategories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => toggleCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                    selectedCategories.includes(cat.id)
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Fault Description */}
        <div>
          <label className="label">故障描述 <span className="text-red-500">*</span></label>
          <textarea
            {...register('fault_description', { required: '請填寫故障描述' })}
            className="input min-h-[120px]"
            defaultValue={order.fault_description}
            required
          />
          {errors.fault_description && (
            <p className="text-red-500 text-sm mt-1">{errors.fault_description.message}</p>
          )}
        </div>

        {/* Handling Method */}
        <div>
          <label className="label">處理方式</label>
          <textarea
            {...register('handling_method')}
            className="input min-h-[80px]"
            defaultValue={order.treatment || ''}
          />
        </div>

        {/* Contractor Unit - Admin only */}
        {isAdmin() && contractorUnits.length > 0 && (
          <div>
            <label className="label">施工單位</label>
            <select
              value={selectedContractorUnitId}
              onChange={(e) => setSelectedContractorUnitId(e.target.value)}
              className="input"
            >
              <option value="">請選擇施工單位</option>
              {contractorUnits.map((cu) => (
                <option key={cu.id} value={cu.id}>{cu.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Repair Status */}
        {settings.repairStatuses?.length > 0 && (
          <div>
            <label className="label">處理狀況</label>
            <select
              {...register('repair_status_id')}
              className="input"
              defaultValue={order.status || ''}
            >
              <option value="">請選擇狀態</option>
              {settings.repairStatuses.map((status) => (
                <option key={status.id || status.name} value={status.name || status.id}>{status.name || status.label}</option>
              ))}
            </select>
          </div>
        )}

        {/* Photos Section */}
        <ExistingPhotosSection
          photos={photos}
          onDeleted={() => fetchOrder()}
          deletedPhotoIds={deletedPhotoIds}
          onMarkDelete={handleMarkDelete}
          onRestore={handleRestore}
        />
        <UploadPhotoSection
          onFilesQueued={(files) => setPendingUploadFiles(files)}
          uploadingItemId={uploadingItemId}
          uploadProgressMap={uploadProgressMap}
        />

        {/* Submit */}
        <div className="flex gap-2 pt-4">
          <Link to={`/orders/${id}`} className="btn btn-secondary flex-1 text-center">
            取消
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn btn-primary flex-1"
          >
            {isSubmitting
              ? uploadingItemId
                ? `上傳照片中...`
                : '儲存中...'
              : '儲存'}
          </button>
        </div>
      </form>
    </div>
  );
}
