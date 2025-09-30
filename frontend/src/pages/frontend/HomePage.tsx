import { Link } from 'react-router-dom'

export default function HomePage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Welcome to POSMID</h1>
      <p className="text-muted-foreground">This is the public landing page. Explore our products and features.</p>
      <div className="flex gap-3">
        <Link className="btn" to="/products">Browse Products</Link>
        <Link className="btn" to="/features">Features</Link>
      </div>
    </div>
  )
}