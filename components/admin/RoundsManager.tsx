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

export default function RoundsManager({ rounds, seasons, defaultSeasonTeams, defaultMatches, defaultSeasonId }: Props) {
  const [seasonId, setSeasonId] = useState(defaultSeasonId)
  const [currentRounds, setCurrentRounds] = useState<Round[]>(
    rounds.filter(r => r.season_id === defaultSeasonId && !r.is_playoff)
      .sort((a, b) => a.round_number - b.round_number)
  )
  const [currentTeams, setCurrentTeams] = useState(defaultSeasonTeams)
  const [currentMatches, setCurrentMatches] = useState(defaultMatches)
  const [form, setForm] = useState({ name: '', round_number: defaultMatches.length > 0 ? rounds.filter(r => r.season_id === defaultSeasonId && !r.is_playoff).length + 1 : 1 })
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const changeSeasonId = async (id: string) => {
    setSeasonId(id)
    const [teamsRes, matchesRes, roundsRes] = await Promise.all([
      supabase.from('season_teams').select('*, team:teams(*)').eq('season_id', id),
      supabase.from('matches').select('*, home_team:teams!home_team_id(*), away_team:teams!away_team_id(*)').eq('season_id', id).eq('is_playoff', false),
      supabase.from('rounds').select('*').eq('season_id', id).eq('is_playoff', false).order('round_number'),
    ])
    const newRounds = roundsRes.data ?? []
    setCurrentTeams((teamsRes.data ?? []) as (SeasonTeam & { team: Team })[])
    setCurrentMatches((matchesRes.data ?? []) as Match[])
    setCurrentRounds(newRounds)
    setForm({ name: '', round_number: newRounds.length + 1 })
  }

  const n = currentTeams.length
  const totalRounds = n < 2 ? 0 : n % 2 === 0 ? 2 * (n - 1) : 2 * n
  const matchesPerRound = Math.floor(n / 2)
  const hasBye = n % 2 === 1

  const handleGenerate = async () => {
    if (n < 2) return
    const msg = currentRounds.length > 0
      ? `Resetirati raspored? Sva postojeća kola i utakmice ove sezone bit će obrisani.\n\n${n} ekipa → ${totalRounds} kola, ${matchesPerRound} utakmic${matchesPerRound === 1 ? 'a' : 'e'} po kolu`
      : `Generirati raspored?\n\n${n} ekipa → ${totalRounds} kola, ${matchesPerRound} utakmic${matchesPerRound === 1 ? 'a' : 'e'} po kolu${hasBye ? ' (jedna ekipa slobodna po kolu)' : ''}\nSvaka ekipa igra sa svakom točno 2 puta.`
    if (!confirm(msg)) return

    setLoading(true)
    try {
      // Delete existing regular rounds for this season
      const { data: existing, error: fetchErr } = await supabase
        .from('rounds').select('id').eq('season_id', seasonId).eq('is_playoff', false)
      if (fetchErr) throw new Error('Greška dohvata kola: ' + fetchErr.message)

      if (existing && existing.length > 0) {
        const ids = existing.map(r => r.id)
        const { error: delMatchErr } = await supabase.from('matches').delete().in('round_id', ids)
        if (delMatchErr) throw new Error('Greška brisanja utakmica: ' + delMatchErr.message)
        const { error: delRoundErr } = await supabase.from('rounds').delete().in('id', ids)
        if (delRoundErr) throw new Error('Greška brisanja kola: ' + delRoundErr.message)
      }

      // Create rounds
      const { data: newRounds, error: roundErr } = await supabase.from('rounds').insert(
        Array.from({ length: totalRounds }, (_, i) => ({
          season_id: seasonId, name: `${i + 1}. kolo`, round_number: i + 1, is_playoff: false,
        }))
      ).select()
      if (roundErr) throw new Error('Greška kreiranja kola: ' + roundErr.message)
      if (!newRounds || newRounds.length === 0) throw new Error('Kola nisu kreirana — provjeri Supabase projekt.')

      const sorted = newRounds.sort((a, b) => a.round_number - b.round_number)
      setCurrentRounds(sorted)
      setForm({ name: '', round_number: newRounds.length + 1 })

      // Create empty match slots per round
      if (matchesPerRound > 0) {
        const matchInserts = sorted.flatMap(round =>
          Array.from({ length: matchesPerRound }, () => ({
            season_id: seasonId, round_id: round.id,
            home_team_id: null as null, away_team_id: null as null,
            status: 'scheduled' as const, is_playoff: false,
          }))
        )
        const { data: newMatchesData, error: matchErr } = await supabase
          .from('matches').insert(matchInserts).select()
        if (matchErr) throw new Error(
          'Kola su kreirana, ali utakmice nisu.\n\nUzrok: ' + matchErr.message +
          '\n\nRješenje: pokreni ovu SQL naredbu u Supabase → SQL Editor:\n\n' +
          'ALTER TABLE matches ALTER COLUMN home_team_id DROP NOT NULL;\n' +
          'ALTER TABLE matches ALTER COLUMN away_team_id DROP NOT NULL;'
        )
        setCurrentMatches((newMatchesData ?? []) as Match[])
      }
    } catch (err) {
      alert(String(err))
    } finally {
      setLoading(false)
      router.refresh()
    }
  }

  const handleTeamChange = async (matchId: string, field: 'home' | 'away', teamId: string) => {
    const m = currentMatches.find(x => x.id === matchId)
    if (!m) return

    const newHomeId = field === 'home' ? (teamId || null) : m.home_team_id
    const newAwayId = field === 'away' ? (teamId || null) : m.away_team_id

    // Optimistic update
    setCurrentMatches(prev => prev.map(x => x.id === matchId
      ? { ...x, home_team_id: newHomeId, away_team_id: newAwayId }
      : x
    ))

    // Validate when both teams are selected
    if (newHomeId && newAwayId) {
      if (newHomeId === newAwayId) {
        alert('Domaćin i gost ne mogu biti ista ekipa.')
        setCurrentMatches(prev => prev.map(x => x.id === matchId
          ? { ...x, home_team_id: m.home_team_id, away_team_id: m.away_team_id }
          : x
        ))
        return
      }

      const pairCount = currentMatches.filter(x =>
        x.id !== matchId && x.home_team_id && x.away_team_id && (
          (x.home_team_id === newHomeId && x.away_team_id === newAwayId) ||
          (x.home_team_id === newAwayId && x.away_team_id === newHomeId)
        )
      ).length
      if (pairCount >= 2) {
        alert('Ove dvije ekipe već igraju 2 puta ove sezone.')
        setCurrentMatches(prev => prev.map(x => x.id === matchId
          ? { ...x, home_team_id: m.home_team_id, away_team_id: m.away_team_id }
          : x
        ))
        return
      }
    }

    await supabase.from('matches').update({ home_team_id: newHomeId, away_team_id: newAwayId }).eq('id', matchId)
  }

  const saveMatchDate = async (matchId: string, date: string) => {
    await supabase.from('matches').update({ match_date: date || null }).eq('id', matchId)
  }

  const handleAddRound = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const { data } = await supabase.from('rounds').insert({
      season_id: seasonId, name: form.name, round_number: form.round_number, is_playoff: false,
    }).select().single()
    if (data) {
      setCurrentRounds(prev => [...prev, data].sort((a, b) => a.round_number - b.round_number))
      setForm({ name: '', round_number: currentRounds.length + 2 })
    }
    setLoading(false)
    router.refresh()
  }

  const handleDeleteRound = async (id: string) => {
    if (!confirm('Obriši kolo? Sve utakmice u kolu biti će obrisane.')) return
    await supabase.from('rounds').delete().eq('id', id)
    setCurrentRounds(prev => prev.filter(r => r.id !== id))
    setCurrentMatches(prev => prev.filter(m => m.round_id !== id))
    if (expanded === id) setExpanded(null)
    router.refresh()
  }

  const roundMatches = (roundId: string) => currentMatches.filter(m => m.round_id === roundId)

  const teamItems = currentTeams.map(st => ({ value: st.team_id, label: st.team?.name ?? '' }))

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
            <p className="text-xs text-muted-foreground">
              Kreira prazne slotove — ekipe popuni direktno u pregledu kola ispod.
            </p>
            <Button
              onClick={handleGenerate}
              disabled={loading}
              variant={currentRounds.length > 0 ? 'outline' : 'default'}
            >
              {loading ? 'Generira...' : currentRounds.length > 0 ? '↺ Resetiraj raspored' : '⚡ Generiraj raspored'}
            </Button>
          </>
        )}
      </div>

      {/* Round list with match team selectors */}
      {currentRounds.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Kola ({currentRounds.length})
          </p>
          {currentRounds.map(round => {
            const rm = roundMatches(round.id)
            const assigned = rm.filter(m => m.home_team_id && m.away_team_id).length
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
                      <span className={`text-xs font-medium ${assigned === rm.length ? 'text-green-600' : 'text-amber-600'}`}>
                        {assigned}/{rm.length} popunjeno
                      </span>
                    )}
                    {dated > 0 && (
                      <span className="text-xs text-muted-foreground">{dated}/{rm.length} dat.</span>
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
                  <div className="border-t bg-muted/20 px-4 py-3 space-y-3">
                    {rm.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Nema utakmica u ovom kolu.</p>
                    ) : rm.map(m => (
                      <div key={m.id} className="flex items-center gap-2 flex-wrap">
                        <Select
                          value={m.home_team_id ?? ''}
                          onValueChange={v => v && handleTeamChange(m.id, 'home', v)}
                          items={teamItems}
                        >
                          <SelectTrigger className="h-7 text-xs w-36">
                            <SelectValue placeholder="Domaćin" />
                          </SelectTrigger>
                          <SelectContent>
                            {currentTeams.map(st => (
                              <SelectItem key={st.team_id} value={st.team_id}>{st.team?.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <span className="text-muted-foreground text-xs shrink-0">vs</span>
                        <Select
                          value={m.away_team_id ?? ''}
                          onValueChange={v => v && handleTeamChange(m.id, 'away', v)}
                          items={teamItems}
                        >
                          <SelectTrigger className="h-7 text-xs w-36">
                            <SelectValue placeholder="Gost" />
                          </SelectTrigger>
                          <SelectContent>
                            {currentTeams.map(st => (
                              <SelectItem key={st.team_id} value={st.team_id}>{st.team?.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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
                    ))}
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
            <Input
              placeholder="npr. 1. kolo"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              required
              className="w-40"
            />
          </div>
          <div className="space-y-1">
            <Label>Broj</Label>
            <Input
              type="number"
              value={form.round_number}
              onChange={e => setForm(f => ({ ...f, round_number: +e.target.value }))}
              className="w-20"
            />
          </div>
          <Button type="submit" disabled={loading || !seasonId}>+ Dodaj kolo</Button>
        </form>
      </div>
    </div>
  )
}
