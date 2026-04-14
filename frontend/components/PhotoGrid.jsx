/**
 * PhotoGrid Component
 * Displays photos in a grid with lightbox view and delete functionality.
 * Mobile-friendly: tap to open lightbox, long-press or button to delete (admin only).
 */

import { useState, useEffect, useCallback } from 'react';
import api from '../api';
import { useAuthStore } from '../store';

export default function PhotoGrid({ photos = [], orderId, onPhotosChange }) {
  const { isAdmin, isGuest } = useAuthStore();
  const [lightboxPhoto, setLightboxPhoto] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const canDelete = isAdmin() && !isGuest();

  // Close lightbox on escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setLightboxPhoto(null);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Prevent body scroll when lightbox is open
  useEffect(() => {
    if (lightboxPhoto) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [lightboxPhoto]);

  const handleDelete = async (photo) => {
    if (!confirm(`確定要刪除這張「${photo.photo_type === 'before' ? '施工前' : '施工後'}」照片嗎？`)) return;

    setIsDeleting(true);
    try {
      await api.delete(`/orders/photos/${photo.id}/`);
      setLightboxPhoto(null);
      if (onPhotosChange) onPhotosChange();
    } catch (err) {
      alert('刪除失敗：' + (err.response?.data?.detail || '未知錯誤'));
      console.error(err);
    } finally {
      setIsDeleting(false);
    }
  };

  const beforePhotos = photos.filter(p => p.photo_type === 'before');
  const afterPhotos = photos.filter(p => p.photo_type === 'after');

  if (photos.length === 0) return null;

  return (
    <>
      <div className="card mb-4">
        <h3 className="text-sm font-medium text-gray-500 mb-3">照片</h3>

        {/* Before Photos */}
        {beforePhotos.length > 0 && (
          <div className="mb-4">
            <h4 className="text-xs text-gray-500 mb-2">施工前</h4>
            <div className="grid grid-cols-2 gap-2">
              {beforePhotos.map((photo) => (
                <button
                  key={photo.id}
                  onClick={() => setLightboxPhoto(photo)}
                  className="w-full aspect-square overflow-hidden rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  aria-label={`查看施工前照片 ${photo.photo_number}`}
                >
                  <img
                    src={photo.file_url}
                    alt={`施工前 ${photo.photo_number}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* After Photos */}
        {afterPhotos.length > 0 && (
          <div>
            <h4 className="text-xs text-gray-500 mb-2">施工後</h4>
            <div className="grid grid-cols-2 gap-2">
              {afterPhotos.map((photo) => (
                <button
                  key={photo.id}
                  onClick={() => setLightboxPhoto(photo)}
                  className="w-full aspect-square overflow-hidden rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  aria-label={`查看施工後照片 ${photo.photo_number}`}
                >
                  <img
                    src={photo.file_url}
                    alt={`施工後 ${photo.photo_number}`}
                    className="w-full h-full object-cover"
                  />
                </button>
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
          {/* Close button */}
          <button
            onClick={() => setLightboxPhoto(null)}
            className="absolute top-4 right-4 p-2 text-white hover:bg-white/20 rounded-full transition-colors"
            aria-label="關閉"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Photo */}
          <div
            className="relative max-w-full max-h-full p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={lightboxPhoto.file_url}
              alt={`${lightboxPhoto.photo_type === 'before' ? '施工前' : '施工後'} ${lightboxPhoto.photo_number}`}
              className="max-w-full max-h-[80vh] object-contain rounded-lg"
            />

            {/* Photo info */}
            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
              <span className="text-white text-sm bg-black/50 px-3 py-1 rounded-full">
                {lightboxPhoto.photo_type === 'before' ? '施工前' : '施工後'} #{lightboxPhoto.photo_number}
              </span>

              {/* Delete button - admin only */}
              {canDelete && (
                <button
                  onClick={() => handleDelete(lightboxPhoto)}
                  disabled={isDeleting}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-full text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {isDeleting ? '刪除中...' : '刪除'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
