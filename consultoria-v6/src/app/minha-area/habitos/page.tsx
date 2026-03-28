"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

/* ─── Tipos ─────────────────────────────────────────── */
type Status = -1 | 0 | 1;
type Registro = { habito: string; dia: string; status: Status };

/* ─── Hábitos fixos ──────────────────────────────────── */
const HABITOS: { slug: string; label: string; emoji: string }[] = [
  { slug: "plano_alimentar",  label: "Plano alimentar",   emoji: "🍽️" },
  { slug: "treino",           label: "Treino",             emoji: "🏋️" },
  { slug: "cardio",           label: "Cardio",             emoji: "🏃" },
  { slug: "frutas_verduras",  label: "Frutas e verduras",  emoji: "🥗" },
  { slug: "horas_sono",       label: "Sono reparador",     emoji: "😴" },
  { slug: "agua",             label: "Quantidade de água", emoji: "💧" },
  { slug: "alcool",           label: "Sem álcool",         emoji: "🚫" },
  { slug: "suplementacao",    label: "Suplementação",      emoji: "💊" },
  { slug: "intestino",        label: "Intestino",          emoji: "🟢" },
  { slug: "refeicao_livre",   label: "Sem ref. livre",     emoji: "🍔" },
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
interface Badge {
  id: string;
  label: string;
  emoji: string;
  desc: string;
  check: (ctx: BadgeContext) => boolean;
}

interface BadgeContext {
  streak: number;
  score: number;
  totalFeitos: number;
  totalCelulas: number;
  registros: Registro[];
  diasCompletados: number; // dias com todos 10 hábitos feitos
  habitoPerfeito: string | null; // hábito com 100% no mês
}

const BADGES: Badge[] = [
  { id: "streak3",   label: "Fogo!",           emoji: "🔥", desc: "3 dias seguidos",              check: (c) => c.streak >= 3 },
  { id: "streak7",   label: "Imparável",       emoji: "⚡", desc: "7 dias seguidos",              check: (c) => c.streak >= 7 },
  { id: "streak14",  label: "Guerreiro",       emoji: "⚔️", desc: "14 dias seguidos",             check: (c) => c.streak >= 14 },
  { id: "streak30",  label: "Lendário",        emoji: "👑", desc: "30 dias seguidos",             check: (c) => c.streak >= 30 },
  { id: "score7",    label: "Consistente",     emoji: "🎯", desc: "Pontuação acima de 7",         check: (c) => c.score >= 7 },
  { id: "score9",    label: "Excelência",      emoji: "🏆", desc: "Pontuação acima de 9",         check: (c) => c.score >= 9 },
  { id: "score10",   label: "Perfeição",       emoji: "💎", desc: "Pontuação 10.0",               check: (c) => c.score === 10 },
  { id: "dia100",    label: "Dia perfeito",    emoji: "⭐", desc: "Todos os hábitos em 1 dia",    check: (c) => c.diasCompletados >= 1 },
  { id: "dia7_100",  label: "Semana perfeita", emoji: "🌟", desc: "7 dias perfeitos no mês",     check: (c) => c.diasCompletados >= 7 },
  { id: "habPerf",   label: "Especialista",    emoji: "🥇", desc: "100% em um hábito no mês",    check: (c) => c.habitoPerfeito !== null },
  { id: "first",     label: "Primeiro passo",  emoji: "👣", desc: "Primeiro hábito marcado",      check: (c) => c.totalFeitos >= 1 },
  { id: "metade",    label: "Meio caminho",    emoji: "🚀", desc: "50%+ dos hábitos no mês",     check: (c) => c.totalCelulas > 0 && (c.totalFeitos / c.totalCelulas) >= 0.5 },
];

/* ─── SVG Icons ─────────────────────────────────────── */
const SvgCheck = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20,6 9,17 4,12"/>
  </svg>
);
const SvgX = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);
const SvgChevronLeft = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15,18 9,12 15,6"/>
  </svg>
);
const SvgChevronRight = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9,18 15,12 9,6"/>
  </svg>
);
const SvgStar = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none">
    <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
  </svg>
);
const SvgTrophy = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 9H4.5a2.5 2.5 0 010-5H6M18 9h1.5a2.5 2.5 0 000-5H18"/>
    <path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 19.24 7 20v2h10v-2c0-.76-.85-1.25-2.03-1.79A1.13 1.13 0 0114 17v-2.34"/>
    <path d="M18 2H6v7a6 6 0 1012 0V2z"/>
  </svg>
);

