/**
 * Tenant Detail Page - Edit Tenant Profile + Manage Users
 * 
 * Day 6-7: Tenant Frontend (Image & Location Enhancement)
 * 
 * Features:
 * - Top section: Inline form to edit tenant (logo + location + basic info)
 * - Bottom section: List users per tenant + action buttons
 * - Dark mode support with design tokens
 * - Responsive design
 * 
 * @package POSMID - Image & Location Enhancement
 * @author Zencoder
 */

import { useEffect, useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { type ColumnDef } from '@tanstack/react-table'
import { Building, MapPin, Save, Upload, X, Users, PlusIcon, PencilIcon, TrashIcon, ArrowUpDown } from 'lucide-react'
import { tenantsApi, type Tenant } from '@/api/tenantsApi'
import { userApi, type Paginated } from '@/api/userApi'
import type { User } from '@/types'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { ImageUploadWithCamera } from '@/components/common/ImageUploadWithCamera'
import { LocationMapPicker, type LocationCoordinates } from '@/components/common/LocationMapPicker'
import { DataTable } from '@/components/shared/data/DataTable'
import { UserFormDialog } from '@/components/domain/users/UserFormDialog'
import { useAuth } from '@/hooks/useAuth'

export default function TenantDetailPage() {
  const { tenantId } = useParams<{ tenantId: string }>()
  const navigate = useNavigate()
  const { tenantId: currentTenantId } = useAuth()

  // Tenant data state
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Form state
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [phone, setPhone] = useState('')
  const [status, setStatus] = useState<'active' | 'inactive' | 'pending' | 'banned'>('active')
  
  // Logo state
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<{ original: string; thumb: string } | null>(null)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  // Location state
  const [location, setLocation] = useState<LocationCoordinates | null>(null)

  // Users list state
  const [users, setUsers] = useState<User[]>([])
  const [usersPage, setUsersPage] = useState(1)
  const [usersPerPage] = useState(10)
  const [usersTotal, setUsersTotal] = useState(0)
  const [usersLastPage, setUsersLastPage] = useState(1)
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // User dialog state
  const [userDialogOpen, setUserDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)

  // Fetch tenant data
  useEffect(() => {
    if (!tenantId) return
    fetchTenant()
  }, [tenantId])

  // Fetch users when page changes
  useEffect(() => {
    if (!tenantId) return
    fetchUsers(usersPage, searchQuery)
  }, [tenantId, usersPage])

  const fetchTenant = async () => {
    if (!tenantId) return
    try {
      setLoading(true)
      const data = await tenantsApi.get(tenantId)
      setTenant(data)
      
      // Populate form
      setName(data.name)
      setAddress(data.address || '')
      setPhone(data.phone || '')
      setStatus(data.status || 'active')
      
      // Set logo preview
      if (data.logo_url) {
        setLogoPreview({
          original: data.logo_url,
          thumb: data.logo_thumb_url || data.logo_url,
        })
      }

      // Set location
      if (data.latitude && data.longitude) {
        setLocation({
          lat: data.latitude,
          lng: data.longitude,
          address: data.location_address || '',
        })
      }
    } catch (error) {
      console.error('Failed to load tenant:', error)
      alert('Gagal memuat data tenant')
    } finally {
      setLoading(false)
    }
  }

  const fetchUsers = async (page: number, search: string = '') => {
    if (!tenantId) return
    try {
      setLoadingUsers(true)
      const data = await userApi.getUsers(tenantId, {
        page,
        per_page: usersPerPage,
        q: search,
      })
      setUsers(data.data)
      setUsersTotal(data.total)
      setUsersLastPage(data.last_page)
    } catch (error) {
      console.error('Failed to load users:', error)
    } finally {
      setLoadingUsers(false)
    }
  }

  const handleSave = async () => {
    if (!tenantId) return
    if (!name.trim()) {
      alert('Nama tenant wajib diisi')
      return
    }

    try {
      setSaving(true)

      // Upload logo if changed
      if (logoFile) {
        setUploadingLogo(true)
        await tenantsApi.uploadLogo(tenantId, logoFile, (progress) => {
          setUploadProgress(progress)
        })
        setUploadingLogo(false)
        setLogoFile(null)
      }

      // Update tenant basic info + location
      await tenantsApi.update(tenantId, {
        name,
        address: address || undefined,
        phone: phone || undefined,
        status,
        latitude: location?.lat || null,
        longitude: location?.lng || null,
        location_address: location?.address || null,
      })

      alert('Data tenant berhasil disimpan')
      await fetchTenant() // Refresh
    } catch (error: any) {
      console.error('Failed to save tenant:', error)
      alert(error.response?.data?.message || 'Gagal menyimpan data tenant')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteLogo = async () => {
    if (!tenantId) return
    if (!confirm('Hapus logo tenant?')) return

    try {
      await tenantsApi.deleteLogo(tenantId)
      setLogoPreview(null)
      alert('Logo berhasil dihapus')
      await fetchTenant()
    } catch (error: any) {
      console.error('Failed to delete logo:', error)
      alert(error.response?.data?.message || 'Gagal menghapus logo')
    }
  }

  const handleImageSelect = (file: File | null) => {
    setLogoFile(file)
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        if (e.target?.result) {
          setLogoPreview({
            original: e.target.result as string,
            thumb: e.target.result as string,
          })
        }
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSearchUsers = () => {
    setUsersPage(1)
    fetchUsers(1, searchQuery)
  }

  const openCreateUserDialog = () => {
    setEditingUser(null)
    setUserDialogOpen(true)
  }

  const openEditUserDialog = (user: User) => {
    setEditingUser(user)
    setUserDialogOpen(true)
  }

  const handleUserDialogSuccess = async () => {
    await fetchUsers(usersPage, searchQuery)
  }

  const handleDeleteUser = async (user: User) => {
    if (!tenantId) return
    if (!confirm(`Hapus user ${user.name}?`)) return

    try {
      await userApi.deleteUser(tenantId, user.id)
      alert('User berhasil dihapus')
      await fetchUsers(usersPage, searchQuery)
    } catch (error: any) {
      console.error('Failed to delete user:', error)
      alert(error.response?.data?.message || 'Gagal menghapus user')
    }
  }

  // Users table columns
  const userColumns = useMemo<ColumnDef<User>[]>(
    () => [
      {
        accessorKey: 'name',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="-ml-4 h-8"
          >
            Nama
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => <div className="font-medium text-foreground">{row.original.name}</div>,
      },
      {
        accessorKey: 'email',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="-ml-4 h-8"
          >
            Email
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => <div className="text-muted-foreground">{row.original.email}</div>,
      },
      {
        accessorKey: 'status',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="-ml-4 h-8"
          >
            Status
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <span
            className={`px-2 py-1 rounded text-xs font-medium ${
              row.original.status === 'active'
                ? 'bg-success-100 text-success-700 dark:bg-success-900 dark:text-success-300'
                : 'bg-danger-100 text-danger-700 dark:bg-danger-900 dark:text-danger-300'
            }`}
          >
            {row.original.status}
          </span>
        ),
      },
      {
        id: 'actions',
        header: () => <div className="text-right">Aksi</div>,
        cell: ({ row }) => {
          const user = row.original
          return (
            <div className="flex items-center justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => openEditUserDialog(user)} title="Edit user">
                <PencilIcon className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDeleteUser(user)}
                className="text-danger-600 hover:text-danger-700 hover:bg-danger-50 dark:hover:bg-danger-900"
                title="Hapus user"
              >
                <TrashIcon className="h-4 w-4" />
              </Button>
            </div>
          )
        },
        enableSorting: false,
      },
    ],
    []
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Memuat data tenant...</p>
        </div>
      </div>
    )
  }

  if (!tenant) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Building className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Tenant tidak ditemukan</p>
          <Button variant="outline" onClick={() => navigate('/admin/users')} className="mt-4">
            Kembali
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Edit Tenant</h1>
          <p className="text-muted-foreground mt-1">
            Kelola informasi tenant, logo, lokasi, dan daftar user
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate('/admin/users')}>
          Kembali
        </Button>
      </div>

      {/* Tenant Edit Form */}
      <Card className="bg-card border-border">
        <div className="p-6">
          <h2 className="text-xl font-semibold text-foreground mb-6 flex items-center gap-2">
            <Building className="h-5 w-5" />
            Informasi Tenant
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column: Basic Info */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="name" className="text-foreground">
                  Nama Tenant <span className="text-danger-500">*</span>
                </Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nama tenant"
                  className="bg-background text-foreground border-border"
                />
              </div>

              <div>
                <Label htmlFor="address" className="text-foreground">
                  Alamat
                </Label>
                <Input
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Alamat lengkap"
                  className="bg-background text-foreground border-border"
                />
              </div>

              <div>
                <Label htmlFor="phone" className="text-foreground">
                  Telepon
                </Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Nomor telepon"
                  className="bg-background text-foreground border-border"
                />
              </div>

              <div>
                <Label htmlFor="status" className="text-foreground">
                  Status
                </Label>
                <select
                  id="status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="pending">Pending</option>
                  <option value="banned">Banned</option>
                </select>
              </div>
            </div>

            {/* Right Column: Logo Upload */}
            <div className="space-y-4">
              <div>
                <Label className="text-foreground mb-2 block">Logo Tenant</Label>
                <ImageUploadWithCamera
                  value={logoPreview}
                  onChange={handleImageSelect}
                  onDelete={tenant.has_logo ? handleDeleteLogo : undefined}
                  maxSize={5}
                  label="Upload Logo"
                  helperText="Format: JPG, PNG, GIF, WEBP. Maksimal 5MB"
                />
                {uploadingLogo && (
                  <div className="mt-2">
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Uploading... {uploadProgress}%
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Location Picker - Full Width */}
          <div className="mt-6">
            <Label className="text-foreground mb-2 block flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Lokasi Bisnis
            </Label>
            <LocationMapPicker
              value={location}
              onChange={setLocation}
              height="400px"
              showSearch
              showCurrentLocation
              showManualInput
            />
            <p className="text-sm text-muted-foreground mt-2">
              Tetapkan lokasi bisnis utama untuk multi-cabang, perhitungan zona pengiriman, dan analisis.
            </p>
          </div>

          {/* Save Button */}
          <div className="mt-6 flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={fetchTenant}
              disabled={saving}
            >
              Reset
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !name.trim()}
              className="bg-primary-600 hover:bg-primary-700 text-white"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Menyimpan...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Simpan Perubahan
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>

      {/* Users List */}
      <Card className="bg-card border-border">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
              <Users className="h-5 w-5" />
              Daftar User ({usersTotal})
            </h2>
            <Button
              onClick={openCreateUserDialog}
              className="bg-primary-600 hover:bg-primary-700 text-white"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Tambah User
            </Button>
          </div>

          {/* Search */}
          <div className="flex gap-2 mb-4">
            <Input
              placeholder="Cari user (nama, email)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearchUsers()}
              className="bg-background text-foreground border-border"
            />
            <Button onClick={handleSearchUsers} variant="outline">
              Cari
            </Button>
          </div>

          {/* Users Table */}
          {loadingUsers ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Memuat data user...</p>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Belum ada user</p>
            </div>
          ) : (
            <DataTable
              columns={userColumns}
              data={users}
              pageCount={usersLastPage}
              manualPagination={false}
              state={{
                pageIndex: usersPage - 1,
                pageSize: usersPerPage,
              }}
            />
          )}
        </div>
      </Card>

      {/* User Dialog */}
      {tenantId && (
        <UserFormDialog
          isOpen={userDialogOpen}
          user={editingUser}
          tenantId={tenantId}
          onClose={() => setUserDialogOpen(false)}
          onSuccess={handleUserDialogSuccess}
        />
      )}
    </div>
  )
}