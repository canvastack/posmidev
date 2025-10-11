import React from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import { DataTable, selectionColumn } from '@/components/data/DataTable'
import { toCSV } from '@/utils/csv'

interface Product {
  id: string
  name: string
  price: number
  status: 'active' | 'inactive'
}

export const ProductsTableExample: React.FC = () => {
  const [pageIndex, setPageIndex] = React.useState(0)
  const [pageSize, setPageSize] = React.useState(10)
  const [rows, setRows] = React.useState<Product[]>(Array.from({ length: 47 }).map((_, i) => ({ id: String(i + 1), name: `Product ${i + 1}`, price: (i + 1) * 1000, status: i % 2 ? 'active' : 'inactive' })))

  const columns: ColumnDef<Product>[] = [
    selectionColumn<Product>(),
    { accessorKey: 'name', header: 'Name', cell: (info) => <span className="font-medium">{info.getValue() as string}</span> },
    { accessorKey: 'price', header: 'Price', cell: (info) => <span>Rp {(info.getValue() as number).toLocaleString('id-ID')}</span> },
    { accessorKey: 'status', header: 'Status', cell: (info) => <span className="uppercase text-xs">{info.getValue() as string}</span> },
  ]

  const downloadCSV = () => {
    const csv = toCSV(rows, [
      { key: 'id', label: 'ID' },
      { key: 'name', label: 'Name' },
      { key: 'price', label: 'Price' },
      { key: 'status', label: 'Status' },
    ])
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'products.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <button className="px-3 py-1.5 rounded-md bg-primary-600 text-white hover:bg-primary-700" onClick={downloadCSV}>Export CSV</button>
      </div>
      <DataTable<Product, any>
        columns={columns}
        data={rows.slice(pageIndex * pageSize, pageIndex * pageSize + pageSize)}
        pageCount={Math.ceil(rows.length / pageSize)}
        state={{ pageIndex, pageSize }}
        manualPagination
        onPaginationChange={(pi, ps) => { setPageIndex(pi); setPageSize(ps) }}
        enableRowSelection
      />
    </div>
  )
}