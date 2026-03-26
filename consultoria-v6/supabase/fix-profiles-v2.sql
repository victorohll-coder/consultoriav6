-- Fix v2: usar apenas auth.uid() e o proprio row, sem consultar auth.users

drop policy if exists "Profiles: read own" on public.profiles;
drop policy if exists "Profiles: admin/prof read all" on public.profiles;
drop policy if exists "Profiles: admin insert" on public.profiles;
drop policy if exists "Profiles: admin update" on public.profiles;
drop policy if exists "Profiles: self insert on signup" on public.profiles;

-- Todos podem ler seu proprio profile
create policy "Profiles: read own" on public.profiles
  for select using (auth.uid() = id);

-- Admin/profissional podem ler todos os profiles
-- Trick: usar uma funcao security definer para checar role sem recursao
create or replace function public.get_my_role()
returns text
language sql
security definer
stable
as $$
  select role from public.profiles where id = auth.uid();
$$;

create policy "Profiles: admin/prof read all" on public.profiles
  for select using (
    public.get_my_role() in ('admin', 'profissional')
  );

-- Admin pode inserir
create policy "Profiles: admin insert" on public.profiles
  for insert with check (
    public.get_my_role() = 'admin'
  );

-- Admin pode atualizar
create policy "Profiles: admin update" on public.profiles
  for update using (
    public.get_my_role() = 'admin'
  );

-- Proprio usuario pode inserir seu profile (signup trigger)
create policy "Profiles: self insert on signup" on public.profiles
  for insert with check (auth.uid() = id);
