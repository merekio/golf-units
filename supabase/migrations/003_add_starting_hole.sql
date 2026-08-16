-- Permite que una ronda inicie en el hoyo 1 o en el hoyo 10.
-- Con 9 hoyos: 1-9 o 10-18. Con 18 hoyos: 1-18 o 10-18 seguido de 1-9.
alter table public.rounds
  add column if not exists starting_hole int not null default 1;

alter table public.rounds
  drop constraint if exists rounds_starting_hole_check;

alter table public.rounds
  add constraint rounds_starting_hole_check check (starting_hole in (1, 10));
