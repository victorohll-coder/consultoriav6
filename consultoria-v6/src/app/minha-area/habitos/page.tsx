"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

/* ─── Tipos ─────────────────────────────────────────── */
type Status = -1 | 0 | 1;
type Registro = { habito: string; dia: string; status: Status };

/* ─── Hábitos fixos ──────────────────────────────────── */
const HABITOS: { slug: string; label: string; short: string }[] = [
  { slug: "plano_alimentar",  label: "Plano alimentar",   short: "Plano" },
  { slug: "treino",           label: "Treino",             short: "Treino" },
  { slug: "cardio",           label: "Cardio",             short: "Cardio" },
  { slug: "frutas_verduras",  label: "Frutas e verduras",  short: "Frutas" },
  { slug: "horas_sono",       label: "Sono reparador",     short: "Sono" },
  { slug: "agua",             label: "Qtd. de água",       short: "Água" },
  { slug: "alcool",           label: "Sem álcool",         short: "S/álcool" },
  { slug: "suplementacao",    label: "Suplementação",      short: "Suplem." },
  { slug: "intestino",        label: "Intestino",          short: "Intest." },
  { slug: "refeicao_livre",   label: "Sem ref. livre",     short: "S/ref.liv" },
];

const MESES = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
];

function diasNoMes(ano: number, mes: number) {
  return new Date(ano, mes, 0).getDate();
}
function pad(n: number) { return String(n).padStart(2, "0"); }

/* ─── Badge definitions ──────────────────────────────── */
interface Badge { id: string; label: string; icon: string; desc: string; check: (ctx: BadgeContext) => boolean; }
interface BadgeContext { streak: number; score: number; totalFeitos: number; totalCelulas: number; registros: Registro[]; diasCompletados: number; habitoPerfeito: string | null; }

const BADGES: Badge[] = [
  { id: "streak3",   label: "Em chamas",       icon: "S3",  desc: "3 dias seguidos",            check: (c) => c.streak >= 3 },
  { id: "streak7",   label: "Imparável",       icon: "S7",  desc: "7 dias seguidos",            check: (c) => c.streak >= 7 },
  { id: "streak14",  label: "Guerreiro",       icon: "S14", desc: "14 dias seguidos",           check: (c) => c.streak >= 14 },
  { id: "streak30",  label: "Lendário",        icon: "S30", desc: "30 dias seguidos",           check: (c) => c.streak >= 30 },
  { id: "score7",    label: "Consistente",     icon: "7+",  desc: "Pontuação acima de 7",       check: (c) => c.score >= 7 },
  { id: "score9",    label: "Excelência",      icon: "9+",  desc: "Pontuação acima de 9",       check: (c) => c.score >= 9 },
  { id: "score10",   label: "Perfeição",       icon: "10",  desc: "Pontuação 10.0",             check: (c) => c.score === 10 },
  { id: "dia100",    label: "Dia perfeito",    icon: "D",   desc: "10/10 hábitos em 1 dia",     check: (c) => c.diasCompletados >= 1 },
  { id: "dia7_100",  label: "Semana perfeita", icon: "7D",  desc: "7 dias perfeitos no mês",   check: (c) => c.diasCompletados >= 7 },
  { id: "habPerf",   label: "Especialista",    icon: "H",   desc: "100% em um hábito no mês",  check: (c) => c.habitoPerfeito !== null },
  { id: "first",     label: "Primeiro passo",  icon: "1",   desc: "Primeiro hábito marcado",    check: (c) => c.totalFeitos >= 1 },
  { id: "metade",    label: "Meio caminho",    icon: "50",  desc: "50%+ dos hábitos no mês",   check: (c) => c.totalCelulas > 0 && (c.totalFeitos / c.totalCelulas) >= 0.5 },
];

