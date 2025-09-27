import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface TenantScopeState {
  selectedTenantId: string | null
  setSelectedTenantId: (id: string | null) => void
  clearSelectedTenantId: () => void
}

// Persist selected tenant to localStorage so it survives reloads
export const useTenantScopeStore = create<TenantScopeState>()(
  persist(
    (set) => ({
      selectedTenantId: null,
      setSelectedTenantId: (id) => set({ selectedTenantId: id }),
      clearSelectedTenantId: () => set({ selectedTenantId: null }),
    }),
    { name: 'tenant-scope' }
  )
)