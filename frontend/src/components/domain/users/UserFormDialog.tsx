/**
 * User Form Dialog with Photo Upload & Location Picker
 * 
 * Features:
 * - Multi-tab form (Details, Access, Photo & Location)
 * - Image upload with camera capture
 * - Interactive location map picker
 * - Role assignment
 * - Dark mode support
 * - Responsive design
 * 
 * @package POSMID - Phase 1 Enhancement
 * @author Zencoder
 */

import React, { useState, useEffect } from 'react';
import { X, User as UserIcon, Shield, MapPin, Camera } from 'lucide-react';
import { userApi, type CreateUserPayload, type UpdateUserPayload } from '@/api/userApi';
import { roleApi } from '@/api/roleApi';
import type { User } from '@/types';
import { ImageUploadWithCamera } from '@/components/common/ImageUploadWithCamera';
import { LocationMapPicker, type LocationCoordinates } from '@/components/common/LocationMapPicker';

interface UserFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  tenantId: string;
  user?: User | null;
  onSuccess: () => void;
}

type TabType = 'details' | 'access' | 'location';

export const UserFormDialog: React.FC<UserFormDialogProps> = ({
  isOpen,
  onClose,
  tenantId,
  user,
  onSuccess,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('details');
  const [submitting, setSubmitting] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    display_name: '',
    phone_number: '',
    status: 'active' as User['status'],
    latitude: null as number | null,
    longitude: null as number | null,
    address: '',
  });

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<{ original: string; thumb: string } | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [availableRoles, setAvailableRoles] = useState<string[]>([]);

  // Load roles
  useEffect(() => {
    const loadRoles = async () => {
      if (!isOpen || !tenantId) return;
      try {
        const roles = await roleApi.getRoles(tenantId);
        setAvailableRoles(roles.map((r) => r.name));
      } catch (err) {
        console.error('Failed to load roles:', err);
      }
    };
    loadRoles();
  }, [isOpen, tenantId]);

  // Initialize form when user prop changes
  useEffect(() => {
    if (!isOpen) return;

    if (user) {
      // Edit mode
      setFormData({
        name: user.name || '',
        email: user.email || '',
        password: '',
        display_name: user.display_name || '',
        phone_number: user.phone_number || '',
        status: user.status || 'active',
        latitude: user.latitude || null,
        longitude: user.longitude || null,
        address: user.address || '',
      });
      setPhotoPreview(
        user.photo
          ? { original: user.photo, thumb: user.photo_thumb || user.photo }
          : null
      );
      setSelectedRoles(user.roles || []);
    } else {
      // Create mode
      setFormData({
        name: '',
        email: '',
        password: '',
        display_name: '',
        phone_number: '',
        status: 'active',
        latitude: null,
        longitude: null,
        address: '',
      });
      setPhotoPreview(null);
      setSelectedRoles([]);
    }
    setPhotoFile(null);
    setActiveTab('details');
  }, [isOpen, user]);

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handlePhotoChange = (file: File | null) => {
    setPhotoFile(file);
  };

  const handlePhotoDelete = async () => {
    if (!user) return;
    
    if (!confirm('Hapus foto profil? Tindakan ini tidak dapat dibatalkan.')) return;

    try {
      await userApi.deletePhoto(tenantId, user.id);
      setPhotoPreview(null);
      setPhotoFile(null);
      alert('Foto berhasil dihapus!');
    } catch (err) {
      console.error('Delete photo error:', err);
      alert('Gagal menghapus foto. Silakan coba lagi.');
    }
  };

  const handleLocationChange = (location: LocationCoordinates | null) => {
    if (location) {
      setFormData((prev) => ({
        ...prev,
        latitude: location.lat,
        longitude: location.lng,
        address: location.address || '',
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        latitude: null,
        longitude: null,
        address: '',
      }));
    }
  };

  const handleRoleToggle = (roleName: string) => {
    setSelectedRoles((prev) =>
      prev.includes(roleName)
        ? prev.filter((r) => r !== roleName)
        : [...prev, roleName]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      let savedUser: User;

      if (user) {
        // Update existing user
        const updatePayload: UpdateUserPayload = {
          name: formData.name,
          email: formData.email,
          display_name: formData.display_name || null,
          phone_number: formData.phone_number || null,
          status: formData.status,
          latitude: formData.latitude,
          longitude: formData.longitude,
          address: formData.address || null,
        };

        if (formData.password) {
          updatePayload.password = formData.password;
        }

        savedUser = await userApi.updateUser(tenantId, user.id, updatePayload);

        // Upload photo if file selected
        if (photoFile) {
          setUploadingPhoto(true);
          await userApi.uploadPhoto(tenantId, user.id, photoFile, setUploadProgress);
          setUploadingPhoto(false);
        }

        // Update roles
        await userApi.updateUserRoles(tenantId, user.id, selectedRoles);
      } else {
        // Create new user
        const createPayload: CreateUserPayload = {
          name: formData.name,
          email: formData.email,
          password: formData.password,
          display_name: formData.display_name || null,
          phone_number: formData.phone_number || null,
          status: formData.status,
        };

        savedUser = await userApi.createUser(tenantId, createPayload);

        // Upload photo if file selected
        if (photoFile) {
          setUploadingPhoto(true);
          await userApi.uploadPhoto(tenantId, savedUser.id, photoFile, setUploadProgress);
          setUploadingPhoto(false);
        }

        // Update location if provided
        if (formData.latitude && formData.longitude) {
          await userApi.updateUser(tenantId, savedUser.id, {
            latitude: formData.latitude,
            longitude: formData.longitude,
            address: formData.address || null,
          });
        }

        // Assign roles
        if (selectedRoles.length > 0) {
          await userApi.updateUserRoles(tenantId, savedUser.id, selectedRoles);
        }
      }

      onSuccess();
      onClose();
    } catch (err) {
      console.error('Save user error:', err);
      alert('Gagal menyimpan user. Silakan coba lagi.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-modal flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-4xl max-h-[90vh] m-4 bg-card rounded-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/30">
          <h2 className="text-xl font-bold text-foreground">
            {user ? 'Edit User' : 'Tambah User Baru'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border bg-muted/20 px-6">
          <button
            type="button"
            onClick={() => setActiveTab('details')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
              activeTab === 'details'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <UserIcon className="h-4 w-4" />
            Detail User
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('access')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
              activeTab === 'access'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Shield className="h-4 w-4" />
            Hak Akses
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('location')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
              activeTab === 'location'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Camera className="h-4 w-4" />
            <MapPin className="h-4 w-4" />
            Foto & Lokasi
          </button>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="px-6 py-6 space-y-6">
            {/* Details Tab */}
            {activeTab === 'details' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Nama Lengkap <span className="text-danger-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      required
                      className="input w-full"
                      placeholder="John Doe"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Nama Tampilan
                    </label>
                    <input
                      type="text"
                      value={formData.display_name}
                      onChange={(e) => handleInputChange('display_name', e.target.value)}
                      className="input w-full"
                      placeholder="Johnny"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Email <span className="text-danger-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      required
                      className="input w-full"
                      placeholder="john@example.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Nomor Telepon
                    </label>
                    <input
                      type="tel"
                      value={formData.phone_number}
                      onChange={(e) => handleInputChange('phone_number', e.target.value)}
                      className="input w-full"
                      placeholder="+62 812 3456 7890"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Password {!user && <span className="text-danger-500">*</span>}
                    </label>
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) => handleInputChange('password', e.target.value)}
                      required={!user}
                      className="input w-full"
                      placeholder={user ? 'Biarkan kosong jika tidak ingin mengubah' : 'Min. 8 karakter'}
                    />
                    {user && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Kosongkan jika tidak ingin mengubah password
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Status
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => handleInputChange('status', e.target.value)}
                      className="input w-full"
                    >
                      <option value="active">Aktif</option>
                      <option value="inactive">Tidak Aktif</option>
                      <option value="pending">Pending</option>
                      <option value="banned">Banned</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Access Tab */}
            {activeTab === 'access' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-3">
                    Pilih Role
                  </label>
                  {availableRoles.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Tidak ada role tersedia</p>
                  ) : (
                    <div className="space-y-2">
                      {availableRoles.map((role) => (
                        <label
                          key={role}
                          className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/20 hover:bg-muted/40 cursor-pointer transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={selectedRoles.includes(role)}
                            onChange={() => handleRoleToggle(role)}
                            className="h-4 w-4 text-primary border-border rounded focus:ring-2 focus:ring-primary"
                          />
                          <span className="text-sm font-medium text-foreground">{role}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Photo & Location Tab */}
            {activeTab === 'location' && (
              <div className="space-y-6">
                {/* Photo Upload Section */}
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                    <Camera className="h-5 w-5" />
                    Foto Profil
                  </h3>
                  <ImageUploadWithCamera
                    value={photoPreview}
                    onChange={handlePhotoChange}
                    onDelete={user ? handlePhotoDelete : undefined}
                    label="Upload Foto Profil"
                    helperText="Format: JPG, PNG, GIF, WEBP. Maksimal 5MB"
                    maxSize={5}
                  />
                  {uploadingPhoto && (
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-sm text-muted-foreground mb-1">
                        <span>Uploading...</span>
                        <span>{uploadProgress}%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Location Picker Section */}
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Lokasi Pengguna
                  </h3>
                  <LocationMapPicker
                    value={
                      formData.latitude && formData.longitude
                        ? {
                            lat: formData.latitude,
                            lng: formData.longitude,
                            address: formData.address || undefined,
                          }
                        : null
                    }
                    onChange={handleLocationChange}
                    height="350px"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border bg-muted/20">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="btn btn-secondary"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting || uploadingPhoto}
              className="btn btn-primary"
            >
              {submitting || uploadingPhoto ? 'Menyimpan...' : user ? 'Update User' : 'Tambah User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserFormDialog;