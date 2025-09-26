import React from 'react'
import { cn } from '@/utils/cn'

interface Option { value: string; label: string }

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  options: Option[]
}

export const Select: React.FC<SelectProps> = ({ label, error, className, id, options, ...props }) => {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')
  return (
    <div className="space-y-1">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-foreground/80">
          {label}
        </label>
      )}
      <select
        id={inputId}
        className={cn(
          'block w-full px-3 py-2 rounded-lg border border-border bg-background focus:ring-primary-500 focus:border-primary-500 sm:text-sm',
          error && 'border-danger-300 focus:ring-danger-500 focus:border-danger-500',
          className
        )}
        {...props}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {error && <p className="text-sm text-danger-600">{error}</p>}
    </div>
  )
}