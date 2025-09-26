import React from 'react'
import { cn } from '@/utils/cn'

interface CurrencyInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  value?: number
  onValueChange?: (v: number) => void
  prefix?: string
}

export const CurrencyInput: React.FC<CurrencyInputProps> = ({ value, onValueChange, prefix = 'Rp', className, ...props }) => {
  const [display, setDisplay] = React.useState<string>(value?.toString() ?? '')

  React.useEffect(() => {
    if (value !== undefined && !Number.isNaN(value)) setDisplay(value.toString())
  }, [value])

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9.,]/g, '').replace(',', '.')
    setDisplay(raw)
    const num = parseFloat(raw)
    if (!Number.isNaN(num)) onValueChange?.(num)
  }

  return (
    <div className={cn('flex items-center rounded-lg border border-border bg-background focus-within:ring-2 focus-within:ring-primary-500 px-2', className)}>
      <span className="text-foreground/60 text-sm mr-1">{prefix}</span>
      <input
        inputMode="decimal"
        className="w-full bg-transparent px-2 py-2 outline-none"
        value={display}
        onChange={onChange}
        {...props}
      />
    </div>
  )
}