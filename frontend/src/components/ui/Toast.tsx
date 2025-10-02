import React from 'react'
import { create } from 'zustand'
import { cn } from '@/utils/cn'

interface ToastItem { id: string; title: string; description?: string; variant?: 'default' | 'success' | 'warning' | 'danger' }
interface ToastState {
  toasts: ToastItem[]
  show: (t: Omit<ToastItem, 'id'>) => void
  dismiss: (id: string) => void
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  show: (t) => set((s) => ({ toasts: [...s.toasts, { id: Math.random().toString(36).slice(2), ...t }] })),
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })),
}))

export const ToastViewport: React.FC = () => {
  const { toasts, dismiss } = useToastStore()
  return (
    <div className="fixed bottom-4 right-4 z-[9999] space-y-2">
      {toasts.map((t) => (
        <div key={t.id} className={cn('min-w-64 rounded-md px-3 py-2 shadow-lg text-sm card border-l-4',
          t.variant === 'success' && 'border-success-500',
          t.variant === 'warning' && 'border-warning-500',
          t.variant === 'danger' && 'border-danger-500',
          (!t.variant || t.variant === 'default') && 'border-foreground/30'
        )}>
          <div className="flex items-start gap-2">
            <div className="font-semibold">{t.title}</div>
            <button className="ml-auto text-foreground/60 hover:text-foreground" onClick={() => dismiss(t.id)}>Close</button>
          </div>
          {t.description && <div className="opacity-80 mt-1">{t.description}</div>}
        </div>
      ))}
    </div>
  )
}