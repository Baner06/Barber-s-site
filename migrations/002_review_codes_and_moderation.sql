-- ============================================================
-- MIGRACIÓN: código de reseña por cita + moderación de reseñas
-- Ejecuta esto en Supabase: Project > SQL Editor > New query
-- (Tu base ya tiene las tablas creadas por schema.sql; esto solo
-- agrega lo nuevo, no borra nada existente.)
-- ============================================================

-- 1. Código de 6 dígitos para dejar reseña, en cada cita
alter table appointments add column if not exists review_code text;
create unique index if not exists idx_appointments_review_code on appointments(review_code) where review_code is not null;

-- 2. Reseñas: a qué barbero y a qué cita pertenecen, y si ya están aprobadas
alter table reviews add column if not exists barber_id uuid references barbers(id) on delete set null;
alter table reviews add column if not exists appointment_id uuid references appointments(id) on delete set null;
alter table reviews add column if not exists approved boolean not null default false;
create unique index if not exists idx_reviews_appointment_id on reviews(appointment_id) where appointment_id is not null;

-- 3. Reemplaza las políticas viejas de reseñas por las nuevas (con moderación)
drop policy if exists "public read reviews" on reviews;
drop policy if exists "public read approved reviews" on reviews;
drop policy if exists "auth read all reviews" on reviews;
drop policy if exists "public insert reviews" on reviews;
drop policy if exists "auth update reviews" on reviews;
drop policy if exists "auth delete reviews" on reviews;

create policy "public read approved reviews" on reviews for select using (approved = true);
create policy "auth read all reviews" on reviews for select using (auth.role() = 'authenticated');
create policy "public insert reviews" on reviews for insert with check (approved = false);
create policy "auth update reviews" on reviews for update using (auth.role() = 'authenticated');
create policy "auth delete reviews" on reviews for delete using (auth.role() = 'authenticated');
