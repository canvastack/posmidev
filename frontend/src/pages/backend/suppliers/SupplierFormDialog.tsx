/**
 * Supplier Form Dialog with Image Upload & Location Picker
 * 
 * IMMUTABLE RULES COMPLIANCE:
 * - Tenant-scoped operations
 * - Uses design tokens from index.css
 * - Fully supports dark/light mode
 * - Responsive design
 */

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import { ImageUploadWithCamera } from '@/components/common/ImageUploadWithCamera';
import { LocationMapPicker, LocationCoordinates } from '@/components/common/LocationMapPicker';
import { supplierApi, type Supplier, type SupplierForm } from '@/api/supplierApi';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BuildingStorefrontIcon, 
  PhotoIcon, 
  MapPinIcon 
} from '@heroicons/react/24/outline';

interface SupplierFormDialogProps {
  open: boolean;
  onClose: () => void;
  tenantId: string;
  supplier?: Supplier | null;
  onSuccess: () => void;
}

export function SupplierFormDialog({
  open,
  onClose,
  tenantId,
  supplier,
  onSuccess,
}: SupplierFormDialogProps) {
  const isEdit = !!supplier;

  // Form state
  const [form, setForm] = useState<SupplierForm>({
    name: '',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
    status: 'active',
    notes: '',
    latitude: null,
    longitude: null,
    location_address: null,
  });

  // Enhancement state
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);
  const [location, setLocation] = useState<LocationCoordinates | null>(null);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  // Initialize form when supplier changes
  useEffect(() => {
    if (supplier) {
      setForm({
        name: supplier.name,
        contact_person: supplier.contact_person || '',
        email: supplier.email || '',
        phone: supplier.phone || '',
        address: supplier.address || '',
        status: supplier.status,
        notes: supplier.notes || '',
        latitude: supplier.latitude,
        longitude: supplier.longitude,
        location_address: supplier.location_address,
      });

      // Set current image
      setCurrentImageUrl(supplier.image_url);

      // Set location if exists
      if (supplier.latitude && supplier.longitude) {
        setLocation({
          lat: supplier.latitude,
          lng: supplier.longitude,
          address: supplier.location_address || undefined,
        });
      }
    } else {
      // Reset for create mode
      setForm({
        name: '',
        contact_person: '',
        email: '',
        phone: '',
        address: '',
        status: 'active',
        notes: '',
        latitude: null,
        longitude: null,
        location_address: null,
      });
      setCurrentImageUrl(null);
      setImageFile(null);
      setLocation(null);
    }
    setErrors({});
  }, [supplier, open]);

  // Update form when location changes
  useEffect(() => {
    if (location) {
      setForm(prev => ({
        ...prev,
        latitude: location.lat,
        longitude: location.lng,
        location_address: location.address || null,
      }));
    } else {
      setForm(prev => ({
        ...prev,
        latitude: null,
        longitude: null,
        location_address: null,
      }));
    }
  }, [location]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!form.name?.trim()) {
      newErrors.name = 'Supplier name is required';
    }

    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = 'Invalid email address';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      setLoading(true);

      let savedSupplier: Supplier;

      if (isEdit && supplier) {
        // Update existing supplier
        savedSupplier = await supplierApi.updateSupplier(tenantId, supplier.id, form);
      } else {
        // Create new supplier
        savedSupplier = await supplierApi.createSupplier(tenantId, form);
      }

      // Upload image if selected
      if (imageFile) {
        await supplierApi.uploadImage(tenantId, savedSupplier.id, imageFile);
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Failed to save supplier:', error);
      if (error?.response?.data?.errors) {
        setErrors(error.response.data.errors);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteImage = async () => {
    if (!supplier) return;

    try {
      await supplierApi.deleteImage(tenantId, supplier.id);
      setCurrentImageUrl(null);
      onSuccess();
    } catch (error) {
      console.error('Failed to delete image:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Edit Supplier' : 'Add New Supplier'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic" className="flex items-center gap-2">
                <BuildingStorefrontIcon className="h-4 w-4" />
                Basic Info
              </TabsTrigger>
              <TabsTrigger value="image" className="flex items-center gap-2">
                <PhotoIcon className="h-4 w-4" />
                Image/Photo
              </TabsTrigger>
              <TabsTrigger value="location" className="flex items-center gap-2">
                <MapPinIcon className="h-4 w-4" />
                Location
              </TabsTrigger>
            </TabsList>

            {/* Basic Information Tab */}
            <TabsContent value="basic" className="space-y-4 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Supplier Name */}
                <div className="md:col-span-2">
                  <Label htmlFor="name">
                    Supplier Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g., ABC Supplies Co."
                    className={errors.name ? 'border-destructive' : ''}
                  />
                  {errors.name && (
                    <p className="text-sm text-destructive mt-1">{errors.name}</p>
                  )}
                </div>

                {/* Contact Person */}
                <div>
                  <Label htmlFor="contact_person">Contact Person</Label>
                  <Input
                    id="contact_person"
                    value={form.contact_person}
                    onChange={(e) => setForm({ ...form, contact_person: e.target.value })}
                    placeholder="e.g., John Doe"
                  />
                </div>

                {/* Status */}
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={form.status}
                    onValueChange={(value: 'active' | 'inactive') =>
                      setForm({ ...form, status: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Email */}
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="email@example.com"
                    className={errors.email ? 'border-destructive' : ''}
                  />
                  {errors.email && (
                    <p className="text-sm text-destructive mt-1">{errors.email}</p>
                  )}
                </div>

                {/* Phone */}
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="+62 812 3456 7890"
                  />
                </div>

                {/* Address */}
                <div className="md:col-span-2">
                  <Label htmlFor="address">Address</Label>
                  <Textarea
                    id="address"
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    placeholder="Street address, city, postal code"
                    rows={2}
                  />
                </div>

                {/* Notes */}
                <div className="md:col-span-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    placeholder="Internal notes..."
                    rows={3}
                  />
                </div>
              </div>
            </TabsContent>

            {/* Image/Photo Tab */}
            <TabsContent value="image" className="space-y-4 pt-4">
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium mb-2">Supplier Photo</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Upload a photo of the supplier's storefront or logo. You can use the camera on mobile devices.
                  </p>
                </div>

                <ImageUploadWithCamera
                  value={currentImageUrl}
                  onChange={setImageFile}
                  onDelete={isEdit ? handleDeleteImage : undefined}
                  maxSize={5}
                  label="Supplier Image"
                />

                {imageFile && (
                  <div className="p-3 bg-muted rounded-md">
                    <p className="text-sm text-muted-foreground">
                      ✓ New image selected: <strong>{imageFile.name}</strong> ({(imageFile.size / 1024).toFixed(2)} KB)
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Image will be uploaded when you save the supplier.
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Location Tab */}
            <TabsContent value="location" className="space-y-4 pt-4">
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium mb-2">Supplier Location</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Mark the supplier's location on the map. You can search, use current location, or enter coordinates manually.
                  </p>
                </div>

                <LocationMapPicker
                  value={location}
                  onChange={setLocation}
                  height="400px"
                  showSearch={true}
                  showManualInput={true}
                  showCurrentLocation={true}
                />

                {location && (
                  <div className="p-3 bg-muted rounded-md space-y-1">
                    <p className="text-sm font-medium">Selected Location:</p>
                    <p className="text-sm text-muted-foreground">
                      <strong>Coordinates:</strong> {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
                    </p>
                    {location.address && (
                      <p className="text-sm text-muted-foreground">
                        <strong>Address:</strong> {location.address}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : isEdit ? 'Update Supplier' : 'Create Supplier'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}