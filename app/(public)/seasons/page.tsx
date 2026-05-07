import { createClient } from '@/lib/supabase/server'
import { getSeasons } from '@/lib/supabase/queries'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { Season } from '@/lib/supabase/types'

export default async function SeasonsPage() {
  const supabase = await createClient()
  const { data: seasons } = await getSeasons(supabase)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Sve sezone</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {(seasons ?? []).map((season: Season) => (
          <Card key={season.id} className="hover:border-primary transition-colors">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <Link href={`/seasons/${season.id}`} className="hover:underline">
                  {season.name}
                </Link>
                {season.is_active && <Badge>Aktivna</Badge>}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {season.year_start}/{season.year_end}
              </p>
              <Link href={`/seasons/${season.id}`} className="text-sm text-primary hover:underline mt-2 block">
                Pregledaj sezonu →
              </Link>
            </CardContent>
          </Card>
        ))}
        {!seasons?.length && (
          <p className="text-muted-foreground col-span-3">Nema sezona.</p>
        )}
      </div>
    </div>
  )
}
