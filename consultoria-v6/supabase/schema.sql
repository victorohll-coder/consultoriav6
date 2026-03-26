-- ============================================
-- Consultoria V6 — Schema completo Supabase
-- PARTE 1: TABELAS
-- ============================================

-- 1. PROFILES
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  nome text not null default '',
  role text not null default 'paciente' check (role in ('admin', 'profissional', 'paciente')),
  created_at timestamptz not null default now()
);

-- 2. PACIENTES
create table if not exists public.pacientes (
  id uuid primary key default gen_random_uuid(),
  profissional_id uuid not null references public.profiles(id) on delete cascade,
  nome text not null,
  telefone text,
  email text,
  plano text,
  data_consulta date,
  valor numeric(10,2) default 0,
  observacoes text,
  created_at timestamptz not null default now()
);

-- 3. PROTOCOLOS
create table if not exists public.protocolos (
  id uuid primary key default gen_random_uuid(),
  profissional_id uuid not null references public.profiles(id) on delete cascade,
  nome text not null,
  steps jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

-- 4. FOLLOWUPS
create table if not exists public.followups (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid not null references public.pacientes(id) on delete cascade,
  profissional_id uuid not null references public.profiles(id) on delete cascade,
  dias int not null default 0,
  tipo text not null,
  data_alvo date not null,
  feito boolean not null default false,
  feito_em date,
  obs text,
  created_at timestamptz not null default now()
);

-- 5. RECEBIMENTOS
create table if not exists public.recebimentos (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid not null references public.pacientes(id) on delete cascade,
  profissional_id uuid not null references public.profiles(id) on delete cascade,
  valor numeric(10,2) not null,
  data date not null,
  plano text,
  forma text check (forma in ('pix', 'cartao', 'dinheiro')),
  status text not null default 'pago' check (status in ('pago', 'pendente')),
  created_at timestamptz not null default now()
);

-- 6. MEDIDAS
create table if not exists public.medidas (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid not null references public.pacientes(id) on delete cascade,
  data date not null,
  peso numeric(5,2),
  gordura numeric(5,2),
  abdominal numeric(5,2),
  cintura numeric(5,2),
  quadril numeric(5,2),
  braco numeric(5,2),
  coxa numeric(5,2),
  created_at timestamptz not null default now()
);

-- 7. CATEGORIAS DE MATERIAL
create table if not exists public.categorias_material (
  id uuid primary key default gen_random_uuid(),
  profissional_id uuid not null references public.profiles(id) on delete cascade,
  nome text not null,
  ordem int not null default 0,
  created_at timestamptz not null default now()
);

-- 8. MATERIAIS
create table if not exists public.materiais (
  id uuid primary key default gen_random_uuid(),
  categoria_id uuid not null references public.categorias_material(id) on delete cascade,
  profissional_id uuid not null references public.profiles(id) on delete cascade,
  titulo text not null,
  tipo text not null check (tipo in ('pdf', 'video', 'texto')),
  conteudo text,
  ordem int not null default 0,
  created_at timestamptz not null default now()
);

-- 9. MATERIAIS_PACIENTE
create table if not exists public.materiais_paciente (
  paciente_id uuid not null references public.pacientes(id) on delete cascade,
  material_id uuid not null references public.materiais(id) on delete cascade,
  primary key (paciente_id, material_id)
);

-- 10. QUESTIONARIOS
create table if not exists public.questionarios (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid not null references public.pacientes(id) on delete cascade,
  data_resposta date,
  proxima_data date,
  respostas jsonb,
  created_at timestamptz not null default now()
);

-- 11. ANAMNESE
create table if not exists public.anamnese (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid not null references public.pacientes(id) on delete cascade,
  respostas jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ============================================
-- PARTE 2: TRIGGER
-- ============================================

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, nome, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'nome', ''),
    coalesce(new.raw_user_meta_data->>'role', 'paciente')
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================
-- PARTE 3: HABILITAR RLS EM TODAS AS TABELAS
-- ============================================

alter table public.profiles enable row level security;
alter table public.pacientes enable row level security;
alter table public.protocolos enable row level security;
alter table public.followups enable row level security;
alter table public.recebimentos enable row level security;
alter table public.medidas enable row level security;
alter table public.categorias_material enable row level security;
alter table public.materiais enable row level security;
alter table public.materiais_paciente enable row level security;
alter table public.questionarios enable row level security;
alter table public.anamnese enable row level security;

-- ============================================
-- PARTE 4: TODAS AS POLICIES
-- ============================================

-- PROFILES
create policy "Profiles: users read own" on public.profiles
  for select using (auth.uid() = id);

create policy "Profiles: admin/prof read all" on public.profiles
  for select using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('admin', 'profissional')
    )
  );

