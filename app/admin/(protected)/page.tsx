import { createClient } from '@/lib/supabase/server'
import { getSeasons, computeStandings } from '@/lib/supabase/queries'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { Season } from '@/lib/supabase/types'

export default async function AdminDashboard() {
  const supabase = await createClient()
  const [{ data: seasons }, { count: teamsCount }, { count: playersCount }] = await Promise.all([
    getSeasons(supabase),
    supabase.from('teams').select('*', { count: 'exact', head: true }),
    supabase.from('players').select('*', { count: 'exact', head: true }),
  ])

  const activeSeason = seasons?.find((s: Season) => s.is_active)
  const standings = activeSeason ? await computeStandings(supabase, activeSeason.id) : []

  const { count: matchesCount } = await supabase
    .from('matches')
    .select('*', { count: 'exact', head: true })
    .eq('season_id', activeSeason?.id ?? '')
    .eq('status', 'finished')

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Admin panel</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Ekipe', value: teamsCount ?? 0, href: '/admin/teams' },
          { label: 'Igrači', value: playersCount ?? 0, href: '/admin/players' },
          { label: 'Sezone', value: seasons?.length ?? 0, href: '/admin/seasons' },
          { label: 'Odigrane utakmice', value: matchesCount ?? 0, href: '/admin/matches' },
        ].map(({ label, value, href }) => (
          <Link key={label} href={href}>
            <Card className="hover:border-primary transition-colors cursor-pointer">
              <CardContent className="pt-6">
                <div className="text-3xl font-bold">{value}</div>
                <div className="text-sm text-muted-foreground mt-1">{label}</div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {activeSeason && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {activeSeason.name}
              <Badge>Aktivna sezona</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {standings.slice(0, 5).map((row, i) => (
                <div key={row.team_id} className="flex items-center justify-between text-sm py-1 border-b last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground w-4">{i + 1}.</span>
                    <span className="font-medium">{row.team.name}</span>
                  </div>
                  <span className="text-muted-foreground">{row.wins}P / {row.losses}I</span>
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-4">
              <Link href="/admin/rounds" className="text-sm text-primary hover:underline">Upravljaj kolima →</Link>
              <Link href="/admin/matches" className="text-sm text-primary hover:underline">Unesi rezultate →</Link>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Brze akcije</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {[
              { href: '/admin/seasons', label: '+ Nova sezona' },
              { href: '/admin/teams', label: '+ Nova ekipa' },
              { href: '/admin/players', label: '+ Novi igrač' },
              { href: '/admin/rounds', label: '+ Novo kolo' },
              { href: '/admin/matches', label: '+ Nova utakmica' },
              { href: '/admin/playoff', label: 'Postavi playoff bracket' },
            ].map(({ href, label }) => (
              <Link key={href} href={href} className="block text-sm text-primary hover:underline">
                {label}
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Sezone</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(seasons ?? []).map((s: Season) => (
                <div key={s.id} className="flex items-center justify-between text-sm">
                  <span>{s.name}</span>
                  <div className="flex items-center gap-2">
                    {s.is_active && <Badge variant="secondary" className="text-xs">Aktivna</Badge>}
                    <Link href={`/admin/seasons/${s.id}`} className="text-primary hover:underline text-xs">
                      Uredi
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
