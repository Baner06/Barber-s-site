-- ============================================================
-- ESQUEMA DE BASE DE DATOS · PWA de turnos para barbería
-- Ejecuta este archivo completo en Supabase: Project > SQL Editor > New query
-- ============================================================

-- 1. BARBEROS / COLABORADORES
create table if not exists barbers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text default 'Barbero',
  photo_url text,
  rating numeric(2,1) default 5.0,
  active boolean default true,
  sort_order int default 0,
  created_at timestamptz default now()
);

-- 2. SERVICIOS
-- category: 'individual' = un solo servicio, 'combo' = varios servicios combinados
-- (ej. corte + barba). Un combo es una fila más en esta tabla, con su propio
-- precio y duración ya sumados; no hace falta una tabla aparte.
create table if not exists services (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  price numeric(10,0) not null,
  duration_minutes int not null default 30,
  category text not null default 'individual' check (category in ('individual','combo')),
  popular boolean default false,
  active boolean default true,
  sort_order int default 0,
  created_at timestamptz default now()
);

-- 3. TURNOS
create table if not exists appointments (
  id uuid primary key default gen_random_uuid(),
  client_name text not null,
  client_phone text not null,
  client_email text not null,
  barber_id uuid references barbers(id) on delete set null,
  service_id uuid references services(id) on delete set null,
  appointment_date date not null,
  start_time time not null,
  end_time time not null,
  status text not null default 'pendiente' check (status in ('pendiente','confirmado','cancelado','completado')),
  notes text,
  -- Código de 6 dígitos entregado al cliente para poder dejar una reseña
  -- de esa cita puntual (evita reseñas de gente que nunca fue atendida).
  review_code text,
  created_at timestamptz default now()
);

create index if not exists idx_appointments_date on appointments(appointment_date);
create index if not exists idx_appointments_barber on appointments(barber_id);
create unique index if not exists idx_appointments_review_code on appointments(review_code) where review_code is not null;

-- 4. RESEÑAS
-- approved: las reseñas nuevas entran en false (pendientes) y solo se
-- muestran en la página pública una vez que el barbero las aprueba desde
-- el panel admin, para evitar publicar insultos o groserías sin revisar.
create table if not exists reviews (
  id uuid primary key default gen_random_uuid(),
  client_name text not null,
  rating int not null check (rating between 1 and 5),
  comment text,
  barber_id uuid references barbers(id) on delete set null,
  appointment_id uuid references appointments(id) on delete set null,
  approved boolean not null default false,
  created_at timestamptz default now()
);

-- Un turno solo puede usarse una vez para dejar reseña.
create unique index if not exists idx_reviews_appointment_id on reviews(appointment_id) where appointment_id is not null;

-- 5. DÍAS BLOQUEADOS
-- Permite al barbero cerrar un día completo (vacaciones, festivo, imprevisto)
-- sin tener que cancelar cita por cita ni tocar el horario semanal fijo.
create table if not exists blocked_dates (
  id uuid primary key default gen_random_uuid(),
  blocked_date date not null unique,
  reason text,
  created_at timestamptz default now()
);

-- ============================================================
-- SEGURIDAD (Row Level Security)
-- Los clientes (anónimos) pueden: leer barberos/servicios/reseñas activos,
-- crear turnos y leer turnos SOLO para calcular disponibilidad.
-- Solo un usuario autenticado (el barbero, con su login) puede
-- actualizar/cancelar turnos y administrar barberos/servicios.
-- ============================================================

alter table barbers enable row level security;
alter table services enable row level security;
alter table appointments enable row level security;
alter table reviews enable row level security;
alter table blocked_dates enable row level security;

-- Lectura pública de barberos y servicios activos
create policy "public read barbers" on barbers for select using (true);
create policy "public read services" on services for select using (true);

-- El público solo ve reseñas ya aprobadas; el barbero (autenticado) las ve todas
-- (incluidas las pendientes de moderar).
create policy "public read approved reviews" on reviews for select using (approved = true);
create policy "auth read all reviews" on reviews for select using (auth.role() = 'authenticated');

-- Cualquier visitante puede enviar una reseña, pero siempre queda pendiente
-- de aprobación (no puede insertarla ya aprobada).
create policy "public insert reviews" on reviews for insert with check (approved = false);

-- Solo el barbero autenticado puede aprobar o eliminar reseñas.
create policy "auth update reviews" on reviews for update using (auth.role() = 'authenticated');
create policy "auth delete reviews" on reviews for delete using (auth.role() = 'authenticated');

