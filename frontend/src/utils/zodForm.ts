import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'

export function useZodForm<T extends z.ZodTypeAny>(schema: T, defaults?: Partial<z.infer<T>>) {
  return useForm<z.infer<T>>({
    resolver: zodResolver(schema),
    defaultValues: defaults as any,
    mode: 'onChange',
  })
}