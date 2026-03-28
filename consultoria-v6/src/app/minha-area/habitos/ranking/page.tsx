"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

const HABITOS = [
  { slug: "plano_alimentar",  label: "Plano alimentar" },
  { slug: "treino",           label: "Treino" },
  { slug: "cardio",           label: "Cardio" },
  { slug: "agua",             label: "3L de água" },
  { slug: "alcool",           label: "Sem álcool" },
  { slug: "refeicao_livre",   label: "Sem ref. livre" },
];

function pad(n: number) { return String(n).padStart(2, "0"); }
function diasNoMes(ano: number, mes: number) { return new Date(ano, mes, 0).getDate(); }

const MESES = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
];

type RankEntry = { nome: string; feitos: number; total: number; pct: number; score: number; isMe: boolean };

export default function RankingPage() {
  const supabase = createClient();
  const hoje = new Date();

  const [myId, setMyId] = useState<string | null>(null);
  const [periodo, setPeriodo] = useState<"semanal" | "mensal">("semanal");
  const [selectedHabito, setSelectedHabito] = useState<string | null>(null);
  const [ranking, setRanking] = useState<RankEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [semanaIdx, setSemanaIdx] = useState(0);

  const ano = hoje.getFullYear();
  const mesNum = hoje.getMonth() + 1;
  const totalDias = diasNoMes(ano, mesNum);
  const allDias = Array.from({ length: totalDias }, (_, i) => i + 1);

  // Build weeks
  const weeks: number[][] = [];
  for (let i = 0; i < totalDias; i += 7) {
    weeks.push(allDias.slice(i, Math.min(i + 7, totalDias)));
  }

  // Auto-set current week
  useEffect(() => {
    setSemanaIdx(Math.floor((hoje.getDate() - 1) / 7));
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => { if (user) setMyId(user.id); });
  }, [supabase]);

  useEffect(() => {
    async function load() {
      if (!myId) return;
      setLoading(true);

      const mesStr = pad(mesNum);
      let diaInicio: string;
      let diaFim: string;
      let totalCells: number;

      if (periodo === "semanal") {
        const weekDays = weeks[semanaIdx] || [];
        if (weekDays.length === 0) { setRanking([]); setLoading(false); return; }
        diaInicio = `${ano}-${mesStr}-${pad(weekDays[0])}`;
        diaFim = `${ano}-${mesStr}-${pad(weekDays[weekDays.length - 1])}`;
        totalCells = selectedHabito ? weekDays.length : HABITOS.length * weekDays.length;
      } else {
        diaInicio = `${ano}-${mesStr}-01`;
        diaFim = `${ano}-${mesStr}-${pad(totalDias)}`;
        totalCells = selectedHabito ? totalDias : HABITOS.length * totalDias;
      }

      let query = supabase
        .from("habitos_registros")
        .select("paciente_id, habito, status")
        .gte("dia", diaInicio)
        .lte("dia", diaFim)
        .eq("status", 1);

      if (selectedHabito) query = query.eq("habito", selectedHabito);
      else query = query.in("habito", HABITOS.map(h => h.slug));

      const { data: allRegs } = await query;
      if (!allRegs || allRegs.length === 0) { setRanking([]); setLoading(false); return; }

      const byPaciente: Record<string, number> = {};
      allRegs.forEach((r: { paciente_id: string }) => {
        byPaciente[r.paciente_id] = (byPaciente[r.paciente_id] || 0) + 1;
      });

      const ids = Object.keys(byPaciente);
      const { data: profiles } = await supabase.from("profiles").select("id, email").in("id", ids);
      const emails = profiles?.map(p => p.email) || [];
      const { data: pacientesData } = await supabase.from("pacientes").select("nome, email").in("email", emails);
      const emailToName: Record<string, string> = {};
      pacientesData?.forEach((p: { nome: string; email: string }) => { emailToName[p.email] = p.nome; });

      const ranked: RankEntry[] = ids.map(id => {
        const feitos = byPaciente[id];
        const pct = (feitos / totalCells) * 100;
        const score = (feitos / totalCells) * 10;
        const profile = profiles?.find(p => p.id === id);
        const nome = profile ? (emailToName[profile.email] || profile.email.split("@")[0]) : "Anônimo";
        const nArr = nome.split(" ");
        return { nome: nArr.length > 1 ? `${nArr[0]} ${nArr[1][0]}.` : nArr[0], feitos, total: totalCells, pct, score, isMe: id === myId };
      }).sort((a, b) => b.score - a.score);

      setRanking(ranked);
      setLoading(false);
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myId, selectedHabito, periodo, semanaIdx]);

  const currentWeek = weeks[semanaIdx] || [];

  return (
    <div className="animate-fade-in-up">
      <div className="flex items-center gap-3 mb-4">
        <Link href="/minha-area/habitos" className="w-9 h-9 rounded-xl bg-white border border-[#e0eaf5] flex items-center justify-center text-[#475569] hover:bg-[#f1f5f9] transition-all shadow-sm active:scale-95">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15,18 9,12 15,6"/>
          </svg>
        </Link>
        <div>
          <h1 style={{ fontFamily: "var(--font-display)" }} className="text-xl font-bold text-[#0f172a]">
            Ranking — {MESES[mesNum - 1]}
          </h1>
          <p className="text-[#475569] text-sm mt-0.5">Veja quem está mandando bem</p>
        </div>
      </div>

      {/* Periodo tabs */}
      <div className="flex bg-[#f1f3f5] rounded-xl p-1 mb-4">
        <button
          onClick={() => setPeriodo("semanal")}
          className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${periodo === "semanal" ? "bg-white text-[#0f2d52] shadow-sm" : "text-[#94a3b8]"}`}
        >
          Semanal
        </button>
        <button
          onClick={() => setPeriodo("mensal")}
          className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${periodo === "mensal" ? "bg-white text-[#0f2d52] shadow-sm" : "text-[#94a3b8]"}`}
        >
          Mensal
        </button>
      </div>

      {/* Week selector (only if semanal) */}
      {periodo === "semanal" && (
        <div className="flex items-center justify-center gap-3 mb-4">
          <button
            onClick={() => setSemanaIdx(s => Math.max(0, s - 1))}
            disabled={semanaIdx === 0}
            className={`w-8 h-8 rounded-lg bg-white border border-[#e0eaf5] flex items-center justify-center active:scale-95 ${semanaIdx === 0 ? "opacity-30" : "text-[#475569]"}`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15,18 9,12 15,6"/></svg>
          </button>
          <div className="text-center min-w-[140px]">
            <p className="text-[13px] font-bold text-[#0f172a]">Semana {semanaIdx + 1}</p>
            <p className="text-[10px] text-[#94a3b8]">Dias {currentWeek[0]} — {currentWeek[currentWeek.length - 1]}</p>
          </div>
          <button
            onClick={() => setSemanaIdx(s => Math.min(weeks.length - 1, s + 1))}
            disabled={semanaIdx >= weeks.length - 1}
            className={`w-8 h-8 rounded-lg bg-white border border-[#e0eaf5] flex items-center justify-center active:scale-95 ${semanaIdx >= weeks.length - 1 ? "opacity-30" : "text-[#475569]"}`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9,18 15,12 9,6"/></svg>
          </button>
        </div>
      )}

      {/* Filtro por hábito */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        <button
          onClick={() => setSelectedHabito(null)}
          className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all border active:scale-95 ${
            !selectedHabito ? "bg-[#0f2d52] text-white border-[#0f2d52]" : "bg-white border-[#e0eaf5] text-[#475569]"
          }`}
        >
          Geral
        </button>
        {HABITOS.map(h => (
          <button
            key={h.slug}
            onClick={() => setSelectedHabito(h.slug)}
            className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all border active:scale-95 ${
              selectedHabito === h.slug ? "bg-[#0f2d52] text-white border-[#0f2d52]" : "bg-white border-[#e0eaf5] text-[#475569]"
            }`}
          >
            {h.label}
          </button>
        ))}
      </div>

      {/* Ranking list */}
      {loading ? (
        <div className="flex flex-col gap-2">{[1,2,3,4,5].map(i => <div key={i} className="h-14 shimmer rounded-xl" />)}</div>
      ) : ranking.length === 0 ? (
        <div className="bg-white border border-[#e0eaf5] rounded-2xl p-10 text-center">
          <p className="text-[#0f172a] font-semibold">Nenhum registro {periodo === "semanal" ? "nesta semana" : "neste mês"}</p>
          <p className="text-[#94a3b8] text-sm mt-1">Marque seus hábitos para aparecer no ranking!</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {ranking.map((r, i) => (
            <div
              key={i}
              className={`flex items-center justify-between px-4 py-3 rounded-2xl transition-all ${
                r.isMe
                  ? "bg-gradient-to-r from-[#0f2d52]/5 to-[#c8a96e]/10 border-2 border-[#c8a96e]/30 shadow-md"
                  : "bg-white border border-[#e0eaf5] shadow-sm"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black ${
                  i === 0 ? "bg-amber-100 text-amber-700" : i === 1 ? "bg-gray-100 text-gray-500" : i === 2 ? "bg-orange-100 text-orange-600" : "bg-[#f8fafc] text-[#94a3b8]"
                }`}>{i + 1}</div>
                <div>
                  <p className={`text-sm font-bold ${r.isMe ? "text-[#0f2d52]" : "text-[#475569]"}`}>
                    {r.nome} {r.isMe && <span className="text-[#c8a96e]">(você)</span>}
                  </p>
                  <p className="text-[10px] text-[#94a3b8]">{r.feitos} hábitos cumpridos</p>
                </div>
              </div>
              <div className="text-right">
                <p className={`text-lg font-black ${r.score >= 7 ? "text-[#1D9E75]" : r.score >= 4 ? "text-[#D4AC0D]" : "text-[#E24B4A]"}`}>
                  {r.score.toFixed(1)}
                </p>
                <p className="text-[9px] text-[#94a3b8]">{r.pct.toFixed(0)}%</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
