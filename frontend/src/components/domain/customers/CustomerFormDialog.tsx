/**
 * Customer Form Dialog with Photo Upload & Delivery Location Picker
 * 
 * Features:
 * - Multi-tab form (Basic Info, Photo, Delivery Address)
 * - Image upload with camera capture
 * - Interactive delivery location map picker
 * - Dark mode support
 * - Responsive design
 * 
 * @package POSMID - Day 10: Customer Frontend Enhancement
 * @author Zencoder
 */

import React, { useState, useEffect } from 'react';
import { X, User as UserIcon, Camera, MapPin } from 'lucide-react';
import { customersApi, type Customer, type CustomerRequest } from '@/api/customersApi';
import { ImageUploadWithCamera } from '@/components/common/ImageUploadWithCamera';
import { LocationMapPicker, type LocationCoordinates } from '@/components/common/LocationMapPicker';

interface CustomerFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  tenantId: string;
  customer?: Customer | null;
  onSuccess: () => void;
}

type TabType = 'basic' | 'photo' | 'delivery';

export const CustomerFormDialog: React.FC<CustomerFormDialogProps> = ({
  isOpen,
  onClose,
  tenantId,
  customer,
  onSuccess,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('basic');
  const [submitting, setSubmitting] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    tags: [] as string[],
    delivery_latitude: null as number | null,
    delivery_longitude: null as number | null,
    delivery_address: '',
  });

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<{ original: string; thumb: string } | null>(null);
  const [tagInput, setTagInput] = useState('');

  // Initialize form when customer prop changes
  useEffect(() => {
    if (!isOpen) return;

    if (customer) {
      // Edit mode
      setFormData({
        name: customer.name || '',
        email: customer.email || '',
        phone: customer.phone || '',
        tags: customer.tags || [],
        delivery_latitude: customer.delivery_latitude || null,
        delivery_longitude: customer.delivery_longitude || null,
        delivery_address: customer.delivery_address || '',
      });
      setPhotoPreview(
        customer.photo_url
          ? { original: customer.photo_url, thumb: customer.photo_thumb_url || customer.photo_url }
          : null
      );
    } else {
      // Create mode - reset form
      setFormData({
        name: '',
        email: '',
        phone: '',
        tags: [],
        delivery_latitude: null,
        delivery_longitude: null,
        delivery_address: '',
      });
      setPhotoPreview(null);
      setPhotoFile(null);
    }

    setActiveTab('basic');
    setError(null);
    setUploadProgress(0);
    setTagInput('');
  }, [isOpen, customer]);

  const handleInputChange = (field: keyof typeof formData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleLocationChange = (location: LocationCoordinates | null) => {
    if (location) {
      setFormData((prev) => ({
        ...prev,
        delivery_latitude: location.lat,
        delivery_longitude: location.lng,
        delivery_address: location.address || prev.delivery_address,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        delivery_latitude: null,
        delivery_longitude: null,
        delivery_address: '',
      }));
    }
  };

  const handleAddTag = () => {
    const trimmed = tagInput.trim();
    if (trimmed && !formData.tags.includes(trimmed)) {
      setFormData((prev) => ({ ...prev, tags: [...prev.tags, trimmed] }));
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setFormData((prev) => ({ ...prev, tags: prev.tags.filter((t) => t !== tag) }));
  };

  const handleImageSelect = (file: File | null) => {
    setPhotoFile(file);
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview({ original: reader.result as string, thumb: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDeletePhoto = async () => {
    if (!customer?.id) return;

    if (!confirm('Hapus foto customer ini?')) return;

    try {
      await customersApi.deletePhoto(tenantId, customer.id);
      setPhotoPreview(null);
      setPhotoFile(null);
      alert('Foto berhasil dihapus');
      onSuccess();
    } catch (err: any) {
      console.error('Error deleting photo:', err);
      alert(err?.response?.data?.message || 'Gagal menghapus foto');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.name.trim()) {
      setError('Nama customer wajib diisi');
      setActiveTab('basic');
      return;
    }

    setSubmitting(true);

    try {
      const payload: CustomerRequest = {
        name: formData.name,
        email: formData.email || null,
        phone: formData.phone || null,
        tags: formData.tags,
        delivery_latitude: formData.delivery_latitude,
        delivery_longitude: formData.delivery_longitude,
        delivery_address: formData.delivery_address || null,
      };

      let savedCustomer: Customer;

      if (customer) {
        // Update existing customer
        savedCustomer = await customersApi.update(tenantId, customer.id, payload);
      } else {
        // Create new customer
        savedCustomer = await customersApi.create(tenantId, payload);
      }

      // Upload photo if selected
      if (photoFile) {
        setUploadingPhoto(true);
        await customersApi.uploadPhoto(tenantId, savedCustomer.id, photoFile, setUploadProgress);
        setUploadingPhoto(false);
      }

      alert(customer ? 'Customer berhasil diupdate' : 'Customer berhasil ditambahkan');
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error saving customer:', err);
      setError(err?.response?.data?.message || 'Gagal menyimpan customer');
    } finally {
      setSubmitting(false);
      setUploadingPhoto(false);
    }
  };

  if (!isOpen) return null;

  const isEditMode = Boolean(customer);
  const currentLocation: LocationCoordinates | null =
    formData.delivery_latitude && formData.delivery_longitude
      ? {
          lat: formData.delivery_latitude,
          lng: formData.delivery_longitude,
          address: formData.delivery_address || undefined,
        }
      : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-card rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-xl font-semibold text-foreground">
            {isEditMode ? 'Edit Customer' : 'Tambah Customer Baru'}
          </h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
            type="button"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border bg-muted/30">
          <button
            type="button"
            onClick={() => setActiveTab('basic')}
            className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors relative ${
              activeTab === 'basic'
                ? 'text-primary-600 dark:text-primary-400'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <UserIcon className="h-4 w-4" />
            Informasi Dasar
            {activeTab === 'basic' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600 dark:bg-primary-400" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('photo')}
            className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors relative ${
              activeTab === 'photo'
                ? 'text-primary-600 dark:text-primary-400'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Camera className="h-4 w-4" />
            Foto
            {activeTab === 'photo' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600 dark:bg-primary-400" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('delivery')}
            className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors relative ${
              activeTab === 'delivery'
                ? 'text-primary-600 dark:text-primary-400'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <MapPin className="h-4 w-4" />
            Alamat Pengiriman
            {activeTab === 'delivery' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600 dark:bg-primary-400" />
            )}
          </button>
        </div>

        {/* Tab Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Error Message */}
            {error && (
              <div className="bg-danger-50 dark:bg-danger-900/20 text-danger-700 dark:text-danger-400 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* Tab 1: Basic Info */}
            {activeTab === 'basic' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Nama Customer <span className="text-danger-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      className="input w-full"
                      placeholder="Masukkan nama customer"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Email</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className="input w-full"
                      placeholder="email@example.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Nomor Telepon</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    className="input w-full"
                    placeholder="+62 812 3456 7890"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Tags</label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddTag();
                        }
                      }}
                      className="input flex-1"
                      placeholder="Tambah tag (tekan Enter)"
                    />
                    <button
                      type="button"
                      onClick={handleAddTag}
                      className="btn btn-secondary px-4"
                    >
                      Tambah
                    </button>
                  </div>
                  {formData.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {formData.tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-1 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 px-3 py-1 rounded-full text-sm"
                        >
                          {tag}
                          <button
                            type="button"
                            onClick={() => handleRemoveTag(tag)}
                            className="hover:text-danger-600 dark:hover:text-danger-400"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tab 2: Photo */}
            {activeTab === 'photo' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium text-foreground mb-4 flex items-center gap-2">
                    <Camera className="h-5 w-5" />
                    Foto Customer
                  </h3>

                  {photoPreview && (
                    <div className="mb-4">
                      <div className="relative inline-block">
                        <img
                          src={photoPreview.thumb}
                          alt="Preview"
                          className="w-32 h-32 object-cover rounded-lg border-2 border-border"
                        />
                        {isEditMode && (
                          <button
                            type="button"
                            onClick={handleDeletePhoto}
                            className="absolute -top-2 -right-2 bg-danger-500 hover:bg-danger-600 text-white rounded-full p-1.5 shadow-lg transition-colors"
                            title="Hapus foto"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        {isEditMode ? 'Foto saat ini' : 'Preview foto baru'}
                      </p>
                    </div>
                  )}

                  <ImageUploadWithCamera
                    onImageSelect={handleImageSelect}
                    currentImageUrl={photoPreview?.original || undefined}
                    label={photoPreview ? 'Ganti Foto' : 'Upload Foto'}
                  />

                  {uploadingPhoto && (
                    <div className="mt-4">
                      <div className="flex items-center justify-between text-sm text-muted-foreground mb-1">
                        <span>Mengupload foto...</span>
                        <span>{uploadProgress}%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <p className="text-xs text-muted-foreground mt-2">
                    Format yang didukung: JPG, PNG, GIF, WEBP (Maks. 5MB)
                  </p>
                </div>
              </div>
            )}

            {/* Tab 3: Delivery Address */}
            {activeTab === 'delivery' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium text-foreground mb-4 flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Alamat Pengiriman
                  </h3>

                  <LocationMapPicker
                    initialLocation={currentLocation}
                    onLocationChange={handleLocationChange}
                    label="Pilih Lokasi Pengiriman"
                    placeholder="Cari alamat pengiriman..."
                  />

                  {currentLocation && (
                    <div className="mt-4 p-4 bg-muted/50 dark:bg-muted/20 rounded-lg space-y-2">
                      <p className="text-sm font-medium text-foreground">📍 Lokasi Terpilih:</p>
                      <p className="text-sm text-muted-foreground">
                        Koordinat: {currentLocation.lat.toFixed(6)}, {currentLocation.lng.toFixed(6)}
                      </p>
                      {formData.delivery_address && (
                        <p className="text-sm text-muted-foreground">
                          Alamat: {formData.delivery_address}
                        </p>
                      )}
                    </div>
                  )}

                  <div className="mt-4">
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Alamat Lengkap (Opsional)
                    </label>
                    <textarea
                      value={formData.delivery_address}
                      onChange={(e) => handleInputChange('delivery_address', e.target.value)}
                      className="input w-full min-h-[80px]"
                      placeholder="Masukkan alamat lengkap untuk pengiriman..."
                      rows={3}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Alamat ini akan digunakan untuk pengiriman produk
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border bg-muted/30">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary px-6"
              disabled={submitting || uploadingPhoto}
            >
              Batal
            </button>
            <button
              type="submit"
              className="btn btn-primary px-6"
              disabled={submitting || uploadingPhoto}
            >
              {submitting || uploadingPhoto
                ? uploadingPhoto
                  ? 'Mengupload...'
                  : 'Menyimpan...'
                : isEditMode
                ? 'Update Customer'
                : 'Tambah Customer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};