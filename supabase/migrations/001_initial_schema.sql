-- =============================================================
-- Golf Units - Esquema completo de la base de datos
-- Ejecutar en Supabase SQL Editor
-- =============================================================

-- ---------------------------------------------------------------
-- EXTENSION
-- ---------------------------------------------------------------
create extension if not exists "uuid-ossp";

-- ---------------------------------------------------------------
-- COURSES
-- ---------------------------------------------------------------
create table if not exists public.courses (
  id          uuid primary key default uuid_generate_v4(),
  owner_id    uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  city        text,
  holes       jsonb,                    -- array de HoleDefinition
  created_at  timestamptz default now() not null
);

-- Agregar columna holes si la tabla ya existe pero le falta la columna
alter table public.courses
  add column if not exists holes jsonb;

-- RLS
alter table public.courses enable row level security;

drop policy if exists "courses_owner_all" on public.courses;
create policy "courses_owner_all"
  on public.courses
  for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- ---------------------------------------------------------------
-- PLAYERS  (jugadores registrados del usuario)
-- ---------------------------------------------------------------
create table if not exists public.players (
  id         uuid primary key default uuid_generate_v4(),
  owner_id   uuid not null references auth.users(id) on delete cascade,
  alias      text not null,
  hcp        numeric default 0,
  created_at timestamptz default now() not null
);

alter table public.players enable row level security;

drop policy if exists "players_owner_all" on public.players;
create policy "players_owner_all"
  on public.players
  for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- ---------------------------------------------------------------
-- GUEST_PLAYERS  (invitados creados por el usuario)
-- ---------------------------------------------------------------
create table if not exists public.guest_players (
  id         uuid primary key default uuid_generate_v4(),
  created_by uuid not null references auth.users(id) on delete cascade,
  name       text not null,
  handicap   numeric default 0,
  created_at timestamptz default now() not null
);

alter table public.guest_players enable row level security;

drop policy if exists "guest_players_owner_all" on public.guest_players;
create policy "guest_players_owner_all"
  on public.guest_players
  for all
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

-- ---------------------------------------------------------------
-- ROUNDS
-- ---------------------------------------------------------------
create table if not exists public.rounds (
  id           uuid primary key default uuid_generate_v4(),
  owner_id     uuid not null references auth.users(id) on delete cascade,
  course_id    uuid references public.courses(id) on delete set null,
  round_date   date not null,
  holes_to_play int not null default 18,
  unit_value   numeric not null default 0,
  created_at   timestamptz default now() not null
);

alter table public.rounds enable row level security;

drop policy if exists "rounds_owner_all" on public.rounds;
create policy "rounds_owner_all"
  on public.rounds
  for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- ---------------------------------------------------------------
-- ROUND_PLAYERS
-- ---------------------------------------------------------------
create table if not exists public.round_players (
  id               uuid primary key default uuid_generate_v4(),
  round_id         uuid not null references public.rounds(id) on delete cascade,
  player_id        uuid references public.players(id) on delete set null,
  guest_player_id  uuid references public.guest_players(id) on delete set null,
  playing_hcp      numeric default 0,
  created_at       timestamptz default now() not null
);

alter table public.round_players enable row level security;

drop policy if exists "round_players_owner_all" on public.round_players;
create policy "round_players_owner_all"
  on public.round_players
  for all
  using (
    exists (
      select 1 from public.rounds r
      where r.id = round_id
        and r.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.rounds r
      where r.id = round_id
        and r.owner_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------
-- HOLE_SCORES
-- ---------------------------------------------------------------
create table if not exists public.hole_scores (
  id                   uuid primary key default uuid_generate_v4(),
  round_id             uuid not null references public.rounds(id) on delete cascade,
  hole_number          int not null,
  player_id            uuid references public.players(id) on delete set null,
  guest_player_id      uuid references public.guest_players(id) on delete set null,
  strokes              int not null default 0,
  putts                int not null default 0,
  regulation_rank      int,
  hit_green_regulation boolean default false,
  birdie               boolean default false,
  eagle                boolean default false,
  sand_par             boolean default false,
  hole_out             boolean default false,
  pinkis               boolean default false,
  salida_green         boolean default false,
  bunker_shot          boolean default false,
  spanish              boolean default false,
  created_at           timestamptz default now() not null
);

alter table public.hole_scores enable row level security;

drop policy if exists "hole_scores_owner_all" on public.hole_scores;
create policy "hole_scores_owner_all"
  on public.hole_scores
  for all
  using (
    exists (
      select 1 from public.rounds r
      where r.id = round_id
        and r.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.rounds r
      where r.id = round_id
        and r.owner_id = auth.uid()
    )
  );
