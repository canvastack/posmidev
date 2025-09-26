import React, { useState } from 'react'
import { cn } from '@/utils/cn'

interface TooltipProps {
  content: React.ReactNode
  delay?: number
  children: React.ReactElement
}

export const Tooltip: React.FC<TooltipProps> = ({ content, delay = 150, children }) => {
  const [open, setOpen] = useState(false)
  const [timer, setTimer] = useState<number | null>(null)

  const show = () => {
    const t = window.setTimeout(() => setOpen(true), delay)
    setTimer(t)
  }
  const hide = () => {
    if (timer) window.clearTimeout(timer)
    setOpen(false)
  }

  return (
    <span className="relative inline-flex" onMouseEnter={show} onMouseLeave={hide} onFocus={show} onBlur={hide}>
      {children}
      {open && (
        <span role="tooltip" className={cn('absolute left-1/2 -translate-x-1/2 top-full mt-2 whitespace-nowrap rounded-md bg-foreground text-background text-xs px-2 py-1 shadow-lg')}>{content}</span>
      )}
    </span>
  )
}