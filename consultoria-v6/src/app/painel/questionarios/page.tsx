"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { PERGUNTAS, BLOCOS } from "@/lib/questionario";
import type { Questionario, Paciente } from "@/lib/types";

function fmtData(d: string) {
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
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

  // Generate pending quizzes (every 15 days)
  async function gerarQuestionarios() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const hoje = new Date();
    const hojeStr = hoje.toISOString().split("T")[0];
    let gerados = 0;

    for (const pac of pacientes) {
      const quizzes = pac.questionarios || [];
      const respondidos = quizzes.filter((q) => q.data_resposta);
      const pendentes = quizzes.filter((q) => !q.data_resposta);

      // Skip if already has a pending quiz
      if (pendentes.length > 0) continue;

      // Check last response date
      const lastResp = respondidos
        .map((q) => q.data_resposta!)
        .sort()
        .reverse()[0];

      let shouldGenerate = false;
      if (!lastResp) {
        // Never answered — generate if patient exists for 15+ days
        const created = new Date(pac.created_at);
        const diff = Math.floor((hoje.getTime() - created.getTime()) / 86400000);
        shouldGenerate = diff >= 15;
      } else {
        const last = new Date(lastResp);
        const diff = Math.floor((hoje.getTime() - last.getTime()) / 86400000);
        shouldGenerate = diff >= 15;
      }

      if (shouldGenerate) {
        const proxData = new Date(hoje);
        proxData.setDate(proxData.getDate() + 15);

        await supabase.from("questionarios").insert({
          paciente_id: pac.id,
          data_resposta: null,
          proxima_data: proxData.toISOString().split("T")[0],
          respostas: null,
        });
        gerados++;
      }
    }

    if (gerados > 0) {
      alert(`${gerados} questionario(s) gerado(s)!`);
      loadData();
    } else {
      alert("Nenhum questionario pendente para gerar.");
    }
  }

  const selectedPac = pacientes.find((p) => p.id === selectedPaciente);
  const quizzes = useMemo(() => {
    if (!selectedPac) return [];
    return [...(selectedPac.questionarios || [])].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [selectedPac]);

  const respondidos = quizzes.filter((q) => q.data_resposta);
  const pendentes = quizzes.filter((q) => !q.data_resposta);

  // Evolution for scale questions
  function getEvolucao(qId: string) {
    const vals = respondidos
      .filter((q) => q.respostas && q.respostas[qId] !== undefined)
      .reverse() // chronological
      .map((q) => ({ data: q.data_resposta!, valor: Number(q.respostas![qId]) }));
    if (vals.length < 2) return null;
    const last = vals[vals.length - 1].valor;
    const prev = vals[vals.length - 2].valor;
    const diff = last - prev;
    return { diff, trend: diff > 0 ? "▲" : diff < 0 ? "▼" : "=", vals };
  }

  // Count stats
  const totalPendentes = pacientes.reduce(
    (s, p) => s + (p.questionarios || []).filter((q) => !q.data_resposta).length, 0
  );
  const totalRespondidos = pacientes.reduce(
    (s, p) => s + (p.questionarios || []).filter((q) => q.data_resposta).length, 0
  );

  if (loading) {
    return (
      <div>
        <h1 className="text-xl font-bold text-text mb-6">Questionarios</h1>
        <div className="bg-surface border border-border rounded-xl p-6 text-text2 text-sm">Carregando...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-text">Questionarios</h1>
        <button onClick={gerarQuestionarios} className="bg-accent hover:bg-[#2563eb] text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
          Gerar Pendentes
        </button>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <div className="bg-surface border border-warn/20 rounded-xl p-5">
          <p className="text-[11px] font-semibold text-text2 uppercase tracking-wider">Pendentes</p>
          <p className="text-[28px] font-bold font-mono text-warn mt-1">{totalPendentes}</p>
        </div>
        <div className="bg-surface border border-accent2/20 rounded-xl p-5">
          <p className="text-[11px] font-semibold text-text2 uppercase tracking-wider">Respondidos</p>
          <p className="text-[28px] font-bold font-mono text-accent2 mt-1">{totalRespondidos}</p>
        </div>
        <div className="bg-surface border border-border rounded-xl p-5">
          <p className="text-[11px] font-semibold text-text2 uppercase tracking-wider">Pacientes</p>
          <p className="text-[28px] font-bold font-mono text-text mt-1">{pacientes.length}</p>
        </div>
      </div>

      {/* Patient list */}
      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-4">
        <div className="bg-surface border border-border rounded-xl p-4">
          <h2 className="text-xs font-semibold text-text2 uppercase tracking-wider mb-3">Pacientes</h2>
          <div className="flex flex-col gap-1">
            {pacientes.map((p) => {
              const pend = (p.questionarios || []).filter((q) => !q.data_resposta).length;
              const resp = (p.questionarios || []).filter((q) => q.data_resposta).length;
              return (
                <div
                  key={p.id}
                  onClick={() => setSelectedPaciente(p.id)}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-all ${
                    selectedPaciente === p.id ? "bg-accent text-white" : "hover:bg-surface2 text-text2"
                  }`}
                >
                  <span className="text-sm font-medium truncate">{p.nome}</span>
                  <div className="flex gap-1 shrink-0">
                    {pend > 0 && (
                      <span className="inline-flex px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-warn/20 text-warn">{pend}</span>
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
            <div className="text-center py-8 text-text3 text-sm">Selecione um paciente para ver os questionarios.</div>
          ) : (
            <>
              <h2 className="text-base font-bold text-text mb-4">{selectedPac.nome}</h2>

              {/* Pending banner */}
              {pendentes.length > 0 && (
                <div className="bg-warn/10 border border-warn/20 rounded-lg p-3 mb-4">
                  <p className="text-warn text-sm font-semibold">{pendentes.length} questionario(s) pendente(s)</p>
                  <p className="text-text3 text-xs mt-0.5">Aguardando resposta do paciente.</p>
                </div>
              )}

              {/* Evolution cards for scale questions */}
              {respondidos.length >= 2 && (
                <div className="mb-4">
                  <h3 className="text-xs font-semibold text-text2 uppercase tracking-wider mb-2">Evolucao</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {PERGUNTAS.filter((p) => p.tipo === "escala").map((p) => {
                      const evo = getEvolucao(p.id);
                      if (!evo) return null;
                      return (
                        <div key={p.id} className="bg-bg border border-border rounded-lg p-2.5 text-center">
                          <p className="text-[10px] text-text3 uppercase font-semibold truncate">{p.texto.replace("Aderencia ao plano alimentar", "Aderencia").replace("Nivel de energia no dia a dia", "Energia").replace("Intensidade dos treinos", "Intensidade")}</p>
                          <p className={`text-lg font-bold font-mono mt-0.5 ${evo.diff > 0 ? "text-accent2" : evo.diff < 0 ? "text-danger" : "text-text3"}`}>
                            {evo.trend} {Math.abs(evo.diff).toFixed(1)}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Response history */}
              <h3 className="text-xs font-semibold text-text2 uppercase tracking-wider mb-2">Historico</h3>
              {quizzes.length === 0 ? (
                <p className="text-text3 text-sm">Nenhum questionario registrado.</p>
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
                            {q.data_resposta ? fmtData(q.data_resposta) : "Aguardando"}
                          </span>
                        </div>
                        <span className="text-text3 text-sm">{expanded === q.id ? "▲" : "▼"}</span>
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
                                    <span className="text-xs font-mono font-semibold text-text shrink-0 ml-2">
                                      {p.tipo === "escala" ? `${val}/5` : val}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          ))}
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
    </div>
  );
}
