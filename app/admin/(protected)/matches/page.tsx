import { createClient } from '@/lib/supabase/server'
import { getSeasons, getMatches, getRounds, getSeasonTeams } from '@/lib/supabase/queries'
import { Card, CardContent } from '@/components/ui/card'
import MatchesManager from '@/components/admin/MatchesManager'
import { Season } from '@/lib/supabase/types'

export default async function AdminMatchesPage() {
  const supabase = await createClient()
  const { data: seasons } = await getSeasons(supabase)
  const activeSeason = seasons?.find((s: Season) => s.is_active) ?? seasons?.[0]

  const [{ data: matches }, { data: rounds }, { data: seasonTeams }] = activeSeason
    ? await Promise.all([
        getMatches(supabase, activeSeason.id),
        getRounds(supabase, activeSeason.id),
        getSeasonTeams(supabase, activeSeason.id),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }]

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Utakmice</h1>
      <Card>
        <CardContent className="pt-6">
          <MatchesManager
            matches={matches ?? []}
            rounds={rounds ?? []}
            seasonTeams={seasonTeams ?? []}
            seasons={seasons ?? []}
            defaultSeasonId={activeSeason?.id ?? ''}
          />
        </CardContent>
      </Card>
    </div>
  )
}
