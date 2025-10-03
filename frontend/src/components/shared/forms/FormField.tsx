import React from 'react'
import { cn } from '@/utils/cn'

interface FormFieldProps {
  label?: string
  htmlFor?: string
  error?: string
  description?: string
  children: React.ReactNode
}

export const FormField: React.FC<FormFieldProps> = ({ label, htmlFor, error, description, children }) => {
  return (
    <div className="space-y-1">
      {label && (
        <label htmlFor={htmlFor} className="block text-sm font-medium text-foreground/80">
          {label}
        </label>
      )}
      {children}
      {description && <p className="text-xs text-foreground/60">{description}</p>}
      {error && <p className={cn('text-sm text-danger-600')}>{error}</p>}
    </div>
  )
}