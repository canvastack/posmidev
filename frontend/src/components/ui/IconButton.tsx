import React from 'react'
import { cn } from '@/utils/cn'

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'ghost' | 'primary' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  srLabel?: string
}

export const IconButton: React.FC<IconButtonProps> = ({
  className,
  children,
  variant = 'ghost',
  size = 'md',
  srLabel,
  ...props
}) => {
  const base = 'inline-flex items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors'
  const variants = {
    ghost: 'text-foreground/80 hover:bg-foreground/10 focus:ring-primary-500',
    primary: 'bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500',
    danger: 'bg-danger-600 text-white hover:bg-danger-700 focus:ring-danger-500',
  }
  const sizes = {
    sm: 'h-8 w-8',
    md: 'h-9 w-9',
    lg: 'h-10 w-10',
  }

  return (
    <button className={cn(base, variants[variant], sizes[size], className)} {...props}>
      {srLabel && <span className="sr-only">{srLabel}</span>}
      {children}
    </button>
  )
}