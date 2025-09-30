import { useParams, Link } from 'react-router-dom'

export default function ProductDetailPublicPage() {
  const { id } = useParams()

  return (
    <div className="space-y-4">
      <Link to="/products" className="text-sm text-primary">← Back to products</Link>
      <div className="grid md:grid-cols-2 gap-6">
        <div className="aspect-square bg-muted rounded" />
        <div>
          <h1 className="text-2xl font-bold">Public Product {id}</h1>
          <p className="text-muted-foreground mt-2">This is a public product detail page. Integrate with public API when available.</p>
          <div className="mt-4 flex gap-3">
            <button className="btn">Add to Cart</button>
            <button className="btn" onClick={() => alert('Demo only')}>Buy Now</button>
          </div>
        </div>
      </div>
    </div>
  )
}