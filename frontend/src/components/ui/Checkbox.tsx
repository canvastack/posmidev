import React from 'react'
import { cn } from '@/utils/cn'

interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  /** Callback with boolean checked value for convenience */
  onCheckedChange?: (checked: boolean) => void
}

export const Checkbox: React.FC<CheckboxProps> = ({
  label,
  className,
  onCheckedChange,
  onChange,
  checked,
  defaultChecked,
  readOnly,
  ...props
}) => {
  const id = React.useId()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Call native onChange first to preserve default behavior
    onChange?.(e)
    // Then bubble boolean convenience callback
    onCheckedChange?.(e.target.checked)
  }

  // If controlled (checked provided) without any change handlers, set readOnly to avoid React warning
  const isReadOnly = readOnly ?? (checked !== undefined && !onChange && !onCheckedChange)

  // Build input props ensuring we don't pass both checked and defaultChecked
  const inputProps: React.InputHTMLAttributes<HTMLInputElement> = {
    id,
    type: 'checkbox',
    className:
      'h-4 w-4 rounded border border-input bg-background text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
    onChange: handleChange,
    readOnly: isReadOnly,
    ...props,
  }

  if (checked !== undefined) {
    inputProps.checked = checked
  } else if (defaultChecked !== undefined) {
    inputProps.defaultChecked = defaultChecked
  }

  return (
    <label htmlFor={id} className={cn('inline-flex items-center gap-2 select-none', className)}>
      <input {...inputProps} />
      {label && <span className="text-sm text-foreground">{label}</span>}
    </label>
  )
}