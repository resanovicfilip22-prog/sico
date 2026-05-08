import { createClient } from '@/lib/supabase/server'
import { getSeasons, getRounds, getSeasonTeams, getMatches } from '@/lib/supabase/queries'
import { Card, CardContent } from '@/components/ui/card'
import RoundsManager from '@/components/admin/RoundsManager'
import { Season } from '@/lib/supabase/types'

export default async function AdminRoundsPage() {
  const supabase = await createClient()
  const { data: seasons } = await getSeasons(supabase)
  const activeSeason = seasons?.find((s: Season) => s.is_active) ?? seasons?.[0]

  const [{ data: rounds }, { data: seasonTeams }, { data: matches }] = await Promise.all([
    activeSeason ? getRounds(supabase, activeSeason.id) : Promise.resolve({ data: [] }),
    activeSeason ? getSeasonTeams(supabase, activeSeason.id) : Promise.resolve({ data: [] }),
    activeSeason ? getMatches(supabase, activeSeason.id) : Promise.resolve({ data: [] }),
  ])

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Kola</h1>
      <Card>
        <CardContent className="pt-6">
          <RoundsManager
            rounds={rounds ?? []}
            seasons={seasons ?? []}
            defaultSeasonTeams={(seasonTeams ?? []) as any}
            defaultMatches={(matches ?? []).filter((m: any) => !m.is_playoff)}
            defaultSeasonId={activeSeason?.id ?? ''}
          />
        </CardContent>
      </Card>
    </div>
  )
}
