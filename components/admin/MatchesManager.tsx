'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Match, Round, Season, SeasonTeam, Team } from '@/lib/supabase/types'
import Link from 'next/link'

interface Props {
  matches: Match[]
  rounds: Round[]
  seasonTeams: (SeasonTeam & { team: Team })[]
  seasons: Season[]
  defaultSeasonId: string
}

export default function MatchesManager({ matches, rounds, seasonTeams, seasons, defaultSeasonId }: Props) {
  const [seasonId, setSeasonId] = useState(defaultSeasonId)
  const [form, setForm] = useState({ round_id: '', home_team_id: '', away_team_id: '', match_date: '' })
  const [loading, setLoading] = useState(false)
  const [editScoreId, setEditScoreId] = useState<string | null>(null)
  const [scoreForm, setScoreForm] = useState({ home_score: '', away_score: '' })
  const router = useRouter()
  const supabase = createClient()

  const handleAddMatch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (form.home_team_id === form.away_team_id) return
    setLoading(true)
    await supabase.from('matches').insert({
      season_id: seasonId,
      round_id: form.round_id,
      home_team_id: form.home_team_id,
      away_team_id: form.away_team_id,
      match_date: form.match_date || null,
      status: 'scheduled',
      is_playoff: false,
    })
    setForm(f => ({ ...f, home_team_id: '', away_team_id: '', match_date: '' }))
    setLoading(false)
    router.refresh()
  }

  const handleSaveScore = async (matchId: string) => {
    setLoading(true)
    await supabase.from('matches').update({
      home_score: +scoreForm.home_score,
      away_score: +scoreForm.away_score,
      status: 'finished',
    }).eq('id', matchId)
    setEditScoreId(null)
    setLoading(false)
    router.refresh()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Obriši utakmicu?')) return
    await supabase.from('matches').delete().eq('id', id)
    router.refresh()
  }

  const regularRounds = rounds.filter(r => !r.is_playoff && r.season_id === seasonId)
  const seasonMatches = matches.filter(m => m.season_id === seasonId && !m.is_playoff)

  const teamsInSelectedRound = form.round_id
    ? new Set(seasonMatches.filter(m => m.round_id === form.round_id).flatMap(m => [m.home_team_id, m.away_team_id]))
    : new Set<string>()

  const availableForHome = seasonTeams.filter(st => !teamsInSelectedRound.has(st.team_id) && st.team_id !== form.away_team_id)
  const availableForAway = seasonTeams.filter(st => !teamsInSelectedRound.has(st.team_id) && st.team_id !== form.home_team_id)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Label>Sezona:</Label>
        <Select value={seasonId} onValueChange={v => v && setSeasonId(v)} items={seasons.map(s => ({ value: s.id, label: s.name }))}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            {seasons.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <form onSubmit={handleAddMatch} className="grid grid-cols-2 md:grid-cols-5 gap-3 items-end border rounded-lg p-4">
        <div className="space-y-1">
          <Label>Kolo</Label>
          <Select value={form.round_id} onValueChange={v => { if (v) setForm(f => ({ ...f, round_id: v, home_team_id: '', away_team_id: '' })) }} items={regularRounds.map(r => ({ value: r.id, label: r.name }))}>
            <SelectTrigger><SelectValue placeholder="Odaberi kolo" /></SelectTrigger>
            <SelectContent>
              {regularRounds.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Domaćin</Label>
          <Select value={form.home_team_id} onValueChange={v => { if (v) setForm(f => ({ ...f, home_team_id: v })) }} items={availableForHome.map(st => ({ value: st.team_id, label: st.team?.name ?? '' }))}>
            <SelectTrigger><SelectValue placeholder="Domaćin" /></SelectTrigger>
            <SelectContent>
              {availableForHome.map(st => <SelectItem key={st.team_id} value={st.team_id}>{st.team?.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Gost</Label>
          <Select value={form.away_team_id} onValueChange={v => { if (v) setForm(f => ({ ...f, away_team_id: v })) }} items={availableForAway.map(st => ({ value: st.team_id, label: st.team?.name ?? '' }))}>
            <SelectTrigger><SelectValue placeholder="Gost" /></SelectTrigger>
            <SelectContent>
              {availableForAway.map(st => <SelectItem key={st.team_id} value={st.team_id}>{st.team?.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Datum</Label>
          <Input type="datetime-local" value={form.match_date} onChange={e => setForm(f => ({ ...f, match_date: e.target.value }))} />
        </div>
        <Button type="submit" disabled={loading || !form.round_id || !form.home_team_id || !form.away_team_id}>
          + Dodaj utakmicu
        </Button>
      </form>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Kolo</TableHead>
            <TableHead>Domaćin</TableHead>
            <TableHead className="text-center">Rezultat</TableHead>
            <TableHead>Gost</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Akcije</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {seasonMatches.map(match => (
            <TableRow key={match.id}>
              <TableCell className="text-sm text-muted-foreground">{match.round?.name}</TableCell>
              <TableCell className="font-medium">{match.home_team?.name}</TableCell>
              <TableCell className="text-center">
                {editScoreId === match.id ? (
                  <div className="flex items-center gap-1 justify-center">
                    <Input
                      type="number"
                      min="0"
                      value={scoreForm.home_score}
                      onChange={e => setScoreForm(f => ({ ...f, home_score: e.target.value }))}
                      className="w-14 h-7 text-center"
                    />
                    <span>-</span>
                    <Input
                      type="number"
                      min="0"
                      value={scoreForm.away_score}
                      onChange={e => setScoreForm(f => ({ ...f, away_score: e.target.value }))}
                      className="w-14 h-7 text-center"
                    />
                  </div>
                ) : (
                  match.status === 'finished'
                    ? <span className="font-bold">{match.home_score} – {match.away_score}</span>
                    : <span className="text-muted-foreground">-</span>
                )}
              </TableCell>
              <TableCell className="font-medium">{match.away_team?.name}</TableCell>
              <TableCell>
                <Badge variant={match.status === 'finished' ? 'secondary' : 'outline'}>
                  {match.status === 'finished' ? 'Završena' : 'Zakazana'}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex gap-1 justify-end">
                  {editScoreId === match.id ? (
                    <>
                      <Button size="sm" onClick={() => handleSaveScore(match.id)} disabled={loading}>Spremi</Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditScoreId(null)}>Odustani</Button>
                    </>
                  ) : (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditScoreId(match.id)
                          setScoreForm({ home_score: String(match.home_score ?? ''), away_score: String(match.away_score ?? '') })
                        }}
                      >
                        {match.status === 'finished' ? 'Izmijeni' : 'Unesi rezultat'}
                      </Button>
                      {match.status !== 'finished' && (
                        <Link href={`/admin/matches/${match.id}/live`} className={cn(buttonVariants({ size: 'sm', variant: 'outline' }))}>
                          ● Live
                        </Link>
                      )}
                      {match.status === 'finished' && (
                        <Link href={`/admin/matches/${match.id}/stats`} className={cn(buttonVariants({ size: 'sm' }))}>Statistika</Link>
                      )}
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(match.id)}>×</Button>
                    </>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
          {seasonMatches.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground">Nema utakmica za ovu sezonu.</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
