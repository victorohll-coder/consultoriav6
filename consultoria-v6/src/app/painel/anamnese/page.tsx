"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { CAMPOS_ANAMNESE } from "@/lib/anamnese";
import type { Paciente, Anamnese } from "@/lib/types";

function fmtData(d: string) {
  const date = new Date(d);
  return date.toLocaleDateString("pt-BR");
}

type PacienteComAnamnese = Paciente & {
  anamnese: Anamnese[];
};

export default function AnamnesePage() {
  const supabase = createClient();
  const [pacientes, setPacientes] = useState<PacienteComAnamnese[]>([]);
  const [selectedPaciente, setSelectedPaciente] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("pacientes")
      .select("*, anamnese(*)")
      .order("nome");
    if (data) setPacientes(data as PacienteComAnamnese[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { loadData(); }, [loadData]);

  const selectedPac = pacientes.find((p) => p.id === selectedPaciente);
  const anamnese = selectedPac?.anamnese?.[0] || null;

  if (loading) {
    return (
      <div>
        <h1 className="text-xl font-bold text-text mb-6">Anamnese</h1>
        <div className="bg-surface border border-border rounded-xl p-6 text-text2 text-sm">Carregando...</div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-text mb-6">Anamnese</h1>

      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-4">
        {/* Patient list */}
        <div className="bg-surface border border-border rounded-xl p-4">
          <h2 className="text-xs font-semibold text-text2 uppercase tracking-wider mb-3">Pacientes</h2>
          <div className="flex flex-col gap-1">
            {pacientes.map((p) => {
              const tem = p.anamnese && p.anamnese.length > 0;
              return (
                <div
                  key={p.id}
                  onClick={() => setSelectedPaciente(p.id)}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-all ${
                    selectedPaciente === p.id ? "bg-accent text-white" : "hover:bg-surface2 text-text2"
                  }`}
                >
                  <span className="text-sm font-medium truncate">{p.nome}</span>
                  <span className={`text-[10px] font-bold ${tem ? "text-accent2" : "text-text3"}`}>
                    {tem ? "✓" : "—"}
                  </span>
                </div>
              );
            })}
            {pacientes.length === 0 && <p className="text-text3 text-xs">Nenhum paciente.</p>}
          </div>
        </div>

        {/* Anamnese detail */}
        <div className="bg-surface border border-border rounded-xl p-5">
          {!selectedPac ? (
            <div className="text-center py-8 text-text3 text-sm">
              Selecione um paciente para ver a anamnese.
            </div>
          ) : !anamnese ? (
            <div className="text-center py-8">
              <p className="text-text3 text-sm">
                {selectedPac.nome} ainda não preencheu a anamnese.
              </p>
              <p className="text-text3 text-xs mt-1">
                O paciente preenche no primeiro acesso à área dele.
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-text">{selectedPac.nome}</h2>
                <span className="text-xs text-text3">
                  Preenchida em {fmtData(anamnese.created_at)}
                </span>
              </div>

              <div className="flex flex-col gap-4">
                {CAMPOS_ANAMNESE.map((campo) => {
                  const val = anamnese.respostas?.[campo.id];
                  return (
                    <div key={campo.id} className="bg-bg border border-border rounded-lg p-4">
                      <p className="text-[11px] font-semibold text-accent uppercase tracking-wider mb-1.5">
                        {campo.label}
                      </p>
                      <p className="text-sm text-text whitespace-pre-wrap">
                        {val || <span className="text-text3 italic">Não informado</span>}
                      </p>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
