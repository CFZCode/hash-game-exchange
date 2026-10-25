'use client'

import { useState } from 'react'

import { ImageIcon } from 'lucide-react'

import FormDialog from '@/components/shared/FormDialog'
import { TextField } from '@/components/shared/FormField'
import { Button } from '@/components/ui/button'
import { useApiMutation } from '@/hooks/use-api'
import { api } from '@/lib/api/client'
import { check } from '@/lib/validate'
import type { GisGame } from './types'

/** A lobby tile's image URL, edited from the curated lists (Lobby curation, Vendor/Type Priority). */
export const EditImage = ({ game, onSaved }: { game: Pick<GisGame, 'uuid' | 'name' | 'image'>; onSaved?: () => void }) => {
  const [image, setImage] = useState(game.image ?? '')

  const save = useApiMutation({
    fn: () => api.put(`admin/casino/games/catalogue/${encodeURIComponent(game.uuid)}/image`, { image }),
    invalidate: [['api', 'admin/casino/games/catalogue/search'], ['api', 'admin/casino/games/vendor-search'], ['api', 'admin/casino/games/type-search']],
    success: 'Image updated',
    onSuccess: () => onSaved?.()
  })

  return (
    <FormDialog
      trigger={
        <Button size='sm' variant='ghost'>
          <ImageIcon /> Image
        </Button>
      }
      title={`Tile image — ${game.name}`}
      description='The URL the lobby tile loads. Absolute URL, up to 2048 characters.'
      onSubmit={() => save.mutateAsync()}
      validate={() => ({ img: check.url(image, 'Image URL') || check.length(image, 'Image URL', { max: 2048 }) })}
    >
      <TextField id='img' label='Image URL' required value={image} onChange={e => setImage(e.target.value)} />
      {image && <img src={image} alt='' className='max-h-40 rounded object-contain' />}
    </FormDialog>
  )
}
