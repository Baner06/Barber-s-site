-- ============================================================
-- MIGRACIÓN: redes sociales editables desde el panel del barbero
-- Ejecuta esto en Supabase: Project > SQL Editor > New query
-- (Tu base ya tiene las tablas creadas por schema.sql; esto solo
-- agrega lo nuevo, no borra nada existente.)
-- ============================================================

-- Fila única de configuración del negocio (por ahora solo redes sociales).
create table if not exists settings (
  id int primary key default 1,
  instagram_url text,
  facebook_url text,
  updated_at timestamptz default now(),
  constraint settings_singleton check (id = 1)
);
insert into settings (id) values (1) on conflict (id) do nothing;

alter table settings enable row level security;

-- Lectura pública (la web pública necesita saber qué redes mostrar)
create policy "public read settings" on settings for select using (true);

-- Solo el barbero autenticado puede editarla
create policy "auth update settings" on settings for update using (auth.role() = 'authenticated');
