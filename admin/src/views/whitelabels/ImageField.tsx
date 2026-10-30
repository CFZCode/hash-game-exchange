'use client'

import { useEffect } from 'react'

import { UploadIcon, XIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'

export type PickedImage = { type: string; data: string; url: string }

const MAX_BYTES = 256 * 1024
const TYPES = ['image/png', 'image/webp', 'image/svg+xml']

/**
 * One image (logo or square icon) as base64 for admin/whitelabels — the backend checks the bytes
 * again (branding rules). `current` is what is stored now, shown until something new is picked.
 */
const ImageField = ({
  label,
  hint,
  value,
  onChange,
  onError,
  current,
  square
}: {
  label: string
  hint: string
  value: PickedImage | null
  onChange: (image: PickedImage | null) => void
  onError: (message: string) => void
  current?: string | null
  square?: boolean
}) => {
  // The preview's object URL dies with the image it showed.
  useEffect(
    () => () => {
      if (value?.url) URL.revokeObjectURL(value.url)
    },
    [value]
  )

  const pick = (file: File | undefined) => {
    if (!file) return
    if (!TYPES.includes(file.type)) return onError('PNG, WebP or SVG only')
    if (file.size > MAX_BYTES) return onError('At most 256 KB')
    const reader = new FileReader()

    reader.onload = () => onChange({ type: file.type, data: String(reader.result).split(',')[1] ?? '', url: URL.createObjectURL(file) })
    reader.readAsDataURL(file)
  }

  const shown = value?.url ?? current

  return (
    <div className='grid gap-2'>
      <span className='text-sm font-medium'>{label}</span>
      <div className='flex flex-wrap items-center gap-3'>
        {shown && (
           
          <img src={shown} alt={`${label} preview`} className={`bg-muted rounded object-contain p-1 ${square ? 'size-10' : 'h-10 max-w-40'}`} />
        )}
        <Button type='button' variant='outline' size='sm' nativeButton={false} render={<label />}>
          <UploadIcon /> {shown ? 'Change' : 'Upload'}
          <input type='file' accept={TYPES.join(',')} className='hidden' onChange={e => pick(e.target.files?.[0])} />
        </Button>
        {value && (
          <Button type='button' variant='ghost' size='sm' onClick={() => onChange(null)}>
            <XIcon /> Remove
          </Button>
        )}
        <span className='text-muted-foreground text-xs'>{hint}</span>
      </div>
    </div>
  )
}

export default ImageField
