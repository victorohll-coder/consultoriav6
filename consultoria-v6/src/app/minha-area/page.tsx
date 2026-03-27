"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

/* SVG Icons */
const SvgClipboard = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/>
    <path d="M12 11h4M12 16h4M8 11h.01M8 16h.01"/>
  </svg>
);
const SvgFileText = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/>
    <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
  </svg>
);
const SvgFolder = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>
  </svg>
);
const SvgScale = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3v17M5 8l7-5 7 5"/><path d="M5 8c0 3-2 5-2 5h4s-2-2-2-5zM19 8c0 3 2 5 2 5h-4s2-2 2-5z"/>
  </svg>
);
const SvgCheck = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20,6 9,17 4,12"/>
  </svg>
);
const SvgClock = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/>
  </svg>
);
const SvgArrowRight = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12,5 19,12 12,19"/>
  </svg>
);

export default function MinhaAreaPage() {
  const supabase = createClient();
  const [questionarioPendente, setQuestionarioPendente] = useState(false);
  const [anamnesePreenchida, setAnamnesePreenchida] = useState(false);
  const [totalMateriais, setTotalMateriais] = useState(0);
  const [ultimaMedida, setUltimaMedida] = useState<{ peso: number | null; data: string } | null>(null);
  const [loading, setLoading] = useState(true);

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

    const hoje = new Date().toISOString().split("T")[0];
    const { data: questPendente } = await supabase
      .from("questionarios")
      .select("id")
      .eq("paciente_id", paciente.id)
      .is("data_resposta", null)
      .lte("proxima_data", hoje)
      .limit(1);
    setQuestionarioPendente((questPendente?.length || 0) > 0);

    const { data: anamnese } = await supabase
      .from("anamnese")
      .select("id")
      .eq("paciente_id", paciente.id)
      .limit(1);
    setAnamnesePreenchida((anamnese?.length || 0) > 0);

    const { count } = await supabase
      .from("materiais")
      .select("*", { count: "exact", head: true });
    setTotalMateriais(count || 0);

    const { data: medidas } = await supabase
      .from("medidas")
      .select("peso, data")
      .eq("paciente_id", paciente.id)
      .order("data", { ascending: false })
      .limit(1);
    if (medidas && medidas.length > 0) setUltimaMedida(medidas[0]);

    setLoading(false);
  }, [supabase]);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="h-24 rounded-2xl shimmer" />
        <div className="grid grid-cols-2 gap-3">
          <div className="h-32 rounded-2xl shimmer" />
          <div className="h-32 rounded-2xl shimmer" />
          <div className="h-32 rounded-2xl shimmer" />
          <div className="h-32 rounded-2xl shimmer" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Questionario pendente — CTA card */}
      {questionarioPendente && (
        <Link href="/minha-area/questionario" className="animate-fade-in-up group">
          <div className="relative overflow-hidden rounded-2xl p-5 cursor-pointer hover-lift border border-[#2563eb]/15" style={{ background: "linear-gradient(135deg, #eef4ff 0%, #dbeafe 50%, #c7d8f5 100%)" }}>
            <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-10" style={{ background: "radial-gradient(circle, #2563eb 0%, transparent 70%)", transform: "translate(30%, -30%)" }} />
            <div className="flex items-center gap-4 relative z-10">
              <div className="w-12 h-12 rounded-xl bg-[#2563eb] flex items-center justify-center shrink-0 shadow-md text-white group-hover:scale-105 transition-transform duration-300">
                <SvgClipboard />
              </div>
              <div className="flex-1">
                <p className="text-[#0f172a] font-bold text-[15px]">Questionario pendente</p>
                <p className="text-[#475569] text-[12px] mt-0.5">Responda para seu nutricionista acompanhar sua evolucao</p>
              </div>
              <span className="text-[#2563eb] shrink-0 group-hover:translate-x-1 transition-transform duration-200">
                <SvgArrowRight />
              </span>
            </div>
          </div>
        </Link>
      )}

      {/* Anamnese pendente — CTA card */}
      {!anamnesePreenchida && (
        <Link href="/minha-area/anamnese" className="animate-fade-in-up-d1 group">
          <div className="relative overflow-hidden rounded-2xl p-5 cursor-pointer hover-lift border" style={{ background: "linear-gradient(135deg, #fefbf3 0%, #fef3c7 50%, #fde99d 100%)", borderColor: "rgba(200,169,110,0.2)" }}>
            <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-10" style={{ background: "radial-gradient(circle, #c8a96e 0%, transparent 70%)", transform: "translate(30%, -30%)" }} />
            <div className="flex items-center gap-4 relative z-10">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-md text-white group-hover:scale-105 transition-transform duration-300" style={{ background: "linear-gradient(135deg, #c8a96e 0%, #dbb87a 100%)" }}>
                <SvgFileText />
              </div>
              <div className="flex-1">
                <p className="text-[#0f172a] font-bold text-[15px]">Preencha sua anamnese</p>
                <p className="text-[#475569] text-[12px] mt-0.5">Importante para montar o melhor plano para voce</p>
              </div>
              <span className="text-[#c8a96e] shrink-0 group-hover:translate-x-1 transition-transform duration-200">
                <SvgArrowRight />
              </span>
            </div>
          </div>
        </Link>
      )}

      {/* Cards grid — premium stat cards */}
      <div className="grid grid-cols-2 gap-3 animate-fade-in-up-d2">
        <Link href="/minha-area/materiais">
          <div className="bg-white border border-[#e0eaf5] rounded-2xl p-5 shadow-sm hover-lift cursor-pointer group relative overflow-hidden">
            <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full bg-[#2563eb]/[0.03]" />
            <div className="w-10 h-10 rounded-xl bg-[#eff6ff] flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300 text-[#2563eb]">
              <SvgFolder />
            </div>
            <p className="text-2xl font-bold text-[#0f172a] tracking-tight">{totalMateriais}</p>
            <p className="text-[11px] text-[#94a3b8] mt-0.5 font-medium uppercase tracking-wider">Materiais</p>
          </div>
        </Link>

        <Link href="/minha-area/medidas">
          <div className="bg-white border border-[#e0eaf5] rounded-2xl p-5 shadow-sm hover-lift cursor-pointer group relative overflow-hidden">
            <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full bg-[#059669]/[0.03]" />
            <div className="w-10 h-10 rounded-xl bg-[#ecfdf5] flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300 text-[#059669]">
              <SvgScale />
            </div>
            <p className="text-2xl font-bold text-[#0f172a] tracking-tight">
              {ultimaMedida?.peso ? `${ultimaMedida.peso}kg` : "\u2014"}
            </p>
            <p className="text-[11px] text-[#94a3b8] mt-0.5 font-medium uppercase tracking-wider">Ultimo peso</p>
          </div>
        </Link>

        <Link href="/minha-area/questionario">
          <div className="bg-white border border-[#e0eaf5] rounded-2xl p-5 shadow-sm hover-lift cursor-pointer group relative overflow-hidden">
            <div className={`absolute -top-6 -right-6 w-20 h-20 rounded-full ${questionarioPendente ? "bg-[#d97706]/[0.03]" : "bg-[#059669]/[0.03]"}`} />
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300 ${questionarioPendente ? "bg-[#fef3c7] text-[#d97706]" : "bg-[#ecfdf5] text-[#059669]"}`}>
              <SvgClipboard />
            </div>
            <div className="flex items-center gap-1.5">
              {questionarioPendente ? (
                <>
                  <span className="text-[#d97706]"><SvgClock /></span>
                  <span className="text-lg font-bold text-[#d97706]">Pendente</span>
                </>
              ) : (
                <>
                  <span className="text-[#059669]"><SvgCheck /></span>
                  <span className="text-lg font-bold text-[#059669]">Em dia</span>
                </>
              )}
            </div>
            <p className="text-[11px] text-[#94a3b8] mt-1 font-medium uppercase tracking-wider">Questionario</p>
          </div>
        </Link>

        <Link href="/minha-area/anamnese">
          <div className="bg-white border border-[#e0eaf5] rounded-2xl p-5 shadow-sm hover-lift cursor-pointer group relative overflow-hidden">
            <div className={`absolute -top-6 -right-6 w-20 h-20 rounded-full ${anamnesePreenchida ? "bg-[#059669]/[0.03]" : "bg-[#d97706]/[0.03]"}`} />
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300 ${anamnesePreenchida ? "bg-[#ecfdf5] text-[#059669]" : "bg-[#fef3c7] text-[#d97706]"}`}>
              <SvgFileText />
            </div>
            <div className="flex items-center gap-1.5">
              {anamnesePreenchida ? (
                <>
                  <span className="text-[#059669]"><SvgCheck /></span>
                  <span className="text-lg font-bold text-[#059669]">Feita</span>
                </>
              ) : (
                <>
                  <span className="text-[#d97706]"><SvgClock /></span>
                  <span className="text-lg font-bold text-[#d97706]">Pendente</span>
                </>
              )}
            </div>
            <p className="text-[11px] text-[#94a3b8] mt-1 font-medium uppercase tracking-wider">Anamnese</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