/* ─── Frases motivacionais ───────────────────────────── */
function getMotivationalMessage(feitos: number, total: number): { text: string; sub: string; color: string; bg: string; border: string } {
  if (feitos === total) return {
    text: "Dia impecável!",
    sub: "Todos os hábitos cumpridos. Você é referência.",
    color: "text-emerald-700", bg: "bg-gradient-to-r from-emerald-50 to-teal-50", border: "border-emerald-200/60",
  };
  if (feitos >= 8) return {
    text: "Quase perfeito!",
    sub: `Faltam apenas ${total - feitos}. Você está no topo.`,
    color: "text-emerald-600", bg: "bg-gradient-to-r from-emerald-50/80 to-teal-50/50", border: "border-emerald-200/40",
  };
  if (feitos >= 5) return {
    text: "Bom ritmo, continue!",
    sub: `${feitos} hábitos feitos. Mais ${total - feitos} e você fecha o dia forte.`,
    color: "text-[#0f2d52]", bg: "bg-gradient-to-r from-blue-50/80 to-slate-50", border: "border-blue-200/40",
  };
  if (feitos >= 1) return {
    text: "Já começou, agora vai!",
    sub: `${feitos} hábito${feitos > 1 ? "s" : ""} feito${feitos > 1 ? "s" : ""}. Bora melhorar mais nesse dia!`,
    color: "text-amber-700", bg: "bg-gradient-to-r from-amber-50/80 to-orange-50/50", border: "border-amber-200/40",
  };
  return {
    text: "Novo dia, nova chance",
    sub: "Marque seu primeiro hábito e comece com tudo.",
    color: "text-[#475569]", bg: "bg-gradient-to-r from-slate-50 to-gray-50", border: "border-slate-200/40",
  };
}

/* ─── SVG Icons ─────────────────────────────────────── */
const SvgCheck = ({ size = 13 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20,6 9,17 4,12"/>
  </svg>
);
const SvgX = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);
const SvgChevronLeft = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15,18 9,12 15,6"/></svg>
);
const SvgChevronRight = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9,18 15,12 9,6"/></svg>
);
const SvgTrophy = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 9H4.5a2.5 2.5 0 010-5H6M18 9h1.5a2.5 2.5 0 000-5H18"/>
    <path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 19.24 7 20v2h10v-2c0-.76-.85-1.25-2.03-1.79A1.13 1.13 0 0114 17v-2.34"/>
    <path d="M18 2H6v7a6 6 0 1012 0V2z"/>
  </svg>
);
const SvgFlame = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none">
    <path d="M12 23c-4.97 0-8-3.03-8-7 0-2.79 1.29-5.18 3.51-7.39C9.04 7.08 10.53 5.09 11 2c.84 1.4 1.3 2.4 1.68 3.62.5 1.63 1.65 2.94 3.25 3.86C18.1 10.85 20 13.2 20 16c0 3.97-3.03 7-8 7z"/>
  </svg>
);

/* ─── Confetti ───────────────────────────────────────── */
function Confetti({ show }: { show: boolean }) {
  if (!show) return null;
  const colors = ["#1D9E75", "#c8a96e", "#2563eb", "#E24B4A", "#D4AC0D", "#9333ea"];
  return (
    <div className="fixed inset-0 z-[100] pointer-events-none overflow-hidden">
      {Array.from({ length: 40 }).map((_, i) => (
        <div key={i} className="absolute animate-confetti-fall" style={{
          left: `${Math.random() * 100}%`, top: -20,
          width: 6 + Math.random() * 6, height: (6 + Math.random() * 6) * 0.6,
          backgroundColor: colors[i % colors.length], borderRadius: 2,
          animationDelay: `${Math.random() * 0.5}s`, animationDuration: `${1.5 + Math.random()}s`,
          transform: `rotate(${Math.random() * 360}deg)`,
        }} />
      ))}
    </div>
  );
}

