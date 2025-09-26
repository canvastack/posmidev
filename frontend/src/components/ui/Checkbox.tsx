import React from 'react'
import { cn } from '@/utils/cn'

interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
}

export const Checkbox: React.FC<CheckboxProps> = ({ label, className, ...props }) => {
  const id = React.useId()
  return (
    <label htmlFor={id} className={cn('inline-flex items-center gap-2 select-none', className)}>
      <input id={id} type="checkbox" className="h-4 w-4 rounded border-border text-primary-600 focus:ring-primary-500" {...props} />
      {label && <span className="text-sm">{label}</span>}
    </label>
  )
}