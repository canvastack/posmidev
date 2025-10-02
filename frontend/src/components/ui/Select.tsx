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
          'block w-full px-3 py-2 rounded-lg bg-background text-foreground',
          'border border-input placeholder:text-muted-foreground',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background',
          error && 'border-destructive focus-visible:ring-destructive',
          className
        )}
        {...props}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-background text-foreground">
            {o.label}
          </option>
        ))}
      </select>
      {error && <p className="text-sm text-destructive-foreground/90 bg-destructive/10 px-2 py-1 rounded-md">{error}</p>}
    </div>
  )
}