create policy "Profiles: admin insert" on public.profiles
  for insert with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

create policy "Profiles: admin update" on public.profiles
  for update using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- PACIENTES
create policy "Pacientes: prof ve os seus" on public.pacientes
  for select using (profissional_id = auth.uid());

create policy "Pacientes: prof insere" on public.pacientes
  for insert with check (profissional_id = auth.uid());

create policy "Pacientes: prof atualiza os seus" on public.pacientes
  for update using (profissional_id = auth.uid());

create policy "Pacientes: prof deleta os seus" on public.pacientes
  for delete using (profissional_id = auth.uid());

create policy "Pacientes: paciente ve a si" on public.pacientes
  for select using (
    email = (select email from auth.users where id = auth.uid())
  );

-- PROTOCOLOS
create policy "Protocolos: prof ve os seus" on public.protocolos
  for select using (profissional_id = auth.uid());

create policy "Protocolos: prof insere" on public.protocolos
  for insert with check (profissional_id = auth.uid());

create policy "Protocolos: prof atualiza" on public.protocolos
  for update using (profissional_id = auth.uid());

create policy "Protocolos: prof deleta" on public.protocolos
  for delete using (profissional_id = auth.uid());

-- FOLLOWUPS
create policy "Followups: prof ve os seus" on public.followups
  for select using (profissional_id = auth.uid());

create policy "Followups: prof insere" on public.followups
  for insert with check (profissional_id = auth.uid());

create policy "Followups: prof atualiza" on public.followups
  for update using (profissional_id = auth.uid());

create policy "Followups: prof deleta" on public.followups
  for delete using (profissional_id = auth.uid());

-- RECEBIMENTOS
create policy "Recebimentos: prof ve os seus" on public.recebimentos
  for select using (profissional_id = auth.uid());

create policy "Recebimentos: prof insere" on public.recebimentos
  for insert with check (profissional_id = auth.uid());

create policy "Recebimentos: prof atualiza" on public.recebimentos
  for update using (profissional_id = auth.uid());

create policy "Recebimentos: prof deleta" on public.recebimentos
  for delete using (profissional_id = auth.uid());

-- MEDIDAS
create policy "Medidas: prof ve via paciente" on public.medidas
  for select using (
    exists (select 1 from public.pacientes p where p.id = paciente_id and p.profissional_id = auth.uid())
  );

create policy "Medidas: prof insere" on public.medidas
  for insert with check (
    exists (select 1 from public.pacientes p where p.id = paciente_id and p.profissional_id = auth.uid())
  );

create policy "Medidas: prof atualiza" on public.medidas
  for update using (
    exists (select 1 from public.pacientes p where p.id = paciente_id and p.profissional_id = auth.uid())
  );

create policy "Medidas: prof deleta" on public.medidas
  for delete using (
    exists (select 1 from public.pacientes p where p.id = paciente_id and p.profissional_id = auth.uid())
  );

create policy "Medidas: paciente ve as suas" on public.medidas
  for select using (
    exists (
      select 1 from public.pacientes p
      where p.id = paciente_id and p.email = (select email from auth.users where id = auth.uid())
    )
  );

-- CATEGORIAS_MATERIAL
create policy "CatMat: prof ve as suas" on public.categorias_material
  for select using (profissional_id = auth.uid());