/* ─── Componente célula ──────────────────────────────── */
function HabitCell({ status, onClick, disabled, loading }: {
  status: Status; onClick: () => void; disabled: boolean; loading: boolean;
}) {
  const [pop, setPop] = useState(false);
  function handleClick() {
    if (disabled || loading) return;
    setPop(true);
    setTimeout(() => setPop(false), 300);
    onClick();
  }

  let cls = "bg-[#f1f3f5] border-transparent text-transparent";
  let icon: React.ReactNode = null;
  if (status === 1) { cls = "bg-[#1D9E75] border-[#1D9E75] text-white shadow-sm shadow-emerald-200/50"; icon = <SvgCheck size={14} />; }
  else if (status === -1) { cls = "bg-[#E24B4A] border-[#E24B4A] text-white shadow-sm shadow-red-200/50"; icon = <SvgX />; }
  if (disabled) cls += " !opacity-30 cursor-not-allowed";

  return (
    <button
      onClick={handleClick}
      disabled={disabled || loading}
      className={`w-[34px] h-[34px] min-w-[34px] rounded-lg border flex items-center justify-center transition-all duration-100 ${cls} ${!disabled ? "hover:brightness-110 active:scale-90" : ""} ${pop ? "scale-[1.3]" : ""}`}
      style={{ transition: "transform 0.12s cubic-bezier(0.34, 1.56, 0.64, 1)" }}
    >
      {loading ? (
        <svg className="animate-spin" width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
          <circle cx="12" cy="12" r="10" strokeOpacity="0.2"/><path d="M12 2a10 10 0 0110 10" strokeLinecap="round"/>
        </svg>
      ) : icon}
    </button>
  );
}

/* ─── Streak calculator ──────────────────────────────── */
function calcStreak(registros: Registro[], hoje: Date): number {
  let streak = 0;
  const d = new Date(hoje);
  while (true) {
    const diaStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    if (registros.filter(r => r.dia === diaStr && r.status === 1).length > 0) { streak++; d.setDate(d.getDate() - 1); }
    else break;
  }
  return streak;
}

