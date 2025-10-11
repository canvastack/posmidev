import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { type ColumnDef } from '@tanstack/react-table'
import { tenantsApi, type Tenant } from '@/api/tenantsApi'
import { DataTable } from '@/components/shared/data/DataTable'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Plus,
  Search,
  Edit,
  Trash2,
  MapPin,
  Building2,
  Loader2,
  ArrowUpDown
} from 'lucide-react'
import { toast } from 'sonner'

export default function TenantsPage() {
  const navigate = useNavigate()
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [perPage, setPerPage] = useState(10)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Create form state
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: '',
    status: 'active' as 'active' | 'inactive' | 'pending' | 'banned',
  })

  // Load tenants
  const loadTenants = async () => {
    try {
      setLoading(true)
      const response = await tenantsApi.list({
        page: currentPage,
        per_page: perPage,
      })
      setTenants(response.data)
      setTotalPages(response.last_page)
      setTotal(response.total)
    } catch (error) {
      console.error('Failed to load tenants:', error)
      toast.error('Gagal memuat data tenant')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTenants()
  }, [currentPage, perPage])

  // Handle search with Enter key
  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      setCurrentPage(1)
      loadTenants()
    }
  }

  // Handle create tenant
  const handleCreate = async () => {
    if (!formData.name.trim()) {
      toast.error('Nama tenant wajib diisi')
      return
    }

    try {
      setIsSubmitting(true)
      await tenantsApi.create(formData)
      toast.success('Tenant berhasil dibuat')
      setIsCreateDialogOpen(false)
      setFormData({ name: '', address: '', phone: '', status: 'active' })
      loadTenants()
    } catch (error) {
      console.error('Failed to create tenant:', error)
      toast.error('Gagal membuat tenant')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle delete
  const handleDelete = async (tenant: Tenant) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus tenant "${tenant.name}"?`)) {
      return
    }

    try {
      await tenantsApi.delete(tenant.id)
      toast.success('Tenant berhasil dihapus')
      loadTenants()
    } catch (error) {
      console.error('Failed to delete tenant:', error)
      toast.error('Gagal menghapus tenant')
    }
  }

  // Status badge variant
  const getStatusVariant = (status?: string) => {
    switch (status) {
      case 'active':
        return 'default'
      case 'inactive':
        return 'secondary'
      case 'pending':
        return 'outline'
      case 'banned':
        return 'destructive'
      default:
        return 'secondary'
    }
  }

  // Status label
  const getStatusLabel = (status?: string) => {
    switch (status) {
      case 'active':
        return 'Aktif'
      case 'inactive':
        return 'Tidak Aktif'
      case 'pending':
        return 'Menunggu'
      case 'banned':
        return 'Diblokir'
      default:
        return status || '-'
    }
  }

  // Table columns definition
  const columns = useMemo<ColumnDef<Tenant>[]>(
    () => [
      {
        accessorKey: 'logo_url',
        header: 'Logo',
        cell: ({ row }) => {
          const tenant = row.original
          return tenant.logo_url ? (
            <img
              src={tenant.logo_url}
              alt={tenant.name}
              className="w-10 h-10 rounded object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
              <Building2 className="w-5 h-5 text-muted-foreground" />
            </div>
          )
        },
        enableSorting: false,
      },
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
        cell: ({ row }) => (
          <div className="font-medium text-foreground">{row.original.name}</div>
        ),
      },
      {
        accessorKey: 'address',
        header: 'Alamat',
        cell: ({ row }) => (
          <div className="text-sm text-muted-foreground max-w-xs truncate">
            {row.original.address || '-'}
          </div>
        ),
      },
      {
        accessorKey: 'phone',
        header: 'Telepon',
        cell: ({ row }) => (
          <div className="text-sm text-muted-foreground">
            {row.original.phone || '-'}
          </div>
        ),
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
          <Badge variant={getStatusVariant(row.original.status)}>
            {getStatusLabel(row.original.status)}
          </Badge>
        ),
      },
      {
        accessorKey: 'location_address',
        header: 'Lokasi',
        cell: ({ row }) => {
          const tenant = row.original
          return tenant.has_location ? (
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="w-3 h-3" />
              <span className="max-w-xs truncate">
                {tenant.location_address || 'Lokasi tersedia'}
              </span>
            </div>
          ) : (
            <span className="text-sm text-muted-foreground">-</span>
          )
        },
      },
      {
        id: 'actions',
        header: () => <div className="text-right">Aksi</div>,
        cell: ({ row }) => {
          const tenant = row.original
          return (
            <div className="flex items-center justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(`/admin/tenants/${tenant.id}`)}
                title="Edit tenant"
              >
                <Edit className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(tenant)}
                title="Hapus tenant"
              >
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            </div>
          )
        },
        enableSorting: false,
      },
    ],
    [navigate]
  )

  // Filter tenants by search term
  const filteredTenants = useMemo(() => {
    if (!searchTerm.trim()) return tenants
    
    const search = searchTerm.toLowerCase()
    return tenants.filter(
      (tenant) =>
        tenant.name.toLowerCase().includes(search) ||
        tenant.address?.toLowerCase().includes(search) ||
        tenant.phone?.toLowerCase().includes(search)
    )
  }, [tenants, searchTerm])

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Manajemen Tenant</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Kelola data tenant dan pengaturannya
          </p>
        </div>
        <Button
          onClick={() => setIsCreateDialogOpen(true)}
          className="w-full md:w-auto"
        >
          <Plus className="w-4 h-4 mr-2" />
          Tambah Tenant
        </Button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Cari tenant..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Data Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12 bg-card border border-border rounded-lg">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground mt-2">Memuat data...</p>
          </div>
        </div>
      ) : filteredTenants.length === 0 ? (
        <div className="flex items-center justify-center py-12 bg-card border border-border rounded-lg">
          <div className="text-center">
            <Building2 className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              {searchTerm ? 'Tidak ada tenant yang ditemukan' : 'Belum ada tenant'}
            </p>
          </div>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={filteredTenants}
          pageCount={totalPages}
          manualPagination={false}
          state={{
            pageIndex: currentPage - 1,
            pageSize: perPage,
          }}
        />
      )}

      {/* Pagination Info */}
      {!loading && total > 0 && (
        <div className="text-sm text-muted-foreground">
          Menampilkan {Math.min((currentPage - 1) * perPage + 1, total)} - {Math.min(currentPage * perPage, total)} dari {total} tenant
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Tambah Tenant Baru</DialogTitle>
            <DialogDescription>
              Buat tenant baru. Anda dapat melengkapi logo dan lokasi setelah tenant dibuat.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">
                Nama Tenant <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Contoh: PT ABC Indonesia"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Alamat</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Contoh: Jl. Sudirman No. 123, Jakarta"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telepon</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="Contoh: 021-12345678"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                value={formData.status}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    status: e.target.value as typeof formData.status,
                  })
                }
                className="w-full h-10 px-3 rounded-md border border-border bg-background text-foreground"
              >
                <option value="active">Aktif</option>
                <option value="inactive">Tidak Aktif</option>
                <option value="pending">Menunggu</option>
                <option value="banned">Diblokir</option>
              </select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateDialogOpen(false)}
              disabled={isSubmitting}
            >
              Batal
            </Button>
            <Button onClick={handleCreate} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}