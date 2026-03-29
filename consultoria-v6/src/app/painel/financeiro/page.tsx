"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import Modal from "@/components/Modal";
import type { Recebimento, Paciente } from "@/lib/types";

const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

const CORES_PLANO: Record<string, string> = {
  avulsa: "#6b7280",
  trimestral: "#1e40af",
  semestral: "#059669",
  anual: "#7c3aed",
};

function fmtMoeda(v: number) {
  return `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
}

function fmtData(d: string) {
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

export default function FinanceiroPage() {
  const supabase = createClient();
  const [recebimentos, setRecebimentos] = useState<(Recebimento & { paciente?: Paciente })[]>([]);
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [planos, setPlanos] = useState<string[]>([]);
  const [anoFiltro, setAnoFiltro] = useState(String(new Date().getFullYear()));
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Form
  const [pacienteId, setPacienteId] = useState("");
  const [valor, setValor] = useState("");
  const [data, setData] = useState("");
  const [plano, setPlano] = useState("");
  const [status, setStatus] = useState<"pago" | "pendente">("pago");
  const [forma, setForma] = useState<"pix" | "cartao" | "dinheiro">("pix");

  const loadData = useCallback(async () => {
    const [{ data: recs }, { data: pacs }, { data: protos }] = await Promise.all([
      supabase
        .from("recebimentos")
        .select("*, paciente:pacientes(id, nome)")
        .order("data", { ascending: false }),
      supabase.from("pacientes").select("*").order("nome"),
      supabase.from("protocolos").select("nome").order("nome"),
    ]);
    if (recs) setRecebimentos(recs);
    if (pacs) setPacientes(pacs);
    if (protos) setPlanos(protos.map((p) => p.nome));
  }, [supabase]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Calculations
  const mesAtual = new Date().toISOString().slice(0, 7);

  const total = useMemo(
    () => recebimentos.filter((r) => r.status === "pago").reduce((s, r) => s + Number(r.valor), 0),
    [recebimentos]
  );

  const totalMes = useMemo(
    () =>
      recebimentos
        .filter((r) => r.data?.startsWith(mesAtual) && r.status === "pago")
        .reduce((s, r) => s + Number(r.valor), 0),
    [recebimentos, mesAtual]
  );

  const pendente = useMemo(
    () => recebimentos.filter((r) => r.status === "pendente").reduce((s, r) => s + Number(r.valor), 0),
    [recebimentos]
  );

  // Years available
  const anos = useMemo(() => {
    const set = new Set(recebimentos.map((r) => r.data?.slice(0, 4)).filter(Boolean));
    set.add(String(new Date().getFullYear()));
    return [...set].sort().reverse();
  }, [recebimentos]);

  // Monthly chart data
  const monthlyData = useMemo(() => {
    const recAno = recebimentos.filter((r) => r.data?.startsWith(anoFiltro));
    return MESES.map((label, i) => {
      const mm = String(i + 1).padStart(2, "0");
      const pago = recAno
        .filter((r) => r.data?.slice(5, 7) === mm && r.status === "pago")
        .reduce((s, r) => s + Number(r.valor), 0);
      const pend = recAno
        .filter((r) => r.data?.slice(5, 7) === mm && r.status === "pendente")
        .reduce((s, r) => s + Number(r.valor), 0);
      return { label, pago, pend };
    });
  }, [recebimentos, anoFiltro]);

  const maxMes = useMemo(
    () => Math.max(...monthlyData.map((m) => m.pago), 1),
    [monthlyData]
  );

  // Revenue by plan
  const revByPlan = useMemo(() => {
    const totalGeral = recebimentos
      .filter((r) => r.status === "pago")
      .reduce((s, r) => s + Number(r.valor), 0) || 1;

    const allPlanos = [...new Set(recebimentos.map((r) => r.plano).filter(Boolean))] as string[];
    return allPlanos.map((pl) => {
      const val = recebimentos
        .filter((r) => r.plano === pl && r.status === "pago")
        .reduce((s, r) => s + Number(r.valor), 0);
      return { plano: pl, valor: val, pct: Math.round((val / totalGeral) * 100) };
    }).sort((a, b) => b.valor - a.valor);
  }, [recebimentos]);

  function resetForm() {
    setPacienteId("");
    setValor("");
    setData(new Date().toISOString().split("T")[0]);
    setPlano("");
    setStatus("pago");
    setForma("pix");
    setEditId(null);
    setError("");
  }

  function openNew() {
    resetForm();
    setData(new Date().toISOString().split("T")[0]);
    setModalOpen(true);
  }

  function openEdit(r: Recebimento) {
    setEditId(r.id);
    setPacienteId(r.paciente_id);
    setValor(String(r.valor));
    setData(r.data);
    setPlano(r.plano || "");
    setStatus(r.status as "pago" | "pendente");
    setForma((r.forma as "pix" | "cartao" | "dinheiro") || "pix");
    setError("");
    setModalOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!pacienteId || !valor) {
      setError("Preencha paciente e valor.");
      return;
    }
    setLoading(true);
    setError("");

    const { data: { user } } = await supabase.auth.getUser();

    // Parse valor: aceita "2500.20", "2500,20", "2.500,20"
    const valorLimpo = valor.replace(/\./g, "").replace(",", ".");
    const valorNum = parseFloat(valorLimpo);
    if (isNaN(valorNum) || valorNum <= 0) {
      setError("Valor inválido. Use formato: 2500,20 ou 2500.20");
      setLoading(false);
      return;
    }

    const payload = {
      profissional_id: user!.id,
      paciente_id: pacienteId,
      valor: valorNum,
      data: data || new Date().toISOString().split("T")[0],
      plano: plano || null,
      status,
      forma,
    };

    if (editId) {
      const { error: err } = await supabase.from("recebimentos").update(payload).eq("id", editId);
      if (err) { setError(err.message); setLoading(false); return; }
    } else {
      const { error: err } = await supabase.from("recebimentos").insert(payload);
      if (err) { setError(err.message); setLoading(false); return; }
    }

    setModalOpen(false);
    resetForm();
    setLoading(false);
    loadData();
  }

  async function handleDelete(id: string, nome: string) {
    if (!confirm(`Excluir recebimento de ${nome}?`)) return;
    await supabase.from("recebimentos").delete().eq("id", id);
    loadData();
  }

  const currentMonth = new Date().getMonth();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-text">Financeiro</h1>
        <button onClick={openNew} className="bg-accent hover:bg-[#172e8a] text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
          + Novo Recebimento
        </button>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <div className="bg-surface border border-accent2/20 rounded-xl p-5 shadow-sm">
          <p className="text-[11px] font-semibold text-text2 uppercase tracking-wider">Receita Total</p>
          <p className="text-[28px] font-bold text-accent2 mt-1">{fmtMoeda(total)}</p>
          <p className="text-[11px] text-text3">todos os registros</p>
        </div>
        <div className="bg-surface border border-accent/20 rounded-xl p-5 shadow-sm">
          <p className="text-[11px] font-semibold text-text2 uppercase tracking-wider">Este Mês</p>
          <p className="text-[28px] font-bold text-accent mt-1">{fmtMoeda(totalMes)}</p>
          <p className="text-[11px] text-text3">{MESES[new Date().getMonth()]}</p>
        </div>
        <div className="bg-surface border border-border rounded-xl p-5 shadow-sm">
          <p className="text-[11px] font-semibold text-text2 uppercase tracking-wider">Recebimentos</p>
          <p className="text-[28px] font-bold text-text mt-1">{recebimentos.length}</p>
          <p className="text-[11px] text-text3">registros totais</p>
        </div>
      </div>

      {/* Chart + Plan breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Monthly chart */}
        <div className="bg-surface border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-text">Faturamento por Mês</h2>
            <select
              value={anoFiltro}
              onChange={(e) => setAnoFiltro(e.target.value)}
              className="px-2 py-1 bg-bg border border-border rounded text-text text-xs focus:border-accent focus:outline-none"
            >
              {anos.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            {monthlyData.map((m, i) => {
              const pct = maxMes > 0 ? Math.round((m.pago / maxMes) * 100) : 0;
              const isAtual = i === currentMonth && anoFiltro === String(new Date().getFullYear());
              return (
                <div
                  key={m.label}
                  className={`flex items-center gap-2 ${isAtual ? "bg-surface2 px-2 py-1 rounded -mx-2" : "py-0.5"}`}
                >
                  <span className={`text-[11px] w-7 ${isAtual ? "font-semibold text-text" : "text-text2"}`}>
                    {m.label}
                  </span>
                  <div className="flex-1 h-1 bg-surface2 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-accent rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-[11px] text-text2 whitespace-nowrap w-24 text-right">
                    {m.pago > 0 ? fmtMoeda(m.pago) : "-"}
                    {m.pend > 0 && (
                      <span className="text-warn text-[9px]"> +{fmtMoeda(m.pend)}</span>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Revenue by plan */}
        <div className="bg-surface border border-border rounded-xl p-5">
          <h2 className="text-sm font-bold text-text mb-4">Receita por Plano</h2>
          {revByPlan.length === 0 ? (
            <p className="text-text3 text-sm">Nenhum recebimento registrado.</p>
          ) : (
            <div className="flex flex-col gap-4">
              {revByPlan.map((rp) => (
                <div key={rp.plano}>
                  <div className="flex justify-between mb-1">
                    <span className="text-[13px] text-text capitalize">{rp.plano}</span>
                    <span className="text-[13px] text-text2">
                      {fmtMoeda(rp.valor)}{" "}
                      <span className="text-text3">{rp.pct}%</span>
                    </span>
                  </div>
                  <div className="h-2 bg-surface2 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${rp.pct}%`,
                        backgroundColor: CORES_PLANO[rp.plano] || "var(--color-accent)",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Last receipts */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-sm font-bold text-text">Últimos Recebimentos</h2>
        </div>

        {recebimentos.length === 0 ? (
          <div className="px-5 py-8 text-center text-text3 text-sm">
            Nenhum recebimento registrado.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {recebimentos.slice(0, 15).map((r) => (
              <div key={r.id} className="px-5 py-3 flex items-center gap-3 hover:bg-surface2 transition-colors">
                <div
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: r.status === "pago" ? "var(--color-accent2)" : "var(--color-warn)" }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-text truncate">
                    {(r.paciente as Paciente | undefined)?.nome || "—"}
                  </p>
                  <p className="text-xs text-text3 capitalize">
                    {r.plano || "-"} · {r.forma || "-"} · {fmtData(r.data)}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-right">
                    <p className="text-sm font-semibold text-text">{fmtMoeda(Number(r.valor))}</p>
                    <p className={`text-[11px] ${r.status === "pago" ? "text-accent2" : "text-warn"}`}>{r.status}</p>
                  </div>
                  <button
                    onClick={() => openEdit(r)}
                    className="bg-surface2 hover:bg-border text-text text-xs px-2 py-1.5 rounded-lg border border-border transition-colors"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => handleDelete(r.id, (r.paciente as Paciente | undefined)?.nome || "")}
                    className="bg-surface2 hover:bg-border text-danger text-xs px-2 py-1.5 rounded-lg border border-border transition-colors"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editId ? "Editar Recebimento" : "Registrar Recebimento"}
        footer={
          <>
            <button type="button" onClick={() => setModalOpen(false)} className="bg-surface2 hover:bg-border text-text text-sm font-semibold px-4 py-2 rounded-lg border border-border transition-colors">
              Cancelar
            </button>
            <button type="submit" form="recebimento-form" disabled={loading} className="bg-accent hover:bg-[#172e8a] text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors disabled:opacity-50">
              {loading ? "Salvando..." : "Salvar"}
            </button>
          </>
        }
      >
        <form id="recebimento-form" onSubmit={handleSave} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-semibold text-text2 uppercase tracking-wider mb-1.5">Paciente *</label>
            <select
              value={pacienteId}
              onChange={(e) => {
                setPacienteId(e.target.value);
                const pac = pacientes.find((p) => p.id === e.target.value);
                if (pac?.plano) setPlano(pac.plano);
              }}
              required
              className="w-full px-3 py-2.5 bg-bg border border-border rounded-lg text-text text-sm focus:border-accent focus:outline-none transition-colors"
            >
              <option value="">Selecione...</option>
              {pacientes.map((p) => (
                <option key={p.id} value={p.id}>{p.nome}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-text2 uppercase tracking-wider mb-1.5">Valor (R$) *</label>
              <input
                type="text"
                inputMode="decimal"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                required
                placeholder="2500,20"
                className="w-full px-3 py-2.5 bg-bg border border-border rounded-lg text-text text-sm focus:border-accent focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-text2 uppercase tracking-wider mb-1.5">Data</label>
              <input
                type="date"
                value={data}
                onChange={(e) => setData(e.target.value)}
                className="w-full px-3 py-2.5 bg-bg border border-border rounded-lg text-text text-sm focus:border-accent focus:outline-none transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-text2 uppercase tracking-wider mb-1.5">Plano</label>
              <select
                value={plano}
                onChange={(e) => setPlano(e.target.value)}
                className="w-full px-3 py-2.5 bg-bg border border-border rounded-lg text-text text-sm focus:border-accent focus:outline-none transition-colors"
              >
                <option value="">Selecione...</option>
                {planos.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-text2 uppercase tracking-wider mb-1.5">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as "pago" | "pendente")}
                className="w-full px-3 py-2.5 bg-bg border border-border rounded-lg text-text text-sm focus:border-accent focus:outline-none transition-colors"
              >
                <option value="pago">Pago</option>
                <option value="pendente">Pendente</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-text2 uppercase tracking-wider mb-1.5">Forma de Pagamento</label>
            <select
              value={forma}
              onChange={(e) => setForma(e.target.value as "pix" | "cartao" | "dinheiro")}
              className="w-full px-3 py-2.5 bg-bg border border-border rounded-lg text-text text-sm focus:border-accent focus:outline-none transition-colors"
            >
              <option value="pix">PIX</option>
              <option value="cartao">Cartão</option>
              <option value="dinheiro">Dinheiro</option>
            </select>
          </div>

          {error && (
            <p className="text-danger text-sm bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">{error}</p>
          )}
        </form>
      </Modal>
    </div>
  );
}
