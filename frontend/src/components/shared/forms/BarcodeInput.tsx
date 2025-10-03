import React from 'react'

interface BarcodeInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onBarcode: (code: string) => void
  minLength?: number
}

// Simple barcode input: listen to fast key events or Enter key
export const BarcodeInput: React.FC<BarcodeInputProps> = ({ onBarcode, minLength = 6, ...props }) => {
  const buffer = React.useRef('')
  const lastTime = React.useRef<number>(0)

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const now = Date.now()
    const delta = now - lastTime.current
    lastTime.current = now

    if (e.key === 'Enter') {
      if (buffer.current.length >= minLength) {
        onBarcode(buffer.current)
      }
      buffer.current = ''
      ;(e.target as HTMLInputElement).value = ''
      return
    }

    if (e.key.length === 1 && delta < 30) {
      buffer.current += e.key
    } else {
      buffer.current = ''
    }
  }

  return <input {...props} onKeyDown={onKeyDown} />
}