import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/Table';
import { useAuth } from '../hooks/useAuth';
import { roleApi } from '../api/roleApi';
import type { Role, Permission, RoleForm } from '../types';
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';

export const RolesPage: React.FC = () => {
  const { tenantId } = useAuth();
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<RoleForm>({
    name: '',
    permissions: [],
  });

  useEffect(() => {
    fetchData();
  }, [tenantId]);

  const fetchData = async () => {
    if (!tenantId) return;
    
    try {
      const [rolesData, permissionsData] = await Promise.all([
        roleApi.getRoles(tenantId),
        roleApi.getPermissions(tenantId),
      ]);
      setRoles(rolesData);
      setPermissions(permissionsData);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (role?: Role) => {
    if (role) {
      setEditingRole(role);
      setForm({
        name: role.name,
        permissions: role.permissions.map(p => p.name),
      });
    } else {
      setEditingRole(null);
      setForm({
        name: '',
        permissions: [],
      });
    }
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingRole(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId) return;

    setSubmitting(true);

    try {
      if (editingRole) {
        await roleApi.updateRole(tenantId, editingRole.id, form);
      } else {
        await roleApi.createRole(tenantId, form);
      }
      
      await fetchData();
      handleCloseModal();
    } catch (error) {
      console.error('Failed to save role:', error);
      alert('Failed to save role. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (role: Role) => {
    if (!tenantId) return;
    
    if (!confirm(`Are you sure you want to delete the role "${role.name}"?`)) {
      return;
    }

    try {
      await roleApi.deleteRole(tenantId, role.id);
      await fetchData();
    } catch (error) {
      console.error('Failed to delete role:', error);
      alert('Failed to delete role. Please try again.');
    }
  };

  const handlePermissionChange = (permissionName: string, checked: boolean) => {
    setForm(prev => ({
      ...prev,
      permissions: checked
        ? [...prev.permissions, permissionName]
        : prev.permissions.filter(p => p !== permissionName),
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Roles & Permissions</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage user roles and their permissions
          </p>
        </div>
        <Button onClick={() => handleOpenModal()}>
          <PlusIcon className="h-4 w-4 mr-2" />
          Add Role
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Role Name</TableHead>
                <TableHead>Permissions</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {roles.map((role) => (
                <TableRow key={role.id}>
                  <TableCell className="font-medium">{role.name}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {role.permissions.slice(0, 3).map((permission) => (
                        <span
                          key={permission.id}
                          className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-primary-100 text-primary-800"
                        >
                          {permission.name}
                        </span>
                      ))}
                      {role.permissions.length > 3 && (
                        <span className="text-xs text-gray-500">
                          +{role.permissions.length - 3} more
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenModal(role)}
                      >
                        <PencilIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(role)}
                      >
                        <TrashIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Role Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={handleCloseModal}
        title={editingRole ? 'Edit Role' : 'Add Role'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <Input
            label="Role Name"
            name="name"
            value={form.name}
            onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
            required
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Permissions
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-64 overflow-y-auto">
              {permissions.map((permission) => (
                <label key={permission.id} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={form.permissions.includes(permission.name)}
                    onChange={(e) => handlePermissionChange(permission.name, e.target.checked)}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-700">{permission.name}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex space-x-3">
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={handleCloseModal}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1"
              loading={submitting}
            >
              {editingRole ? 'Update' : 'Create'} Role
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};