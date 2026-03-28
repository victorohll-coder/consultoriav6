"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Paciente } from "@/lib/types";

type Status = -1 | 0 | 1;
type Registro = { habito: string; dia: string; status: Status };

const HABITOS: { slug: string; label: string }[] = [
  { slug: "plano_alimentar",  label: "Plano alimentar"   },
  { slug: "treino",           label: "Treino"             },
  { slug: "cardio",           label: "Cardio"             },
  { slug: "agua",             label: "3L de água"         },
  { slug: "alcool",           label: "Sem álcool"         },
  { slug: "refeicao_livre",   label: "Sem ref. livre"     },
];

const MESES = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
];

function diasNoMes(ano: number, mes: number) { return new Date(ano, mes, 0).getDate(); }
function pad(n: number) { return String(n).padStart(2, "0"); }

const SvgCheck = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20,6 9,17 4,12"/>
  </svg>
);
const SvgXIcon = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);
const SvgChevronLeft = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15,18 9,12 15,6"/>
  </svg>
);
const SvgChevronRight = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9,18 15,12 9,6"/>
  </svg>
);

/* ─── Tipo ranking ───────────────────────────────────── */
type RankEntry = { pacienteTableId: string; nome: string; score: number; feitos: number; total: number };

export default function HabitosPainelPage() {
  const supabase = createClient();
  const hoje = new Date();

  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [selectedPaciente, setSelectedPaciente] = useState<string>("");
  const [mes, setMes] = useState(hoje.getMonth() + 1);
  const [ano, setAno] = useState(hoje.getFullYear());
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [loading, setLoading] = useState(false);

  // Ranking
  const [rankingTab, setRankingTab] = useState<"semanal" | "mensal">("semanal");
  const [ranking, setRanking] = useState<RankEntry[]>([]);
  const [loadingRanking, setLoadingRanking] = useState(true);
  const [semanaIdx, setSemanaIdx] = useState(0);

  const totalDias = diasNoMes(ano, mes);
  const dias = Array.from({ length: totalDias }, (_, i) => i + 1);
  const isCurrentMonth = mes === hoje.getMonth() + 1 && ano === hoje.getFullYear();

  // Weeks
  const weeks: number[][] = [];
  for (let i = 0; i < totalDias; i += 7) {
    weeks.push(dias.slice(i, Math.min(i + 7, totalDias)));
  }

  // Auto set current week
  useEffect(() => {
    if (isCurrentMonth) setSemanaIdx(Math.floor((hoje.getDate() - 1) / 7));
    else setSemanaIdx(0);
  }, [mes, ano, isCurrentMonth]);

  const currentWeekDays = weeks[semanaIdx] || weeks[0] || [];

  /* Load pacientes */
  useEffect(() => {
    supabase.from("pacientes").select("*").order("nome").then(({ data }) => {
      if (data) setPacientes(data);
    });
  }, [supabase]);

  /* Load ranking */
  const loadRanking = useCallback(async () => {
    if (pacientes.length === 0) return;
    setLoadingRanking(true);

    const mesStr = pad(mes);
    let diaInicio: string;
    let diaFim: string;
    let totalCells: number;

    if (rankingTab === "semanal") {
      const wd = currentWeekDays;
      if (wd.length === 0) { setRanking([]); setLoadingRanking(false); return; }
      diaInicio = `${ano}-${mesStr}-${pad(wd[0])}`;
      diaFim = `${ano}-${mesStr}-${pad(wd[wd.length - 1])}`;
      totalCells = HABITOS.length * wd.length;
    } else {
      diaInicio = `${ano}-${mesStr}-01`;
      diaFim = `${ano}-${mesStr}-${pad(totalDias)}`;
      totalCells = HABITOS.length * totalDias;
    }

    const { data: allRegs } = await supabase
      .from("habitos_registros")
      .select("paciente_id, status")
      .gte("dia", diaInicio).lte("dia", diaFim).eq("status", 1)
      .in("habito", HABITOS.map(h => h.slug));

    if (!allRegs || allRegs.length === 0) { setRanking([]); setLoadingRanking(false); return; }

    const byAuthId: Record<string, number> = {};
    allRegs.forEach((r: { paciente_id: string }) => {
      byAuthId[r.paciente_id] = (byAuthId[r.paciente_id] || 0) + 1;
    });

    // Map auth ids to paciente table ids via profiles
    const authIds = Object.keys(byAuthId);
    const { data: profiles } = await supabase.from("profiles").select("id, email").in("id", authIds);

    const ranked: RankEntry[] = [];
    for (const authId of authIds) {
      const profile = profiles?.find(p => p.id === authId);
      if (!profile) continue;
      const pac = pacientes.find(p => p.email === profile.email);
      if (!pac) continue;
      const feitos = byAuthId[authId];
      ranked.push({
        pacienteTableId: pac.id,
        nome: pac.nome,
        score: (feitos / totalCells) * 10,
        feitos,
        total: totalCells,
      });
    }

    ranked.sort((a, b) => b.score - a.score);
    setRanking(ranked);
    setLoadingRanking(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pacientes, rankingTab, semanaIdx, mes, ano]);

  useEffect(() => { loadRanking(); }, [loadRanking]);

  /* Click on ranking row → select that paciente */
  function selectFromRanking(pacienteTableId: string) {
    setSelectedPaciente(pacienteTableId);
    // Scroll to grid
    setTimeout(() => {
      document.getElementById("habitos-grid")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  }

  /* Load registros for selected paciente */
  const loadRegistros = useCallback(async () => {
    if (!selectedPaciente) { setRegistros([]); return; }
    const pac = pacientes.find(p => p.id === selectedPaciente);
    if (!pac) return;

    setLoading(true);
    const mesStr = pad(mes);
    const ultimoDia = pad(totalDias);

    const { data: profile } = await supabase
      .from("profiles").select("id").eq("email", pac.email).single();

    if (!profile) { setRegistros([]); setLoading(false); return; }

    const { data } = await supabase
      .from("habitos_registros").select("habito, dia, status")
      .eq("paciente_id", profile.id)
      .gte("dia", `${ano}-${mesStr}-01`).lte("dia", `${ano}-${mesStr}-${ultimoDia}`);

    const slugsValidos = new Set(HABITOS.map(h => h.slug));
    setRegistros(((data as Registro[]) || []).filter(r => slugsValidos.has(r.habito)));
    setLoading(false);
  }, [selectedPaciente, pacientes, mes, ano, totalDias, supabase]);

  useEffect(() => { loadRegistros(); }, [loadRegistros]);

  function getStatus(slug: string, dia: number): Status {
    const r = registros.find(r => r.habito === slug && r.dia === `${ano}-${pad(mes)}-${pad(dia)}`);
    return (r?.status ?? 0) as Status;
  }

  function prevMes() { if (mes === 1) { setMes(12); setAno(a => a - 1); } else setMes(m => m - 1); }
  function nextMes() { if (mes === 12) { setMes(1); setAno(a => a + 1); } else setMes(m => m + 1); }

  const totalCelulas = HABITOS.length * totalDias;
  const totalFeitos = registros.filter(r => r.status === 1).length;
  const score = totalCelulas > 0 ? (totalFeitos / totalCelulas) * 10 : 0;
  const scoreColor = score >= 7 ? "#1D9E75" : score >= 4 ? "#D4AC0D" : "#E24B4A";

  // Week score for selected paciente
  const weekFeitos = currentWeekDays.reduce((sum, d) => {
    const dStr = `${ano}-${pad(mes)}-${pad(d)}`;
    return sum + registros.filter(r => r.dia === dStr && r.status === 1).length;
  }, 0);
  const weekCelulas = HABITOS.length * currentWeekDays.length;
  const weekScore = weekCelulas > 0 ? (weekFeitos / weekCelulas) * 10 : 0;
  const weekScoreColor = weekScore >= 7 ? "#1D9E75" : weekScore >= 4 ? "#D4AC0D" : "#E24B4A";

  const selectedNome = pacientes.find(p => p.id === selectedPaciente)?.nome || "";

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text">Hábitos</h1>
        <p className="text-text2 text-sm mt-1">Ranking e acompanhamento de hábitos dos pacientes</p>
      </div>

      {/* ─── Navegação de mês ────────────────────────────── */}
      <div className="flex items-center gap-3 mb-5">
        <button onClick={prevMes} className="w-8 h-8 rounded-lg border border-surface2 bg-surface flex items-center justify-center text-text2 hover:bg-surface2 transition-all">
          <SvgChevronLeft />
        </button>
        <p className="text-text font-bold text-base min-w-[150px] text-center">{MESES[mes - 1]} {ano}</p>
        <button onClick={nextMes} className="w-8 h-8 rounded-lg border border-surface2 bg-surface flex items-center justify-center text-text2 hover:bg-surface2 transition-all">
          <SvgChevronRight />
        </button>
      </div>

      {/* ─── Ranking ─────────────────────────────────────── */}
      <div className="bg-surface border border-surface2 rounded-2xl overflow-hidden shadow-sm mb-6">
        {/* Tabs */}
        <div className="flex border-b border-surface2">
          <button
            onClick={() => setRankingTab("semanal")}
            className={`flex-1 py-3 text-sm font-bold transition-all ${rankingTab === "semanal" ? "text-accent border-b-2 border-accent" : "text-text3 hover:text-text2"}`}
          >
            Ranking Semanal
          </button>
          <button
            onClick={() => setRankingTab("mensal")}
            className={`flex-1 py-3 text-sm font-bold transition-all ${rankingTab === "mensal" ? "text-accent border-b-2 border-accent" : "text-text3 hover:text-text2"}`}
          >
            Ranking Mensal
          </button>
        </div>

        {/* Week selector (semanal only) */}
        {rankingTab === "semanal" && (
          <div className="flex items-center justify-center gap-3 py-3 border-b border-surface2 bg-surface2/20">
            <button
              onClick={() => setSemanaIdx(s => Math.max(0, s - 1))}
              disabled={semanaIdx === 0}
              className={`w-7 h-7 rounded-lg border border-surface2 bg-surface flex items-center justify-center ${semanaIdx === 0 ? "opacity-30" : "text-text2 hover:bg-surface2"}`}
            >
              <SvgChevronLeft />
            </button>
            <div className="text-center min-w-[140px]">
              <p className="text-sm font-bold text-text">Semana {semanaIdx + 1}</p>
              <p className="text-[10px] text-text3">Dias {currentWeekDays[0]} — {currentWeekDays[currentWeekDays.length - 1]}</p>
            </div>
            <button
              onClick={() => setSemanaIdx(s => Math.min(weeks.length - 1, s + 1))}
              disabled={semanaIdx >= weeks.length - 1}
              className={`w-7 h-7 rounded-lg border border-surface2 bg-surface flex items-center justify-center ${semanaIdx >= weeks.length - 1 ? "opacity-30" : "text-text2 hover:bg-surface2"}`}
            >
              <SvgChevronRight />
            </button>
          </div>
        )}

        {/* Ranking list */}
        {loadingRanking ? (
          <div className="p-4 flex flex-col gap-2">
            {[1,2,3].map(i => <div key={i} className="h-12 bg-surface2 rounded-xl animate-pulse" />)}
          </div>
        ) : ranking.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-text2 font-semibold">Sem dados {rankingTab === "semanal" ? "nesta semana" : "neste mês"}</p>
          </div>
        ) : (
          <div className="divide-y divide-surface2">
            {ranking.map((r, i) => {
              const isSelected = r.pacienteTableId === selectedPaciente;
              return (
                <button
                  key={r.pacienteTableId}
                  onClick={() => selectFromRanking(r.pacienteTableId)}
                  className={`w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-surface2/50 transition-all ${isSelected ? "bg-accent/5" : ""}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black ${
                      i === 0 ? "bg-amber-100 text-amber-700" : i === 1 ? "bg-gray-100 text-gray-500" : i === 2 ? "bg-orange-100 text-orange-600" : "bg-surface2 text-text3"
                    }`}>{i + 1}</div>
                    <div>
                      <p className={`text-sm font-bold ${isSelected ? "text-accent" : "text-text"}`}>
                        {r.nome}
                        {isSelected && <span className="text-text3 font-normal text-xs ml-1.5">← visualizando</span>}
                      </p>
                      <p className="text-[10px] text-text3">{r.feitos} de {r.total} hábitos</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-lg font-black ${r.score >= 7 ? "text-[#1D9E75]" : r.score >= 4 ? "text-[#D4AC0D]" : "text-[#E24B4A]"}`}>
                      {r.score.toFixed(1)}
                    </p>
                    <p className="text-[9px] text-text3">{Math.round((r.feitos / r.total) * 100)}%</p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── Grid do paciente selecionado ─────────────────── */}
      <div id="habitos-grid">
        {/* Dropdown selector (alternative) */}
        <div className="flex flex-wrap gap-3 mb-4">
          <select
            value={selectedPaciente}
            onChange={e => setSelectedPaciente(e.target.value)}
            className="border border-surface2 rounded-lg px-3 py-2 text-sm text-text bg-surface focus:outline-none focus:ring-2 focus:ring-accent/30 min-w-[220px]"
          >
            <option value="">Selecione um paciente</option>
            {pacientes.map(p => (
              <option key={p.id} value={p.id}>{p.nome}</option>
            ))}
          </select>
        </div>

        {!selectedPaciente ? (
          <div className="bg-surface border border-surface2 rounded-2xl p-12 text-center">
            <p className="text-text2 font-semibold">Clique em um paciente no ranking ou selecione acima</p>
          </div>
        ) : (
          <>
            {/* Scores */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-surface border border-surface2 rounded-xl px-4 py-3">
                <p className="text-[10px] text-text3 font-bold uppercase tracking-wider mb-1">Semana {semanaIdx + 1}</p>
                <p className="text-2xl font-black" style={{ color: weekScoreColor }}>
                  {weekScore.toFixed(1)}<span className="text-sm text-text3 font-semibold"> / 10</span>
                </p>
                <p className="text-[10px] text-text3">{weekFeitos} de {weekCelulas} ({weekCelulas > 0 ? Math.round((weekFeitos / weekCelulas) * 100) : 0}%)</p>
              </div>
              <div className="bg-surface border border-surface2 rounded-xl px-4 py-3">
                <p className="text-[10px] text-text3 font-bold uppercase tracking-wider mb-1">Mês</p>
                <p className="text-2xl font-black" style={{ color: scoreColor }}>
                  {score.toFixed(1)}<span className="text-sm text-text3 font-semibold"> / 10</span>
                </p>
                <p className="text-[10px] text-text3">{totalFeitos} de {totalCelulas} ({totalCelulas > 0 ? Math.round((totalFeitos / totalCelulas) * 100) : 0}%)</p>
              </div>
            </div>

            {/* Grid somente leitura */}
            {loading ? (
              <div className="flex flex-col gap-2">
                {[1,2,3,4,5].map(i => <div key={i} className="h-9 bg-surface2 rounded-xl animate-pulse" />)}
              </div>
            ) : (
              <div className="bg-surface border border-surface2 rounded-2xl overflow-hidden shadow-sm">
                <div className="px-4 py-3 border-b border-surface2 bg-surface2/20">
                  <p className="text-sm font-bold text-text">{selectedNome}</p>
                  <p className="text-[10px] text-text3">Tabela completa — somente visualização</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="border-collapse" style={{ minWidth: "900px" }}>
                    <thead>
                      <tr className="border-b border-surface2">
                        <th className="sticky left-0 bg-surface z-10 min-w-[148px] max-w-[148px] w-[148px] text-left px-4 py-3 border-r border-surface2">
                          <span className="text-[10px] font-bold text-text3 uppercase tracking-wider">Hábito</span>
                        </th>
                        {dias.map(d => (
                          <th key={d} className="w-[28px] min-w-[28px] px-0.5 py-3 text-center">
                            <span className={`text-[10px] font-bold ${isCurrentMonth && d === hoje.getDate() ? "text-accent" : "text-text3"}`}>{d}</span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {HABITOS.map((h, idx) => (
                        <tr key={h.slug} className={idx % 2 === 0 ? "bg-surface" : "bg-surface2/30"}>
                          <td className={`sticky left-0 z-10 min-w-[148px] max-w-[148px] w-[148px] px-4 py-2 border-r border-surface2 ${idx % 2 === 0 ? "bg-surface" : "bg-surface2/30"}`}>
                            <span className="text-[12px] font-semibold text-text truncate block">{h.label}</span>
                          </td>
                          {dias.map(d => {
                            const status = getStatus(h.slug, d);
                            return (
                              <td key={d} className="px-0.5 py-2 text-center">
                                <div className={`w-[28px] h-[28px] mx-auto rounded-md flex items-center justify-center text-white ${
                                  status === 1 ? "bg-[#1D9E75]" : status === -1 ? "bg-[#E24B4A]" : "bg-surface2 border border-surface2"
                                }`}>
                                  {status === 1 && <SvgCheck />}
                                  {status === -1 && <SvgXIcon />}
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Legenda */}
                <div className="flex items-center gap-4 px-4 py-3 border-t border-surface2 bg-surface2/30">
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded-md bg-[#1D9E75] flex items-center justify-center"><SvgCheck /></div>
                    <span className="text-[11px] text-text2 font-medium">Feito</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded-md bg-[#E24B4A] flex items-center justify-center"><SvgXIcon /></div>
                    <span className="text-[11px] text-text2 font-medium">Não feito</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded-md bg-surface2 border border-surface2" />
                    <span className="text-[11px] text-text2 font-medium">Sem registro</span>
                  </div>
                  <span className="text-[11px] text-text3 ml-auto italic">Somente visualização</span>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