-- Lectura pública de turnos (necesaria para bloquear horarios ya ocupados)
create policy "public read appointments" on appointments for select using (true);

-- Cualquier visitante puede crear un turno (reservar)
create policy "public insert appointments" on appointments for insert with check (true);

-- Solo usuarios autenticados (el barbero) pueden modificar/cancelar/borrar
create policy "auth update appointments" on appointments for update using (auth.role() = 'authenticated');
create policy "auth delete appointments" on appointments for delete using (auth.role() = 'authenticated');

-- Solo usuarios autenticados administran barberos y servicios
create policy "auth manage barbers insert" on barbers for insert with check (auth.role() = 'authenticated');
create policy "auth manage barbers update" on barbers for update using (auth.role() = 'authenticated');
create policy "auth manage barbers delete" on barbers for delete using (auth.role() = 'authenticated');

create policy "auth manage services insert" on services for insert with check (auth.role() = 'authenticated');
create policy "auth manage services update" on services for update using (auth.role() = 'authenticated');
create policy "auth manage services delete" on services for delete using (auth.role() = 'authenticated');

-- Lectura pública de días bloqueados (el sitio necesita saberlo para no ofrecer horarios)
create policy "public read blocked_dates" on blocked_dates for select using (true);

-- Solo el barbero autenticado puede bloquear/desbloquear días
create policy "auth manage blocked_dates insert" on blocked_dates for insert with check (auth.role() = 'authenticated');
create policy "auth manage blocked_dates delete" on blocked_dates for delete using (auth.role() = 'authenticated');

-- ============================================================
-- DATOS DE EJEMPLO (puedes borrarlos luego desde el panel admin)
-- ============================================================
-- Este proyecto está pensado para un solo barbero: basta con una fila aquí.
-- Si más adelante se suman colaboradores, la app ya soporta varios.
insert into barbers (name, role, rating, sort_order) values
  ('Luis Felipe Galvis', 'Barbero', 5.0, 1)
on conflict do nothing;

-- Servicios individuales: catálogo estándar de una barbería profesional.
insert into services (name, description, price, duration_minutes, category, popular, sort_order) values
  ('Corte de cabello', 'Degradado y corte a tijera para un acabado natural.', 25000, 40, 'individual', true, 1),
  ('Corte + Lavado', 'Degradado, corte a tijera y lavado de cabello.', 28000, 45, 'individual', true, 2),
  ('Corte a máquina', 'Corte rápido a máquina, ideal para mantenimiento.', 18000, 25, 'individual', false, 3),
  ('Barba', 'Perfilado y afeitado de barba con toalla caliente.', 15000, 25, 'individual', true, 4),
  ('Afeitado clásico con navaja', 'Afeitado tradicional con navaja y toalla caliente.', 22000, 30, 'individual', false, 5),
  ('Cejas', 'Diseño y perfilado de cejas con cera o navaja.', 10000, 15, 'individual', false, 6),
  ('Corte infantil', 'Corte para niños hasta 10 años.', 20000, 30, 'individual', false, 7),
  ('Tinte de cabello o barba', 'Aplicación de color en cabello o barba.', 30000, 45, 'individual', false, 8),
  ('Mascarilla facial', 'Limpieza y mascarilla facial de cierre.', 15000, 20, 'individual', false, 9),
  ('Alisado / Keratina', 'Tratamiento alisador con keratina.', 45000, 60, 'individual', false, 10)
on conflict do nothing;

-- Combos: combinaciones más pedidas en barberías profesionales.
insert into services (name, description, price, duration_minutes, category, popular, sort_order) values
  ('Corte + Barba', 'Combo clásico: corte de cabello y perfilado de barba.', 35000, 60, 'combo', true, 1),
  ('Look Completo (Corte + Barba + Cejas)', 'Corte, barba y cejas en una sola cita.', 42000, 75, 'combo', true, 2),
  ('Corte + Afeitado Clásico', 'Corte de cabello y afeitado tradicional con navaja.', 40000, 65, 'combo', false, 3),
  ('Corte + Mascarilla Facial', 'Corte de cabello y mascarilla facial de cierre.', 35000, 60, 'combo', false, 4),
  ('Combo Padre e Hijo', 'Corte de cabello para adulto y para niño, en el mismo turno.', 40000, 70, 'combo', false, 5),
  ('Combo Novio', 'Corte, barba, cejas y mascarilla facial: preparación completa para el gran día.', 55000, 90, 'combo', false, 6)
on conflict do nothing;
