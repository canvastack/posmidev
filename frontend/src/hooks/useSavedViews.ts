import { useState, useEffect } from 'react';

export interface SavedView {
  id: string;
  name: string;
  filters: {
    search?: string;
    category?: string;
    stockFilter?: string;
    minPrice?: string;
    maxPrice?: string;
    createdFrom?: string;
    createdTo?: string;
    updatedFrom?: string;
    updatedTo?: string;
    statuses?: string[];
  };
  createdAt: string;
}

const STORAGE_KEY = 'products_saved_views';

export function useSavedViews() {
  const [views, setViews] = useState<SavedView[]>([]);

  // Load views from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setViews(Array.isArray(parsed) ? parsed : []);
      } catch (error) {
        console.error('Failed to parse saved views:', error);
        setViews([]);
      }
    }
  }, []);

  // Save views to localStorage whenever they change
  const saveToStorage = (newViews: SavedView[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newViews));
    setViews(newViews);
  };

  const saveView = (name: string, filters: SavedView['filters']) => {
    const newView: SavedView = {
      id: `view_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      filters,
      createdAt: new Date().toISOString(),
    };
    const newViews = [...views, newView];
    saveToStorage(newViews);
    return newView;
  };

  const updateView = (id: string, name: string, filters: SavedView['filters']) => {
    const newViews = views.map(view =>
      view.id === id
        ? { ...view, name, filters }
        : view
    );
    saveToStorage(newViews);
  };

  const deleteView = (id: string) => {
    const newViews = views.filter(view => view.id !== id);
    saveToStorage(newViews);
  };

  const getView = (id: string) => {
    return views.find(view => view.id === id);
  };

  return {
    views,
    saveView,
    updateView,
    deleteView,
    getView,
  };
}