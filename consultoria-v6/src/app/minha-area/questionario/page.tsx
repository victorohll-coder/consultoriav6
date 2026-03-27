"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { PERGUNTAS, BLOCOS } from "@/lib/questionario";
import type { Questionario } from "@/lib/types";

function fmtData(d: string) {
  return new Date(d).toLocaleDateString("pt-BR");
}

/* SVG Icons */
const SvgCheck = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20,6 9,17 4,12"/>
  </svg>
);
const SvgChevron = ({ open }: { open: boolean }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}>
    <polyline points="6,9 12,15 18,9"/>
  </svg>
);
const SvgSend = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22,2 15,22 11,13 2,9"/>
  </svg>
);
const SvgClipboard = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/>
    <path d="M12 11h4M12 16h4M8 11h.01M8 16h.01"/>
  </svg>
);

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

    const missing = PERGUNTAS.filter((p) => {
      const val = respostas[p.id];
      if (p.tipo === "livre") return false;
      return val === undefined || val === "" || val === null;
    });
    if (missing.length > 0) {
      alert(`Responda todas as perguntas obrigatorias. Faltam ${missing.length}.`);
      return;
    }

    setSubmitting(true);

    const hoje = new Date().toISOString().split("T")[0];
    const proxima = new Date();
    proxima.setDate(proxima.getDate() + 15);

    await supabase
      .from("questionarios")
      .update({
        data_resposta: hoje,
        respostas,
      })
      .eq("id", pendente.id);

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

  // Compute answered count for progress
  const answeredCount = PERGUNTAS.filter(p => {
    const val = respostas[p.id];
    return val !== undefined && val !== "" && val !== null;
  }).length;
  const progressPct = Math.round((answeredCount / PERGUNTAS.length) * 100);

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="h-8 w-48 shimmer rounded-lg" />
        <div className="h-2 shimmer rounded-full" />
        {[1,2,3].map(i => <div key={i} className="h-24 shimmer rounded-2xl" />)}
      </div>
    );
  }

  return (
    <div>
      <h1 style={{fontFamily:"var(--font-display)"}} className="text-xl font-bold text-[#0f172a] mb-4 animate-fade-in-up">Questionario</h1>

      {/* Success message */}
      {success && (
        <div className="bg-emerald-50 border border-emerald-200/60 rounded-2xl p-4 mb-4 animate-fade-in-scale">
          <div className="flex items-center gap-2">
            <span className="text-emerald-600"><SvgCheck /></span>
            <p className="text-emerald-700 text-sm font-semibold">Respostas enviadas com sucesso!</p>
          </div>
          <p className="text-[#475569] text-xs mt-1 ml-6">Obrigado por responder. Seu proximo questionario sera em 15 dias.</p>
        </div>
      )}

      {/* Formulario pendente */}
      {pendente && (
        <div className="animate-fade-in-up">
          {/* Progress bar */}
          <div className="bg-white border border-[#e0eaf5] rounded-2xl p-4 mb-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-[#0f2d52] uppercase tracking-wider">Progresso</span>
              <span className="text-xs font-bold text-[#2563eb]">{answeredCount}/{PERGUNTAS.length}</span>
            </div>
            <div className="w-full h-2 bg-[#f1f5f9] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progressPct}%`, background: "linear-gradient(90deg, #2563eb 0%, #c8a96e 100%)" }}
              />
            </div>
          </div>

          {BLOCOS.map((bloco, blocoIdx) => {
            const perguntas = PERGUNTAS.filter((p) => p.bloco === bloco);
            return (
              <div key={bloco} className="mb-5 animate-fade-in-up" style={{ animationDelay: `${blocoIdx * 0.06}s` }}>
                <h3 className="text-[11px] font-bold text-[#0f2d52] uppercase tracking-[0.15em] mb-3 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: "linear-gradient(135deg, #c8a96e, #dbb87a)" }} />
                  {bloco}
                </h3>
                <div className="flex flex-col gap-3">
                  {perguntas.map((p) => {
                    const globalIndex = PERGUNTAS.indexOf(p) + 1;
                    const isAnswered = respostas[p.id] !== undefined && respostas[p.id] !== "" && respostas[p.id] !== null;
                    return (
                    <div key={p.id} className={`bg-white border rounded-2xl p-4 transition-all duration-200 ${isAnswered ? "border-emerald-200/60 shadow-sm" : "border-[#e0eaf5]"}`}>
                      <p className="text-sm text-[#0f172a] font-medium mb-3 flex items-start gap-2">
                        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-bold shrink-0 mt-0.5 transition-colors duration-200 ${isAnswered ? "bg-emerald-100 text-emerald-700" : "bg-[#0f2d52]/5 text-[#0f2d52]"}`}>{globalIndex}</span>
                        <span className="flex-1">{p.texto}</span>
                        {isAnswered && <span className="text-emerald-500 shrink-0 mt-0.5"><SvgCheck /></span>}
                      </p>

                      {p.tipo === "escala" && (
                        <div>
                          <div className="flex justify-between text-[10px] text-[#94a3b8] mb-1.5 font-medium">
                            <span>{p.minLabel}</span>
                            <span>{p.maxLabel}</span>
                          </div>
                          <div className="flex gap-1.5">
                            {Array.from({ length: (p.max || 5) - (p.min || 1) + 1 }, (_, i) => i + (p.min || 1)).map((val) => (
                              <button
                                key={val}
                                onClick={() => setRespostas({ ...respostas, [p.id]: val })}
                                className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 border active-press ${
                                  respostas[p.id] === val
                                    ? "bg-[#0f2d52] text-white border-[#0f2d52] shadow-sm"
                                    : "bg-white border-[#e0eaf5] text-[#475569] hover:border-[#c8a96e]/40"
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
                              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-200 border active-press ${
                                respostas[p.id] === opt
                                  ? "bg-[#0f2d52] text-white border-[#0f2d52] shadow-sm"
                                  : "bg-white border-[#e0eaf5] text-[#475569] hover:border-[#c8a96e]/40"
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
                          className="w-full px-3 py-2.5 bg-[#f8fafc] border border-[#e0eaf5] rounded-xl text-[#0f172a] text-sm focus:border-[#c8a96e] focus:ring-2 focus:ring-[#c8a96e]/10 focus:outline-none resize-none transition-all"
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
            className="w-full flex items-center justify-center gap-2 text-white font-bold py-3.5 rounded-2xl text-sm transition-all duration-200 disabled:opacity-50 shadow-md hover:shadow-lg active-press"
            style={{ background: "linear-gradient(135deg, #0f2d52 0%, #1e3a5f 100%)" }}
          >
            {submitting ? "Enviando..." : <><SvgSend /> Enviar Respostas</>}
          </button>
        </div>
      )}

      {/* Sem pendente e sem historico */}
      {!pendente && historico.length === 0 && !success && (
        <div className="bg-white border border-[#e0eaf5] rounded-2xl p-10 text-center shadow-sm animate-fade-in-up">
          <div className="w-16 h-16 rounded-2xl bg-[#eff6ff] flex items-center justify-center mx-auto mb-4 text-[#94a3b8]">
            <SvgClipboard />
          </div>
          <p className="text-[#0f172a] font-semibold text-base">Nenhum questionario disponivel</p>
          <p className="text-[#94a3b8] text-sm mt-1">Seu proximo questionario sera liberado automaticamente.</p>
        </div>
      )}

      {/* Historico */}
      {historico.length > 0 && (
        <div className="mt-6 animate-fade-in-up-d2">
          <h2 className="text-sm font-bold text-[#0f2d52] mb-3 uppercase tracking-wider">Historico de Respostas</h2>
          <div className="flex flex-col gap-2">
            {historico.map((q) => (
              <div key={q.id} className="bg-white border border-[#e0eaf5] rounded-2xl overflow-hidden shadow-sm">
                <button
                  onClick={() => setExpanded(expanded === q.id ? null : q.id)}
                  className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-[#f8fafc] transition-all duration-200 active-press"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-emerald-500"><SvgCheck /></span>
                    <span className="text-[#0f172a] text-sm font-medium">
                      Respondido em {fmtData(q.data_resposta!)}
                    </span>
                  </div>
                  <SvgChevron open={expanded === q.id} />
                </button>

                {expanded === q.id && q.respostas && (
                  <div className="border-t border-[#e0eaf5] px-5 py-4 animate-fade-in-up">
                    {BLOCOS.map((bloco) => {
                      const perguntas = PERGUNTAS.filter((p) => p.bloco === bloco);
                      return (
                        <div key={bloco} className="mb-4">
                          <h4 className="text-[10px] font-bold text-[#0f2d52] uppercase tracking-[0.15em] mb-2 flex items-center gap-1.5">
                            <span className="w-1 h-1 rounded-full bg-[#c8a96e]" />
                            {bloco}
                          </h4>
                          {perguntas.map((p) => {
                            const gIdx = PERGUNTAS.indexOf(p) + 1;
                            return (
                            <div key={p.id} className="flex justify-between py-1.5 border-b border-[#e0eaf5]/30 last:border-0">
                              <span className="text-[#475569] text-xs"><span className="text-[#0f2d52] font-bold mr-1.5">{gIdx}.</span>{p.texto}</span>
                              <span className="text-[#0f172a] text-xs font-semibold ml-4 shrink-0">
                                {q.respostas![p.id] !== undefined ? String(q.respostas![p.id]) : "\u2014"}
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
