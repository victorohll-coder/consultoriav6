"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { CAMPOS_ANAMNESE, BLOCOS_ANAMNESE } from "@/lib/anamnese";
import type { Anamnese } from "@/lib/types";

export default function AnamnesePacientePage() {
  const supabase = createClient();
  const [pacienteId, setPacienteId] = useState<string | null>(null);
  const [anamnese, setAnamnese] = useState<Anamnese | null>(null);
  const [respostas, setRespostas] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [currentBloco, setCurrentBloco] = useState(0);

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

    if (!respostas.objetivo?.trim()) {
      alert("Preencha pelo menos o campo sobre seu objetivo principal.");
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

  if (loading) return <div className="text-text2 text-sm p-6">Carregando...</div>;

  // === JÁ PREENCHIDA — SOMENTE LEITURA (não pode alterar) ===
  if (anamnese) {
    return (
      <div>
        <h1 className="text-xl font-bold text-text mb-4">Anamnese</h1>

        <div className="bg-accent2/10 border border-accent2/30 rounded-xl p-4 mb-6">
          <p className="text-accent2 text-sm font-semibold">✓ Anamnese preenchida</p>
          <p className="text-text2 text-xs mt-1">
            Enviada em {new Date(anamnese.created_at).toLocaleDateString("pt-BR")}. Suas respostas não podem ser alteradas.
          </p>
        </div>

        {BLOCOS_ANAMNESE.map((bloco) => (
          <div key={bloco} className="mb-6">
            <h2 className="text-xs font-bold text-accent uppercase tracking-wider mb-3 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-accent" />
              {bloco}
            </h2>
            <div className="flex flex-col gap-2">
              {CAMPOS_ANAMNESE.filter((c) => c.bloco === bloco).map((campo) => {
                const val = anamnese.respostas?.[campo.id];
                return (
                  <div key={campo.id} className="bg-surface border border-border rounded-xl p-4">
                    <p className="text-[11px] font-semibold text-text2 mb-1">
                      {campo.label}
                    </p>
                    <p className="text-sm text-text whitespace-pre-wrap">
                      {campo.tipo === "escala" && val ? `${val}/10` : val || <span className="text-text3 italic">Não informado</span>}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // === FORMULÁRIO POR BLOCOS (stepper) ===
  const blocoAtual = BLOCOS_ANAMNESE[currentBloco];
  const camposBlocoAtual = CAMPOS_ANAMNESE.filter((c) => c.bloco === blocoAtual);
  const isLastBloco = currentBloco === BLOCOS_ANAMNESE.length - 1;
  const isFirstBloco = currentBloco === 0;

  return (
    <div>
      <h1 className="text-xl font-bold text-text mb-1">Anamnese</h1>
      <p className="text-text2 text-sm mb-6">
        Responda com calma e honestidade. Suas respostas ajudam a montar o melhor plano para você.
      </p>

      {success && (
        <div className="bg-accent2/10 border border-accent2/30 rounded-xl p-4 mb-4">
          <p className="text-accent2 text-sm font-semibold">✓ Anamnese salva com sucesso!</p>
          <p className="text-text2 text-xs mt-1">Obrigado por responder. Seu nutricionista já pode visualizar.</p>
        </div>
      )}

      {/* Progress bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-accent">{blocoAtual}</span>
          <span className="text-[10px] text-text3">{currentBloco + 1} de {BLOCOS_ANAMNESE.length}</span>
        </div>
        <div className="w-full h-1.5 bg-surface2 rounded-full overflow-hidden">
          <div
            className="h-full bg-accent rounded-full transition-all duration-300"
            style={{ width: `${((currentBloco + 1) / BLOCOS_ANAMNESE.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Questions for current block */}
      <div className="flex flex-col gap-4 mb-6">
        {camposBlocoAtual.map((campo) => (
          <div key={campo.id} className="bg-surface border border-border rounded-xl p-4">
            <label className="block text-sm font-semibold text-text mb-2">
              {campo.label}
              {campo.id === "objetivo" && <span className="text-danger ml-1">*</span>}
            </label>

            {campo.tipo === "textarea" && (
              <textarea
                value={respostas[campo.id] || ""}
                onChange={(e) => setRespostas({ ...respostas, [campo.id]: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-text text-sm focus:border-accent focus:outline-none resize-none transition-colors"
                placeholder={campo.placeholder || "Descreva aqui..."}
              />
            )}

            {campo.tipo === "opcao" && campo.opcoes && (
              <div className="flex flex-wrap gap-2">
                {campo.opcoes.map((op) => (
                  <button
                    key={op}
                    type="button"
                    onClick={() => setRespostas({ ...respostas, [campo.id]: op })}
                    className={`px-3 py-2 rounded-lg text-sm border transition-all ${
                      respostas[campo.id] === op
                        ? "bg-accent text-white border-accent"
                        : "bg-bg border-border text-text2 hover:border-accent/50"
                    }`}
                  >
                    {op}
                  </button>
                ))}
              </div>
            )}

            {campo.tipo === "escala" && (
              <div className="flex flex-col gap-2">
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={respostas[campo.id] || 5}
                  onChange={(e) => setRespostas({ ...respostas, [campo.id]: e.target.value })}
                  className="w-full accent-accent"
                />
                <div className="flex justify-between text-[10px] text-text3">
                  <span>1 — Pouco</span>
                  <span className="text-accent font-bold text-sm">{respostas[campo.id] || 5}</span>
                  <span>10 — Máximo</span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Navigation */}
      <div className="flex gap-3">
        {!isFirstBloco && (
          <button
            onClick={() => setCurrentBloco(currentBloco - 1)}
            className="flex-1 bg-surface2 hover:bg-border text-text font-semibold py-3 rounded-xl text-sm transition-colors border border-border"
          >
            ← Voltar
          </button>
        )}

        {!isLastBloco ? (
          <button
            onClick={() => setCurrentBloco(currentBloco + 1)}
            className="flex-1 bg-accent hover:bg-[#172e8a] text-white font-semibold py-3 rounded-xl text-sm transition-colors"
          >
            Próximo →
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 bg-accent2 hover:bg-accent2/80 text-white font-semibold py-3 rounded-xl text-sm transition-colors disabled:opacity-50"
          >
            {submitting ? "Enviando..." : "✓ Enviar Anamnese"}
          </button>
        )}
      </div>
    </div>
  );
}
