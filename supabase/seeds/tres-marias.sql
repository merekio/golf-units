-- =============================================================
-- Alta de campo: Club de Golf Tres Marías - El Reto
-- Ejecutar en Supabase SQL Editor
--
-- El Desafío NO se incluye: solo se tienen 9 hoyos y se decidió
-- no darlo de alta hasta contar con la tarjeta completa de 18.
--
-- El script detecta tu usuario automáticamente si solo existe uno.
-- Si tienes varios usuarios, sustituye v_owner con tu UUID:
--   select id, email from auth.users;
-- =============================================================

do $$
declare
  v_owner uuid;
  v_user_count int;
  v_has_extended boolean;
  v_reto_holes jsonb := '[
    {"holeNumber": 1,  "par": 4, "handicap": 11},
    {"holeNumber": 2,  "par": 4, "handicap": 5},
    {"holeNumber": 3,  "par": 3, "handicap": 3},
    {"holeNumber": 4,  "par": 4, "handicap": 13},
    {"holeNumber": 5,  "par": 5, "handicap": 1},
    {"holeNumber": 6,  "par": 3, "handicap": 17},
    {"holeNumber": 7,  "par": 4, "handicap": 15},
    {"holeNumber": 8,  "par": 5, "handicap": 7},
    {"holeNumber": 9,  "par": 4, "handicap": 9},
    {"holeNumber": 10, "par": 4, "handicap": 4},
    {"holeNumber": 11, "par": 4, "handicap": 8},
    {"holeNumber": 12, "par": 4, "handicap": 16},
    {"holeNumber": 13, "par": 3, "handicap": 14},
    {"holeNumber": 14, "par": 3, "handicap": 10},
    {"holeNumber": 15, "par": 4, "handicap": 12},
    {"holeNumber": 16, "par": 5, "handicap": 6},
    {"holeNumber": 17, "par": 4, "handicap": 18},
    {"holeNumber": 18, "par": 5, "handicap": 2}
  ]'::jsonb;
begin
  -- Resolver el dueño del campo
  select count(*) into v_user_count from auth.users;
  if v_user_count = 0 then
    raise exception 'No hay usuarios registrados en auth.users.';
  elsif v_user_count > 1 then
    raise exception 'Hay % usuarios. Edita el script y asigna v_owner con tu UUID (select id, email from auth.users).', v_user_count;
  end if;
  select id into v_owner from auth.users limit 1;

  -- ¿Existen las columnas extendidas (country/state/slope/rating)?
  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'courses' and column_name = 'slope_rating'
  ) into v_has_extended;

  -- ---------- El Reto (18 hoyos, par 72) ----------
  if exists (select 1 from public.courses where owner_id = v_owner and name = 'Tres Marías - El Reto') then
    raise notice 'El campo "Tres Marías - El Reto" ya existe; se omite.';
  elsif v_has_extended then
    insert into public.courses (owner_id, name, country, state, city, slope_rating, course_rating, holes)
    values (v_owner, 'Tres Marías - El Reto', 'México', 'Michoacán', 'Morelia', 129, 70.9, v_reto_holes);
    raise notice 'Campo "Tres Marías - El Reto" creado (con slope/rating).';
  else
    insert into public.courses (owner_id, name, city, holes)
    values (v_owner, 'Tres Marías - El Reto', 'Morelia', v_reto_holes);
    raise notice 'Campo "Tres Marías - El Reto" creado (esquema básico).';
  end if;
end $$;
