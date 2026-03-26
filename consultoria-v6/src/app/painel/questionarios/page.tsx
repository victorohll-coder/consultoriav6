"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { PERGUNTAS, BLOCOS } from "@/lib/questionario";
import Modal from "@/components/Modal";
import type { Questionario, Paciente } from "@/lib/types";

function fmtData(d: string) {
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

function addDays(dateStr: string, days: number) {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

type PacienteComQuiz = Paciente & {
  questionarios: Questionario[];
};

export default function QuestionariosPage() {
  const supabase = createClient();
  const [pacientes, setPacientes] = useState<PacienteComQuiz[]>([]);
  const [selectedPaciente, setSelectedPaciente] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Edit modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editQuizId, setEditQuizId] = useState<string | null>(null);
  const [editRespostas, setEditRespostas] = useState<Record<string, string | number>>({});

  const loadData = useCallback(async () => {
    setLoading(true);
    const { data: pacs } = await supabase
      .from("pacientes")
      .select("*, questionarios(*)")
      .order("nome");

    if (pacs) setPacientes(pacs as PacienteComQuiz[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { loadData(); }, [loadData]);

  // Generate quizzes based on data_consulta: D+15, D+30, D+45... up to 365 days
  async function gerarQuestionarios() {
    let gerados = 0;

    for (const pac of pacientes) {
      if (!pac.data_consulta) continue;

      const quizzes = pac.questionarios || [];
      const existingDates = new Set(
        quizzes.map((q) => q.proxima_data).filter(Boolean)
      );

      // Determine plan duration in days (default 365)
      const planDays = getPlanDuration(pac.plano);

      // Generate D+15, D+30, D+45...
      for (let dia = 15; dia <= planDays; dia += 15) {
        const dataAlvo = addDays(pac.data_consulta, dia);

        // Skip if quiz already exists for this date
        if (existingDates.has(dataAlvo)) continue;

        // Skip dates more than 30 days in the future (generate incrementally)
        const hoje = new Date();
        const alvo = new Date(dataAlvo + "T12:00:00");
        const diffDays = Math.floor((alvo.getTime() - hoje.getTime()) / 86400000);
        if (diffDays > 30) continue;

        await supabase.from("questionarios").insert({
          paciente_id: pac.id,
          data_resposta: null,
          proxima_data: dataAlvo,
          respostas: null,
        });
        gerados++;
      }
    }

    if (gerados > 0) {
      alert(`${gerados} questionário(s) gerado(s)!`);
      loadData();
    } else {
      alert("Nenhum questionário novo para gerar. Todos já estão em dia.");
    }
  }

  function getPlanDuration(plano: string | null): number {
    if (!plano) return 365;
    const p = plano.toLowerCase();
    if (p.includes("avulsa") || p.includes("mensal")) return 30;
    if (p.includes("trimestral")) return 90;
    if (p.includes("semestral")) return 180;
    if (p.includes("anual")) return 365;
    if (p.includes("vip")) return 365;
    return 365;
  }

  // Edit quiz responses
  function openEditQuiz(q: Questionario) {
    setEditQuizId(q.id);
    setEditRespostas(q.respostas ? { ...q.respostas } : {});
    setEditModalOpen(true);
  }

  async function handleSaveEdit() {
    if (!editQuizId) return;
    await supabase.from("questionarios").update({
      respostas: editRespostas,
      data_resposta: editRespostas && Object.keys(editRespostas).length > 0
        ? new Date().toISOString().split("T")[0]
        : null,
    }).eq("id", editQuizId);
    setEditModalOpen(false);
    loadData();
  }

  async function handleDeleteQuiz(id: string) {
    if (!confirm("Excluir este questionário?")) return;
    await supabase.from("questionarios").delete().eq("id", id);
    loadData();
  }

  const selectedPac = pacientes.find((p) => p.id === selectedPaciente);
  const quizzes = useMemo(() => {
    if (!selectedPac) return [];
    return [...(selectedPac.questionarios || [])].sort(
      (a, b) => {
        // Sort by proxima_data or created_at
        const da = a.proxima_data || a.created_at;
        const db = b.proxima_data || b.created_at;
        return new Date(db).getTime() - new Date(da).getTime();
      }
    );
  }, [selectedPac]);

  const hoje = new Date().toISOString().split("T")[0];
  const respondidos = quizzes.filter((q) => q.data_resposta);
  const atrasados = quizzes.filter((q) => !q.data_resposta && q.proxima_data && q.proxima_data <= hoje);
  const agendados = quizzes.filter((q) => !q.data_resposta && q.proxima_data && q.proxima_data > hoje);

  // Evolution for scale questions
  function getEvolucao(qId: string) {
    const vals = respondidos
      .filter((q) => q.respostas && q.respostas[qId] !== undefined)
      .reverse()
      .map((q) => ({ data: q.data_resposta!, valor: Number(q.respostas![qId]) }));
    if (vals.length < 2) return null;
    const last = vals[vals.length - 1].valor;
    const prev = vals[vals.length - 2].valor;
    const diff = last - prev;
    return { diff, trend: diff > 0 ? "▲" : diff < 0 ? "▼" : "=", vals };
  }

  // Count stats
  const totalAtrasados = pacientes.reduce(
    (s, p) => s + (p.questionarios || []).filter((q) => !q.data_resposta && q.proxima_data && q.proxima_data <= new Date().toISOString().split("T")[0]).length, 0
  );
  const totalAgendados = pacientes.reduce(
    (s, p) => s + (p.questionarios || []).filter((q) => !q.data_resposta && q.proxima_data && q.proxima_data > new Date().toISOString().split("T")[0]).length, 0
  );
  const totalRespondidos = pacientes.reduce(
    (s, p) => s + (p.questionarios || []).filter((q) => q.data_resposta).length, 0
  );

  if (loading) {
    return (
      <div>
        <h1 className="text-xl font-bold text-text mb-6">Questionários</h1>
        <div className="bg-surface border border-border rounded-xl p-6 text-text2 text-sm">Carregando...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-text">Questionários</h1>
        <button onClick={gerarQuestionarios} className="bg-accent hover:bg-[#172e8a] text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
          Gerar Pendentes
        </button>
      </div>

      {/* Info */}
      <div className="bg-accent/5 border border-accent/20 rounded-lg p-3 mb-4 text-xs text-text2">
        📋 Questionários são gerados automaticamente a cada 15 dias a partir da data da consulta (D+15, D+30, D+45...). Clique em "Gerar Pendentes" para criar os próximos 30 dias.
      </div>

      {/* Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-surface border border-danger/20 rounded-xl p-5 shadow-sm">
          <p className="text-[11px] font-semibold text-text2 uppercase tracking-wider">Atrasados</p>
          <p className="text-[28px] font-bold text-danger mt-1">{totalAtrasados}</p>
        </div>
        <div className="bg-surface border border-accent/20 rounded-xl p-5 shadow-sm">
          <p className="text-[11px] font-semibold text-text2 uppercase tracking-wider">Agendados</p>
          <p className="text-[28px] font-bold text-accent mt-1">{totalAgendados}</p>
        </div>
        <div className="bg-surface border border-accent2/20 rounded-xl p-5 shadow-sm">
          <p className="text-[11px] font-semibold text-text2 uppercase tracking-wider">Respondidos</p>
          <p className="text-[28px] font-bold text-accent2 mt-1">{totalRespondidos}</p>
        </div>
        <div className="bg-surface border border-border rounded-xl p-5 shadow-sm">
          <p className="text-[11px] font-semibold text-text2 uppercase tracking-wider">Pacientes</p>
          <p className="text-[28px] font-bold text-text mt-1">{pacientes.length}</p>
        </div>
      </div>

      {/* Patient list */}
      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-4">
        <div className="bg-surface border border-border rounded-xl p-4">
          <h2 className="text-xs font-semibold text-text2 uppercase tracking-wider mb-3">Pacientes</h2>
          <div className="flex flex-col gap-1">
            {pacientes.map((p) => {
              const hojeStr = new Date().toISOString().split("T")[0];
              const atr = (p.questionarios || []).filter((q) => !q.data_resposta && q.proxima_data && q.proxima_data <= hojeStr).length;
              const resp = (p.questionarios || []).filter((q) => q.data_resposta).length;
              return (
                <div
                  key={p.id}
                  onClick={() => setSelectedPaciente(p.id)}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-all ${
                    selectedPaciente === p.id ? "bg-accent text-white" : "hover:bg-surface2 text-text2"
                  }`}
                >
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-medium truncate">{p.nome}</span>
                    {p.data_consulta && (
                      <span className={`text-[10px] ${selectedPaciente === p.id ? "text-white/70" : "text-text3"}`}>
                        Consulta: {fmtData(p.data_consulta)}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {atr > 0 && (
                      <span className="inline-flex px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-danger/20 text-danger">{atr}</span>
                    )}
                    <span className="inline-flex px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-accent2/20 text-accent2">{resp}</span>
                  </div>
                </div>
              );
            })}
            {pacientes.length === 0 && <p className="text-text3 text-xs">Nenhum paciente.</p>}
          </div>
        </div>

        {/* Quiz detail */}
        <div className="bg-surface border border-border rounded-xl p-5">
          {!selectedPac ? (
            <div className="text-center py-8 text-text3 text-sm">Selecione um paciente para ver os questionários.</div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-text">{selectedPac.nome}</h2>
                {selectedPac.data_consulta && (
                  <span className="text-xs text-text3">Consulta: {fmtData(selectedPac.data_consulta)}</span>
                )}
              </div>

              {/* Atrasados banner */}
              {atrasados.length > 0 && (
                <div className="bg-danger/10 border border-danger/20 rounded-lg p-3 mb-4">
                  <p className="text-danger text-sm font-semibold">⚠ {atrasados.length} questionário(s) atrasado(s)</p>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {atrasados.map((q) => (
                      <span key={q.id} className="text-[10px] text-text3 bg-bg border border-border rounded px-1.5 py-0.5">
                        {q.proxima_data ? fmtData(q.proxima_data) : "Sem data"}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Agendados info */}
              {agendados.length > 0 && (
                <div className="bg-accent/5 border border-accent/20 rounded-lg p-3 mb-4">
                  <p className="text-accent text-sm font-semibold">📅 {agendados.length} questionário(s) agendado(s)</p>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {agendados.map((q) => (
                      <span key={q.id} className="text-[10px] text-text3 bg-bg border border-border rounded px-1.5 py-0.5">
                        {q.proxima_data ? fmtData(q.proxima_data) : "Sem data"}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Evolution cards for scale questions */}
              {respondidos.length >= 2 && (
                <div className="mb-4">
                  <h3 className="text-xs font-semibold text-text2 uppercase tracking-wider mb-2">Evolução</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {PERGUNTAS.filter((p) => p.tipo === "escala").map((p) => {
                      const evo = getEvolucao(p.id);
                      if (!evo) return null;
                      return (
                        <div key={p.id} className="bg-bg border border-border rounded-lg p-2.5 text-center">
                          <p className="text-[10px] text-text3 uppercase font-semibold truncate">{p.texto.replace("Aderência ao plano alimentar", "Aderência").replace("Nível de energia no dia a dia", "Energia").replace("Intensidade dos treinos", "Intensidade")}</p>
                          <p className={`text-lg font-bold mt-0.5 ${evo.diff > 0 ? "text-accent2" : evo.diff < 0 ? "text-danger" : "text-text3"}`}>
                            {evo.trend} {Math.abs(evo.diff).toFixed(1)}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Response history */}
              <h3 className="text-xs font-semibold text-text2 uppercase tracking-wider mb-2">Histórico</h3>
              {quizzes.length === 0 ? (
                <p className="text-text3 text-sm">Nenhum questionário registrado.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {quizzes.map((q) => (
                    <div key={q.id} className="bg-bg border border-border rounded-lg overflow-hidden">
                      <div
                        className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-surface2 transition-colors"
                        onClick={() => setExpanded(expanded === q.id ? null : q.id)}
                      >
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${q.data_resposta ? "bg-accent2/20 text-accent2" : "bg-warn/20 text-warn"}`}>
                            {q.data_resposta ? "Respondido" : "Pendente"}
                          </span>
                          <span className="text-sm text-text">
                            {q.proxima_data ? `D+${getDaysSince(selectedPac.data_consulta, q.proxima_data)}` : ""}
                            {q.proxima_data && ` · ${fmtData(q.proxima_data)}`}
                          </span>
                          {q.data_resposta && (
                            <span className="text-[10px] text-text3">
                              resp. {fmtData(q.data_resposta)}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={(e) => { e.stopPropagation(); openEditQuiz(q); }}
                            className="bg-surface2 hover:bg-border text-text text-[10px] px-1.5 py-1 rounded border border-border transition-colors"
                            title="Editar"
                          >✏️</button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteQuiz(q.id); }}
                            className="bg-surface2 hover:bg-border text-danger text-[10px] px-1.5 py-1 rounded border border-border transition-colors"
                            title="Excluir"
                          >🗑️</button>
                          <span className="text-text3 text-sm">{expanded === q.id ? "▲" : "▼"}</span>
                        </div>
                      </div>

                      {expanded === q.id && q.respostas && (
                        <div className="px-4 pb-4 border-t border-border pt-3">
                          {BLOCOS.map((bloco) => (
                            <div key={bloco} className="mb-3 last:mb-0">
                              <p className="text-[10px] font-semibold text-accent uppercase tracking-wider mb-1.5">{bloco}</p>
                              {PERGUNTAS.filter((p) => p.bloco === bloco).map((p) => {
                                const val = q.respostas![p.id];
                                if (val === undefined) return null;
                                return (
                                  <div key={p.id} className="flex justify-between py-1 border-b border-border/50 last:border-0">
                                    <span className="text-xs text-text2">{p.texto}</span>
                                    <span className="text-xs font-semibold text-text shrink-0 ml-2">
                                      {p.tipo === "escala" ? `${val}/5` : val}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          ))}
                        </div>
                      )}

                      {expanded === q.id && !q.respostas && (
                        <div className="px-4 pb-4 border-t border-border pt-3 text-text3 text-xs">
                          Aguardando resposta do paciente.
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Edit Quiz Modal */}
      <Modal open={editModalOpen} onClose={() => setEditModalOpen(false)} title="Editar Questionário" footer={
        <>
          <button type="button" onClick={() => setEditModalOpen(false)} className="bg-surface2 hover:bg-border text-text text-sm font-semibold px-4 py-2 rounded-lg border border-border transition-colors">Cancelar</button>
          <button onClick={handleSaveEdit} className="bg-accent hover:bg-[#172e8a] text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">Salvar</button>
        </>
      }>
        <div className="flex flex-col gap-4 max-h-[60vh] overflow-y-auto">
          {BLOCOS.map((bloco) => (
            <div key={bloco}>
              <p className="text-[11px] font-semibold text-accent uppercase tracking-wider mb-2">{bloco}</p>
              {PERGUNTAS.filter((p) => p.bloco === bloco).map((p) => (
                <div key={p.id} className="mb-3">
                  <label className="block text-xs text-text2 mb-1">{p.texto}</label>
                  {p.tipo === "escala" ? (
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-text3">{p.minLabel}</span>
                      <input
                        type="range"
                        min={p.min} max={p.max}
                        value={editRespostas[p.id] ?? p.min ?? 1}
                        onChange={(e) => setEditRespostas({ ...editRespostas, [p.id]: Number(e.target.value) })}
                        className="flex-1 accent-accent"
                      />
                      <span className="text-[10px] text-text3">{p.maxLabel}</span>
                      <span className="text-xs font-bold text-accent w-6 text-center">{editRespostas[p.id] ?? "-"}</span>
                    </div>
                  ) : p.tipo === "opcao" ? (
                    <select
                      value={editRespostas[p.id] ?? ""}
                      onChange={(e) => setEditRespostas({ ...editRespostas, [p.id]: e.target.value })}
                      className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-text text-sm focus:border-accent focus:outline-none transition-colors"
                    >
                      <option value="">Selecione...</option>
                      {p.opcoes?.map((op) => (
                        <option key={op} value={op}>{op}</option>
                      ))}
                    </select>
                  ) : (
                    <textarea
                      value={(editRespostas[p.id] as string) ?? ""}
                      onChange={(e) => setEditRespostas({ ...editRespostas, [p.id]: e.target.value })}
                      rows={2}
                      className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-text text-sm focus:border-accent focus:outline-none transition-colors resize-y"
                    />
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
}

function getDaysSince(dataConsulta: string | null, dataAlvo: string): number {
  if (!dataConsulta) return 0;
  const d1 = new Date(dataConsulta + "T12:00:00");
  const d2 = new Date(dataAlvo + "T12:00:00");
  return Math.round((d2.getTime() - d1.getTime()) / 86400000);
}
