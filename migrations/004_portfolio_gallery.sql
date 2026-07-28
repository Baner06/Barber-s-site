-- ============================================================
-- MIGRACIÓN: galería de trabajos (fotos que sube el barbero)
-- Ejecuta esto en Supabase: Project > SQL Editor > New query
-- (Tu base ya tiene las tablas creadas por schema.sql; esto solo
-- agrega lo nuevo, no borra nada existente.)
-- ============================================================

-- 1. Bucket de almacenamiento público para las fotos
insert into storage.buckets (id, name, public) values ('portfolio', 'portfolio', true) on conflict (id) do nothing;

create policy "public read portfolio bucket" on storage.objects for select using (bucket_id = 'portfolio');
create policy "auth upload portfolio bucket" on storage.objects for insert with check (bucket_id = 'portfolio' and auth.role() = 'authenticated');
create policy "auth delete portfolio bucket" on storage.objects for delete using (bucket_id = 'portfolio' and auth.role() = 'authenticated');

-- 2. Metadatos de cada foto (image_url para mostrarla, storage_path para poder
-- borrar el archivo del bucket cuando se elimina la fila)
create table if not exists portfolio_items (
  id uuid primary key default gen_random_uuid(),
  image_url text not null,
  storage_path text not null,
  caption text,
  created_at timestamptz default now()
);

alter table portfolio_items enable row level security;

create policy "public read portfolio_items" on portfolio_items for select using (true);
create policy "auth manage portfolio_items insert" on portfolio_items for insert with check (auth.role() = 'authenticated');
create policy "auth manage portfolio_items delete" on portfolio_items for delete using (auth.role() = 'authenticated');
