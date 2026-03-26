export type Role = "admin" | "profissional" | "paciente";

export interface Profile {
  id: string;
  email: string;
  nome: string;
  role: Role;
  created_at: string;
}

export interface Paciente {
  id: string;
  profissional_id: string;
  nome: string;
  telefone: string | null;
  email: string | null;
  plano: string | null;
  data_consulta: string | null;
  valor: number;
  observacoes: string | null;
  created_at: string;
}

export interface Protocolo {
  id: string;
  profissional_id: string;
  nome: string;
  steps: ProtocoloStep[];
  created_at: string;
}

export interface ProtocoloStep {
  dias: number;
  tipo: string;
}

export interface Followup {
  id: string;
  paciente_id: string;
  profissional_id: string;
  dias: number;
  tipo: string;
  data_alvo: string;
  feito: boolean;
  feito_em: string | null;
  obs: string | null;
  created_at: string;
  // joined
  paciente?: Paciente;
}

export interface Recebimento {
  id: string;
  paciente_id: string;
  profissional_id: string;
  valor: number;
  data: string;
  plano: string | null;
  forma: "pix" | "cartao" | "dinheiro" | null;
  status: "pago" | "pendente";
  created_at: string;
  // joined
  paciente?: Paciente;
}

export interface Medida {
  id: string;
  paciente_id: string;
  data: string;
  peso: number | null;
  gordura: number | null;
  abdominal: number | null;
  cintura: number | null;
  quadril: number | null;
  braco: number | null;
  coxa: number | null;
  created_at: string;
}

export interface CategoriaMaterial {
  id: string;
  profissional_id: string;
  nome: string;
  ordem: number;
  created_at: string;
}

export interface Material {
  id: string;
  categoria_id: string;
  profissional_id: string;
  titulo: string;
  tipo: "pdf" | "video" | "texto";
  conteudo: string | null;
  ordem: number;
  created_at: string;
}

export interface MaterialPaciente {
  paciente_id: string;
  material_id: string;
}

export interface Questionario {
  id: string;
  paciente_id: string;
  data_resposta: string | null;
  proxima_data: string | null;
  respostas: Record<string, string | number> | null;
  created_at: string;
}

export interface Anamnese {
  id: string;
  paciente_id: string;
  respostas: Record<string, string>;
  created_at: string;
}
