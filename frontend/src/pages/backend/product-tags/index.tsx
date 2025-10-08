import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Pagination } from '@/components/ui/Pagination';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { productTagApi, type ProductTag, type ProductTagForm } from '@/api/productTagApi';
import { useToast } from '@/hooks/use-toast';
import { PlusIcon, PencilIcon, TrashIcon, MagnifyingGlassIcon, TagIcon } from '@heroicons/react/24/outline';

// Predefined tag colors
const TAG_COLORS = [
  '#3B82F6', // blue
  '#10B981', // green
  '#F59E0B', // amber
  '#EF4444', // red
  '#8B5CF6', // purple
  '#EC4899', // pink
  '#14B8A6', // teal
  '#F97316', // orange
  '#6366F1', // indigo
  '#84CC16', // lime
];

export default function ProductTagsPage() {
  const { tenantId } = useAuth();
  const { hasPermission } = usePermissions();
  const { toast } = useToast();
  
  const [tags, setTags] = useState<ProductTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<ProductTag | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [perPage] = useState(10);
  
  // Search
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  
  // Form state
  const [formData, setFormData] = useState<ProductTagForm>({
    name: '',
    color: TAG_COLORS[0],
    description: '',
  });
  
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Check permissions
  const canCreate = hasPermission('products.create');
  const canUpdate = hasPermission('products.update');
  const canDelete = hasPermission('products.delete');

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch tags
  const fetchTags = async () => {
    if (!tenantId) return;
    
    try {
      setLoading(true);
      const response = await productTagApi.getTags(tenantId, {
        page: currentPage,
        per_page: perPage,
        search: debouncedSearchQuery || undefined,
      });
      
      setTags(response.data);
      setTotalPages(response.last_page);
      setTotalItems(response.total);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.response?.data?.message || 'Failed to fetch tags',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTags();
  }, [tenantId, currentPage, debouncedSearchQuery]);

  const handleOpenModal = (tag?: ProductTag) => {
    if (tag) {
      setEditingTag(tag);
      setFormData({
        name: tag.name,
        color: tag.color,
        description: tag.description || '',
      });
    } else {
      setEditingTag(null);
      setFormData({
        name: '',
        color: TAG_COLORS[Math.floor(Math.random() * TAG_COLORS.length)],
        description: '',
      });
    }
    setValidationErrors({});
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingTag(null);
    setFormData({
      name: '',
      color: TAG_COLORS[0],
      description: '',
    });
    setValidationErrors({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId) return;

    // Simple validation
    const errors: Record<string, string> = {};
    if (!formData.name?.trim()) errors.name = 'Tag name is required';
    
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    try {
      setSubmitting(true);
      
      if (editingTag) {
        await productTagApi.updateTag(tenantId, editingTag.id, formData);
        toast({
          title: 'Success',
          description: 'Tag updated successfully',
        });
      } else {
        await productTagApi.createTag(tenantId, formData);
        toast({
          title: 'Success',
          description: 'Tag created successfully',
        });
      }
      
      handleCloseModal();
      fetchTags();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.response?.data?.message || 'Failed to save tag',
      });
      
      if (error.response?.data?.errors) {
        setValidationErrors(error.response.data.errors);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (tag: ProductTag) => {
    if (!tenantId) return;
    if (!confirm(`Are you sure you want to delete tag "${tag.name}"?`)) {
      return;
    }

    try {
      setDeleting(tag.id);
      await productTagApi.deleteTag(tenantId, tag.id);
      toast({
        title: 'Success',
        description: 'Tag deleted successfully',
      });
      fetchTags();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.response?.data?.message || 'Failed to delete tag',
      });
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Product Tags</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Organize products with tags for better categorization
          </p>
        </div>
        {canCreate && (
          <Button onClick={() => handleOpenModal()}>
            <PlusIcon className="h-5 w-5 mr-2" />
            Add Tag
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card className="mb-6 p-4">
        <div className="flex gap-4 items-center">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </Card>

      {/* Tags Grid */}
      {loading ? (
        <Card className="p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Loading tags...</p>
          </div>
        </Card>
      ) : tags.length === 0 ? (
        <Card className="p-12">
          <div className="text-center">
            <TagIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No tags found</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery ? 'Try adjusting your search' : 'Get started by creating your first tag'}
            </p>
            {canCreate && !searchQuery && (
              <Button onClick={() => handleOpenModal()}>
                <PlusIcon className="h-5 w-5 mr-2" />
                Add Tag
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tag</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Usage Count</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tags.map((tag) => (
                  <TableRow key={tag.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: tag.color }}
                        />
                        <span className="font-medium">{tag.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{tag.slug}</TableCell>
                    <TableCell className="text-muted-foreground max-w-xs truncate">
                      {tag.description || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{tag.usage_count || 0} products</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(tag.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      {canUpdate && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenModal(tag)}
                        >
                          <PencilIcon className="h-4 w-4" />
                        </Button>
                      )}
                      {canDelete && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(tag)}
                          disabled={deleting === tag.id}
                        >
                          <TrashIcon className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Pagination */}
            <div className="border-t border-border p-4">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                totalItems={totalItems}
                itemsPerPage={perPage}
              />
            </div>
          </Card>
        </>
      )}

      {/* Create/Edit Modal */}
      <Modal isOpen={modalOpen} onClose={handleCloseModal} title={editingTag ? 'Edit Tag' : 'Create Tag'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Tag Name <span className="text-danger-500">*</span>
            </label>
            <Input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className={validationErrors.name ? 'border-danger-500' : ''}
              placeholder="e.g., Featured, Sale, New Arrival"
            />
            {validationErrors.name && (
              <p className="text-sm text-danger-500 mt-1">{validationErrors.name}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Tag Color</label>
            <div className="flex flex-wrap gap-2">
              {TAG_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setFormData({ ...formData, color })}
                  className={`w-10 h-10 rounded-lg border-2 transition-all ${
                    formData.color === color ? 'border-foreground scale-110' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Selected color: <span style={{ color: formData.color }}>{formData.color}</span>
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 rounded-lg bg-background text-foreground border border-input focus:ring-2 focus:ring-ring"
              placeholder="Optional description for this tag"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={handleCloseModal}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Saving...' : editingTag ? 'Update Tag' : 'Create Tag'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}