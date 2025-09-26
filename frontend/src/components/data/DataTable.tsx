import React from 'react'
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  ColumnFiltersState,
  getFilteredRowModel,
  VisibilityState,
} from '@tanstack/react-table'
import { cn } from '@/utils/cn'
import { Checkbox } from '@/components/ui/Checkbox'

export interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  pageCount?: number
  manualPagination?: boolean
  onPaginationChange?: (pageIndex: number, pageSize: number) => void
  state?: { pageIndex?: number; pageSize?: number }
  enableRowSelection?: boolean
  onSelectionChange?: (rows: TData[]) => void
  enableColumnVisibility?: boolean
  className?: string
}

export function DataTable<TData, TValue>({
  columns,
  data,
  pageCount,
  manualPagination,
  onPaginationChange,
  state,
  enableRowSelection,
  onSelectionChange,
  enableColumnVisibility,
  className,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = React.useState({})

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      pagination: state,
    },
    enableRowSelection,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    pageCount,
    manualPagination,
  })

  React.useEffect(() => {
    if (!enableRowSelection || !onSelectionChange) return
    const rows = table.getSelectedRowModel().rows.map((r) => r.original as TData)
    onSelectionChange(rows)
  }, [rowSelection])

  return (
    <div className={cn('space-y-2', className)}>
      <div className="overflow-hidden ring-1 ring-border/60 rounded-lg">
        <table className="min-w-full divide-y divide-border/60">
          <thead className="bg-foreground/5">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th key={header.id} className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide">
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-border/60 bg-background">
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="hover:bg-foreground/5">
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-3 py-2 text-sm">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between gap-2 text-sm">
        <div className="flex items-center gap-2">
          <button className="px-2 py-1 rounded-md bg-foreground/10 disabled:opacity-50" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
            Prev
          </button>
          <button className="px-2 py-1 rounded-md bg-foreground/10 disabled:opacity-50" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
            Next
          </button>
          <span className="opacity-80">
            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount() || 1}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="opacity-80">Rows per page</span>
          <select
            className="px-2 py-1 rounded-md bg-background border border-border"
            value={table.getState().pagination.pageSize}
            onChange={(e) => table.setPageSize(Number(e.target.value))}
          >
            {[10, 20, 50].map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  )
}

// Helpers for common table patterns
export function selectionColumn<TData>(): ColumnDef<TData, unknown> {
  return {
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected()}
        onChange={(e) => table.toggleAllPageRowsSelected(e.currentTarget.checked)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onChange={(e) => row.toggleSelected(e.currentTarget.checked)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
    size: 32,
  }
}