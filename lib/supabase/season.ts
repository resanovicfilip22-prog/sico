import { SupabaseClient } from '@supabase/supabase-js'
import { Season } from './types'

export async function resolveSeasonAndAll(
  supabase: SupabaseClient,
  seasonIdParam?: string
): Promise<{ season: Season | null; allSeasons: Season[] }> {
  const { data: allSeasons } = await supabase
    .from('seasons')
    .select('*')
    .order('year_start', { ascending: false })

  if (!allSeasons || allSeasons.length === 0) return { season: null, allSeasons: [] }

  if (seasonIdParam) {
    const found = allSeasons.find(s => s.id === seasonIdParam) ?? null
    return { season: found, allSeasons }
  }

  const active = allSeasons.find(s => s.is_active) ?? allSeasons[0]
  return { season: active, allSeasons }
}
