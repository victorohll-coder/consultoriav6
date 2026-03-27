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
  { slug: "frutas_verduras",  label: "Frutas e verduras"  },
  { slug: "horas_sono",       label: "Sono reparador"     },
  { slug: "agua",             label: "Quantidade de água" },
  { slug: "alcool",           label: "Sem álcool"         },
  { slug: "suplementacao",    label: "Suplementação"      },
  { slug: "intestino",        label: "Intestino"          },
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

export default function HabitosPainelPage() {
  const supabase = createClient();
  const hoje = new Date();

  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [selectedPaciente, setSelectedPaciente] = useState<string>("");
  const [mes, setMes] = useState(hoje.getMonth() + 1);
  const [ano, setAno] = useState(hoje.getFullYear());
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [loading, setLoading] = useState(false);

  const totalDias = diasNoMes(ano, mes);
  const dias = Array.from({ length: totalDias }, (_, i) => i + 1);

  useEffect(() => {
    supabase.from("pacientes").select("*").order("nome").then(({ data }) => {
      if (data) setPacientes(data);
    });
  }, [supabase]);

  const loadRegistros = useCallback(async () => {
    if (!selectedPaciente) { setRegistros([]); return; }

    // Buscar o auth user_id pelo email do paciente
    const pac = pacientes.find(p => p.id === selectedPaciente);
    if (!pac) return;

    setLoading(true);
    const mesStr = pad(mes);
    const ultimoDia = pad(totalDias);

    // Buscar pelo paciente_id via profiles (auth.users)
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", pac.email)
      .single();

    if (!profile) { setRegistros([]); setLoading(false); return; }

    const { data } = await supabase
      .from("habitos_registros")
      .select("habito, dia, status")
      .eq("paciente_id", profile.id)
      .gte("dia", `${ano}-${mesStr}-01`)
      .lte("dia", `${ano}-${mesStr}-${ultimoDia}`);

    setRegistros((data as Registro[]) || []);
    setLoading(false);
  }, [selectedPaciente, pacientes, mes, ano, totalDias, supabase]);

  useEffect(() => { loadRegistros(); }, [loadRegistros]);

  function getStatus(slug: string, dia: number): Status {
    const r = registros.find(r => r.habito === slug && r.dia === `${ano}-${pad(mes)}-${pad(dia)}`);
    return (r?.status ?? 0) as Status;
  }

  function prevMes() {
    if (mes === 1) { setMes(12); setAno(a => a - 1); }
    else setMes(m => m - 1);
  }
  function nextMes() {
    if (mes === 12) { setMes(1); setAno(a => a + 1); }
    else setMes(m => m + 1);
  }

  const totalCelulas = HABITOS.length * totalDias;
  const totalFeitos = registros.filter(r => r.status === 1).length;
  const score = totalCelulas > 0 ? (totalFeitos / totalCelulas) * 10 : 0;
  const scoreColor = score >= 7 ? "#1D9E75" : score >= 4 ? "#D4AC0D" : "#E24B4A";

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text">Hábitos</h1>
        <p className="text-text2 text-sm mt-1">Visualize o desafio de hábitos de cada paciente</p>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 mb-6">
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
          <p className="text-text2 font-semibold">Selecione um paciente para visualizar os hábitos</p>
        </div>
      ) : (
        <>
          {/* Navegação de mês + pontuação */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
            <div className="flex items-center gap-3">
              <button onClick={prevMes} className="w-8 h-8 rounded-lg border border-surface2 bg-surface flex items-center justify-center text-text2 hover:bg-surface2 transition-all">
                <SvgChevronLeft />
              </button>
              <p className="text-text font-bold text-base min-w-[150px] text-center">{MESES[mes - 1]} {ano}</p>
              <button onClick={nextMes} className="w-8 h-8 rounded-lg border border-surface2 bg-surface flex items-center justify-center text-text2 hover:bg-surface2 transition-all">
                <SvgChevronRight />
              </button>
            </div>

            {!loading && (
              <div className="flex items-center gap-3 bg-surface border border-surface2 rounded-xl px-4 py-2.5">
                <div>
                  <p className="text-[11px] text-text3 font-semibold uppercase tracking-wider">Pontuação</p>
                  <p className="text-2xl font-black" style={{ color: scoreColor }}>
                    {score.toFixed(1)}<span className="text-sm text-text3 font-semibold"> / 10</span>
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-text3">{totalFeitos} de {totalCelulas} feitos</p>
                  <p className="text-[11px] text-text3">{Math.round((totalFeitos / totalCelulas) * 100)}% de consistência</p>
                </div>
              </div>
            )}
          </div>

          {/* Grid somente leitura */}
          {loading ? (
            <div className="flex flex-col gap-2">
              {[1,2,3,4,5].map(i => <div key={i} className="h-9 bg-surface2 rounded-xl animate-pulse" />)}
            </div>
          ) : (
            <div className="bg-surface border border-surface2 rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="border-collapse" style={{ minWidth: "900px" }}>
                  <thead>
                    <tr className="border-b border-surface2">
                      <th className="sticky left-0 bg-surface z-10 min-w-[148px] max-w-[148px] w-[148px] text-left px-4 py-3 border-r border-surface2">
                        <span className="text-[10px] font-bold text-text3 uppercase tracking-wider">Hábito</span>
                      </th>
                      {dias.map(d => (
                        <th key={d} className="w-[28px] min-w-[28px] px-0.5 py-3 text-center">
                          <span className="text-[10px] font-bold text-text3">{d}</span>
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
  );
}
