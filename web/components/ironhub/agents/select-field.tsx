"use client"

import { FormField } from "@/components/ironhub/agents/form-field"
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select"

type SelectFieldProps = {
  label: string
  value: string
  values: string[]
  onChange: (value: string) => void
}

export function SelectField({
  label,
  value,
  values,
  onChange,
}: SelectFieldProps) {
  return (
    <FormField label={label}>
      <NativeSelect
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full"
      >
        {values.map((option) => (
          <NativeSelectOption key={option} value={option}>
            {option.replace("-", " ")}
          </NativeSelectOption>
        ))}
      </NativeSelect>
    </FormField>
  )
}