/* ─── Confetti animation ─────────────────────────────── */
function Confetti({ show }: { show: boolean }) {
  if (!show) return null;
  const colors = ["#1D9E75", "#c8a96e", "#2563eb", "#E24B4A", "#D4AC0D", "#9333ea"];
  return (
    <div className="fixed inset-0 z-[100] pointer-events-none overflow-hidden">
      {Array.from({ length: 40 }).map((_, i) => {
        const left = Math.random() * 100;
        const delay = Math.random() * 0.5;
        const dur = 1.5 + Math.random();
        const size = 6 + Math.random() * 6;
        const color = colors[i % colors.length];
        const rotation = Math.random() * 360;
        return (
          <div
            key={i}
            className="absolute animate-confetti-fall"
            style={{
              left: `${left}%`,
              top: -20,
              width: size,
              height: size * 0.6,
              backgroundColor: color,
              borderRadius: 2,
              animationDelay: `${delay}s`,
              animationDuration: `${dur}s`,
              transform: `rotate(${rotation}deg)`,
            }}
          />
        );
      })}
    </div>
  );
}

/* ─── Componente célula ──────────────────────────────── */
function HabitCell({
  status, onClick, disabled, loading,
}: {
  status: Status; onClick: () => void; disabled: boolean; loading: boolean;
}) {
  const [pop, setPop] = useState(false);

  function handleClick() {
    if (disabled || loading) return;
    setPop(true);
    setTimeout(() => setPop(false), 300);
    onClick();
  }

  let bg = "bg-gray-100 border border-gray-200 text-gray-300";
  let icon: React.ReactNode = null;

  if (status === 1) {
    bg = "bg-[#1D9E75] border-[#1D9E75] text-white shadow-sm";
    icon = <SvgCheck />;
  } else if (status === -1) {
    bg = "bg-[#E24B4A] border-[#E24B4A] text-white shadow-sm";
    icon = <SvgX />;
  }

  if (disabled) {
    bg += " opacity-40 cursor-not-allowed";
    if (status === 0) bg = "bg-gray-50 border border-gray-100 opacity-40 cursor-not-allowed";
  }

  return (
    <button
      onClick={handleClick}
      disabled={disabled || loading}
      className={`w-[30px] h-[30px] min-w-[30px] rounded-md flex items-center justify-center transition-all duration-150 ${bg} ${!disabled ? "hover:opacity-80 active:scale-90" : ""} ${pop ? "scale-125" : ""}`}
      style={{ transition: "transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.15s ease" }}
    >
      {loading ? (
        <svg className="animate-spin" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
          <circle cx="12" cy="12" r="10" strokeOpacity="0.2"/>
          <path d="M12 2a10 10 0 0110 10" strokeLinecap="round"/>
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
    const regsHoje = registros.filter(r => r.dia === diaStr && r.status === 1);
    if (regsHoje.length > 0) {
      streak++;
      d.setDate(d.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

/* ─── Componente ScoreCard ───────────────────────────── */
function ScoreCard({ score, totalFeitos, totalCelulas, streak, recorde }: {
  score: number; totalFeitos: number; totalCelulas: number; streak: number; recorde: number;
}) {
  const pct = totalCelulas > 0 ? Math.round((totalFeitos / totalCelulas) * 100) : 0;
  const scoreColor = score >= 7 ? "#1D9E75" : score >= 4 ? "#D4AC0D" : "#E24B4A";
  const barColor = score >= 7 ? "bg-[#1D9E75]" : score >= 4 ? "bg-[#D4AC0D]" : "bg-[#E24B4A]";

  return (
    <div className="bg-white border border-[#e0eaf5] rounded-2xl p-5 mb-4 shadow-sm animate-fade-in-up">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-[11px] font-bold text-[#94a3b8] uppercase tracking-wider mb-0.5">Pontuação do mês</p>
          <div className="flex items-end gap-1.5">
            <span className="text-4xl font-black" style={{ color: scoreColor, fontFamily: "var(--font-display)" }}>
              {score.toFixed(1)}
            </span>
            <span className="text-[#94a3b8] text-lg font-semibold mb-1">/ 10</span>
          </div>
        </div>
        <div className="flex flex-col items-center gap-1">
          {/* Streak */}
          <div className="flex items-center gap-1.5 bg-orange-50 border border-orange-200/60 rounded-xl px-3 py-1.5">
            <span className="text-lg">🔥</span>
            <div>
              <p className="text-orange-600 font-black text-base leading-none">{streak}</p>
              <p className="text-[9px] text-orange-400 font-bold uppercase">dias</p>
            </div>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-100 rounded-full h-2.5 mb-2">
        <div
          className={`${barColor} h-2.5 rounded-full transition-all duration-700`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-[#94a3b8]">
          {totalFeitos} de {totalCelulas} hábitos cumpridos ({pct}%)
        </p>
        {recorde > 0 && (
          <p className="text-[11px] text-[#c8a96e] font-bold">
            Recorde: {recorde.toFixed(1)} ⭐
          </p>
        )}
      </div>
    </div>
  );
}

/* ─── Resumo do dia ──────────────────────────────────── */
function DayResume({ registros, hoje }: { registros: Registro[]; hoje: Date }) {
  const hojeStr = `${hoje.getFullYear()}-${pad(hoje.getMonth() + 1)}-${pad(hoje.getDate())}`;
  const feitosHoje = registros.filter(r => r.dia === hojeStr && r.status === 1).length;
  const naoFeitosHoje = registros.filter(r => r.dia === hojeStr && r.status === -1).length;
  const pendentes = HABITOS.length - feitosHoje - naoFeitosHoje;
  const todosFeitos = feitosHoje === HABITOS.length;

  const faltam = HABITOS.filter(h => {
    const r = registros.find(reg => reg.dia === hojeStr && reg.habito === h.slug);
    return !r || r.status !== 1;
  });

  if (todosFeitos) {
    return (
      <div className="bg-emerald-50 border border-emerald-200/60 rounded-2xl p-4 mb-4 animate-fade-in-scale">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🎉</span>
          <div>
            <p className="text-emerald-700 font-bold text-sm">Dia perfeito!</p>
            <p className="text-emerald-600 text-xs">Todos os 10 hábitos marcados hoje. Excelente!</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-blue-50 border border-blue-200/50 rounded-2xl p-4 mb-4 animate-fade-in-up">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[#0f2d52] font-bold text-sm">Hoje: {feitosHoje}/{HABITOS.length} hábitos ✅</p>
        {pendentes > 0 && (
          <span className="text-[11px] text-blue-500 font-bold bg-blue-100 px-2 py-0.5 rounded-lg">
            {pendentes} pendente{pendentes > 1 ? "s" : ""}
          </span>
        )}
      </div>
      {faltam.length > 0 && faltam.length <= 5 && (
        <p className="text-[11px] text-[#475569]">
          Falta: {faltam.map(h => h.emoji + " " + h.label).join(", ")}
        </p>
      )}
    </div>
  );
}

/* ─── Badges display ─────────────────────────────────── */
function BadgesSection({ earned }: { earned: Badge[] }) {
  const [showAll, setShowAll] = useState(false);
  if (earned.length === 0) return null;

  const visible = showAll ? earned : earned.slice(0, 4);

  return (
    <div className="mb-4 animate-fade-in-up-d1">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[11px] font-bold text-[#94a3b8] uppercase tracking-wider flex items-center gap-1.5">
          <span className="text-sm">🏅</span> Conquistas ({earned.length}/{BADGES.length})
        </p>
        {earned.length > 4 && (
          <button onClick={() => setShowAll(!showAll)} className="text-[11px] text-[#c8a96e] font-bold hover:underline">
            {showAll ? "Menos" : "Ver todas"}
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {visible.map(b => (
          <div key={b.id} className="flex items-center gap-1.5 bg-white border border-[#e0eaf5] rounded-xl px-3 py-2 shadow-sm hover:shadow-md transition-shadow">
            <span className="text-lg">{b.emoji}</span>
            <div>
              <p className="text-[11px] font-bold text-[#0f172a] leading-tight">{b.label}</p>
              <p className="text-[9px] text-[#94a3b8]">{b.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Ranking Preview ────────────────────────────────── */
function RankingPreview({ pacienteId, score }: { pacienteId: string; score: number }) {
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

      // Buscar todos os registros do mês atual de TODOS os pacientes
      const { data: allRegs } = await supabase
        .from("habitos_registros")
        .select("paciente_id, status")
        .gte("dia", `${ano}-${mesStr}-01`)
        .lte("dia", `${ano}-${mesStr}-${ultimoDia}`)
        .eq("status", 1);

      if (!allRegs || allRegs.length === 0) {
        setLoadingRank(false);
        return;
      }

      // Agrupar por paciente
      const byPaciente: Record<string, number> = {};
      allRegs.forEach((r: { paciente_id: string; status: number }) => {
        byPaciente[r.paciente_id] = (byPaciente[r.paciente_id] || 0) + 1;
      });

      const totalCelulas = HABITOS.length * totalDias;

      // Buscar nomes via profiles
      const ids = Object.keys(byPaciente);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, email")
        .in("id", ids);

      // Buscar nomes dos pacientes
      const emails = profiles?.map(p => p.email) || [];
      const { data: pacientesData } = await supabase
        .from("pacientes")
        .select("nome, email")
        .in("email", emails);

      const emailToName: Record<string, string> = {};
      pacientesData?.forEach((p: { nome: string; email: string }) => {
        emailToName[p.email] = p.nome;
      });

      const ranked = ids.map(id => {
        const feitos = byPaciente[id];
        const pontuacao = (feitos / totalCelulas) * 10;
        const profile = profiles?.find(p => p.id === id);
        const nome = profile ? (emailToName[profile.email] || profile.email.split("@")[0]) : "Anônimo";
        // Anonimizar: apenas primeiro nome + primeira letra do sobrenome
        const nomeArr = nome.split(" ");
        const nomeDisplay = nomeArr.length > 1 ? `${nomeArr[0]} ${nomeArr[1][0]}.` : nomeArr[0];
        return { nome: nomeDisplay, pontuacao, isMe: id === pacienteId };
      }).sort((a, b) => b.pontuacao - a.pontuacao);

      setRanking(ranked.slice(0, 5));
      const pos = ranked.findIndex(r => r.isMe) + 1;
      setMyPos(pos);
      setLoadingRank(false);
    }
    load();
  }, [pacienteId, supabase]);

  if (loadingRank || ranking.length === 0) return null;

  const medals = ["🥇", "🥈", "🥉"];

  return (
    <div className="bg-white border border-[#e0eaf5] rounded-2xl p-5 mb-4 shadow-sm animate-fade-in-up-d2">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] font-bold text-[#94a3b8] uppercase tracking-wider flex items-center gap-1.5">
          <SvgTrophy /> Ranking do mês
        </p>
        {myPos > 0 && (
          <span className="text-[11px] font-bold text-[#c8a96e] bg-[#fef9ef] px-2.5 py-1 rounded-lg">
            Você: {myPos}º lugar
          </span>
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        {ranking.map((r, i) => (
          <div
            key={i}
            className={`flex items-center justify-between px-3 py-2 rounded-xl transition-all ${
              r.isMe ? "bg-[#0f2d52]/5 border border-[#0f2d52]/10" : "bg-[#fafbfc]"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <span className="text-lg min-w-[24px] text-center">{i < 3 ? medals[i] : `${i + 1}º`}</span>
              <span className={`text-sm font-semibold ${r.isMe ? "text-[#0f2d52]" : "text-[#475569]"}`}>
                {r.isMe ? `${r.nome} (você)` : r.nome}
              </span>
            </div>
            <span className={`text-sm font-black ${
              r.pontuacao >= 7 ? "text-[#1D9E75]" : r.pontuacao >= 4 ? "text-[#D4AC0D]" : "text-[#E24B4A]"
            }`}>
              {r.pontuacao.toFixed(1)}
            </span>
          </div>
        ))}
      </div>

      {/* Link ranking por hábito */}
      <Link href="/minha-area/habitos/ranking" className="block mt-3 text-center text-[11px] text-[#c8a96e] font-bold hover:underline">
        Ver ranking completo por hábito →
      </Link>
    </div>
  );
}

/* ─── Página principal ───────────────────────────────── */
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

  const totalDias = diasNoMes(ano, mes);
  const dias = Array.from({ length: totalDias }, (_, i) => i + 1);

  /* Buscar user */
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setPacienteId(user.id);
    });
  }, [supabase]);

  /* Buscar registros do mês */
  const loadRegistros = useCallback(async () => {
    if (!pacienteId) return;
    setLoading(true);
    const mesStr = pad(mes);
    const ultimoDia = pad(totalDias);
    const { data } = await supabase
      .from("habitos_registros")
      .select("habito, dia, status")
      .eq("paciente_id", pacienteId)
      .gte("dia", `${ano}-${mesStr}-01`)
      .lte("dia", `${ano}-${mesStr}-${ultimoDia}`);
    const regs = (data as Registro[]) || [];
    setRegistros(regs);
    prevFeitosRef.current = regs.filter(r => r.status === 1).length;
    setLoading(false);
  }, [pacienteId, mes, ano, totalDias, supabase]);

  useEffect(() => { loadRegistros(); }, [loadRegistros]);

  /* Buscar todos os registros para streak */
  useEffect(() => {
    if (!pacienteId) return;
    supabase
      .from("habitos_registros")
      .select("habito, dia, status")
      .eq("paciente_id", pacienteId)
      .order("dia", { ascending: false })
      .limit(1000)
      .then(({ data }) => {
        setAllTimeRegistros((data as Registro[]) || []);
      });
  }, [pacienteId, registros, supabase]);

  /* Buscar recorde pessoal (maior pontuação mensal) */
  useEffect(() => {
    if (!pacienteId) return;
    supabase
      .from("habitos_pontuacao")
      .select("pontuacao")
      .eq("paciente_id", pacienteId)
      .order("pontuacao", { ascending: false })
      .limit(1)
      .then(({ data }) => {
        if (data && data.length > 0) setRecorde(Number(data[0].pontuacao));
      });
  }, [pacienteId, supabase]);

  /* Ler status da célula */
  function getStatus(slug: string, dia: number): Status {
    const r = registros.find(r => r.habito === slug && r.dia === `${ano}-${pad(mes)}-${pad(dia)}`);
    return (r?.status ?? 0) as Status;
  }

  /* Clicar na célula */
  async function handleClick(slug: string, dia: number) {
    if (!pacienteId) return;
    const key = `${slug}-${dia}`;
    const current = getStatus(slug, dia);
    const next: Status = current === 0 ? 1 : current === 1 ? -1 : 0;
    const diaStr = `${ano}-${pad(mes)}-${pad(dia)}`;

    /* Optimistic update */
    setRegistros(prev => {
      const sem = prev.filter(r => !(r.habito === slug && r.dia === diaStr));
      if (next === 0) return sem;
      return [...sem, { habito: slug, dia: diaStr, status: next }];
    });

    // Check if all habits complete today (for confetti)
    if (next === 1) {
      const hojeStr = `${ano}-${pad(mes)}-${pad(dia)}`;
      const futureRegs = registros.filter(r => r.dia === hojeStr && r.status === 1 && r.habito !== slug);
      if (futureRegs.length === HABITOS.length - 1) {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 3000);
      }
    }

    setLoadingCell(key);
    const { error } = await supabase
      .from("habitos_registros")
      .upsert(
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

  /* Navegação de mês */
  function prevMes() {
    if (mes === 1) { setMes(12); setAno(a => a - 1); }
    else setMes(m => m - 1);
  }
  function nextMes() {
    const n = new Date(ano, mes, 1);
    if (n > hoje) return;
    if (mes === 12) { setMes(1); setAno(a => a + 1); }
    else setMes(m => m + 1);
  }
  const isCurrentMonth = mes === hoje.getMonth() + 1 && ano === hoje.getFullYear();

  /* Pontuação */
  const totalCelulas = HABITOS.length * totalDias;
  const totalFeitos = registros.filter(r => r.status === 1).length;
  const score = totalCelulas > 0 ? (totalFeitos / totalCelulas) * 10 : 0;

  /* Streak */
  const streak = calcStreak(allTimeRegistros, hoje);

  /* Badge context */
  const diasCompletados = dias.filter(d => {
    const dStr = `${ano}-${pad(mes)}-${pad(d)}`;
    return HABITOS.every(h => registros.find(r => r.habito === h.slug && r.dia === dStr && r.status === 1));
  }).length;

  const habitoPerfeito = HABITOS.find(h => {
    const diaPassado = isCurrentMonth ? hoje.getDate() : totalDias;
    return Array.from({ length: diaPassado }, (_, i) => i + 1).every(d => {
      const dStr = `${ano}-${pad(mes)}-${pad(d)}`;
      return registros.find(r => r.habito === h.slug && r.dia === dStr && r.status === 1);
    });
  })?.slug || null;

  const badgeCtx: BadgeContext = {
    streak,
    score,
    totalFeitos,
    totalCelulas,
    registros,
    diasCompletados,
    habitoPerfeito,
  };

  const earnedBadges = BADGES.filter(b => b.check(badgeCtx));

  return (
    <div className="animate-fade-in-up">
      <Confetti show={showConfetti} />

      {/* Toast de erro */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-[#E24B4A] text-white text-sm font-semibold px-5 py-3 rounded-2xl shadow-lg animate-fade-in-scale">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 style={{ fontFamily: "var(--font-display)" }} className="text-xl font-bold text-[#0f172a]">
            Desafio de Hábitos
          </h1>
          <p className="text-[#475569] text-sm mt-0.5">Marque seus hábitos e suba no ranking!</p>
        </div>
        {streak >= 3 && (
          <div className="flex items-center gap-1 bg-gradient-to-r from-orange-500 to-red-500 text-white px-3 py-1.5 rounded-xl text-xs font-bold shadow-lg animate-pulse">
            🔥 {streak} dias seguidos!
          </div>
        )}
      </div>

      {/* Resumo do dia (apenas mês atual) */}
      {isCurrentMonth && !loading && <DayResume registros={registros} hoje={hoje} />}

      {/* Seletor de mês */}
      <div className="flex items-center justify-center gap-4 mb-4">
        <button
          onClick={prevMes}
          className="w-9 h-9 rounded-xl bg-white border border-[#e0eaf5] flex items-center justify-center text-[#475569] hover:bg-[#f1f5f9] transition-all shadow-sm active:scale-95"
        >
          <SvgChevronLeft />
        </button>
        <p className="text-[#0f172a] font-bold text-base min-w-[160px] text-center">
          {MESES[mes - 1]} {ano}
        </p>
        <button
          onClick={nextMes}
          disabled={isCurrentMonth}
          className={`w-9 h-9 rounded-xl bg-white border border-[#e0eaf5] flex items-center justify-center transition-all shadow-sm active:scale-95 ${isCurrentMonth ? "opacity-30 cursor-not-allowed" : "text-[#475569] hover:bg-[#f1f5f9]"}`}
        >
          <SvgChevronRight />
        </button>
      </div>

      {/* Score card */}
      {!loading && (
        <ScoreCard score={score} totalFeitos={totalFeitos} totalCelulas={totalCelulas} streak={streak} recorde={recorde} />
      )}

      {/* Badges */}
      {!loading && <BadgesSection earned={earnedBadges} />}

      {/* Ranking */}
      {!loading && pacienteId && isCurrentMonth && (
        <RankingPreview pacienteId={pacienteId} score={score} />
      )}

      {/* Grid */}
      {loading ? (
        <div className="flex flex-col gap-2">
          {[1,2,3,4].map(i => <div key={i} className="h-10 shimmer rounded-xl" />)}
        </div>
      ) : (
        <div className="bg-white border border-[#e0eaf5] rounded-2xl shadow-sm overflow-hidden animate-fade-in-up-d1">
          <div className="overflow-x-auto -mx-0">
            <table className="border-collapse" style={{ minWidth: "900px" }}>
              <thead>
                <tr className="border-b border-[#e0eaf5]">
                  <th className="sticky left-0 bg-white z-10 min-w-[148px] max-w-[148px] w-[148px] text-left px-4 py-3 border-r border-[#e0eaf5]">
                    <span className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-wider">Hábito</span>
                  </th>
                  {dias.map(d => (
                    <th key={d} className="w-[30px] min-w-[30px] px-0.5 py-3 text-center">
                      <span className={`text-[10px] font-bold ${isCurrentMonth && d === hoje.getDate() ? "text-[#c8a96e]" : "text-[#94a3b8]"}`}>
                        {d}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {HABITOS.map((h, idx) => (
                  <tr key={h.slug} className={idx % 2 === 0 ? "bg-white" : "bg-[#fafbfc]"}>
                    <td className={`sticky left-0 z-10 min-w-[148px] max-w-[148px] w-[148px] px-4 py-2 border-r border-[#e0eaf5] ${idx % 2 === 0 ? "bg-white" : "bg-[#fafbfc]"}`}>
                      <span className="text-[12px] font-semibold text-[#0f172a] truncate block">
                        {h.emoji} {h.label}
                      </span>
                    </td>
                    {dias.map(d => {
                      const diaHoje = hoje.getDate();
                      const isFuturo = isCurrentMonth && d > diaHoje;
                      const isEditavel = isCurrentMonth && (d === diaHoje || d === diaHoje - 1);
                      const disabled = isFuturo || !isEditavel;
                      const cellKey = `${h.slug}-${d}`;
                      const status = getStatus(h.slug, d);
                      return (
                        <td key={d} className="px-0.5 py-2 text-center">
                          <HabitCell
                            status={status}
                            onClick={() => handleClick(h.slug, d)}
                            disabled={disabled}
                            loading={loadingCell === cellKey}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Legenda */}
          <div className="flex items-center gap-4 px-4 py-3 border-t border-[#e0eaf5] bg-[#fafbfc]">
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-md bg-[#1D9E75] flex items-center justify-center">
                <SvgCheck />
              </div>
              <span className="text-[11px] text-[#475569] font-medium">Feito</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-md bg-[#E24B4A] flex items-center justify-center">
                <SvgX />
              </div>
              <span className="text-[11px] text-[#475569] font-medium">Não feito</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-md bg-gray-100 border border-gray-200" />
              <span className="text-[11px] text-[#475569] font-medium">Sem registro</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
