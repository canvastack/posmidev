import React from 'react'

export const EmptyState: React.FC<{ title?: string; description?: string; action?: React.ReactNode }> = ({ title = 'No data', description = 'There is nothing to show yet.', action }) => {
  return (
    <div className="flex flex-col items-center justify-center text-center p-8 card">
      <div className="text-2xl">🗂️</div>
      <h3 className="mt-2 text-sm font-semibold">{title}</h3>
      <p className="mt-1 text-sm opacity-80 max-w-md">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}