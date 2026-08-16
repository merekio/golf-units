-- Otras unidades: captura libre por jugador y hoyo (positiva o negativa).
-- La app valida que la suma entre jugadores sea 0 en cada hoyo.
alter table public.hole_scores
  add column if not exists otras_unidades int not null default 0;
