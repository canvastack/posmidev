import React, { useEffect, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { useAuth } from '@/hooks/useAuth';
import { contentApi } from '@/api/contentApi';
import type { ContentPage, ContentPageForm } from '@/types';
import { PlusIcon, PencilIcon, TrashIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface VisualFormData {
  hero: {
    badge: string;
    title: string;
    subtitle: string;
    description: string;
  };
  team: Array<{
    name: string;
    role: string;
    image: string;
    description: string;
  }>;
  story: {
    image: string;
    title: string;
    features: string[];
    paragraphs: string[];
    satisfaction: string;
  };
  services: Array<{
    icon: string;
    title: string;
    features: string[];
    description: string;
  }>;
  milestones: Array<{
    year: string;
    title: string;
    description: string;
  }>;
  achievements: Array<{
    icon: string;
    color: string;
    label: string;
    number: string;
  }>;
}

const emptyVisualForm: VisualFormData = {
  hero: { badge: '', title: '', subtitle: '', description: '' },
  team: [],
  story: { image: '', title: '', features: [], paragraphs: [], satisfaction: '' },
  services: [],
  milestones: [],
  achievements: [],
};

export default function ContentPagesPage() {
  const { tenantId } = useAuth();
  const [pages, setPages] = useState<ContentPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPage, setEditingPage] = useState<ContentPage | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [editorMode, setEditorMode] = useState<'visual' | 'json'>('visual');
  
  const [form, setForm] = useState<ContentPageForm>({
    slug: '',
    title: '',
    content: {},
    status: 'draft',
    published_at: null,
  });
  const [contentString, setContentString] = useState('{}');
  const [visualForm, setVisualForm] = useState<VisualFormData>(emptyVisualForm);

  // Sync visual form to JSON
  const syncVisualToJson = useCallback((vForm: VisualFormData) => {
    const jsonString = JSON.stringify(vForm, null, 2);
    setContentString(jsonString);
    setForm(prev => ({ ...prev, content: vForm }));
    setJsonError(null);
  }, []);

  // Sync JSON to visual form
  const syncJsonToVisual = useCallback((jsonString: string) => {
    try {
      const parsed = JSON.parse(jsonString);
      setVisualForm({
        hero: parsed.hero || emptyVisualForm.hero,
        team: parsed.team || [],
        story: parsed.story || emptyVisualForm.story,
        services: parsed.services || [],
        milestones: parsed.milestones || [],
        achievements: parsed.achievements || [],
      });
      setForm(prev => ({ ...prev, content: parsed }));
      setJsonError(null);
    } catch (err) {
      setJsonError('Invalid JSON format');
    }
  }, []);

  const fetchPages = useCallback(async () => {
    if (!tenantId) return;
    try {
      const response = await contentApi.getContentPagesAdmin(tenantId);
      const pagesArray = Array.isArray(response) ? response : response?.data || [];
      setPages(pagesArray);
    } catch (error) {
      console.error('Failed to fetch content pages:', error);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchPages();
  }, [fetchPages]);

  const handleOpenModal = (page?: ContentPage) => {
    if (page) {
      setEditingPage(page);
      const contentJson = JSON.stringify(page.content, null, 2);
      setContentString(contentJson);
      syncJsonToVisual(contentJson);
      setForm({
        slug: page.slug,
        title: page.title,
        content: page.content,
        status: page.status,
        published_at: page.published_at,
      });
    } else {
      setEditingPage(null);
      setForm({
        slug: '',
        title: '',
        content: {},
        status: 'draft',
        published_at: null,
      });
      setContentString('{}');
      setVisualForm(emptyVisualForm);
    }
    setJsonError(null);
    setEditorMode('visual');
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingPage(null);
    setJsonError(null);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleContentChange = (value: string) => {
    setContentString(value);
    try {
      const parsed = JSON.parse(value);
      setForm(prev => ({ ...prev, content: parsed }));
      setJsonError(null);
    } catch (err) {
      setJsonError('Invalid JSON format');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId || jsonError) return;

    setSubmitting(true);
    try {
      if (editingPage) {
        await contentApi.updateContentPage(tenantId, editingPage.id, form);
      } else {
        await contentApi.createContentPage(tenantId, form);
      }
      await fetchPages();
      handleCloseModal();
    } catch (error: any) {
      console.error('Failed to save content page:', error);
      alert(error?.response?.data?.message || 'Failed to save content page');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (page: ContentPage) => {
    if (!tenantId) return;
    if (!confirm(`Are you sure you want to delete "${page.title}"?`)) return;

    try {
      await contentApi.deleteContentPage(tenantId, page.id);
      await fetchPages();
    } catch (error) {
      console.error('Failed to delete content page:', error);
      alert('Failed to delete content page');
    }
  };

  // Visual form handlers
  const updateVisualField = (section: keyof VisualFormData, field: string, value: any) => {
    const updated = { ...visualForm, [section]: { ...visualForm[section], [field]: value } };
    setVisualForm(updated);
    syncVisualToJson(updated);
  };

  const addArrayItem = (section: 'team' | 'services' | 'milestones' | 'achievements', item: any) => {
    const updated = { ...visualForm, [section]: [...visualForm[section], item] };
    setVisualForm(updated);
    syncVisualToJson(updated);
  };

  const updateArrayItem = (section: 'team' | 'services' | 'milestones' | 'achievements', index: number, item: any) => {
    const updated = { ...visualForm };
    updated[section][index] = item;
    setVisualForm(updated);
    syncVisualToJson(updated);
  };

  const removeArrayItem = (section: 'team' | 'services' | 'milestones' | 'achievements', index: number) => {
    const updated = { ...visualForm };
    updated[section].splice(index, 1);
    setVisualForm(updated);
    syncVisualToJson(updated);
  };

  const addStoryFeature = (feature: string) => {
    if (!feature.trim()) return;
    const updated = { ...visualForm, story: { ...visualForm.story, features: [...visualForm.story.features, feature] } };
    setVisualForm(updated);
    syncVisualToJson(updated);
  };

  const removeStoryFeature = (index: number) => {
    const updated = { ...visualForm, story: { ...visualForm.story, features: visualForm.story.features.filter((_, i) => i !== index) } };
    setVisualForm(updated);
    syncVisualToJson(updated);
  };

  const addStoryParagraph = (paragraph: string) => {
    if (!paragraph.trim()) return;
    const updated = { ...visualForm, story: { ...visualForm.story, paragraphs: [...visualForm.story.paragraphs, paragraph] } };
    setVisualForm(updated);
    syncVisualToJson(updated);
  };

  const removeStoryParagraph = (index: number) => {
    const updated = { ...visualForm, story: { ...visualForm.story, paragraphs: visualForm.story.paragraphs.filter((_, i) => i !== index) } };
    setVisualForm(updated);
    syncVisualToJson(updated);
  };

  const addServiceFeature = (serviceIndex: number, feature: string) => {
    if (!feature.trim()) return;
    const updated = { ...visualForm };
    updated.services[serviceIndex].features.push(feature);
    setVisualForm(updated);
    syncVisualToJson(updated);
  };

  const removeServiceFeature = (serviceIndex: number, featureIndex: number) => {
    const updated = { ...visualForm };
    updated.services[serviceIndex].features.splice(featureIndex, 1);
    setVisualForm(updated);
    syncVisualToJson(updated);
  };

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-card-foreground">Content Pages</h1>
          <p className="text-muted-foreground mt-1">Manage your dynamic content pages</p>
        </div>
        <Button onClick={() => handleOpenModal()}>
          <PlusIcon className="h-5 w-5 mr-2" />
          Add New Page
        </Button>
      </div>

      <Card>
        <CardContent className="p-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Published At</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">Loading...</TableCell>
                </TableRow>
              ) : pages.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">No content pages found</TableCell>
                </TableRow>
              ) : (
                pages.map((page) => (
                  <TableRow key={page.id}>
                    <TableCell>{page.title}</TableCell>
                    <TableCell>
                      <code className="px-2 py-1 bg-muted rounded text-sm">{page.slug}</code>
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        page.status === 'published' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {page.status}
                      </span>
                    </TableCell>
                    <TableCell>
                      {page.published_at 
                        ? new Date(page.published_at).toLocaleDateString()
                        : '-'
                      }
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenModal(page)}
                        >
                          <PencilIcon className="h-4 w-4 text-blue-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(page)}
                        >
                          <TrashIcon className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Modal isOpen={modalOpen} onClose={handleCloseModal} size="xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <h2 className="text-xl font-semibold">
            {editingPage ? 'Edit Content Page' : 'Add New Content Page'}
          </h2>

          {/* Basic Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title *
              </label>
              <Input
                name="title"
                value={form.title}
                onChange={handleChange}
                placeholder="About Us"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Slug * <span className="text-gray-500 text-xs">(kebab-case: about-us)</span>
              </label>
              <Input
                name="slug"
                value={form.slug}
                onChange={handleChange}
                placeholder="about-us"
                pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              name="status"
              value={form.status}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm px-3 py-2 border"
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
          </div>

          {/* Editor Mode Tabs */}
          <div className="border-b border-gray-200">
            <div className="flex space-x-4">
              <button
                type="button"
                className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                  editorMode === 'visual'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
                onClick={() => setEditorMode('visual')}
              >
                Visual Editor
              </button>
              <button
                type="button"
                className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                  editorMode === 'json'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
                onClick={() => {
                  setEditorMode('json');
                  syncJsonToVisual(contentString);
                }}
              >
                JSON Editor
              </button>
            </div>
          </div>

          {/* Visual Editor */}
          {editorMode === 'visual' && (
            <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2">
              {/* Hero Section */}
              <div className="border rounded-lg p-4 bg-gray-50">
                <h3 className="text-lg font-semibold mb-3">Hero Section</h3>
                <div className="space-y-3">
                  <Input
                    placeholder="Badge text"
                    value={visualForm.hero.badge}
                    onChange={(e) => updateVisualField('hero', 'badge', e.target.value)}
                  />
                  <Input
                    placeholder="Title"
                    value={visualForm.hero.title}
                    onChange={(e) => updateVisualField('hero', 'title', e.target.value)}
                  />
                  <Input
                    placeholder="Subtitle"
                    value={visualForm.hero.subtitle}
                    onChange={(e) => updateVisualField('hero', 'subtitle', e.target.value)}
                  />
                  <textarea
                    placeholder="Description"
                    value={visualForm.hero.description}
                    onChange={(e) => updateVisualField('hero', 'description', e.target.value)}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm px-3 py-2 border"
                    rows={3}
                  />
                </div>
              </div>

              {/* Team Section */}
              <div className="border rounded-lg p-4 bg-gray-50">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold">Team Members</h3>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => addArrayItem('team', { name: '', role: '', image: '', description: '' })}
                  >
                    <PlusIcon className="h-4 w-4 mr-1" />
                    Add Member
                  </Button>
                </div>
                <div className="space-y-3">
                  {visualForm.team.map((member, idx) => (
                    <div key={idx} className="bg-white p-3 rounded border">
                      <div className="flex items-start justify-between mb-2">
                        <span className="text-sm font-medium">Member #{idx + 1}</span>
                        <button
                          type="button"
                          onClick={() => removeArrayItem('team', idx)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <XMarkIcon className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          placeholder="Name"
                          value={member.name}
                          onChange={(e) => updateArrayItem('team', idx, { ...member, name: e.target.value })}
                        />
                        <Input
                          placeholder="Role"
                          value={member.role}
                          onChange={(e) => updateArrayItem('team', idx, { ...member, role: e.target.value })}
                        />
                        <Input
                          placeholder="Image URL"
                          value={member.image}
                          onChange={(e) => updateArrayItem('team', idx, { ...member, image: e.target.value })}
                          className="col-span-2"
                        />
                        <textarea
                          placeholder="Description"
                          value={member.description}
                          onChange={(e) => updateArrayItem('team', idx, { ...member, description: e.target.value })}
                          className="col-span-2 w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm px-3 py-2 border"
                          rows={2}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Story Section */}
              <div className="border rounded-lg p-4 bg-gray-50">
                <h3 className="text-lg font-semibold mb-3">Story Section</h3>
                <div className="space-y-3">
                  <Input
                    placeholder="Image URL"
                    value={visualForm.story.image}
                    onChange={(e) => updateVisualField('story', 'image', e.target.value)}
                  />
                  <Input
                    placeholder="Title"
                    value={visualForm.story.title}
                    onChange={(e) => updateVisualField('story', 'title', e.target.value)}
                  />
                  <Input
                    placeholder="Customer Satisfaction (e.g., 98.5%)"
                    value={visualForm.story.satisfaction}
                    onChange={(e) => updateVisualField('story', 'satisfaction', e.target.value)}
                  />
                  
                  {/* Features */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Features</label>
                    <div className="space-y-2">
                      {visualForm.story.features.map((feature, idx) => (
                        <div key={idx} className="flex gap-2">
                          <Input value={feature} disabled className="flex-1" />
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => removeStoryFeature(idx)}
                          >
                            <XMarkIcon className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      ))}
                      <div className="flex gap-2">
                        <Input
                          placeholder="Add feature"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              addStoryFeature(e.currentTarget.value);
                              e.currentTarget.value = '';
                            }
                          }}
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          size="sm"
                          onClick={(e) => {
                            const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                            addStoryFeature(input.value);
                            input.value = '';
                          }}
                        >
                          Add
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Paragraphs */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Paragraphs</label>
                    <div className="space-y-2">
                      {visualForm.story.paragraphs.map((para, idx) => (
                        <div key={idx} className="flex gap-2">
                          <textarea
                            value={para}
                            disabled
                            className="flex-1 rounded-md border-gray-300 bg-gray-100 px-3 py-2 border text-sm"
                            rows={2}
                          />
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => removeStoryParagraph(idx)}
                          >
                            <XMarkIcon className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      ))}
                      <div className="flex gap-2">
                        <textarea
                          placeholder="Add paragraph"
                          className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm px-3 py-2 border"
                          rows={2}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && e.ctrlKey) {
                              e.preventDefault();
                              addStoryParagraph(e.currentTarget.value);
                              e.currentTarget.value = '';
                            }
                          }}
                        />
                        <Button
                          type="button"
                          size="sm"
                          onClick={(e) => {
                            const textarea = e.currentTarget.previousElementSibling as HTMLTextAreaElement;
                            addStoryParagraph(textarea.value);
                            textarea.value = '';
                          }}
                        >
                          Add
                        </Button>
                      </div>
                      <p className="text-xs text-gray-500">Press Ctrl+Enter to add</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Services Section */}
              <div className="border rounded-lg p-4 bg-gray-50">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold">Services</h3>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => addArrayItem('services', { icon: '', title: '', features: [], description: '' })}
                  >
                    <PlusIcon className="h-4 w-4 mr-1" />
                    Add Service
                  </Button>
                </div>
                <div className="space-y-3">
                  {visualForm.services.map((service, idx) => (
                    <div key={idx} className="bg-white p-3 rounded border">
                      <div className="flex items-start justify-between mb-2">
                        <span className="text-sm font-medium">Service #{idx + 1}</span>
                        <button
                          type="button"
                          onClick={() => removeArrayItem('services', idx)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <XMarkIcon className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="space-y-2">
                        <Input
                          placeholder="Icon (e.g., Zap, ShoppingBag)"
                          value={service.icon}
                          onChange={(e) => updateArrayItem('services', idx, { ...service, icon: e.target.value })}
                        />
                        <Input
                          placeholder="Title"
                          value={service.title}
                          onChange={(e) => updateArrayItem('services', idx, { ...service, title: e.target.value })}
                        />
                        <textarea
                          placeholder="Description"
                          value={service.description}
                          onChange={(e) => updateArrayItem('services', idx, { ...service, description: e.target.value })}
                          className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm px-3 py-2 border"
                          rows={2}
                        />
                        
                        {/* Service Features */}
                        <div>
                          <label className="block text-xs font-medium mb-1">Features</label>
                          <div className="space-y-1">
                            {service.features.map((feature, fIdx) => (
                              <div key={fIdx} className="flex gap-1">
                                <Input value={feature} disabled className="flex-1 text-sm" size="sm" />
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => removeServiceFeature(idx, fIdx)}
                                >
                                  <XMarkIcon className="h-3 w-3 text-red-600" />
                                </Button>
                              </div>
                            ))}
                            <div className="flex gap-1">
                              <Input
                                placeholder="Add feature"
                                size="sm"
                                className="flex-1 text-sm"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    addServiceFeature(idx, e.currentTarget.value);
                                    e.currentTarget.value = '';
                                  }
                                }}
                              />
                              <Button
                                type="button"
                                size="sm"
                                onClick={(e) => {
                                  const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                                  addServiceFeature(idx, input.value);
                                  input.value = '';
                                }}
                              >
                                +
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Milestones Section */}
              <div className="border rounded-lg p-4 bg-gray-50">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold">Milestones</h3>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => addArrayItem('milestones', { year: '', title: '', description: '' })}
                  >
                    <PlusIcon className="h-4 w-4 mr-1" />
                    Add Milestone
                  </Button>
                </div>
                <div className="space-y-3">
                  {visualForm.milestones.map((milestone, idx) => (
                    <div key={idx} className="bg-white p-3 rounded border">
                      <div className="flex items-start justify-between mb-2">
                        <span className="text-sm font-medium">Milestone #{idx + 1}</span>
                        <button
                          type="button"
                          onClick={() => removeArrayItem('milestones', idx)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <XMarkIcon className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <Input
                          placeholder="Year"
                          value={milestone.year}
                          onChange={(e) => updateArrayItem('milestones', idx, { ...milestone, year: e.target.value })}
                        />
                        <Input
                          placeholder="Title"
                          value={milestone.title}
                          onChange={(e) => updateArrayItem('milestones', idx, { ...milestone, title: e.target.value })}
                          className="col-span-2"
                        />
                        <textarea
                          placeholder="Description"
                          value={milestone.description}
                          onChange={(e) => updateArrayItem('milestones', idx, { ...milestone, description: e.target.value })}
                          className="col-span-3 w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm px-3 py-2 border"
                          rows={2}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Achievements Section */}
              <div className="border rounded-lg p-4 bg-gray-50">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold">Achievements</h3>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => addArrayItem('achievements', { icon: '', color: '', label: '', number: '' })}
                  >
                    <PlusIcon className="h-4 w-4 mr-1" />
                    Add Achievement
                  </Button>
                </div>
                <div className="space-y-3">
                  {visualForm.achievements.map((achievement, idx) => (
                    <div key={idx} className="bg-white p-3 rounded border">
                      <div className="flex items-start justify-between mb-2">
                        <span className="text-sm font-medium">Achievement #{idx + 1}</span>
                        <button
                          type="button"
                          onClick={() => removeArrayItem('achievements', idx)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <XMarkIcon className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          placeholder="Icon (e.g., Users, Globe)"
                          value={achievement.icon}
                          onChange={(e) => updateArrayItem('achievements', idx, { ...achievement, icon: e.target.value })}
                        />
                        <Input
                          placeholder="Color (e.g., from-blue-500 to-blue-600)"
                          value={achievement.color}
                          onChange={(e) => updateArrayItem('achievements', idx, { ...achievement, color: e.target.value })}
                        />
                        <Input
                          placeholder="Label"
                          value={achievement.label}
                          onChange={(e) => updateArrayItem('achievements', idx, { ...achievement, label: e.target.value })}
                        />
                        <Input
                          placeholder="Number (e.g., 10,000+)"
                          value={achievement.number}
                          onChange={(e) => updateArrayItem('achievements', idx, { ...achievement, number: e.target.value })}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* JSON Editor */}
          {editorMode === 'json' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Content (JSON) *
              </label>
              <textarea
                value={contentString}
                onChange={(e) => handleContentChange(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm px-3 py-2 border font-mono text-sm"
                rows={20}
                placeholder='{"hero": {"title": "Welcome"}, "sections": []}'
                required
              />
              {jsonError && (
                <p className="mt-1 text-sm text-red-600">{jsonError}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Enter valid JSON content. Switch to Visual Editor for guided form input.
              </p>
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button
              type="button"
              variant="ghost"
              onClick={handleCloseModal}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || !!jsonError}>
              {submitting ? 'Saving...' : editingPage ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}