create policy "CatMat: prof insere" on public.categorias_material
  for insert with check (profissional_id = auth.uid());

create policy "CatMat: prof atualiza" on public.categorias_material
  for update using (profissional_id = auth.uid());

create policy "CatMat: prof deleta" on public.categorias_material
  for delete using (profissional_id = auth.uid());

create policy "CatMat: paciente ve liberadas" on public.categorias_material
  for select using (
    exists (
      select 1 from public.materiais m
      join public.materiais_paciente mp on mp.material_id = m.id
      join public.pacientes p on p.id = mp.paciente_id
      where m.categoria_id = categorias_material.id
        and p.email = (select email from auth.users where id = auth.uid())
    )
  );

-- MATERIAIS
create policy "Materiais: prof ve os seus" on public.materiais
  for select using (profissional_id = auth.uid());

create policy "Materiais: prof insere" on public.materiais
  for insert with check (profissional_id = auth.uid());

create policy "Materiais: prof atualiza" on public.materiais
  for update using (profissional_id = auth.uid());

create policy "Materiais: prof deleta" on public.materiais
  for delete using (profissional_id = auth.uid());

create policy "Materiais: paciente ve liberados" on public.materiais
  for select using (
    exists (
      select 1 from public.materiais_paciente mp
      join public.pacientes p on p.id = mp.paciente_id
      where mp.material_id = materiais.id
        and p.email = (select email from auth.users where id = auth.uid())
    )
  );

-- MATERIAIS_PACIENTE
create policy "MatPac: prof ve os seus" on public.materiais_paciente
  for select using (
    exists (select 1 from public.pacientes p where p.id = paciente_id and p.profissional_id = auth.uid())
  );

create policy "MatPac: prof insere" on public.materiais_paciente
  for insert with check (
    exists (select 1 from public.pacientes p where p.id = paciente_id and p.profissional_id = auth.uid())
  );

create policy "MatPac: prof deleta" on public.materiais_paciente
  for delete using (
    exists (select 1 from public.pacientes p where p.id = paciente_id and p.profissional_id = auth.uid())
  );

create policy "MatPac: paciente ve os seus" on public.materiais_paciente
  for select using (
    exists (
      select 1 from public.pacientes p
      where p.id = paciente_id and p.email = (select email from auth.users where id = auth.uid())
    )
  );

-- QUESTIONARIOS
create policy "Quiz: prof ve via paciente" on public.questionarios
  for select using (
    exists (select 1 from public.pacientes p where p.id = paciente_id and p.profissional_id = auth.uid())
  );

create policy "Quiz: prof insere" on public.questionarios
  for insert with check (
    exists (select 1 from public.pacientes p where p.id = paciente_id and p.profissional_id = auth.uid())
  );

create policy "Quiz: prof atualiza" on public.questionarios
  for update using (
    exists (select 1 from public.pacientes p where p.id = paciente_id and p.profissional_id = auth.uid())
  );

create policy "Quiz: paciente ve os seus" on public.questionarios
  for select using (
    exists (
      select 1 from public.pacientes p
      where p.id = paciente_id and p.email = (select email from auth.users where id = auth.uid())
    )
  );

create policy "Quiz: paciente atualiza os seus" on public.questionarios
  for update using (
    exists (
      select 1 from public.pacientes p
      where p.id = paciente_id and p.email = (select email from auth.users where id = auth.uid())
    )
  );

-- ANAMNESE
create policy "Anamnese: prof ve via paciente" on public.anamnese
  for select using (
    exists (select 1 from public.pacientes p where p.id = paciente_id and p.profissional_id = auth.uid())
  );

create policy "Anamnese: paciente ve a sua" on public.anamnese
  for select using (
    exists (
      select 1 from public.pacientes p
      where p.id = paciente_id and p.email = (select email from auth.users where id = auth.uid())
    )
  );

create policy "Anamnese: paciente insere" on public.anamnese
  for insert with check (
    exists (
      select 1 from public.pacientes p
      where p.id = paciente_id and p.email = (select email from auth.users where id = auth.uid())
    )
  );
