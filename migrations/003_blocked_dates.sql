-- ============================================================
-- MIGRACIÓN: bloqueo de días completos (vacaciones, festivos, etc.)
-- Ejecuta esto en Supabase: Project > SQL Editor > New query
-- (Tu base ya tiene las tablas creadas por schema.sql; esto solo
-- agrega lo nuevo, no borra nada existente.)
-- ============================================================

create table if not exists blocked_dates (
  id uuid primary key default gen_random_uuid(),
  blocked_date date not null unique,
  reason text,
  created_at timestamptz default now()
);

alter table blocked_dates enable row level security;

-- Lectura pública (el sitio de reservas necesita saber qué días están cerrados)
create policy "public read blocked_dates" on blocked_dates for select using (true);

-- Solo el barbero autenticado puede bloquear/desbloquear días
create policy "auth manage blocked_dates insert" on blocked_dates for insert with check (auth.role() = 'authenticated');
create policy "auth manage blocked_dates delete" on blocked_dates for delete using (auth.role() = 'authenticated');
