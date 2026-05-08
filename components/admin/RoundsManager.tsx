'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Round, Season, SeasonTeam, Team, Match } from '@/lib/supabase/types'

interface Props {
  rounds: Round[]
  seasons: Season[]
  defaultSeasonTeams: (SeasonTeam & { team: Team })[]
  defaultMatches: Match[]
  defaultSeasonId: string
}

function generateDoubleRoundRobin(teamIds: string[]): { home: string; away: string }[][] {
  const teams = [...teamIds]
  if (teams.length % 2 === 1) teams.push('bye')
  const n = teams.length
  const fixed = teams[0]
  const rotating = teams.slice(1)
  const firstHalf: { home: string; away: string }[][] = []

  for (let r = 0; r < n - 1; r++) {
    const round: { home: string; away: string }[] = []
    if (fixed !== 'bye' && rotating[0] !== 'bye') round.push({ home: fixed, away: rotating[0] })
    for (let i = 1; i < n / 2; i++) {
      const t1 = rotating[i], t2 = rotating[n - 2 - i]
      if (t1 !== 'bye' && t2 !== 'bye') round.push({ home: t1, away: t2 })
    }
    firstHalf.push(round)
    rotating.unshift(rotating.pop()!)
  }

  const secondHalf = firstHalf.map(r => r.map(m => ({ home: m.away, away: m.home })))
  return [...firstHalf, ...secondHalf]
}

