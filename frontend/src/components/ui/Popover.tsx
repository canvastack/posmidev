import React, { useRef, useState } from 'react'
import { cn } from '@/utils/cn'

interface PopoverProps {
  trigger: React.ReactNode
  children: React.ReactNode
  align?: 'start' | 'center' | 'end'
}

export const Popover: React.FC<PopoverProps> = ({ trigger, children, align = 'start' }) => {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const toggle = () => setOpen((v) => !v)
  const close = (e: MouseEvent) => {
    if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
  }
  React.useEffect(() => {
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  return (
    <div ref={ref} className="relative inline-block">
      <div onClick={toggle} className="cursor-pointer select-none">
        {trigger}
      </div>
      {open && (
        <div className={cn('absolute z-50 mt-2 min-w-40 rounded-md border border-border bg-background shadow-lg',
          align === 'start' && 'left-0',
          align === 'center' && 'left-1/2 -translate-x-1/2',
          align === 'end' && 'right-0')
        }>
          {children}
        </div>
      )}
    </div>
  )
}