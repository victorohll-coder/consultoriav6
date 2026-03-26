"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Followup, Paciente } from "@/lib/types";

const WA_SVG = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="#fff">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

function fmtData(d: string) {
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

function whatsappLink(tel: string) {
  const digits = tel.replace(/\D/g, "");
  const full = digits.length <= 11 ? `55${digits}` : digits;
  return `https://wa.me/${full}`;
}

function diffDays(dateStr: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + "T00:00:00");
  return Math.floor((target.getTime() - today.getTime()) / 86400000);
}

type FollowupWithPaciente = Followup & { paciente: Paciente };

interface EngajamentoItem {
  pacienteNome: string;
  tipo: "questionario" | "followup" | "medidas";
  detalhe: string;
}

export default function AlertasPage() {
  const supabase = createClient();
  const [followups, setFollowups] = useState<FollowupWithPaciente[]>([]);
  const [pacientesCount, setPacientesCount] = useState(0);
  const [quizPendentes, setQuizPendentes] = useState(0);
  const [engajamento, setEngajamento] = useState<EngajamentoItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);

    // Follow-ups não feitos com dados do paciente
    const { data: fups } = await supabase
      .from("followups")
      .select("*, paciente:pacientes(*)")
      .eq("feito", false)
      .order("data_alvo", { ascending: true });

    if (fups) setFollowups(fups as FollowupWithPaciente[]);

    // Total pacientes
    const { count } = await supabase
      .from("pacientes")
      .select("*", { count: "exact", head: true });
    setPacientesCount(count || 0);

    // Questionários pendentes (sem resposta)
    const { count: qCount } = await supabase
      .from("questionarios")
      .select("*", { count: "exact", head: true })
      .is("data_resposta", null);
    setQuizPendentes(qCount || 0);

    // === Dashboard de Engajamento ===
    const engItems: EngajamentoItem[] = [];

    // Pacientes com questionário pendente
    const hoje = new Date().toISOString().split("T")[0];
    const { data: questPend } = await supabase
      .from("questionarios")
      .select("paciente_id, proxima_data, pacientes(nome)")
      .is("data_resposta", null)
      .lte("proxima_data", hoje);

    if (questPend) {
      for (const q of questPend as unknown as { paciente_id: string; proxima_data: string; pacientes: { nome: string } }[]) {
        engItems.push({
          pacienteNome: q.pacientes?.nome || "Paciente",
          tipo: "questionario",
          detalhe: `Pendente desde ${fmtData(q.proxima_data)}`,
        });
      }
    }

    // Pacientes com follow-up atrasado
    if (fups) {
      for (const f of fups as FollowupWithPaciente[]) {
        if (diffDays(f.data_alvo) < 0) {
          engItems.push({
            pacienteNome: f.paciente?.nome || "Paciente",
            tipo: "followup",
            detalhe: `${f.tipo} atrasado ${Math.abs(diffDays(f.data_alvo))}d`,
          });
        }
      }
    }

    // Pacientes sem medidas há mais de 30 dias
    const { data: allPacientes } = await supabase
      .from("pacientes")
      .select("id, nome");

    if (allPacientes) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 30);
      const cutoffStr = cutoff.toISOString().split("T")[0];

      for (const pac of allPacientes) {
        const { data: lastMedida } = await supabase
          .from("medidas")
          .select("data")
          .eq("paciente_id", pac.id)
          .order("data", { ascending: false })
          .limit(1);

        if (!lastMedida || lastMedida.length === 0) {
          engItems.push({
            pacienteNome: pac.nome,
            tipo: "medidas",
            detalhe: "Nenhuma medida registrada",
          });
        } else if (lastMedida[0].data < cutoffStr) {
          const dias = diffDays(lastMedida[0].data);
          engItems.push({
            pacienteNome: pac.nome,
            tipo: "medidas",
            detalhe: `Última medida há ${Math.abs(dias)} dias`,
          });
        }
      }
    }

    setEngajamento(engItems);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function marcarFeito(id: string) {
    const hoje = new Date().toISOString().split("T")[0];
    await supabase
      .from("followups")
      .update({ feito: true, feito_em: hoje })
      .eq("id", id);
    loadData();
  }

  // Categorize
  const atrasados = followups.filter((f) => diffDays(f.data_alvo) < 0);
  const hoje = followups.filter((f) => diffDays(f.data_alvo) === 0);
  const proximos7 = followups.filter((f) => {
    const d = diffDays(f.data_alvo);
    return d >= 1 && d <= 7;
  });

  const cards = [
    {
      label: "Atrasados",
      value: atrasados.length,
      color: "text-danger",
      bg: "bg-danger/10 border-danger/20",
    },
    {
      label: "Hoje",
      value: hoje.length,
      color: "text-warn",
      bg: "bg-warn/10 border-warn/20",
    },
    {
      label: "Próximos 7 dias",
      value: proximos7.length,
      color: "text-accent",
      bg: "bg-accent/10 border-accent/20",
    },
    {
      label: "Pacientes ativos",
      value: pacientesCount,
      color: "text-accent2",
      bg: "bg-accent2/10 border-accent2/20",
    },
  ];

  // All pending sorted: overdue first, then today, then future
  const allPending = [...atrasados, ...hoje, ...proximos7, ...followups.filter((f) => diffDays(f.data_alvo) > 7)];
  // Remove duplicates (already included in categories)
  const seen = new Set<string>();
  const uniquePending = allPending.filter((f) => {
    if (seen.has(f.id)) return false;
    seen.add(f.id);
    return true;
  });

  function getStatusBadge(dataAlvo: string) {
    const d = diffDays(dataAlvo);
    if (d < 0)
      return (
        <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-danger/20 text-danger">
          {Math.abs(d)}d atrasado
        </span>
      );
    if (d === 0)
      return (
        <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-warn/20 text-warn animate-pulse">
          HOJE
        </span>
      );
    if (d <= 7)
      return (
        <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-accent/20 text-accent">
          em {d}d
        </span>
      );
    return (
      <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-surface2 text-text3">
        em {d}d
      </span>
    );
  }

  if (loading) {
    return (
      <div>
        <h1 className="text-xl font-bold text-text mb-6">Alertas</h1>
        <div className="bg-surface border border-border rounded-xl p-6 text-text2 text-sm">
          Carregando...
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-text mb-6">Alertas</h1>

      {/* Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {cards.map((c) => (
          <div
            key={c.label}
            className={`bg-surface border rounded-xl p-5 shadow-sm ${c.bg}`}
          >
            <p className="text-[11px] font-semibold text-text2 uppercase tracking-wider">
              {c.label}
            </p>
            <p className={`text-[28px] font-bold font-mono mt-1 ${c.color}`}>
              {c.value}
            </p>
          </div>
        ))}
      </div>

      {/* Quiz banner */}
      {quizPendentes > 0 && (
        <div className="bg-warn/10 border border-warn/20 rounded-xl p-4 mb-6 flex items-center justify-between">
          <div>
            <p className="text-warn text-sm font-semibold">
              {quizPendentes} questionário{quizPendentes > 1 ? "s" : ""}{" "}
              pendente{quizPendentes > 1 ? "s" : ""}
            </p>
            <p className="text-text3 text-xs mt-0.5">
              Pacientes que ainda não responderam o questionário quinzenal
            </p>
          </div>
          <a
            href="/painel/questionarios"
            className="bg-warn hover:bg-warn/80 text-black text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
          >
            Ver detalhes
          </a>
        </div>
      )}

      {/* Follow-ups list */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-sm font-bold text-text">Follow-ups pendentes</h2>
        </div>

        {uniquePending.length === 0 ? (
          <div className="px-5 py-8 text-center text-text3 text-sm">
            Nenhum follow-up pendente. Tudo em dia!
          </div>
        ) : (
          <div className="divide-y divide-border">
            {uniquePending.map((f) => (
              <div
                key={f.id}
                className="px-5 py-3.5 flex items-center gap-3 hover:bg-surface2 transition-colors"
              >
                {/* Patient info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-text truncate">
                      {f.paciente?.nome || "Paciente"}
                    </p>
                    {getStatusBadge(f.data_alvo)}
                  </div>
                  <p className="text-xs text-text3 mt-0.5">
                    <span className="capitalize">{f.tipo}</span>
                    {" · "}
                    D+{f.dias}
                    {" · "}
                    {fmtData(f.data_alvo)}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {f.paciente?.telefone && (
                    <a
                      href={whatsappLink(f.paciente.telefone)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-7 h-7 rounded-full bg-[#25d366] hover:bg-[#1ebe57] flex items-center justify-center transition-all hover:scale-110"
                      title="WhatsApp"
                    >
                      {WA_SVG}
                    </a>
                  )}
                  <button
                    onClick={() => marcarFeito(f.id)}
                    className="bg-accent2/20 hover:bg-accent2/30 text-accent2 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-colors"
                    title="Marcar como feito"
                  >
                    ✓ Feito
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Dashboard de Engajamento */}
      {engajamento.length > 0 && (
        <div className="bg-surface border border-border rounded-xl overflow-hidden mt-6">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-bold text-text">📊 Dashboard de Engajamento</h2>
            <span className="text-[10px] font-mono text-text3">{engajamento.length} alerta{engajamento.length > 1 ? "s" : ""}</span>
          </div>
          <div className="divide-y divide-border">
            {engajamento.map((item, i) => (
              <div key={i} className="px-5 py-3 flex items-center gap-3 hover:bg-surface2 transition-colors">
                <span className="text-base">
                  {item.tipo === "questionario" ? "📋" : item.tipo === "followup" ? "⏰" : "📏"}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-text truncate">{item.pacienteNome}</p>
                  <p className="text-xs text-text3">{item.detalhe}</p>
                </div>
                <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-full ${
                  item.tipo === "questionario"
                    ? "bg-warn/20 text-warn"
                    : item.tipo === "followup"
                      ? "bg-danger/20 text-danger"
                      : "bg-accent/20 text-accent"
                }`}>
                  {item.tipo === "questionario" ? "QUEST" : item.tipo === "followup" ? "FOLLOW" : "MEDIDA"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
