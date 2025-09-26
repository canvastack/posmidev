import { Fragment, useEffect, useRef, useState } from 'react';
import { Card, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/Table';
import { Modal } from '../ui/Modal';
import { PlusIcon, PencilIcon, TrashIcon, ChevronDownIcon, ChevronRightIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { tenantApi, type Tenant } from '../../api/tenantApi';
import { userApi, type Paginated, type CreateUserPayload, type UpdateUserPayload } from '../../api/userApi';
import { roleApi } from '../../api/roleApi';
import type { User } from '../../types';
import { useAuth } from '../../hooks/useAuth';

interface TenantRowState {
  expanded: boolean;
  usersPage: number;
  usersPerPage: number;
  search: string;
  usersData?: Paginated<User>;
  loadingUsers: boolean;
}

export const UsersByTenant: React.FC = () => {
  const { tenantId: currentTenantId } = useAuth();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [tenantPages, setTenantPages] = useState({ page: 1, perPage: 10, total: 0, lastPage: 1 });
  const [loadingTenants, setLoadingTenants] = useState(true);
  const [rowsState, setRowsState] = useState<Record<string, TenantRowState>>({});

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [activeTenantId, setActiveTenantId] = useState<string | null>(null);
  type FormState = Partial<CreateUserPayload & UpdateUserPayload> & { photo_thumb?: string | null };
  const [form, setForm] = useState<FormState>({
    name: '',
    email: '',
    password: '',
    display_name: '',
    status: 'pending',
    photo: '',
    photo_thumb: '',
    phone_number: '',
  });
  const [submitting, setSubmitting] = useState(false);

  // Modal tabs and image cropping state
  const [activeTab, setActiveTab] = useState<'details' | 'access'>('details');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const imageRef = useRef<HTMLImageElement | null>(null);
  const cropRef = useRef<{ x: number; y: number; size: number } | null>(null);

  useEffect(() => {
    fetchTenants({ page: 1, perPage: tenantPages.perPage });
  }, [tenantPages.perPage]);

  const fetchTenants = async ({ page, perPage }: { page: number; perPage: number }) => {
    try {
      setLoadingTenants(true);
      const data = await tenantApi.getTenants({ page, per_page: perPage });
      setTenants(data.data);
      setTenantPages({ page: data.current_page, perPage: data.per_page, total: data.total, lastPage: data.last_page });
    } catch (e) {
      console.error('Failed to load tenants', e);
    } finally {
      setLoadingTenants(false);
    }
  };

  const ensureRowState = (tenantId: string): TenantRowState => {
    return rowsState[tenantId] || { expanded: false, usersPage: 1, usersPerPage: 10, search: '', loadingUsers: false } as TenantRowState;
  };

  const toggleExpand = async (tenant: Tenant) => {
    const cur = ensureRowState(tenant.id);
    const next = { ...cur, expanded: !cur.expanded };
    setRowsState(prev => ({ ...prev, [tenant.id]: next }));
    if (!cur.expanded) {
      await fetchUsers(tenant.id, { page: cur.usersPage, perPage: cur.usersPerPage, q: cur.search });
    }
  };

  const fetchUsers = async (tenantId: string, { page, perPage, q }: { page: number; perPage: number; q?: string }) => {
    try {
      setRowsState(prev => ({ ...prev, [tenantId]: { ...ensureRowState(tenantId), loadingUsers: true } }));
      const data = await userApi.getUsers(tenantId, { page, per_page: perPage, q });
      setRowsState(prev => ({ ...prev, [tenantId]: { ...ensureRowState(tenantId), expanded: true, loadingUsers: false, usersData: data, usersPage: data.current_page, usersPerPage: data.per_page } }));
    } catch (e) {
      console.error('Failed to load users', e);
      setRowsState(prev => ({ ...prev, [tenantId]: { ...ensureRowState(tenantId), loadingUsers: false } }));
    }
  };

  const openCreateModal = (tenantId: string) => {
    setEditingUser(null);
    setActiveTenantId(tenantId);
    setForm({ name: '', email: '', password: '', display_name: '', status: 'pending', photo: '', photo_thumb: '', phone_number: '' });
    setSelectedFile(null);
    setUploadProgress(0);
    setUploading(false);
    setActiveTab('details');
    setModalOpen(true);
  };

  const openEditModal = (tenantId: string, user: User) => {
    setEditingUser(user);
    setActiveTenantId(tenantId);
    setForm({ name: user.name, email: user.email, display_name: user.display_name ?? '', status: user.status, photo: user.photo ?? '', photo_thumb: user.photo_thumb ?? '', phone_number: user.phone_number ?? '' });
    setSelectedFile(null);
    setUploadProgress(0);
    setUploading(false);
    setActiveTab('details');
    setModalOpen(true);
  };

  const handleDelete = async (tenantId: string, user: User) => {
    if (!confirm(`Delete user ${user.name}?`)) return;
    try {
      await userApi.deleteUser(tenantId, user.id);
      await fetchUsers(tenantId, { page: ensureRowState(tenantId).usersPage, perPage: ensureRowState(tenantId).usersPerPage, q: ensureRowState(tenantId).search });
    } catch (e) {
      console.error('Delete failed', e);
      alert('Failed to delete user');
    }
  };

  const [availableRoles, setAvailableRoles] = useState<string[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);

  // Load roles for Access tab when opening modal in edit mode
  useEffect(() => {
    const loadRoles = async () => {
      if (!modalOpen || !activeTenantId) return;
      try {
        const roles = await roleApi.getRoles(activeTenantId);
        setAvailableRoles(roles.map(r => r.name));
        if (editingUser?.roles) setSelectedRoles(editingUser.roles);
      } catch (e) {
        console.warn('Failed to load roles', e);
      }
    };
    loadRoles();
  }, [modalOpen, activeTenantId, editingUser?.id, editingUser?.roles]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTenantId) return;
    setSubmitting(true);
    try {
      if (editingUser) {
        await userApi.updateUser(activeTenantId, editingUser.id, {
          name: form.name,
          email: form.email,
          password: form.password || undefined,
          display_name: form.display_name,
          status: form.status,
          photo: form.photo,
          phone_number: form.phone_number,
        });
        // Sync roles if Access tab used
        if (selectedRoles && selectedRoles.length >= 0) {
          await userApi.updateUserRoles(activeTenantId, editingUser.id, selectedRoles);
        }
      } else {
        const newUser = await userApi.createUser(activeTenantId, {
          name: form.name || '',
          email: form.email || '',
          password: form.password || '',
          display_name: form.display_name || '',
          status: form.status,
          photo: form.photo,
          phone_number: form.phone_number,
        });
        // If roles selected pre-save, try to assign (optional)
        if ((selectedRoles?.length || 0) > 0) {
          await userApi.updateUserRoles(activeTenantId, newUser.id, selectedRoles);
        }
      }
      setModalOpen(false);
      await fetchUsers(activeTenantId, { page: ensureRowState(activeTenantId).usersPage, perPage: ensureRowState(activeTenantId).usersPerPage, q: ensureRowState(activeTenantId).search });
    } catch (e) {
      console.error('Save failed', e);
      alert('Failed to save user');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users</h1>
          <p className="mt-1 text-sm text-gray-500">Manage users per tenant with expandable rows</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>&nbsp;</TableHead>
                <TableHead>Tenant</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingTenants ? (
                <TableRow><TableCell className="py-8">Loading tenants...</TableCell></TableRow>
              ) : tenants.length === 0 ? (
                <TableRow><TableCell className="py-8">No tenants found</TableCell></TableRow>
              ) : (
                tenants.map((tenant) => {
                  const state = ensureRowState(tenant.id);
                  return (
                    <Fragment key={tenant.id}>
                      <TableRow>
                        <TableCell className="w-10">
                          <button onClick={() => toggleExpand(tenant)} className="text-gray-600 hover:text-gray-900">
                            {state.expanded ? <ChevronDownIcon className="h-5 w-5" /> : <ChevronRightIcon className="h-5 w-5" />}
                          </button>
                        </TableCell>
                        <TableCell className="font-medium">{tenant.name}</TableCell>
                        <TableCell>
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-primary-100 text-primary-800">
                            {tenant.status ?? 'pending'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Button size="sm" onClick={() => openCreateModal(tenant.id)} disabled={currentTenantId ? currentTenantId !== tenant.id : false}>
                            <PlusIcon className="h-4 w-4 mr-2" /> Add User
                          </Button>
                        </TableCell>
                      </TableRow>

                      {state.expanded && (
                        <tr>
                          <td colSpan={4} className="bg-gray-50">
                            <div className="p-4 space-y-3">
                              <div className="flex items-center justify-between">
                                <div className="relative">
                                  <MagnifyingGlassIcon className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                  <input
                                    type="text"
                                    className="pl-9 pr-3 py-2 border rounded-md text-sm w-64"
                                    placeholder="Search users..."
                                    value={state.search}
                                    onChange={(e) => setRowsState(prev => ({ ...prev, [tenant.id]: { ...ensureRowState(tenant.id), search: e.target.value } }))}
                                    onKeyDown={(e) => { if (e.key === 'Enter') fetchUsers(tenant.id, { page: 1, perPage: state.usersPerPage, q: state.search }); }}
                                  />
                                </div>
                                <div className="text-sm text-gray-600">Page {state.usersData?.current_page || 1} of {state.usersData?.last_page || 1} — {state.usersData?.total || 0} users</div>
                              </div>

                              <div>
                                <Table className="min-w-full">
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>Photo</TableHead>
                                      <TableHead>Name</TableHead>
                                      <TableHead>Email</TableHead>
                                      <TableHead>Phone</TableHead>
                                      <TableHead>Status</TableHead>
                                      <TableHead>Roles</TableHead>
                                      <TableHead>Actions</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {state.loadingUsers ? (
                                      <TableRow><TableCell className="py-8" colSpan={7}>Loading users...</TableCell></TableRow>
                                    ) : !state.usersData || state.usersData.data.length === 0 ? (
                                      <TableRow><TableCell className="py-8" colSpan={7}>No users</TableCell></TableRow>
                                    ) : (
                                      state.usersData.data.map((u) => (
                                        <TableRow key={u.id}>
                                          <TableCell>
                                            {u.photo ? (
                                              <img
                                                src={u.photo_thumb || u.photo}
                                                onError={(e) => { (e.currentTarget as HTMLImageElement).src = u.photo || ''; }}
                                                alt={u.name}
                                                className="h-8 w-8 rounded-full object-cover"
                                              />
                                            ) : (
                                              <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-xs text-gray-600">
                                                {u.name?.slice(0,2)?.toUpperCase()}
                                              </div>
                                            )}
                                          </TableCell>
                                          <TableCell className="font-medium">{u.display_name || u.name}</TableCell>
                                          <TableCell>{u.email}</TableCell>
                                          <TableCell>{u.phone_number || '-'}</TableCell>
                                          <TableCell>
                                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-primary-100 text-primary-800">
                                              {u.status ?? 'pending'}
                                            </span>
                                          </TableCell>
                                          <TableCell>
                                            <div className="flex flex-wrap gap-1">
                                              {u.roles?.slice(0, 3).map((r) => (
                                                <span key={r} className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                                                  {r}
                                                </span>
                                              ))}
                                              {u.roles && u.roles.length > 3 && (
                                                <span className="text-xs text-gray-500">+{u.roles.length - 3} more</span>
                                              )}
                                            </div>
                                          </TableCell>
                                          <TableCell>
                                            <div className="flex space-x-2">
                                              <Button variant="ghost" size="sm" onClick={() => openEditModal(tenant.id, u)}>
                                                <PencilIcon className="h-4 w-4" />
                                              </Button>
                                              <Button variant="ghost" size="sm" onClick={() => handleDelete(tenant.id, u)}>
                                                <TrashIcon className="h-4 w-4" />
                                              </Button>
                                            </div>
                                          </TableCell>
                                        </TableRow>
                                      ))
                                    )}
                                  </TableBody>
                                </Table>
                              </div>

                              <div className="flex items-center justify-between">
                                <div className="space-x-2">
                                  <Button
                                    variant="secondary"
                                    size="sm"
                                    disabled={(state.usersData?.current_page || 1) <= 1}
                                    onClick={() => fetchUsers(tenant.id, { page: (state.usersData?.current_page || 1) - 1, perPage: state.usersPerPage, q: state.search })}
                                  >Prev</Button>
                                  <Button
                                    variant="secondary"
                                    size="sm"
                                    disabled={(state.usersData?.current_page || 1) >= (state.usersData?.last_page || 1)}
                                    onClick={() => fetchUsers(tenant.id, { page: (state.usersData?.current_page || 1) + 1, perPage: state.usersPerPage, q: state.search })}
                                  >Next</Button>
                                </div>
                                <div>
                                  <select
                                    className="border rounded-md text-sm p-1"
                                    value={state.usersPerPage}
                                    onChange={(e) => fetchUsers(tenant.id, { page: 1, perPage: parseInt(e.target.value, 10), q: state.search })}
                                  >
                                    {[10, 20, 50].map(n => <option key={n} value={n}>{n} / page</option>)}
                                  </select>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })
              )}
            </TableBody>
          </Table>

          {/* Tenant pagination */}
          <div className="flex items-center justify-between p-4">
            <div className="text-sm text-gray-600">Page {tenantPages.page} of {tenantPages.lastPage} — {tenantPages.total} tenants</div>
            <div className="space-x-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={tenantPages.page <= 1}
                onClick={() => fetchTenants({ page: tenantPages.page - 1, perPage: tenantPages.perPage })}
              >Prev</Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={tenantPages.page >= tenantPages.lastPage}
                onClick={() => fetchTenants({ page: tenantPages.page + 1, perPage: tenantPages.perPage })}
              >Next</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Create / Edit User Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingUser ? 'Edit User' : 'Add User'} size="lg">
        {/* Tabs */}
        <div className="mb-3 border-b border-gray-200">
          <nav className="-mb-px flex space-x-6" aria-label="Tabs">
            <button type="button" onClick={() => setActiveTab('details')} className={`whitespace-nowrap py-2 px-1 border-b-2 text-sm font-medium ${activeTab==='details' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>Details</button>
            <button type="button" onClick={() => setActiveTab('access')} className={`whitespace-nowrap py-2 px-1 border-b-2 text-sm font-medium ${activeTab==='access' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>Access</button>
          </nav>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {activeTab === 'details' && (
            <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Name" name="name" value={form.name || ''} onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))} required />
              <Input label="Email" name="email" type="email" value={form.email || ''} onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))} required />
              {!editingUser && (
                <Input label="Password" name="password" type="password" value={form.password || ''} onChange={(e) => setForm(prev => ({ ...prev, password: e.target.value }))} required />
              )}
              {editingUser && (
                <Input label="Password (optional)" name="password" type="password" value={form.password || ''} onChange={(e) => setForm(prev => ({ ...prev, password: e.target.value }))} />
              )}
              <Input label="Display Name" name="display_name" value={form.display_name || ''} onChange={(e) => setForm(prev => ({ ...prev, display_name: e.target.value }))} />
              <Input label="Phone Number" name="phone_number" value={form.phone_number || ''} onChange={(e) => setForm(prev => ({ ...prev, phone_number: e.target.value }))} />
              <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Photo</label>
              <div className="flex items-center gap-3">
                {form.photo ? (
                  <img src={form.photo_thumb || form.photo} onError={(e) => { (e.currentTarget as HTMLImageElement).src = form.photo || ''; }} className="h-10 w-10 rounded-full object-cover" />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-gray-200" />
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setSelectedFile(file);
                    setActiveTab('details');
                  }}
                  className="text-sm"
                />
                {uploading && (
                  <div className="text-xs text-gray-600">{uploadProgress}%</div>
                )}
              </div>
              {/* Simple square cropper */}
              {selectedFile && (
                <div className="mt-3 space-y-2">
                  <div className="text-xs text-gray-600">Crop avatar (1:1)</div>
                  <div className="relative w-64 h-64 bg-gray-50 border overflow-hidden">
                    <img
                      ref={imageRef}
                      src={URL.createObjectURL(selectedFile)}
                      className="max-w-none select-none"
                      onLoad={(e) => {
                        const img = e.currentTarget;
                        // Initialize a centered crop square
                        const size = Math.min(img.naturalWidth, img.naturalHeight);
                        const x = Math.max(0, (img.naturalWidth - size) / 2);
                        const y = Math.max(0, (img.naturalHeight - size) / 2);
                        cropRef.current = { x, y, size };
                      }}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        setSelectedFile(null);
                      }}
                    >Cancel</Button>
                    <Button
                      type="button"
                      onClick={async () => {
                        if (!activeTenantId || !selectedFile) return;
                        try {
                          // Perform simple center-crop to square using Canvas
                          const img = document.createElement('img');
                          img.src = URL.createObjectURL(selectedFile);
                          await new Promise((res) => { img.onload = () => res(null); });
                          const side = Math.min(img.naturalWidth, img.naturalHeight);
                          const sx = Math.max(0, (img.naturalWidth - side) / 2);
                          const sy = Math.max(0, (img.naturalHeight - side) / 2);
                          const canvas = document.createElement('canvas');
                          canvas.width = side;
                          canvas.height = side;
                          const ctx = canvas.getContext('2d');
                          if (!ctx) throw new Error('no ctx');
                          ctx.drawImage(img, sx, sy, side, side, 0, 0, side, side);
                          const blob: Blob = await new Promise((resolve) => canvas.toBlob((b) => resolve(b as Blob), 'image/jpeg', 0.92));

                          // Upload cropped blob
                          setUploadProgress(0);
                          setUploading(true);
                          const fileForUpload = new File([blob], selectedFile.name, { type: blob.type });
                          const { url, thumb_url } = await userApi.uploadUserPhoto(activeTenantId, fileForUpload, (p) => setUploadProgress(p));
                          setForm(prev => ({ ...prev, photo: url, ...(thumb_url ? { photo_thumb: thumb_url } : {}) }));
                          setSelectedFile(null);
                        } catch (err) {
                          console.error('Upload failed', err);
                          alert('Failed to upload photo');
                        } finally {
                          setUploading(false);
                        }
                      }}
                    >Crop & Upload</Button>
                    {uploading && <div className="text-xs text-gray-600 self-center">{uploadProgress}%</div>}
                  </div>
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select className="w-full border rounded-md p-2 text-sm" value={form.status || 'pending'} onChange={(e) => setForm(prev => ({ ...prev, status: e.target.value as User['status'] }))}>
                <option value="active">active</option>
                <option value="inactive">inactive</option>
                <option value="pending">pending</option>
                <option value="banned">banned</option>
              </select>
            </div>
          </div>

          <div className="flex space-x-3">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" className="flex-1" loading={submitting}>{editingUser ? 'Update' : 'Create'} User</Button>
          </div>
          </>
          )}

          {activeTab === 'access' && (
            <div className="space-y-3">
              {!editingUser && (
                <div className="text-sm text-gray-500">Save the user first, then assign roles.</div>
              )}
              {editingUser && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Roles</label>
                  <div className="flex flex-wrap gap-2">
                    {availableRoles.map((r) => {
                      const active = selectedRoles.includes(r);
                      return (
                        <button
                          key={r}
                          type="button"
                          className={`px-2 py-1 text-xs rounded-full border ${active ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-700 border-gray-300'}`}
                          onClick={() => {
                            setSelectedRoles((prev) => prev.includes(r) ? prev.filter(x => x !== r) : [...prev, r]);
                          }}
                        >{r}</button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Footer actions */}
          <div className="flex space-x-3">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" className="flex-1" loading={submitting}>{editingUser ? 'Update' : 'Create'} User</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}