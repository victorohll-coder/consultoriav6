-- Fix: substituir todas as referencias a auth.users por auth.jwt() nas policies
-- auth.jwt()->>'email' retorna o email do usuario autenticado sem precisar SELECT em auth.users

-- PACIENTES: policy que usa auth.users
drop policy if exists "Pacientes: paciente ve a si" on public.pacientes;
create policy "Pacientes: paciente ve a si" on public.pacientes
  for select using (
    email = (auth.jwt()->>'email')
  );

-- MEDIDAS: policy paciente
drop policy if exists "Medidas: paciente ve as suas" on public.medidas;
create policy "Medidas: paciente ve as suas" on public.medidas
  for select using (
    exists (
      select 1 from public.pacientes p
      where p.id = paciente_id and p.email = (auth.jwt()->>'email')
    )
  );

-- CATEGORIAS_MATERIAL: policy paciente
drop policy if exists "CatMat: paciente ve liberadas" on public.categorias_material;
create policy "CatMat: paciente ve liberadas" on public.categorias_material
  for select using (
    exists (
      select 1 from public.materiais m
      join public.materiais_paciente mp on mp.material_id = m.id
      join public.pacientes p on p.id = mp.paciente_id
      where m.categoria_id = categorias_material.id
        and p.email = (auth.jwt()->>'email')
    )
  );

-- MATERIAIS: policy paciente
drop policy if exists "Materiais: paciente ve liberados" on public.materiais;
create policy "Materiais: paciente ve liberados" on public.materiais
  for select using (
    exists (
      select 1 from public.materiais_paciente mp
      join public.pacientes p on p.id = mp.paciente_id
      where mp.material_id = materiais.id
        and p.email = (auth.jwt()->>'email')
    )
  );

-- MATERIAIS_PACIENTE: policy paciente
drop policy if exists "MatPac: paciente ve os seus" on public.materiais_paciente;
create policy "MatPac: paciente ve os seus" on public.materiais_paciente
  for select using (
    exists (
      select 1 from public.pacientes p
      where p.id = paciente_id and p.email = (auth.jwt()->>'email')
    )
  );

-- QUESTIONARIOS: policies paciente
drop policy if exists "Quiz: paciente ve os seus" on public.questionarios;
create policy "Quiz: paciente ve os seus" on public.questionarios
  for select using (
    exists (
      select 1 from public.pacientes p
      where p.id = paciente_id and p.email = (auth.jwt()->>'email')
    )
  );

drop policy if exists "Quiz: paciente atualiza os seus" on public.questionarios;
create policy "Quiz: paciente atualiza os seus" on public.questionarios
  for update using (
    exists (
      select 1 from public.pacientes p
      where p.id = paciente_id and p.email = (auth.jwt()->>'email')
    )
  );

-- ANAMNESE: policies paciente
drop policy if exists "Anamnese: paciente ve a sua" on public.anamnese;
create policy "Anamnese: paciente ve a sua" on public.anamnese
  for select using (
    exists (
      select 1 from public.pacientes p
      where p.id = paciente_id and p.email = (auth.jwt()->>'email')
    )
  );

drop policy if exists "Anamnese: paciente insere" on public.anamnese;
create policy "Anamnese: paciente insere" on public.anamnese
  for insert with check (
    exists (
      select 1 from public.pacientes p
      where p.id = paciente_id and p.email = (auth.jwt()->>'email')
    )
  );
