import { useScrollTop } from '@/hooks/useScrollTop'

// Floating button to quickly scroll to top
export function ScrollToTopButton() {
  const visible = useScrollTop(300)
  if (!visible) return null
  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      className="fixed bottom-6 right-6 rounded-full bg-primary-600 text-white shadow-lg hover:bg-primary-700 transition-colors p-3"
      aria-label="Scroll to top"
    >
      ↑
    </button>
  )
}