export default function RoundsManager({ rounds, seasons, defaultSeasonTeams, defaultMatches, defaultSeasonId }: Props) {
  const [seasonId, setSeasonId] = useState(defaultSeasonId)
  const [currentTeams, setCurrentTeams] = useState(defaultSeasonTeams)
  const [currentMatches, setCurrentMatches] = useState(defaultMatches)
  const [form, setForm] = useState({ name: '', round_number: rounds.length + 1 })
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const changeSeasonId = async (id: string) => {
    setSeasonId(id)
    const [teamsRes, matchesRes] = await Promise.all([
      supabase.from('season_teams').select('*, team:teams(*)').eq('season_id', id),
      supabase.from('matches').select('*, home_team:teams!home_team_id(*), away_team:teams!away_team_id(*)').eq('season_id', id).eq('is_playoff', false),
    ])
    setCurrentTeams((teamsRes.data ?? []) as (SeasonTeam & { team: Team })[])
    setCurrentMatches((matchesRes.data ?? []) as Match[])
  }

  const seasonRounds = rounds
    .filter(r => r.season_id === seasonId && !r.is_playoff)
    .sort((a, b) => a.round_number - b.round_number)

  const n = currentTeams.length
  const totalRounds = n < 2 ? 0 : n % 2 === 0 ? 2 * (n - 1) : 2 * n
  const matchesPerRound = Math.floor(n / 2)
  const hasBye = n % 2 === 1

  const handleGenerate = async () => {
    if (n < 2) return
    const msg = seasonRounds.length > 0
      ? `Resetirati raspored? Sva postojeća kola i utakmice ove sezone bit će obrisani.\n\n${n} ekipa → ${totalRounds} kola`
      : `Generirati raspored?\n\n${n} ekipa → ${totalRounds} kola, ${matchesPerRound} utakmic${matchesPerRound === 1 ? 'a' : 'e'} po kolu${hasBye ? ' (jedna ekipa slobodna)' : ''}\nSvaka ekipa igra sa svakom točno 2 puta.`
    if (!confirm(msg)) return

    setLoading(true)

    if (seasonRounds.length > 0) {
      const ids = seasonRounds.map(r => r.id)
      await supabase.from('matches').delete().in('round_id', ids)
      await supabase.from('rounds').delete().in('id', ids)
    }

    const schedule = generateDoubleRoundRobin(currentTeams.map(st => st.team_id))
    const { data: newRounds } = await supabase.from('rounds').insert(
      schedule.map((_, i) => ({ season_id: seasonId, name: `${i + 1}. kolo`, round_number: i + 1, is_playoff: false }))
    ).select()

    if (newRounds && schedule.length > 0) {
      const matchInserts = schedule.flatMap((pairs, i) =>
        pairs.map(p => ({
          season_id: seasonId,
          round_id: newRounds[i].id,
          home_team_id: p.home,
          away_team_id: p.away,
          status: 'scheduled',
          is_playoff: false,
        }))
      )
      await supabase.from('matches').insert(matchInserts)
    }

    setLoading(false)
    router.refresh()
  }

  const handleAddRound = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    await supabase.from('rounds').insert({ season_id: seasonId, name: form.name, round_number: form.round_number, is_playoff: false })
    setForm(f => ({ name: '', round_number: f.round_number + 1 }))
    setLoading(false)
    router.refresh()
  }

  const handleDeleteRound = async (id: string) => {
    if (!confirm('Obriši kolo? Sve utakmice u kolu biti će obrisane.')) return
    await supabase.from('rounds').delete().eq('id', id)
    router.refresh()
  }

  const saveMatchDate = async (matchId: string, date: string) => {
    await supabase.from('matches').update({ match_date: date || null }).eq('id', matchId)
  }

  const roundMatches = (roundId: string) =>
    currentMatches.filter(m => m.round_id === roundId).sort((a, b) =>
      (a.home_team?.name ?? '').localeCompare(b.home_team?.name ?? '')
    )

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Label>Sezona:</Label>
        <Select value={seasonId} onValueChange={v => v && changeSeasonId(v)} items={seasons.map(s => ({ value: s.id, label: s.name }))}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>{seasons.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      {/* Auto schedule generator */}
      <div className="border rounded-lg p-4 space-y-3">
        <h3 className="font-semibold">Automatski raspored (krug-krug)</h3>
        {n < 2 ? (
          <p className="text-sm text-muted-foreground">Dodaj najmanje 2 ekipe u sezonu da bi mogao generirati raspored.</p>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              <strong>{n} ekipa</strong> → <strong>{totalRounds} kola</strong>,{' '}
              {matchesPerRound} utakmic{matchesPerRound === 1 ? 'a' : 'e'} po kolu
              {hasBye && <span className="text-amber-600"> (neparan broj ekipa — jedna slobodna po kolu)</span>}
              {' '}· svaka ekipa igra sa svakom točno <strong>2×</strong>
            </p>
            <Button onClick={handleGenerate} disabled={loading} variant={seasonRounds.length > 0 ? 'outline' : 'default'}>
              {loading ? 'Generira...' : seasonRounds.length > 0 ? '↺ Resetiraj raspored' : '⚡ Generiraj raspored'}
            </Button>
          </>
        )}
      </div>

      {/* Round list with match date editors */}
      {seasonRounds.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Kola ({seasonRounds.length})
          </p>
          {seasonRounds.map(round => {
            const rm = roundMatches(round.id)
            const dated = rm.filter(m => m.match_date).length
            const isOpen = expanded === round.id

            return (
              <div key={round.id} className="border rounded-lg overflow-hidden">
                <button
                  type="button"
                  className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-muted/40 transition-colors text-left"
                  onClick={() => setExpanded(isOpen ? null : round.id)}
                >
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="font-medium">{round.name}</span>
                    <Badge variant="secondary" className="text-xs">{rm.length} utakmic{rm.length === 1 ? 'a' : 'e'}</Badge>
                    {rm.length > 0 && (
                      <span className={`text-xs ${dated === rm.length ? 'text-green-600' : 'text-muted-foreground'}`}>
                        {dated}/{rm.length} datuma
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm" variant="ghost"
                      className="text-destructive text-xs h-6 px-2"
                      onClick={e => { e.stopPropagation(); handleDeleteRound(round.id) }}
                    >
                      Obriši
                    </Button>
                    <span className="text-muted-foreground text-xs">{isOpen ? '▲' : '▼'}</span>
                  </div>
                </button>

                {isOpen && (
                  <div className="border-t bg-muted/20 px-4 py-3 space-y-2">
                    {rm.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Nema utakmica — dodaj ih u sekciji Utakmice.</p>
                    ) : (
                      rm.map(m => (
                        <div key={m.id} className="flex items-center gap-3 flex-wrap">
                          <span className="text-sm min-w-[220px]">
                            <span className="font-medium">{m.home_team?.name}</span>
                            <span className="text-muted-foreground mx-1">vs</span>
                            <span className="font-medium">{m.away_team?.name}</span>
                          </span>
                          <div className="flex items-center gap-2">
                            <Input
                              type="datetime-local"
                              className="h-7 text-xs w-44"
                              defaultValue={m.match_date ? m.match_date.slice(0, 16) : ''}
                              onBlur={e => saveMatchDate(m.id, e.target.value)}
                            />
                            {m.status === 'finished' && (
                              <Badge variant="secondary" className="text-xs">
                                {m.home_score}–{m.away_score}
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Manual round add */}
      <div className="border-t pt-4">
        <h3 className="font-semibold text-sm mb-3">Dodaj kolo ručno</h3>
        <form onSubmit={handleAddRound} className="flex gap-3 items-end flex-wrap">
          <div className="space-y-1">
            <Label>Naziv kola</Label>
            <Input placeholder="npr. 1. kolo" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required className="w-40" />
          </div>
          <div className="space-y-1">
            <Label>Broj</Label>
            <Input type="number" value={form.round_number} onChange={e => setForm(f => ({ ...f, round_number: +e.target.value }))} className="w-20" />
          </div>
          <Button type="submit" disabled={loading || !seasonId}>+ Dodaj kolo</Button>
        </form>
      </div>
    </div>
  )
}
