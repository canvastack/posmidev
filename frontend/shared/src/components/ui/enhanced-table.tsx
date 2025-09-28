import * as React from "react"
import { ChevronDown, ChevronRight } from "lucide-react"
import { Button } from "./button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./table"
import { cn } from "@/lib/utils"

// Enhanced Table Component with Expandable Rows
// Designed specifically to preserve 100% existing functionality
// while providing modern visual enhancement

interface ColumnDef {
  accessorKey: string
  header: string
  cell?: (value: any, row: any) => React.ReactNode
}

interface EnhancedTableProps {
  // Core data - MANDATORY
  data: any[]
  columns: ColumnDef[]

  // Expandable functionality - CRITICAL (must preserve existing)
  expandable?: {
    enabled: boolean
    render: (row: any) => React.ReactNode
  }

  // Pagination - MANDATORY (must preserve existing)
  pagination?: {
    pageIndex: number
    pageSize: number
    totalItems: number
    onPageChange: (page: number) => void
    onPageSizeChange: (size: number) => void
  }

  // Search - MANDATORY (must preserve existing)
  search?: {
    value: string
    onChange: (value: string) => void
    placeholder?: string
  }

  // Filter - MANDATORY (must preserve existing)
  filter?: {
    value: string
    onChange: (value: string) => void
    options: Array<{ label: string; value: string }>
  }

  // Sorting - MANDATORY (must preserve existing)
  sorting?: {
    column: string
    direction: 'asc' | 'desc'
    onSort: (column: string) => void
  }

  // Loading state
  loading?: boolean

  // Empty state
  emptyMessage?: string

  // All existing props must be preserved
  className?: string
  [key: string]: any
}

export function EnhancedTable({
  data,
  columns,
  expandable,
  pagination,
  search,
  filter,
  sorting,
  loading = false,
  emptyMessage = "No data available",
  className,
  ...props
}: EnhancedTableProps) {
  const [expandedRows, setExpandedRows] = React.useState<Set<number>>(new Set())

  const toggleRowExpansion = (index: number) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(index)) {
      newExpanded.delete(index)
    } else {
      newExpanded.add(index)
    }
    setExpandedRows(newExpanded)
  }

  const getCellValue = (row: any, column: ColumnDef) => {
    const value = row[column.accessorKey]
    return column.cell ? column.cell(value, row) : value
  }

  return (
    <div className={cn("space-y-4", className)} {...props}>
      {/* Search and Filter Controls - Preserve existing functionality */}
      {(search || filter) && (
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          {search && (
            <div className="relative flex-1 max-w-sm">
              <input
                type="text"
                placeholder={search.placeholder || "Search..."}
                value={search.value}
                onChange={(e) => search.onChange(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 pl-10"
              />
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <svg
                  className="h-4 w-4 text-muted-foreground"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
            </div>
          )}

          {filter && (
            <select
              value={filter.value}
              onChange={(e) => filter.onChange(e.target.value)}
              className="flex h-10 w-full sm:w-[180px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {filter.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      {/* Enhanced Table with Expandable Rows */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {expandable?.enabled && (
                <TableHead className="w-[50px]">Expand</TableHead>
              )}
              {columns.map((column, index) => (
                <TableHead
                  key={column.accessorKey}
                  className={cn(
                    sorting?.column === column.accessorKey &&
                      "cursor-pointer select-none hover:bg-muted/50",
                    index === 0 && "text-left"
                  )}
                  onClick={() => {
                    if (sorting && column.accessorKey === sorting.column) {
                      sorting.onSort(column.accessorKey)
                    }
                  }}
                >
                  <div className="flex items-center space-x-2">
                    <span>{column.header}</span>
                    {sorting?.column === column.accessorKey && (
                      <span className="text-muted-foreground">
                        {sorting.direction === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length + (expandable?.enabled ? 1 : 0)}
                  className="h-24 text-center"
                >
                  Loading...
                </TableCell>
              </TableRow>
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length + (expandable?.enabled ? 1 : 0)}
                  className="h-24 text-center"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              data.map((row, index) => (
                <React.Fragment key={index}>
                  <TableRow className="hover:bg-muted/50">
                    {expandable?.enabled && (
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleRowExpansion(index)}
                          className="h-8 w-8 p-0"
                        >
                          {expandedRows.has(index) ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </Button>
                      </TableCell>
                    )}
                    {columns.map((column) => (
                      <TableCell key={column.accessorKey}>
                        {getCellValue(row, column)}
                      </TableCell>
                    ))}
                  </TableRow>

                  {/* Expanded Row - Preserve existing expandable functionality */}
                  {expandable?.enabled && expandedRows.has(index) && (
                    <TableRow>
                      <TableCell
                        colSpan={columns.length + 1}
                        className="bg-muted/20 p-4"
                      >
                        <div className="space-y-2">
                          {expandable.render(row)}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination - Preserve existing functionality */}
      {pagination && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {pagination.pageIndex * pagination.pageSize + 1} to{' '}
            {Math.min((pagination.pageIndex + 1) * pagination.pageSize, pagination.totalItems)} of{' '}
            {pagination.totalItems} entries
          </div>
          <div className="flex items-center space-x-2">
            <select
              value={pagination.pageSize}
              onChange={(e) => pagination.onPageSizeChange(Number(e.target.value))}
              className="h-8 rounded border border-input bg-background px-2 text-sm"
            >
              {[10, 20, 30, 40, 50].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
            <div className="flex items-center space-x-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => pagination.onPageChange(0)}
                disabled={pagination.pageIndex === 0}
              >
                {'<<'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => pagination.onPageChange(pagination.pageIndex - 1)}
                disabled={pagination.pageIndex === 0}
              >
                {'<'}
              </Button>
              <span className="px-2 text-sm">
                Page {pagination.pageIndex + 1} of{' '}
                {Math.ceil(pagination.totalItems / pagination.pageSize)}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => pagination.onPageChange(pagination.pageIndex + 1)}
                disabled={
                  pagination.pageIndex >=
                  Math.ceil(pagination.totalItems / pagination.pageSize) - 1
                }
              >
                {'>'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  pagination.onPageChange(
                    Math.ceil(pagination.totalItems / pagination.pageSize) - 1
                  )
                }
                disabled={
                  pagination.pageIndex >=
                  Math.ceil(pagination.totalItems / pagination.pageSize) - 1
                }
              >
                {'>>'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}