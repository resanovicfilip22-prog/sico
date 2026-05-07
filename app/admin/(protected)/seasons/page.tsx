import { createClient } from '@/lib/supabase/server'
import { getSeasons } from '@/lib/supabase/queries'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import Link from 'next/link'
import { Season } from '@/lib/supabase/types'
import { cn } from '@/lib/utils'
import AddSeasonDialog from '@/components/admin/AddSeasonDialog'

export default async function AdminSeasonsPage() {
  const supabase = await createClient()
  const { data: seasons } = await getSeasons(supabase)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Sezone</h1>
        <AddSeasonDialog />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {(seasons ?? []).map((season: Season) => (
          <Card key={season.id}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-base">
                {season.name}
                {season.is_active && <Badge>Aktivna</Badge>}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground">
                {season.year_start}/{season.year_end} · Playoff top {season.playoff_teams_count}
              </p>
              <Link href={`/admin/seasons/${season.id}`} className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}>
                Uredi / Roster
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
