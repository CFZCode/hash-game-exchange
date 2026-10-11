'use client'

import type { ReactNode } from 'react'

import {
  DatePicker,
  DateRangePicker,
  DateTimePicker,
  type DatePickerProps,
  type DateRangePickerProps,
  type DateTimePickerProps
} from '@/components/ui/date-picker'
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'

type Base = { id: string; label: ReactNode; hint?: ReactNode; required?: boolean }

export const TextField = ({
  id,
  label,
  hint,
  required,
  ...input
}: Base & Omit<React.ComponentProps<typeof Input>, 'id'>) => (
  <Field className='gap-2'>
    <FieldLabel htmlFor={id}>{label}{required && ' *'}</FieldLabel>
    <Input id={id} required={required} {...input} />
    {hint && <FieldDescription>{hint}</FieldDescription>}
  </Field>
)

/** `value`/`onChange` use 'yyyy-MM-dd' strings, like the old `type='date'` input. */
export const DateField = ({ id, label, hint, required, ...picker }: Base & Omit<DatePickerProps, 'id'>) => (
  <Field className='gap-2'>
    <FieldLabel htmlFor={id}>{label}{required && ' *'}</FieldLabel>
    <DatePicker id={id} required={required} {...picker} />
    {hint && <FieldDescription>{hint}</FieldDescription>}
  </Field>
)

/** `value`/`onChange` use 'yyyy-MM-ddTHH:mm' local strings, like the old `type='datetime-local'` input. */
export const DateTimeField = ({ id, label, hint, required, ...picker }: Base & Omit<DateTimePickerProps, 'id'>) => (
  <Field className='gap-2'>
    <FieldLabel htmlFor={id}>{label}{required && ' *'}</FieldLabel>
    <DateTimePicker id={id} required={required} {...picker} />
    {hint && <FieldDescription>{hint}</FieldDescription>}
  </Field>
)

export const DateRangeField = ({ id, label, hint, required, ...picker }: Base & Omit<DateRangePickerProps, 'id'>) => (
  <Field className='gap-2'>
    <FieldLabel htmlFor={id}>{label}{required && ' *'}</FieldLabel>
    <DateRangePicker id={id} required={required} className='sm:w-full' {...picker} />
    {hint && <FieldDescription>{hint}</FieldDescription>}
  </Field>
)

export const TextAreaField = ({ id, label, hint, required, ...input }: Base & Omit<React.ComponentProps<typeof Textarea>, 'id'>) => (
  <Field className='gap-2'>
    <FieldLabel htmlFor={id}>{label}{required && ' *'}</FieldLabel>
    <Textarea id={id} required={required} {...input} />
    {hint && <FieldDescription>{hint}</FieldDescription>}
  </Field>
)

export const SelectField = ({
  id,
  label,
  hint,
  value,
  onChange,
  options,
  placeholder
}: Base & {
  value: string
  onChange: (value: string) => void
  options: { value: string; label: ReactNode }[]
  placeholder?: string
}) => (
  <Field className='gap-2'>
    <FieldLabel htmlFor={id}>{label}</FieldLabel>
    <Select value={value} onValueChange={v => v !== null && onChange(v)}>
      <SelectTrigger id={id} className='w-full'>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map(o => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
    {hint && <FieldDescription>{hint}</FieldDescription>}
  </Field>
)

export const SwitchField = ({
  id,
  label,
  hint,
  checked,
  onChange,
  disabled
}: Base & { checked: boolean; onChange: (checked: boolean) => void; disabled?: boolean }) => (
  <Field orientation='horizontal' className='items-center justify-between gap-4 rounded-md border px-3 py-2'>
    <div className='min-w-0'>
      <FieldLabel htmlFor={id} className='cursor-pointer'>{label}</FieldLabel>
      {hint && <FieldDescription className='text-xs'>{hint}</FieldDescription>}
    </div>
    <Switch id={id} checked={checked} onCheckedChange={onChange} disabled={disabled} />
  </Field>
)
