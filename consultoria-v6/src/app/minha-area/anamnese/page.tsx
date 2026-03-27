"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { CAMPOS_ANAMNESE, BLOCOS_ANAMNESE } from "@/lib/anamnese";
import type { Anamnese } from "@/lib/types";

/* SVG Icons */
const SvgCheck = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20,6 9,17 4,12"/>
  </svg>
);
const SvgLock = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
  </svg>
);
const SvgSend = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22,2 15,22 11,13 2,9"/>
  </svg>
);
const SvgArrowLeft = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12,19 5,12 12,5"/>
  </svg>
);
const SvgArrowRight = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12,5 19,12 12,19"/>
  </svg>
);

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

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="h-8 w-48 shimmer rounded-lg" />
        <div className="h-2 shimmer rounded-full" />
        {[1,2,3].map(i => <div key={i} className="h-24 shimmer rounded-2xl" />)}
      </div>
    );
  }

  // Global question numbering
  const getGlobalIndex = (campoId: string) => CAMPOS_ANAMNESE.findIndex(c => c.id === campoId) + 1;

  // === JA PREENCHIDA — SOMENTE LEITURA ===
  if (anamnese) {
    return (
      <div className="animate-fade-in-up">
        <h1 style={{fontFamily:"var(--font-display)"}} className="text-xl font-bold text-[#0f172a] mb-4">Anamnese</h1>

        <div className="bg-emerald-50 border border-emerald-200/60 rounded-2xl p-4 mb-6 flex items-start gap-3">
          <div className="flex items-center gap-2">
            <span className="text-emerald-600"><SvgCheck /></span>
            <span className="text-emerald-600"><SvgLock /></span>
          </div>
          <div>
            <p className="text-emerald-700 text-sm font-semibold">Anamnese preenchida</p>
            <p className="text-[#475569] text-xs mt-0.5">
              Enviada em {new Date(anamnese.created_at).toLocaleDateString("pt-BR")}. Suas respostas nao podem ser alteradas.
            </p>
          </div>
        </div>

        {BLOCOS_ANAMNESE.map((bloco, idx) => (
          <div key={bloco} className="mb-6" style={{ animationDelay: `${idx * 0.05}s` }}>
            <h2 className="text-[11px] font-bold text-[#0f2d52] uppercase tracking-[0.15em] mb-3 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: "linear-gradient(135deg, #c8a96e, #dbb87a)" }} />
              {bloco}
            </h2>
            <div className="flex flex-col gap-2">
              {CAMPOS_ANAMNESE.filter((c) => c.bloco === bloco).map((campo) => {
                const val = anamnese.respostas?.[campo.id];
                const gIdx = getGlobalIndex(campo.id);
                return (
                  <div key={campo.id} className="bg-white border border-[#e0eaf5] rounded-2xl p-4">
                    <p className="text-[11px] font-semibold text-[#475569] mb-1 flex items-center gap-1.5">
                      <span className="text-[#0f2d52] font-bold">{gIdx}.</span>
                      {campo.label}
                    </p>
                    <p className="text-sm text-[#0f172a] whitespace-pre-wrap pl-4">
                      {campo.tipo === "escala" && val ? `${val}/10` : val || <span className="text-[#94a3b8] italic">Nao informado</span>}
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

  // === FORMULARIO POR BLOCOS (stepper) ===
  const blocoAtual = BLOCOS_ANAMNESE[currentBloco];
  const camposBlocoAtual = CAMPOS_ANAMNESE.filter((c) => c.bloco === blocoAtual);
  const isLastBloco = currentBloco === BLOCOS_ANAMNESE.length - 1;
  const isFirstBloco = currentBloco === 0;

  return (
    <div className="animate-fade-in-up">
      <h1 style={{fontFamily:"var(--font-display)"}} className="text-xl font-bold text-[#0f172a] mb-1">Anamnese</h1>
      <p className="text-[#475569] text-sm mb-6">
        Responda com calma e honestidade. Suas respostas ajudam a montar o melhor plano para voce.
      </p>

      {success && (
        <div className="bg-emerald-50 border border-emerald-200/60 rounded-2xl p-4 mb-4 animate-fade-in-scale">
          <div className="flex items-center gap-2">
            <span className="text-emerald-600"><SvgCheck /></span>
            <p className="text-emerald-700 text-sm font-semibold">Anamnese salva com sucesso!</p>
          </div>
          <p className="text-[#475569] text-xs mt-1 ml-6">Obrigado por responder. Seu nutricionista ja pode visualizar.</p>
        </div>
      )}

      {/* Stepper progress */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-bold text-[#0f2d52] uppercase tracking-[0.15em]">{blocoAtual}</span>
          <span className="text-[10px] text-[#94a3b8] font-semibold">{currentBloco + 1} de {BLOCOS_ANAMNESE.length}</span>
        </div>
        <div className="w-full h-2 bg-[#f1f5f9] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500 ease-out"
            style={{ width: `${((currentBloco + 1) / BLOCOS_ANAMNESE.length) * 100}%`, background: "linear-gradient(90deg, #0f2d52 0%, #c8a96e 100%)" }}
          />
        </div>
        {/* Step dots */}
        <div className="flex gap-1.5 mt-2">
          {BLOCOS_ANAMNESE.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentBloco(i)}
              className={`h-1.5 rounded-full transition-all duration-200 ${
                i === currentBloco ? "w-6 bg-[#c8a96e]" : i < currentBloco ? "w-3 bg-[#0f2d52]/30" : "w-3 bg-[#e0eaf5]"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Questions for current block */}
      <div className="flex flex-col gap-4 mb-6">
        {camposBlocoAtual.map((campo, idx) => {
          const gIdx = getGlobalIndex(campo.id);
          return (
          <div key={campo.id} className="bg-white border border-[#e0eaf5] rounded-2xl p-4 animate-fade-in-up" style={{ animationDelay: `${idx * 0.04}s` }}>
            <label className="flex items-start gap-2 text-sm font-semibold text-[#0f172a] mb-3">
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#0f2d52]/5 text-[#0f2d52] text-[11px] font-bold shrink-0 mt-0.5">{gIdx}</span>
              <span className="flex-1">
                {campo.label}
                {campo.id === "objetivo" && <span className="text-rose-500 ml-1">*</span>}
              </span>
            </label>

            {campo.tipo === "textarea" && (
              <textarea
                value={respostas[campo.id] || ""}
                onChange={(e) => setRespostas({ ...respostas, [campo.id]: e.target.value })}
                rows={3}
                className="w-full px-3 py-2.5 bg-[#f8fafc] border border-[#e0eaf5] rounded-xl text-[#0f172a] text-sm focus:border-[#c8a96e] focus:ring-2 focus:ring-[#c8a96e]/10 focus:outline-none resize-none transition-all"
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
                    className={`px-3.5 py-2 rounded-xl text-sm border font-medium transition-all duration-200 active-press ${
                      respostas[campo.id] === op
                        ? "bg-[#0f2d52] text-white border-[#0f2d52] shadow-sm"
                        : "bg-[#f8fafc] border-[#e0eaf5] text-[#475569] hover:border-[#c8a96e]/50"
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
                  className="w-full accent-[#c8a96e]"
                />
                <div className="flex justify-between text-[10px] text-[#94a3b8] font-medium">
                  <span>1 — Pouco</span>
                  <span className="text-[#0f2d52] font-bold text-base">{respostas[campo.id] || 5}</span>
                  <span>10 — Maximo</span>
                </div>
              </div>
            )}
          </div>
          );
        })}
      </div>

      {/* Navigation */}
      <div className="flex gap-3">
        {!isFirstBloco && (
          <button
            onClick={() => setCurrentBloco(currentBloco - 1)}
            className="flex-1 flex items-center justify-center gap-2 bg-white hover:bg-[#f8fafc] text-[#0f172a] font-semibold py-3.5 rounded-2xl text-sm transition-all duration-200 border border-[#e0eaf5] active-press"
          >
            <SvgArrowLeft /> Voltar
          </button>
        )}

        {!isLastBloco ? (
          <button
            onClick={() => setCurrentBloco(currentBloco + 1)}
            className="flex-1 flex items-center justify-center gap-2 text-white font-semibold py-3.5 rounded-2xl text-sm transition-all duration-200 shadow-md hover:shadow-lg active-press"
            style={{ background: "linear-gradient(135deg, #0f2d52 0%, #1e3a5f 100%)" }}
          >
            Proximo <SvgArrowRight />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3.5 rounded-2xl text-sm transition-all duration-200 disabled:opacity-50 shadow-md active-press"
          >
            {submitting ? "Enviando..." : <><SvgSend /> Enviar Anamnese</>}
          </button>
        )}
      </div>
    </div>
  );
}
