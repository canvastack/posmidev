import React from 'react'
import { cn } from '@/utils/cn'

interface SwitchProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onChange' | 'onCheckedChange'> {
  checked: boolean
  onChange?: (v: boolean) => void
  onCheckedChange?: (v: boolean) => void
  label?: string
}

export const Switch: React.FC<SwitchProps> = ({ 
  checked, 
  onChange, 
  onCheckedChange, 
  label, 
  className,
  ...props 
}) => {
  const id = React.useId()
  
  const handleToggle = () => {
    const newValue = !checked
    onChange?.(newValue)
    onCheckedChange?.(newValue)
  }
  
  return (
    <div className={cn('inline-flex items-center gap-2', className)}>
      {label && (
        <label htmlFor={id} className="text-sm select-none text-foreground/80">
          {label}
        </label>
      )}
      <button
        type="button"
        id={id}
        role="switch"
        aria-checked={checked}
        onClick={handleToggle}
        className={cn(
          'relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500',
          checked ? 'bg-primary-600' : 'bg-foreground/20'
        )}
        {...props}
      >
        <span
          className={cn(
            'inline-block h-5 w-5 transform rounded-full bg-white transition-transform',
            checked ? 'translate-x-5' : 'translate-x-1'
          )}
        />
      </button>
    </div>
  )}