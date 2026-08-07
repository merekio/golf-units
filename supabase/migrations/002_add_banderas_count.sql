alter table public.hole_scores
add column if not exists banderas_count int not null default 0;
