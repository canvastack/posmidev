import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

interface PublicProduct {
  id: string
  name: string
  price: number
  image?: string
}

export default function ProductsPublicPage() {
  const [items, setItems] = useState<PublicProduct[]>([])

  // Placeholder: public list (no auth). Replace with real public API when available.
  useEffect(() => {
    setItems([
      { id: '1', name: 'Sample Product A', price: 120000 },
      { id: '2', name: 'Sample Product B', price: 90000 },
      { id: '3', name: 'Sample Product C', price: 185000 },
    ])
  }, [])

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Products (Public)</h1>
      <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
        {items.map(p => (
          <Link key={p.id} to={`/products/${p.id}`} className="card hover:bg-accent/40 transition-colors" >
            <div className="aspect-video bg-muted rounded mb-3" />
            <div className="font-medium">{p.name}</div>
            <div className="text-sm text-muted-foreground">Rp {p.price.toLocaleString('id-ID')}</div>
          </Link>
        ))}
      </div>
    </div>
  )
}