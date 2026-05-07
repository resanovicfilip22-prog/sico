-- Enable UUID extension
create extension if not exists "pgcrypto";

-- SEASONS
create table seasons (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  year_start int not null,
  year_end int not null,
  is_active boolean not null default false,
  playoff_teams_count int not null default 4,
  created_at timestamptz not null default now()
);

-- TEAMS
create table teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  short_name text not null check (char_length(short_name) <= 4),
  created_at timestamptz not null default now()
);

-- SEASON_TEAMS (which teams participate in a season)
create table season_teams (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references seasons(id) on delete cascade,
  team_id uuid not null references teams(id) on delete cascade,
  unique(season_id, team_id)
);

-- PLAYERS
create table players (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  birth_year int,
  position text check (position in ('PG','SG','SF','PF','C','N/A')),
  created_at timestamptz not null default now()
);

-- PLAYER_TEAM_SEASONS (player on a team in a specific season)
create table player_team_seasons (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references players(id) on delete cascade,
  team_id uuid not null references teams(id) on delete cascade,
  season_id uuid not null references seasons(id) on delete cascade,
  jersey_number int,
  unique(player_id, season_id)
);

-- ROUNDS (kola)
create table rounds (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references seasons(id) on delete cascade,
  round_number int not null,
  name text not null,
  is_playoff boolean not null default false,
  playoff_round int,
  created_at timestamptz not null default now(),
  unique(season_id, round_number)
);

-- PLAYOFF_SERIES (mora biti prije matches zbog FK)
create table playoff_series (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references seasons(id) on delete cascade,
  round int not null,
  position int not null,
  team1_id uuid references teams(id),
  team2_id uuid references teams(id),
  team1_wins int not null default 0,
  team2_wins int not null default 0,
  winner_id uuid references teams(id),
  created_at timestamptz not null default now()
);

-- MATCHES
create table matches (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references seasons(id) on delete cascade,
  round_id uuid not null references rounds(id) on delete cascade,
  home_team_id uuid not null references teams(id),
  away_team_id uuid not null references teams(id),
  home_score int,
  away_score int,
  match_date timestamptz,
  status text not null default 'scheduled' check (status in ('scheduled','finished')),
  is_playoff boolean not null default false,
  playoff_series_id uuid references playoff_series(id),
  playoff_game_number int,
  created_at timestamptz not null default now()
);

-- PLAYER_MATCH_STATS
create table player_match_stats (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references matches(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  team_id uuid not null references teams(id),
  minutes int not null default 0,
  two_pt_made int not null default 0,
  two_pt_attempted int not null default 0,
  three_pt_made int not null default 0,
  three_pt_attempted int not null default 0,
  ft_made int not null default 0,
  ft_attempted int not null default 0,
  off_rebounds int not null default 0,
  def_rebounds int not null default 0,
  assists int not null default 0,
  turnovers int not null default 0,
  steals int not null default 0,
  blocks int not null default 0,
  fouls int not null default 0,
  plus_minus int not null default 0,
  unique(match_id, player_id)
);

-- VIEW: computed stats per player per match
create view player_match_stats_computed as
select
  pms.*,
  (pms.two_pt_made * 2 + pms.three_pt_made * 3 + pms.ft_made) as points,
  (pms.off_rebounds + pms.def_rebounds) as total_rebounds,
  (pms.two_pt_made * 2 + pms.three_pt_made * 3 + pms.ft_made)
    + pms.assists
    + (pms.off_rebounds + pms.def_rebounds) as val,
  case when pms.two_pt_attempted > 0
    then round(pms.two_pt_made::numeric / pms.two_pt_attempted * 100, 1)
    else null end as two_pt_pct,
  case when pms.three_pt_attempted > 0
    then round(pms.three_pt_made::numeric / pms.three_pt_attempted * 100, 1)
    else null end as three_pt_pct,
  case when pms.ft_attempted > 0
    then round(pms.ft_made::numeric / pms.ft_attempted * 100, 1)
    else null end as ft_pct,
  case when (pms.two_pt_attempted + pms.three_pt_attempted) > 0
    then round((pms.two_pt_made + pms.three_pt_made)::numeric / (pms.two_pt_attempted + pms.three_pt_attempted) * 100, 1)
    else null end as fg_pct
from player_match_stats pms;

-- RLS
alter table seasons enable row level security;
alter table teams enable row level security;
alter table season_teams enable row level security;
alter table players enable row level security;
alter table player_team_seasons enable row level security;
alter table rounds enable row level security;
alter table matches enable row level security;
alter table playoff_series enable row level security;
alter table player_match_stats enable row level security;

-- Public read
create policy "public read seasons" on seasons for select using (true);
create policy "public read teams" on teams for select using (true);
create policy "public read season_teams" on season_teams for select using (true);
create policy "public read players" on players for select using (true);
create policy "public read player_team_seasons" on player_team_seasons for select using (true);
create policy "public read rounds" on rounds for select using (true);
create policy "public read matches" on matches for select using (true);
create policy "public read playoff_series" on playoff_series for select using (true);
create policy "public read player_match_stats" on player_match_stats for select using (true);

-- Admin write (authenticated users only)
create policy "admin write seasons" on seasons for all using (auth.role() = 'authenticated');
create policy "admin write teams" on teams for all using (auth.role() = 'authenticated');
create policy "admin write season_teams" on season_teams for all using (auth.role() = 'authenticated');
create policy "admin write players" on players for all using (auth.role() = 'authenticated');
create policy "admin write player_team_seasons" on player_team_seasons for all using (auth.role() = 'authenticated');
create policy "admin write rounds" on rounds for all using (auth.role() = 'authenticated');
create policy "admin write matches" on matches for all using (auth.role() = 'authenticated');
create policy "admin write playoff_series" on playoff_series for all using (auth.role() = 'authenticated');
create policy "admin write player_match_stats" on player_match_stats for all using (auth.role() = 'authenticated');
