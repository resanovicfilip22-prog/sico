import { createClient } from '@/lib/supabase/server'
import { getSeasons, getRounds } from '@/lib/supabase/queries'
import { Card, CardContent } from '@/components/ui/card'
import RoundsManager from '@/components/admin/RoundsManager'
import { Season } from '@/lib/supabase/types'

export default async function AdminRoundsPage() {
  const supabase = await createClient()
  const { data: seasons } = await getSeasons(supabase)
  const activeSeason = seasons?.find((s: Season) => s.is_active) ?? seasons?.[0]

  const { data: rounds } = activeSeason
    ? await getRounds(supabase, activeSeason.id)
    : { data: [] }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Kola</h1>
      <Card>
        <CardContent className="pt-6">
          <RoundsManager
            rounds={rounds ?? []}
            seasons={seasons ?? []}
            defaultSeasonId={activeSeason?.id ?? ''}
          />
        </CardContent>
      </Card>
    </div>
  )
}
