import React from 'react'
import { cn } from '@/utils/cn'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  className,
  id,
  ...props
}) => {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')

  return (
    <div className="space-y-1">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-foreground/80">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={cn(
          // Surface + borders + typography
          'block w-full px-3 py-2 rounded-lg border bg-background text-foreground placeholder:text-muted-foreground',
          // Semantic borders
          'border-input focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background',
          // Error state maps to destructive tokens
          error && 'border-destructive focus-visible:ring-destructive',
          className
        )}
        {...props}
      />
      {error && (
        <p className="text-sm text-destructive-foreground/90 bg-destructive/10 px-2 py-1 rounded-md">
          {error}
        </p>
      )}
    </div>
  )
}
