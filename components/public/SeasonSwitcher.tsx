'use client'

import { useRouter, usePathname } from 'next/navigation'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Season } from '@/lib/supabase/types'

interface Props {
  seasons: Season[]
  currentSeasonId: string
}

export default function SeasonSwitcher({ seasons, currentSeasonId }: Props) {
  const router = useRouter()
  const pathname = usePathname()

  const handleChange = (seasonId: string | null) => {
    if (!seasonId) return
    const activeSeason = seasons.find(s => s.is_active)
    if (seasonId === activeSeason?.id) {
      router.push(pathname)
    } else {
      router.push(`${pathname}?s=${seasonId}`)
    }
  }

  return (
    <Select value={currentSeasonId} onValueChange={handleChange} items={seasons.map(s => ({ value: s.id, label: s.name + (s.is_active ? ' (aktivna)' : '') }))}>
      <SelectTrigger className="w-44">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {seasons.map(s => (
          <SelectItem key={s.id} value={s.id}>
            {s.name}{s.is_active ? ' (aktivna)' : ''}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
