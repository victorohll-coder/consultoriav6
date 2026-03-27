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
const SvgStar = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="none">
    <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
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
  const [habitScore, setHabitScore] = useState<number | null>(null);
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

    // Pontuação de hábitos do mês atual
    const hoje2 = new Date();
    const ano = hoje2.getFullYear();
    const mes = String(hoje2.getMonth() + 1).padStart(2, "0");
    const totalDias = new Date(ano, hoje2.getMonth() + 1, 0).getDate();
    const { data: habitos } = await supabase
      .from("habitos_registros")
      .select("status")
      .eq("paciente_id", user.id)
      .gte("dia", `${ano}-${mes}-01`)
      .lte("dia", `${ano}-${mes}-${String(totalDias).padStart(2, "0")}`);
    if (habitos) {
      const totalCelulas = 10 * totalDias;
      const totalFeitos = habitos.filter((r: { status: number }) => r.status === 1).length;
      setHabitScore((totalFeitos / totalCelulas) * 10);
    }

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
                <p className="text-[#0f172a] font-bold text-[15px]">Questionário pendente</p>
                <p className="text-[#475569] text-[12px] mt-0.5">Responda para seu nutricionista acompanhar sua evolução</p>
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

      {/* Cards grid — premium image cards */}
      <div className="grid grid-cols-2 gap-3 animate-fade-in-up-d2">
        <Link href="/minha-area/materiais">
          <div className="relative rounded-2xl overflow-hidden hover-lift cursor-pointer group" style={{ height: 170 }}>
            <img src="/cards/materiais.jpg" alt="" className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
            <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(15,45,82,0.92) 0%, rgba(15,45,82,0.5) 50%, rgba(15,45,82,0.15) 100%)" }} />
            <div className="relative z-10 h-full flex flex-col justify-end p-5">
              <p className="text-3xl font-bold text-white tracking-tight drop-shadow-lg">{totalMateriais}</p>
              <p className="text-[12px] text-white/70 mt-0.5 font-semibold uppercase tracking-wider">Materiais liberados</p>
            </div>
          </div>
        </Link>

        <Link href="/minha-area/habitos">
          <div className="relative rounded-2xl overflow-hidden hover-lift cursor-pointer group" style={{ height: 170, background: "linear-gradient(135deg, #0d4f3c 0%, #1D9E75 60%, #26c48e 100%)" }}>
            {/* Brilho decorativo */}
            <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full opacity-20" style={{ background: "radial-gradient(circle, #fff 0%, transparent 70%)" }} />
            <div className="absolute bottom-0 left-0 right-0 h-1/2" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.35) 0%, transparent 100%)" }} />
            <div className="relative z-10 h-full flex flex-col justify-between p-5">
              {/* Score no topo */}
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center text-white">
                  <SvgStar />
                </div>
                {habitScore !== null && (
                  <span className="text-[11px] font-bold text-white/60 uppercase tracking-wider">
                    {habitScore >= 7 ? "🔥 Ótimo" : habitScore >= 4 ? "👍 Bom" : "💪 Vamos lá"}
                  </span>
                )}
              </div>
              {/* Número e label */}
              <div>
                <p className="text-3xl font-black text-white tracking-tight drop-shadow-lg">
                  {habitScore !== null ? `${habitScore.toFixed(1)}/10` : "—"}
                </p>
                <p className="text-[12px] text-white/70 mt-0.5 font-semibold uppercase tracking-wider">Desafio de Hábitos</p>
              </div>
            </div>
          </div>
        </Link>

        <Link href="/minha-area/questionario">
          <div className="relative rounded-2xl overflow-hidden hover-lift cursor-pointer group" style={{ height: 170 }}>
            <img src="/cards/questionario.jpg" alt="" className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
            <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(15,45,82,0.92) 0%, rgba(15,45,82,0.5) 50%, rgba(15,45,82,0.15) 100%)" }} />
            <div className="relative z-10 h-full flex flex-col justify-end p-5">
              <div className="flex items-center gap-2">
                {questionarioPendente ? (
                  <>
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-lg shadow-amber-400/50 animate-pulse" />
                    <span className="text-xl font-bold text-amber-300 drop-shadow-lg">Pendente</span>
                  </>
                ) : (
                  <>
                    <span className="text-emerald-400 drop-shadow-lg"><SvgCheck /></span>
                    <span className="text-xl font-bold text-emerald-400 drop-shadow-lg">Em dia</span>
                  </>
                )}
              </div>
              <p className="text-[12px] text-white/70 mt-0.5 font-semibold uppercase tracking-wider">Questionário quinzenal</p>
            </div>
          </div>
        </Link>

        <Link href="/minha-area/anamnese">
          <div className="relative rounded-2xl overflow-hidden hover-lift cursor-pointer group" style={{ height: 170 }}>
            <img src="/cards/anamnese.jpg" alt="" className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
            <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(15,45,82,0.92) 0%, rgba(15,45,82,0.5) 50%, rgba(15,45,82,0.15) 100%)" }} />
            <div className="relative z-10 h-full flex flex-col justify-end p-5">
              <div className="flex items-center gap-2">
                {anamnesePreenchida ? (
                  <>
                    <span className="text-emerald-400 drop-shadow-lg"><SvgCheck /></span>
                    <span className="text-xl font-bold text-emerald-400 drop-shadow-lg">Preenchida</span>
                  </>
                ) : (
                  <>
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-lg shadow-amber-400/50 animate-pulse" />
                    <span className="text-xl font-bold text-amber-300 drop-shadow-lg">Pendente</span>
                  </>
                )}
              </div>
              <p className="text-[12px] text-white/70 mt-0.5 font-semibold uppercase tracking-wider">Anamnese inicial</p>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
