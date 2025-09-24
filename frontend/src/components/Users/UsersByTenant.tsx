import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/Table';
import { Modal } from '../ui/Modal';
import { PlusIcon, PencilIcon, TrashIcon, ChevronDownIcon, ChevronRightIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { tenantApi, type Tenant } from '../../api/tenantApi';
import { userApi, type Paginated, type CreateUserPayload, type UpdateUserPayload } from '../../api/userApi';
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
  const [form, setForm] = useState<Partial<CreateUserPayload & UpdateUserPayload>>({
    name: '',
    email: '',
    password: '',
    display_name: '',
    status: 'pending',
    photo: '',
    phone_number: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchTenants({ page: 1, perPage: tenantPages.perPage });
  }, []);

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
    setForm({ name: '', email: '', password: '', display_name: '', status: 'pending', photo: '', phone_number: '' });
    setModalOpen(true);
  };

  const openEditModal = (tenantId: string, user: User) => {
    setEditingUser(user);
    setActiveTenantId(tenantId);
    setForm({ name: user.name, email: user.email, display_name: user.display_name ?? '', status: user.status, photo: user.photo ?? '', phone_number: user.phone_number ?? '' });
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
      } else {
        await userApi.createUser(activeTenantId, {
          name: form.name || '',
          email: form.email || '',
          password: form.password || '',
          display_name: form.display_name || '',
          status: form.status,
          photo: form.photo,
          phone_number: form.phone_number,
        });
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
                <TableHead></TableHead>
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
                    <React.Fragment key={tenant.id}>
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
                                              <img src={u.photo} alt={u.name} className="h-8 w-8 rounded-full object-cover" />
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
                    </React.Fragment>
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
        <form onSubmit={handleSubmit} className="space-y-4">
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
                  <img src={form.photo} className="h-10 w-10 rounded-full object-cover" />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-gray-200" />
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file || !activeTenantId) return;
                    try {
                      const { url } = await userApi.uploadUserPhoto(activeTenantId, file);
                      setForm(prev => ({ ...prev, photo: url }));
                    } catch (err) {
                      console.error('Upload failed', err);
                      alert('Failed to upload photo');
                    }
                  }}
                  className="text-sm"
                />
              </div>
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
        </form>
      </Modal>
    </div>
  );
}