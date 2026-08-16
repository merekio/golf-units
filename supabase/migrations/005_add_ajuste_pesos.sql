-- Ajuste en pesos por jugador al inicio de la ronda.
-- Positivo si el jugador recibe dinero, negativo si da dinero.
-- La suma de ajustes entre todos los jugadores de la ronda debe ser 0.
alter table public.round_players
  add column if not exists ajuste_pesos numeric not null default 0;
