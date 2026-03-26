-- Fix: remove policies recursivas de profiles e recriar sem recursao

drop policy if exists "Profiles: users read own" on public.profiles;
drop policy if exists "Profiles: admin/prof read all" on public.profiles;
drop policy if exists "Profiles: admin insert" on public.profiles;
drop policy if exists "Profiles: admin update" on public.profiles;

-- Qualquer usuario autenticado pode ler seu proprio profile
create policy "Profiles: read own" on public.profiles
  for select using (auth.uid() = id);

-- Admin e profissional podem ler todos os profiles
-- Usa auth.jwt() para evitar recursao
create policy "Profiles: admin/prof read all" on public.profiles
  for select using (
    (auth.jwt()->>'role') = 'authenticated'
    and exists (
      select 1 from auth.users u
      where u.id = auth.uid()
        and (u.raw_user_meta_data->>'role') in ('admin', 'profissional')
    )
  );

-- Admin pode inserir profiles (para criar novos usuarios)
create policy "Profiles: admin insert" on public.profiles
  for insert with check (
    exists (
      select 1 from auth.users u
      where u.id = auth.uid()
        and (u.raw_user_meta_data->>'role') = 'admin'
    )
  );

-- Admin pode atualizar profiles
create policy "Profiles: admin update" on public.profiles
  for update using (
    exists (
      select 1 from auth.users u
      where u.id = auth.uid()
        and (u.raw_user_meta_data->>'role') = 'admin'
    )
  );

-- Permitir que o trigger (security definer) insira profiles para novos usuarios
-- O trigger roda como superuser, mas precisamos de uma policy para o signUp flow
create policy "Profiles: self insert on signup" on public.profiles
  for insert with check (auth.uid() = id);
