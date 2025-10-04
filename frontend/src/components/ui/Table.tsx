import React from 'react'
import { cn } from '@/utils/cn'

interface TableProps { children: React.ReactNode; className?: string; scrollX?: boolean; scrollY?: boolean; maxHeight?: number | string }
interface TableHeaderProps { children: React.ReactNode; className?: string }
interface TableBodyProps { children: React.ReactNode; className?: string }
interface TableRowProps { children: React.ReactNode; className?: string }

type TableCellProps = React.TdHTMLAttributes<HTMLTableCellElement>
interface TableHeadProps { children: React.ReactNode; className?: string }

export const Table: React.FC<TableProps> = ({ children, className, scrollX, scrollY, maxHeight }) => (
  <div
    className={cn(
      'bg-card text-card-foreground',
      scrollX || scrollY ? 'overflow-hidden' : 'overflow-hidden'
    )}
  >
    <div
      className={cn(
        // custom smooth scroll wrapper
        scrollX ? 'overflow-x-auto custom-scrollbar' : '',
        scrollY ? 'overflow-y-auto custom-scrollbar' : '',
      )}
      style={maxHeight ? { maxHeight: typeof maxHeight === 'number' ? `${maxHeight}px` : maxHeight } : undefined}
    >
      <table className={cn('min-w-full divide-y divide-border', className)}>
        {children}
      </table>
    </div>
  </div>
)

export const TableHeader: React.FC<TableHeaderProps> = ({ children, className }) => (
  <thead className={cn('bg-muted/40 text-muted-foreground', className)}>
    {children}
  </thead>
)

export const TableBody: React.FC<TableBodyProps> = ({ children, className }) => (
  <tbody className={cn('divide-y divide-border bg-background', className)}>
    {children}
  </tbody>
)

export const TableRow: React.FC<TableRowProps> = ({ children, className }) => (
  <tr className={cn('hover:bg-accent/40 transition-colors', className)}>
    {children}
  </tr>
)

export const TableHead: React.FC<TableHeadProps> = ({ children, className }) => (
  <th className={cn('px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground', className)}>
    {children}
  </th>
)

export const TableCell: React.FC<TableCellProps> = ({ children, className, ...props }) => (
  <td {...props} className={cn('px-6 py-4 whitespace-nowrap text-sm text-foreground', className)}>
    {children}
  </td>
)
