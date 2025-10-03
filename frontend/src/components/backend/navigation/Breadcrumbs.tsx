import { Link, useLocation, useParams } from 'react-router-dom'

// Map path segments to readable labels
const LABELS: Record<string, string> = {
  'dashboard': 'Dashboard',
  'pos': 'POS',
  'products': 'Products',
  'orders': 'Orders',
  'users': 'Users',
  'roles': 'Roles',
  'tenants': 'Tenant',
  'customers': 'Customers',
}

export function Breadcrumbs() {
  const location = useLocation()
  const params = useParams()

  const segments = location.pathname.replace(/^\/+|\/+$/g, '').split('/')
  const parts: { path: string; label: string }[] = []

  let pathAcc = ''
  for (const seg of segments) {
    if (!seg) continue
    pathAcc += `/${seg}`
    let label = LABELS[seg] || decodeURIComponent(seg)
    if (seg === params.tenantId) label = 'Tenant ' + seg.slice(0, 8)
    parts.push({ path: pathAcc, label })
  }

  if (parts.length === 0) {
    parts.push({ path: '/', label: 'Home' })
  }

  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex items-center gap-2 text-xs sm:text-sm">
        {parts.map((p, idx) => (
          <li key={p.path} className="flex items-center gap-2">
            {idx > 0 && <span className="opacity-60">/</span>}
            {idx < parts.length - 1 ? (
              <Link to={p.path} className="hover:underline opacity-80 hover:opacity-100">{p.label}</Link>
            ) : (
              <span className="font-medium">{p.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}