/* ─── Ranking Preview ────────────────────────────────── */
function RankingPreview({ pacienteId }: { pacienteId: string }) {
  const supabase = createClient();
  const [ranking, setRanking] = useState<{ nome: string; pontuacao: number; isMe: boolean }[]>([]);
  const [myPos, setMyPos] = useState(0);
  const [loadingRank, setLoadingRank] = useState(true);

  useEffect(() => {
    async function load() {
      const hoje = new Date();
      const ano = hoje.getFullYear();
      const mesNum = hoje.getMonth() + 1;
      const mesStr = pad(mesNum);
      const totalDias = diasNoMes(ano, mesNum);
      const ultimoDia = pad(totalDias);
      const { data: allRegs } = await supabase
        .from("habitos_registros").select("paciente_id, status")
        .gte("dia", `${ano}-${mesStr}-01`).lte("dia", `${ano}-${mesStr}-${ultimoDia}`).eq("status", 1);
      if (!allRegs || allRegs.length === 0) { setLoadingRank(false); return; }

      const byPaciente: Record<string, number> = {};
      allRegs.forEach((r: { paciente_id: string }) => { byPaciente[r.paciente_id] = (byPaciente[r.paciente_id] || 0) + 1; });
      const totalCelulas = HABITOS.length * totalDias;
      const ids = Object.keys(byPaciente);
      const { data: profiles } = await supabase.from("profiles").select("id, email").in("id", ids);
      const emails = profiles?.map(p => p.email) || [];
      const { data: pacientesData } = await supabase.from("pacientes").select("nome, email").in("email", emails);
      const emailToName: Record<string, string> = {};
      pacientesData?.forEach((p: { nome: string; email: string }) => { emailToName[p.email] = p.nome; });

      const ranked = ids.map(id => {
        const pontuacao = (byPaciente[id] / totalCelulas) * 10;
        const profile = profiles?.find(p => p.id === id);
        const nome = profile ? (emailToName[profile.email] || profile.email.split("@")[0]) : "Anônimo";
        const nArr = nome.split(" ");
        return { nome: nArr.length > 1 ? `${nArr[0]} ${nArr[1][0]}.` : nArr[0], pontuacao, isMe: id === pacienteId };
      }).sort((a, b) => b.pontuacao - a.pontuacao);

      setRanking(ranked.slice(0, 5));
      setMyPos(ranked.findIndex(r => r.isMe) + 1);
      setLoadingRank(false);
    }
    load();
  }, [pacienteId, supabase]);

  if (loadingRank || ranking.length === 0) return null;

  return (
    <div className="bg-white border border-[#e0eaf5] rounded-2xl overflow-hidden shadow-sm animate-fade-in-up-d2 mb-4">
      {/* Header com imagem */}
      <div className="relative h-16 overflow-hidden" style={{ background: "linear-gradient(135deg, #0a1e3d 0%, #0f2d52 40%, #1a4975 100%)" }}>
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "url('/cards/peso.jpg')", backgroundSize: "cover", backgroundPosition: "center" }} />
        <div className="relative z-10 flex items-center justify-between h-full px-4">
          <div className="flex items-center gap-2 text-white">
            <SvgTrophy />
            <span className="text-xs font-bold uppercase tracking-wider">Ranking do mês</span>
          </div>
          {myPos > 0 && (
            <span className="text-[11px] font-bold text-[#c8a96e] bg-white/10 backdrop-blur-sm px-2.5 py-1 rounded-lg">
              Você: {myPos}º lugar
            </span>
          )}
        </div>
      </div>
      <div className="p-3 flex flex-col gap-1">
        {ranking.map((r, i) => (
          <div key={i} className={`flex items-center justify-between px-3 py-2 rounded-xl ${r.isMe ? "bg-[#0f2d52]/5 border border-[#0f2d52]/10" : ""}`}>
            <div className="flex items-center gap-2.5">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${
                i === 0 ? "bg-amber-100 text-amber-700" : i === 1 ? "bg-gray-100 text-gray-500" : i === 2 ? "bg-orange-100 text-orange-600" : "text-[#94a3b8]"
              }`}>
                {i + 1}
              </div>
              <span className={`text-[13px] font-semibold ${r.isMe ? "text-[#0f2d52]" : "text-[#475569]"}`}>
                {r.isMe ? `${r.nome} (você)` : r.nome}
              </span>
            </div>
            <span className={`text-[13px] font-black ${r.pontuacao >= 7 ? "text-[#1D9E75]" : r.pontuacao >= 4 ? "text-[#D4AC0D]" : "text-[#E24B4A]"}`}>
              {r.pontuacao.toFixed(1)}
            </span>
          </div>
        ))}
      </div>
      <Link href="/minha-area/habitos/ranking" className="block text-center text-[11px] text-[#c8a96e] font-bold py-2.5 border-t border-[#e0eaf5] hover:bg-[#fafbfc] transition-colors">
        Ver ranking completo →
      </Link>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════ */
/* ─── Página principal ─────────────────────────────── */
/* ═══════════════════════════════════════════════════════ */
export default function HabitosPage() {
  const supabase = createClient();
  const hoje = new Date();
  const [mes, setMes] = useState(hoje.getMonth() + 1);
  const [ano, setAno] = useState(hoje.getFullYear());
  const [pacienteId, setPacienteId] = useState<string | null>(null);
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [allTimeRegistros, setAllTimeRegistros] = useState<Registro[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingCell, setLoadingCell] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [recorde, setRecorde] = useState(0);
  const prevFeitosRef = useRef(0);
  const [semanaIdx, setSemanaIdx] = useState(0); // which week chunk to show

  const totalDias = diasNoMes(ano, mes);
  const dias = Array.from({ length: totalDias }, (_, i) => i + 1);

  useEffect(() => { supabase.auth.getUser().then(({ data: { user } }) => { if (user) setPacienteId(user.id); }); }, [supabase]);

  const loadRegistros = useCallback(async () => {
    if (!pacienteId) return;
    setLoading(true);
    const mesStr = pad(mes); const ultimoDia = pad(totalDias);
    const { data } = await supabase.from("habitos_registros").select("habito, dia, status")
      .eq("paciente_id", pacienteId).gte("dia", `${ano}-${mesStr}-01`).lte("dia", `${ano}-${mesStr}-${ultimoDia}`);
    const regs = (data as Registro[]) || [];
    setRegistros(regs);
    prevFeitosRef.current = regs.filter(r => r.status === 1).length;
    setLoading(false);
  }, [pacienteId, mes, ano, totalDias, supabase]);

  useEffect(() => { loadRegistros(); }, [loadRegistros]);

  useEffect(() => {
    if (!pacienteId) return;
    supabase.from("habitos_registros").select("habito, dia, status").eq("paciente_id", pacienteId)
      .order("dia", { ascending: false }).limit(1000)
      .then(({ data }) => { setAllTimeRegistros((data as Registro[]) || []); });
  }, [pacienteId, registros, supabase]);

  useEffect(() => {
    if (!pacienteId) return;
    supabase.from("habitos_pontuacao").select("pontuacao").eq("paciente_id", pacienteId)
      .order("pontuacao", { ascending: false }).limit(1)
      .then(({ data }) => { if (data && data.length > 0) setRecorde(Number(data[0].pontuacao)); });
  }, [pacienteId, supabase]);

  function getStatus(slug: string, dia: number): Status {
    const r = registros.find(r => r.habito === slug && r.dia === `${ano}-${pad(mes)}-${pad(dia)}`);
    return (r?.status ?? 0) as Status;
  }

  async function handleClick(slug: string, dia: number) {
    if (!pacienteId) return;
    const key = `${slug}-${dia}`;
    const current = getStatus(slug, dia);
    const next: Status = current === 0 ? 1 : current === 1 ? -1 : 0;
    const diaStr = `${ano}-${pad(mes)}-${pad(dia)}`;

    setRegistros(prev => {
      const sem = prev.filter(r => !(r.habito === slug && r.dia === diaStr));
      if (next === 0) return sem;
      return [...sem, { habito: slug, dia: diaStr, status: next }];
    });

    if (next === 1) {
      const hojeStr = `${ano}-${pad(mes)}-${pad(dia)}`;
      const futureRegs = registros.filter(r => r.dia === hojeStr && r.status === 1 && r.habito !== slug);
      if (futureRegs.length === HABITOS.length - 1) {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 3000);
      }
    }

    setLoadingCell(key);
    const { error } = await supabase.from("habitos_registros").upsert(
      { paciente_id: pacienteId, habito: slug, dia: diaStr, status: next },
      { onConflict: "paciente_id,habito,dia" }
    );
    setLoadingCell(null);

    if (error) {
      setRegistros(prev => {
        const sem = prev.filter(r => !(r.habito === slug && r.dia === diaStr));
        if (current === 0) return sem;
        return [...sem, { habito: slug, dia: diaStr, status: current }];
      });
      setToast("Erro ao salvar. Tente novamente.");
      setTimeout(() => setToast(null), 3000);
    }
  }

  function prevMes() { if (mes === 1) { setMes(12); setAno(a => a - 1); } else setMes(m => m - 1); }
  function nextMes() { const n = new Date(ano, mes, 1); if (n > hoje) return; if (mes === 12) { setMes(1); setAno(a => a + 1); } else setMes(m => m + 1); }
  const isCurrentMonth = mes === hoje.getMonth() + 1 && ano === hoje.getFullYear();

  /* Split days into weeks of 7 */
  const weeks: number[][] = [];
  for (let i = 0; i < totalDias; i += 7) {
    weeks.push(dias.slice(i, Math.min(i + 7, totalDias)));
  }
  const totalWeeks = weeks.length;

  /* Auto-set to current week when current month */
  useEffect(() => {
    if (isCurrentMonth) {
      const currentWeekIdx = Math.floor((hoje.getDate() - 1) / 7);
      setSemanaIdx(currentWeekIdx);
    } else {
      setSemanaIdx(0);
    }
  }, [mes, ano, isCurrentMonth]);

  const currentWeekDays = weeks[semanaIdx] || weeks[0] || [];
  const weekStart = currentWeekDays[0];
  const weekEnd = currentWeekDays[currentWeekDays.length - 1];
  const DIAS_SEMANA_NOMES = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  const totalCelulas = HABITOS.length * totalDias;
  const totalFeitos = registros.filter(r => r.status === 1).length;
  const score = totalCelulas > 0 ? (totalFeitos / totalCelulas) * 10 : 0;
  const pct = totalCelulas > 0 ? Math.round((totalFeitos / totalCelulas) * 100) : 0;
  const streak = calcStreak(allTimeRegistros, hoje);
  const scoreColor = score >= 7 ? "#1D9E75" : score >= 4 ? "#D4AC0D" : "#E24B4A";

  /* Day resume */
  const hojeStr = `${hoje.getFullYear()}-${pad(hoje.getMonth() + 1)}-${pad(hoje.getDate())}`;
  const feitosHoje = registros.filter(r => r.dia === hojeStr && r.status === 1).length;
  const msg = getMotivationalMessage(feitosHoje, HABITOS.length);

  /* Badges */
  const diasCompletados = dias.filter(d => {
    const dStr = `${ano}-${pad(mes)}-${pad(d)}`;
    return HABITOS.every(h => registros.find(r => r.habito === h.slug && r.dia === dStr && r.status === 1));
  }).length;
  const habitoPerfeito = HABITOS.find(h => {
    const dp = isCurrentMonth ? hoje.getDate() : totalDias;
    return Array.from({ length: dp }, (_, i) => i + 1).every(d => registros.find(r => r.habito === h.slug && r.dia === `${ano}-${pad(mes)}-${pad(d)}` && r.status === 1));
  })?.slug || null;
  const earnedBadges = BADGES.filter(b => b.check({ streak, score, totalFeitos, totalCelulas, registros, diasCompletados, habitoPerfeito }));

  return (
    <div className="animate-fade-in-up">
      <Confetti show={showConfetti} />
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-[#E24B4A] text-white text-sm font-semibold px-5 py-3 rounded-2xl shadow-lg animate-fade-in-scale">{toast}</div>
      )}

      {/* ─── Hero header com imagem ─────────────────────── */}
      <div className="relative rounded-2xl overflow-hidden mb-4 shadow-sm" style={{ height: 120 }}>
        <img src="/cards/peso.jpg" alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, rgba(10,30,61,0.88) 0%, rgba(15,45,82,0.8) 50%, rgba(26,73,117,0.7) 100%)" }} />
        <div className="relative z-10 h-full flex items-center justify-between px-5">
          <div>
            <h1 style={{ fontFamily: "var(--font-display)" }} className="text-lg font-bold text-white">
              Desafio de Hábitos
            </h1>
            <p className="text-white/50 text-xs mt-0.5">Consistência gera resultados</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Streak badge */}
            {streak > 0 && (
              <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm rounded-xl px-3 py-2 border border-white/10">
                <span className="text-orange-400"><SvgFlame /></span>
                <div className="leading-none">
                  <p className="text-white font-black text-sm">{streak}</p>
                  <p className="text-white/40 text-[8px] font-bold uppercase">dias</p>
                </div>
              </div>
            )}
            {/* Score */}
            <div className="text-right">
              <p className="text-2xl font-black text-white" style={{ fontFamily: "var(--font-display)" }}>
                {score.toFixed(1)}
              </p>
              <p className="text-white/40 text-[8px] font-bold uppercase tracking-wider">pontos</p>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Seletor de mês ────────────────────────────── */}
      <div className="flex items-center justify-center gap-4 mb-3">
        <button onClick={prevMes} className="w-8 h-8 rounded-lg bg-white border border-[#e0eaf5] flex items-center justify-center text-[#475569] hover:bg-[#f1f5f9] transition-all shadow-sm active:scale-95">
          <SvgChevronLeft />
        </button>
        <p className="text-[#0f172a] font-bold text-sm min-w-[140px] text-center">{MESES[mes - 1]} {ano}</p>
        <button onClick={nextMes} disabled={isCurrentMonth}
          className={`w-8 h-8 rounded-lg bg-white border border-[#e0eaf5] flex items-center justify-center transition-all shadow-sm active:scale-95 ${isCurrentMonth ? "opacity-30 cursor-not-allowed" : "text-[#475569] hover:bg-[#f1f5f9]"}`}>
          <SvgChevronRight />
        </button>
      </div>

      {/* ─── Barra de progresso + resumo do dia (sticky) ─ */}
      {!loading && isCurrentMonth && (
        <div className={`${msg.bg} border ${msg.border} rounded-2xl p-4 mb-3 sticky top-[52px] z-30 shadow-sm backdrop-blur-sm`}>
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className={`text-sm font-bold ${msg.color}`}>{msg.text}</p>
              <p className="text-[11px] text-[#475569] mt-0.5">{msg.sub}</p>
            </div>
            <div className="flex items-center gap-1.5 bg-white/60 rounded-xl px-3 py-1.5">
              <span className="text-lg font-black" style={{ color: scoreColor }}>{feitosHoje}</span>
              <span className="text-[#94a3b8] text-xs font-semibold">/{HABITOS.length}</span>
            </div>
          </div>
          <div className="w-full bg-white/60 rounded-full h-1.5">
            <div className="h-1.5 rounded-full transition-all duration-500" style={{ width: `${(feitosHoje / HABITOS.length) * 100}%`, backgroundColor: scoreColor }} />
          </div>
        </div>
      )}

      {/* ─── Progresso mensal ──────────────────────────── */}
      {!loading && (
        <div className="bg-white border border-[#e0eaf5] rounded-2xl p-4 mb-3 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-wider">Progresso mensal</p>
            {recorde > 0 && <p className="text-[10px] text-[#c8a96e] font-bold">Recorde: {recorde.toFixed(1)}</p>}
          </div>
          <div className="w-full bg-[#f1f3f5] rounded-full h-2 mb-1.5">
            <div className="h-2 rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: scoreColor }} />
          </div>
          <p className="text-[10px] text-[#94a3b8]">{totalFeitos} de {totalCelulas} hábitos cumpridos ({pct}%)</p>
        </div>
      )}

      {/* ─── Conquistas ───────────────────────────────── */}
      {!loading && earnedBadges.length > 0 && (
        <div className="mb-3 animate-fade-in-up-d1">
          <p className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <SvgTrophy /> Conquistas ({earnedBadges.length}/{BADGES.length})
          </p>
          <div className="flex flex-wrap gap-1.5">
            {earnedBadges.slice(0, 6).map(b => (
              <div key={b.id} className="flex items-center gap-1.5 bg-gradient-to-r from-[#fef9ef] to-white border border-[#c8a96e]/20 rounded-lg px-2.5 py-1.5">
                <div className="w-5 h-5 rounded-md flex items-center justify-center text-[8px] font-black text-[#0f2d52]" style={{ background: "linear-gradient(135deg, #c8a96e, #dbb87a)" }}>
                  {b.icon}
                </div>
                <div>
                  <p className="text-[10px] font-bold text-[#0f172a] leading-tight">{b.label}</p>
                  <p className="text-[8px] text-[#94a3b8]">{b.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── Ranking ──────────────────────────────────── */}
      {!loading && pacienteId && isCurrentMonth && <RankingPreview pacienteId={pacienteId} />}

      {/* ─── Grid de hábitos — semana a semana ────────── */}
      {loading ? (
        <div className="flex flex-col gap-2">{[1,2,3,4].map(i => <div key={i} className="h-10 shimmer rounded-xl" />)}</div>
      ) : (
        <div className="bg-white border border-[#e0eaf5] rounded-2xl shadow-sm overflow-hidden animate-fade-in-up-d1">
          {/* Week navigator */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#e0eaf5] bg-[#fafbfc]">
            <button
              onClick={() => setSemanaIdx(s => Math.max(0, s - 1))}
              disabled={semanaIdx === 0}
              className={`w-8 h-8 rounded-lg bg-white border border-[#e0eaf5] flex items-center justify-center transition-all active:scale-95 ${semanaIdx === 0 ? "opacity-30 cursor-not-allowed" : "text-[#475569] hover:bg-[#f1f5f9]"}`}
            >
              <SvgChevronLeft />
            </button>
            <div className="text-center">
              <p className="text-[13px] font-bold text-[#0f172a]">
                Dias {weekStart} — {weekEnd}
              </p>
              <p className="text-[10px] text-[#94a3b8] font-medium">
                Semana {semanaIdx + 1} de {totalWeeks}
              </p>
            </div>
            <button
              onClick={() => setSemanaIdx(s => Math.min(totalWeeks - 1, s + 1))}
              disabled={semanaIdx >= totalWeeks - 1}
              className={`w-8 h-8 rounded-lg bg-white border border-[#e0eaf5] flex items-center justify-center transition-all active:scale-95 ${semanaIdx >= totalWeeks - 1 ? "opacity-30 cursor-not-allowed" : "text-[#475569] hover:bg-[#f1f5f9]"}`}
            >
              <SvgChevronRight />
            </button>
          </div>

          {/* Week dots indicator */}
          <div className="flex items-center justify-center gap-1.5 py-2 border-b border-[#f0f3f6]">
            {weeks.map((_, wi) => (
              <button
                key={wi}
                onClick={() => setSemanaIdx(wi)}
                className={`w-2 h-2 rounded-full transition-all ${wi === semanaIdx ? "bg-[#0f2d52] scale-125" : "bg-[#dde3ea] hover:bg-[#b0bcc8]"}`}
              />
            ))}
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse" style={{ minWidth: 420 }}>
              <thead>
                <tr className="border-b border-[#e0eaf5]">
                  <th className="sticky left-0 bg-white z-10 min-w-[110px] w-[110px] text-left px-4 py-3 border-r border-[#e0eaf5]">
                    <span className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-wider">Hábito</span>
                  </th>
                  {currentWeekDays.map(d => {
                    const dayDate = new Date(ano, mes - 1, d);
                    const dayName = DIAS_SEMANA_NOMES[dayDate.getDay()];
                    const isToday = isCurrentMonth && d === hoje.getDate();
                    return (
                      <th key={d} className="px-1 py-3 text-center min-w-[42px]">
                        <div className={`flex flex-col items-center gap-0.5 ${isToday ? "text-[#c8a96e]" : "text-[#94a3b8]"}`}>
                          <span className="text-[9px] font-bold uppercase">{dayName}</span>
                          <span className={`text-[12px] font-black ${isToday ? "bg-[#c8a96e] text-white w-6 h-6 rounded-full flex items-center justify-center" : ""}`}>
                            {d}
                          </span>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {HABITOS.map((h, idx) => (
                  <tr key={h.slug} className={idx % 2 === 0 ? "bg-white" : "bg-[#fafbfc]"}>
                    <td className={`sticky left-0 z-10 min-w-[110px] w-[110px] px-4 py-2.5 border-r border-[#f0f3f6] ${idx % 2 === 0 ? "bg-white" : "bg-[#fafbfc]"}`}>
                      <span className="text-[12px] font-semibold text-[#0f172a] leading-tight block">{h.label}</span>
                    </td>
                    {currentWeekDays.map(d => {
                      const diaHoje = hoje.getDate();
                      const isFuturo = isCurrentMonth && d > diaHoje;
                      const isEditavel = isCurrentMonth && (d === diaHoje || d === diaHoje - 1);
                      const disabled = isFuturo || !isEditavel;
                      const status = getStatus(h.slug, d);
                      return (
                        <td key={d} className="px-1 py-2 text-center">
                          <div className="flex justify-center">
                            <HabitCell
                              status={status}
                              onClick={() => handleClick(h.slug, d)}
                              disabled={disabled}
                              loading={loadingCell === `${h.slug}-${d}`}
                            />
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
          <div className="flex items-center gap-3 px-4 py-2.5 border-t border-[#e0eaf5] bg-[#fafbfc]">
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded-[5px] bg-[#1D9E75]" />
              <span className="text-[10px] text-[#475569] font-medium">Feito</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded-[5px] bg-[#E24B4A]" />
              <span className="text-[10px] text-[#475569] font-medium">Não feito</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded-[5px] bg-[#f1f3f5]" />
              <span className="text-[10px] text-[#475569] font-medium">Vazio</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
