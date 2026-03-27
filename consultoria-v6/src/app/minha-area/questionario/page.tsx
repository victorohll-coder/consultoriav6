"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { PERGUNTAS, BLOCOS } from "@/lib/questionario";
import type { Questionario } from "@/lib/types";

function fmtData(d: string) {
  return new Date(d).toLocaleDateString("pt-BR");
}

export default function QuestionarioPacientePage() {
  const supabase = createClient();
  const [pacienteId, setPacienteId] = useState<string | null>(null);
  const [pendente, setPendente] = useState<Questionario | null>(null);
  const [historico, setHistorico] = useState<Questionario[]>([]);
  const [respostas, setRespostas] = useState<Record<string, string | number>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
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

    const hoje = new Date().toISOString().split("T")[0];

    // Pendente
    const { data: pend } = await supabase
      .from("questionarios")
      .select("*")
      .eq("paciente_id", paciente.id)
      .is("data_resposta", null)
      .lte("proxima_data", hoje)
      .order("proxima_data", { ascending: true })
      .limit(1);

    if (pend && pend.length > 0) {
      setPendente(pend[0] as Questionario);
    }

    // Historico respondidos
    const { data: hist } = await supabase
      .from("questionarios")
      .select("*")
      .eq("paciente_id", paciente.id)
      .not("data_resposta", "is", null)
      .order("data_resposta", { ascending: false });

    if (hist) setHistorico(hist as Questionario[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { loadData(); }, [loadData]);

  async function handleSubmit() {
    if (!pendente || !pacienteId) return;

    // Validate all required
    const missing = PERGUNTAS.filter((p) => {
      const val = respostas[p.id];
      if (p.tipo === "livre") return false; // Optional
      return val === undefined || val === "" || val === null;
    });
    if (missing.length > 0) {
      alert(`Responda todas as perguntas obrigatórias. Faltam ${missing.length}.`);
      return;
    }

    setSubmitting(true);

    const hoje = new Date().toISOString().split("T")[0];
    const proxima = new Date();
    proxima.setDate(proxima.getDate() + 15);

    // Update current
    await supabase
      .from("questionarios")
      .update({
        data_resposta: hoje,
        respostas,
      })
      .eq("id", pendente.id);

    // Create next
    await supabase.from("questionarios").insert({
      paciente_id: pacienteId,
      proxima_data: proxima.toISOString().split("T")[0],
    });

    setSuccess(true);
    setSubmitting(false);
    setPendente(null);
    setRespostas({});
    loadData();
  }

  if (loading) return <div className="text-[#475569] text-sm">Carregando...</div>;

  return (
    <div>
      <h1 style={{fontFamily:"var(--font-display)"}} className="text-xl font-bold text-[#0f172a] mb-4">Questionário</h1>

      {/* Success message */}
      {success && (
        <div className="bg-[#059669]/10 border border-[#059669]/30 rounded-xl p-4 mb-4">
          <p className="text-[#059669] text-sm font-semibold">✓ Respostas enviadas com sucesso!</p>
          <p className="text-[#475569] text-xs mt-1">Obrigado por responder. Seu próximo questionário será em 15 dias.</p>
        </div>
      )}

      {/* Formulario pendente */}
      {pendente && (
        <div className="bg-white border border-[#2563eb]/30 rounded-xl p-5 mb-6">
          <h2 className="text-base font-bold text-[#0f172a] mb-4">📋 Questionário Pendente</h2>

          {BLOCOS.map((bloco) => {
            const perguntas = PERGUNTAS.filter((p) => p.bloco === bloco);
            return (
              <div key={bloco} className="mb-5">
                <h3 className="text-xs font-bold text-[#2563eb] uppercase tracking-wider mb-3">{bloco}</h3>
                <div className="flex flex-col gap-4">
                  {perguntas.map((p) => {
                    const globalIndex = PERGUNTAS.indexOf(p) + 1;
                    return (
                    <div key={p.id} className="bg-[#f8fafc] border border-[#e0eaf5] rounded-lg p-4">
                      <p className="text-sm text-[#0f172a] font-medium mb-2">
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#2563eb]/10 text-[#2563eb] text-xs font-bold mr-2 shrink-0">{globalIndex}</span>
                        {p.texto}
                      </p>

                      {p.tipo === "escala" && (
                        <div>
                          <div className="flex justify-between text-[10px] text-[#9ca3af] mb-1">
                            <span>{p.minLabel}</span>
                            <span>{p.maxLabel}</span>
                          </div>
                          <div className="flex gap-2">
                            {Array.from({ length: (p.max || 5) - (p.min || 1) + 1 }, (_, i) => i + (p.min || 1)).map((val) => (
                              <button
                                key={val}
                                onClick={() => setRespostas({ ...respostas, [p.id]: val })}
                                className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all border ${
                                  respostas[p.id] === val
                                    ? "bg-[#2563eb] text-white border-[#2563eb]"
                                    : "bg-white border-[#e0eaf5] text-[#475569] hover:border-[#2563eb]/40"
                                }`}
                              >
                                {val}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {p.tipo === "opcao" && (
                        <div className="flex flex-wrap gap-2">
                          {p.opcoes?.map((opt) => (
                            <button
                              key={opt}
                              onClick={() => setRespostas({ ...respostas, [p.id]: opt })}
                              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                                respostas[p.id] === opt
                                  ? "bg-[#2563eb] text-white border-[#2563eb]"
                                  : "bg-white border-[#e0eaf5] text-[#475569] hover:border-[#2563eb]/40"
                              }`}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      )}

                      {p.tipo === "livre" && (
                        <textarea
                          value={(respostas[p.id] as string) || ""}
                          onChange={(e) => setRespostas({ ...respostas, [p.id]: e.target.value })}
                          rows={3}
                          className="w-full px-3 py-2 bg-white border border-[#e0eaf5] rounded-lg text-[#0f172a] text-sm focus:border-[#2563eb] focus:outline-none resize-none"
                          placeholder="Escreva aqui..."
                        />
                      )}
                    </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full bg-[#2563eb] hover:bg-[#172e8a] text-white font-semibold py-3 rounded-xl text-sm transition-colors disabled:opacity-50"
          >
            {submitting ? "Enviando..." : "Enviar Respostas"}
          </button>
        </div>
      )}

      {/* Sem pendente e sem historico */}
      {!pendente && historico.length === 0 && !success && (
        <div className="bg-white border border-[#e0eaf5] rounded-xl p-8 text-center">
          <p className="text-3xl mb-2">📋</p>
          <p className="text-[#475569] text-sm">Nenhum questionário disponível no momento.</p>
        </div>
      )}

      {/* Historico */}
      {historico.length > 0 && (
        <div>
          <h2 className="text-base font-bold text-[#0f172a] mb-3">Histórico de Respostas</h2>
          <div className="flex flex-col gap-2">
            {historico.map((q) => (
              <div key={q.id} className="bg-white border border-[#e0eaf5] rounded-xl overflow-hidden">
                <button
                  onClick={() => setExpanded(expanded === q.id ? null : q.id)}
                  className="w-full flex items-center justify-between px-5 py-3 hover:bg-[#f1f5f9] transition-all"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-[#059669]">✓</span>
                    <span className="text-[#0f172a] text-sm font-medium">
                      Respondido em {fmtData(q.data_resposta!)}
                    </span>
                  </div>
                  <span className="text-[#9ca3af] text-sm">{expanded === q.id ? "▲" : "▼"}</span>
                </button>

                {expanded === q.id && q.respostas && (
                  <div className="border-t border-[#e0eaf5] px-5 py-4">
                    {BLOCOS.map((bloco) => {
                      const perguntas = PERGUNTAS.filter((p) => p.bloco === bloco);
                      return (
                        <div key={bloco} className="mb-4">
                          <h4 className="text-[10px] font-bold text-[#2563eb] uppercase tracking-wider mb-2">{bloco}</h4>
                          {perguntas.map((p) => {
                            const gIdx = PERGUNTAS.indexOf(p) + 1;
                            return (
                            <div key={p.id} className="flex justify-between py-1.5 border-b border-[#e0eaf5]/30 last:border-0">
                              <span className="text-[#475569] text-xs"><span className="text-[#2563eb] font-bold mr-1.5">{gIdx}.</span>{p.texto}</span>
                              <span className="text-[#0f172a] text-xs font-semibold ml-4 shrink-0">
                                {q.respostas![p.id] !== undefined ? String(q.respostas![p.id]) : "—"}
                              </span>
                            </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
