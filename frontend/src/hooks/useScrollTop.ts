import { useEffect, useState } from 'react'

// Returns visibility state for scroll-to-top based on threshold
export function useScrollTop(threshold = 300) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > threshold)
    onScroll()
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [threshold])
  return visible
}