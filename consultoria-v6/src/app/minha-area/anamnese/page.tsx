"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { CAMPOS_ANAMNESE } from "@/lib/anamnese";
import type { Anamnese } from "@/lib/types";

export default function AnamnesePacientePage() {
  const supabase = createClient();
  const [pacienteId, setPacienteId] = useState<string | null>(null);
  const [anamnese, setAnamnese] = useState<Anamnese | null>(null);
  const [respostas, setRespostas] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", user.id)
      .single();
    if (!profile) return;

    const { data: paciente } = await supabase
      .from("pacientes")
      .select("id")
      .eq("email", profile.email)
      .single();
    if (!paciente) return;
    setPacienteId(paciente.id);

    const { data: anamneseData } = await supabase
      .from("anamnese")
      .select("*")
      .eq("paciente_id", paciente.id)
      .order("created_at", { ascending: false })
      .limit(1);

    if (anamneseData && anamneseData.length > 0) {
      setAnamnese(anamneseData[0] as Anamnese);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => { loadData(); }, [loadData]);

  async function handleSubmit() {
    if (!pacienteId) return;

    // Validate at least objetivo
    if (!respostas.objetivo?.trim()) {
      alert("Preencha pelo menos o campo 'Objetivo principal'.");
      return;
    }

    setSubmitting(true);

    const { error } = await supabase.from("anamnese").insert({
      paciente_id: pacienteId,
      respostas,
    });

    if (error) {
      alert("Erro ao salvar: " + error.message);
      setSubmitting(false);
      return;
    }

    setSuccess(true);
    setSubmitting(false);
    loadData();
  }

  if (loading) return <div className="text-text2 text-sm">Carregando...</div>;

  // Ja preenchida — somente leitura
  if (anamnese) {
    return (
      <div>
        <h1 className="text-xl font-bold text-text mb-4">Anamnese</h1>

        <div className="bg-accent2/10 border border-accent2/30 rounded-xl p-4 mb-4">
          <p className="text-accent2 text-sm font-semibold">✓ Anamnese preenchida</p>
          <p className="text-text2 text-xs mt-1">
            Preenchida em {new Date(anamnese.created_at).toLocaleDateString("pt-BR")}
          </p>
        </div>

        <div className="flex flex-col gap-3">
          {CAMPOS_ANAMNESE.map((campo) => {
            const val = anamnese.respostas?.[campo.id];
            return (
              <div key={campo.id} className="bg-surface border border-border rounded-xl p-4">
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
      </div>
    );
  }

  // Formulario para preencher
  return (
    <div>
      <h1 className="text-xl font-bold text-text mb-2">Anamnese</h1>
      <p className="text-text2 text-sm mb-6">
        Preencha suas informações para que seu nutricionista te conheça melhor.
      </p>

      {success && (
        <div className="bg-accent2/10 border border-accent2/30 rounded-xl p-4 mb-4">
          <p className="text-accent2 text-sm font-semibold">✓ Anamnese salva com sucesso!</p>
        </div>
      )}

      <div className="flex flex-col gap-4">
        {CAMPOS_ANAMNESE.map((campo) => (
          <div key={campo.id} className="bg-surface border border-border rounded-xl p-4">
            <label className="block text-[11px] font-semibold text-accent uppercase tracking-wider mb-2">
              {campo.label}
              {campo.id === "objetivo" && <span className="text-danger ml-1">*</span>}
            </label>
            <textarea
              value={respostas[campo.id] || ""}
              onChange={(e) => setRespostas({ ...respostas, [campo.id]: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-text text-sm focus:border-accent focus:outline-none resize-none"
              placeholder={`Descreva aqui...`}
            />
          </div>
        ))}

        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full bg-accent hover:bg-[#172e8a] text-white font-semibold py-3 rounded-xl text-sm transition-colors disabled:opacity-50"
        >
          {submitting ? "Salvando..." : "Salvar Anamnese"}
        </button>
      </div>
    </div>
  );
}
