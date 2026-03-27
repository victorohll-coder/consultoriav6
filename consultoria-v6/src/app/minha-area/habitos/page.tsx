"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

/* ─── Tipos ─────────────────────────────────────────── */
type Status = -1 | 0 | 1;
type Registro = { habito: string; dia: string; status: Status };

/* ─── Hábitos fixos ──────────────────────────────────── */
const HABITOS: { slug: string; label: string }[] = [
  { slug: "plano_alimentar",  label: "Plano alimentar"    },
  { slug: "treino",           label: "Treino"              },
  { slug: "cardio",           label: "Cardio"              },
  { slug: "frutas_verduras",  label: "Frutas e verduras"   },
  { slug: "horas_sono",       label: "Sono reparador"      },
  { slug: "agua",             label: "Quantidade de água"  },
  { slug: "alcool",           label: "Sem álcool"          },
  { slug: "suplementacao",    label: "Suplementação"       },
  { slug: "intestino",        label: "Intestino"           },
  { slug: "refeicao_livre",   label: "Sem ref. livre"      },
];

const MESES = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
];

function diasNoMes(ano: number, mes: number) {
  return new Date(ano, mes, 0).getDate();
}

function pad(n: number) { return String(n).padStart(2, "0"); }

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

/* ─── Componente célula ──────────────────────────────── */
function HabitCell({
  status, onClick, disabled, loading,
}: {
  status: Status; onClick: () => void; disabled: boolean; loading: boolean;
}) {
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
    bg = "bg-gray-50 border border-gray-100 opacity-40 cursor-not-allowed";
  }

  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled || loading}
      className={`w-[30px] h-[30px] min-w-[30px] rounded-md flex items-center justify-center transition-all duration-150 ${bg} ${!disabled ? "hover:opacity-80 active:scale-90" : ""}`}
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

/* ─── Componente ScoreCard ───────────────────────────── */
function ScoreCard({ score, totalFeitos, totalCelulas }: { score: number; totalFeitos: number; totalCelulas: number }) {
  const pct = Math.round((totalFeitos / totalCelulas) * 100);
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
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: `${scoreColor}18` }}>
          <span style={{ color: scoreColor }}><SvgStar /></span>
        </div>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-2 mb-1.5">
        <div
          className={`${barColor} h-2 rounded-full transition-all duration-700`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-[11px] text-[#94a3b8]">
        {totalFeitos} de {totalCelulas} hábitos cumpridos ({pct}%)
      </p>
    </div>
  );
}

/* ─── Página principal ───────────────────────────────── */
export default function HabitosPage() {
  const supabase = createClient();

  const hoje = new Date();
  const [mes, setMes] = useState(hoje.getMonth() + 1);     // 1-12
  const [ano, setAno] = useState(hoje.getFullYear());
  const [pacienteId, setPacienteId] = useState<string | null>(null);
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingCell, setLoadingCell] = useState<string | null>(null); // "slug-dia"
  const [toast, setToast] = useState<string | null>(null);

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
    setRegistros((data as Registro[]) || []);
    setLoading(false);
  }, [pacienteId, mes, ano, totalDias, supabase]);

  useEffect(() => {
    loadRegistros();
  }, [loadRegistros]);

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

    setLoadingCell(key);
    const { error } = await supabase
      .from("habitos_registros")
      .upsert(
        { paciente_id: pacienteId, habito: slug, dia: diaStr, status: next },
        { onConflict: "paciente_id,habito,dia" }
      );
    setLoadingCell(null);

    if (error) {
      /* Reverter em caso de erro */
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
    const n = new Date(ano, mes, 1); // primeiro dia do próximo mês
    if (n > hoje) return; // não avança além do mês atual
    if (mes === 12) { setMes(1); setAno(a => a + 1); }
    else setMes(m => m + 1);
  }
  const isCurrentMonth = mes === hoje.getMonth() + 1 && ano === hoje.getFullYear();

  /* Pontuação */
  const totalCelulas = HABITOS.length * totalDias;
  const totalFeitos = registros.filter(r => r.status === 1).length;
  const score = totalCelulas > 0 ? (totalFeitos / totalCelulas) * 10 : 0;

  return (
    <div className="animate-fade-in-up">
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
          <p className="text-[#475569] text-sm mt-0.5">Marque seus hábitos diários</p>
        </div>
      </div>

      {/* Seletor de mês */}
      <div className="flex items-center justify-center gap-4 mb-5">
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
        <ScoreCard score={score} totalFeitos={totalFeitos} totalCelulas={totalCelulas} />
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
                  {/* Coluna sticky com label */}
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
                    {/* Label sticky */}
                    <td className={`sticky left-0 z-10 min-w-[148px] max-w-[148px] w-[148px] px-4 py-2 border-r border-[#e0eaf5] ${idx % 2 === 0 ? "bg-white" : "bg-[#fafbfc]"}`}>
                      <span className="text-[12px] font-semibold text-[#0f172a] truncate block">{h.label}</span>
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
