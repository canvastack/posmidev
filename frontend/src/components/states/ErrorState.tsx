import React from 'react'

export const ErrorState: React.FC<{ title?: string; description?: string; onRetry?: () => void }> = ({ title = 'Something went wrong', description = 'Please try again later.', onRetry }) => {
  return (
    <div className="flex flex-col items-center justify-center text-center p-8 card border-l-4 border-danger-500">
      <div className="text-2xl">⚠️</div>
      <h3 className="mt-2 text-sm font-semibold text-danger-600">{title}</h3>
      <p className="mt-1 text-sm opacity-80 max-w-md">{description}</p>
      {onRetry && (
        <button className="mt-4 px-3 py-1.5 rounded-md bg-danger-600 text-white hover:bg-danger-700" onClick={onRetry}>
          Retry
        </button>
      )}
    </div>
  )
}