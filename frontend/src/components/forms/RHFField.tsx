import React from 'react'
import { Controller, Control, FieldValues, Path } from 'react-hook-form'
import { FormField } from './FormField'

interface RHFFieldProps<T extends FieldValues> {
  control: Control<T>
  name: Path<T>
  label?: string
  description?: string
  render: (field: any, fieldState: { error?: { message?: string } }) => React.ReactNode
}

export function RHFField<T extends FieldValues>({ control, name, label, description, render }: RHFFieldProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <FormField label={label} htmlFor={name} error={fieldState.error?.message} description={description}>
          {render(field, fieldState)}
        </FormField>
      )}
    />
  )
}