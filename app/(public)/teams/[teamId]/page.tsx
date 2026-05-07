import { createClient } from '@/lib/supabase/server'
import { getSeasons } from '@/lib/supabase/queries'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Match, Season } from '@/lib/supabase/types'

export default async function TeamPage({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params
  const supabase = await createClient()

  const { data: team } = await supabase.from('teams').select('*').eq('id', teamId).single()
  if (!team) notFound()

  const { data: seasons } = await getSeasons(supabase)

  const { data: seasonTeamsRaw } = await supabase
    .from('season_teams')
    .select('season_id')
    .eq('team_id', teamId)

  const teamSeasonIds: string[] = (seasonTeamsRaw ?? []).map((st: { season_id: string }) => st.season_id)
  const teamSeasons = (seasons ?? []).filter((s: Season) => teamSeasonIds.includes(s.id))

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">{team.name}</h1>

      {teamSeasons.length === 0 && (
        <p className="text-muted-foreground">Ova ekipa nije sudjelovala ni u jednoj sezoni.</p>
      )}

      <Tabs defaultValue={teamSeasons[0]?.id ?? 'none'}>
        <TabsList>
          {teamSeasons.map((s: Season) => (
            <TabsTrigger key={s.id} value={s.id}>
              {s.name}
              {s.is_active && <Badge className="ml-1 text-xs" variant="secondary">Aktivna</Badge>}
            </TabsTrigger>
          ))}
        </TabsList>

        {teamSeasons.map((season: Season) => (
          <TeamSeasonTab key={season.id} seasonId={season.id} teamId={teamId} />
        ))}
      </Tabs>
    </div>
  )
}

async function TeamSeasonTab({ seasonId, teamId }: { seasonId: string; teamId: string }) {
  const supabase = await createClient()

  const [{ data: roster }, { data: matches }] = await Promise.all([
    supabase
      .from('player_team_seasons')
      .select('*, player:players(*)')
      .eq('team_id', teamId)
      .eq('season_id', seasonId),
    supabase
      .from('matches')
      .select('*, home_team:teams!home_team_id(*), away_team:teams!away_team_id(*), round:rounds(*)')
      .eq('season_id', seasonId)
      .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
      .eq('status', 'finished')
      .order('match_date'),
  ])

  const finishedMatches = (matches ?? []) as Match[]
  const wins = finishedMatches.filter(m =>
    (m.home_team_id === teamId && (m.home_score ?? 0) > (m.away_score ?? 0)) ||
    (m.away_team_id === teamId && (m.away_score ?? 0) > (m.home_score ?? 0))
  ).length
  const losses = finishedMatches.length - wins

  return (
    <TabsContent value={seasonId} className="space-y-4">
      <div className="flex gap-4">
        <Card className="flex-1">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{wins}–{losses}</div>
            <div className="text-sm text-muted-foreground">Omjer pobjeda/poraza</div>
          </CardContent>
        </Card>
        <Card className="flex-1">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{roster?.length ?? 0}</div>
            <div className="text-sm text-muted-foreground">Igrači u rosteru</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Roster</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {(roster ?? []).map((r: {
              player_id: string
              jersey_number: number | null
              player: { first_name: string; last_name: string; position: string | null }
            }) => (
              <Link key={r.player_id} href={`/players/${r.player_id}`} className="border rounded px-2 py-1 text-sm hover:border-primary transition-colors">
                {r.jersey_number ? <span className="text-muted-foreground mr-1">#{r.jersey_number}</span> : null}
                {r.player?.last_name} {r.player?.first_name}
                {r.player?.position ? <span className="text-muted-foreground ml-1 text-xs">{r.player.position}</span> : null}
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Utakmice</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kolo</TableHead>
                <TableHead>Protivnik</TableHead>
                <TableHead className="text-center">Rezultat</TableHead>
                <TableHead className="text-center">Ishod</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {finishedMatches.map((m: Match) => {
                const isHome = m.home_team_id === teamId
                const opponent = isHome ? m.away_team : m.home_team
                const teamScore = isHome ? m.home_score : m.away_score
                const oppScore = isHome ? m.away_score : m.home_score
                const won = (teamScore ?? 0) > (oppScore ?? 0)
                return (
                  <TableRow key={m.id}>
                    <TableCell className="text-sm text-muted-foreground">{m.round?.name}</TableCell>
                    <TableCell>
                      <Link href={`/teams/${opponent?.id}`} className="hover:underline">
                        {isHome ? '(D) ' : '(G) '}{opponent?.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-center font-bold">
                      <Link href={`/matches/${m.id}`} className="hover:underline">
                        {teamScore} – {oppScore}
                      </Link>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={won ? 'default' : 'destructive'}>
                        {won ? 'P' : 'I'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </TabsContent>
  )
}
