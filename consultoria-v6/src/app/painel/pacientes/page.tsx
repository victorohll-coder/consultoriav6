"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import Modal from "@/components/Modal";
import type { Paciente } from "@/lib/types";

const WA_SVG = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

function fmtData(d: string | null) {
  if (!d) return "-";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

function whatsappLink(tel: string) {
  const digits = tel.replace(/\D/g, "");
  const full = digits.length <= 11 ? `55${digits}` : digits;
  return `https://wa.me/${full}`;
}

export default function PacientesPage() {
  const supabase = createClient();
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [busca, setBusca] = useState("");
  const [filtroPlano, setFiltroPlano] = useState("todos");
  const [planos, setPlanos] = useState<string[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Form state
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [plano, setPlano] = useState("");
  const [dataConsulta, setDataConsulta] = useState("");
  const [valor, setValor] = useState("");
  const [observacoes, setObservacoes] = useState("");

  const loadPacientes = useCallback(async () => {
    const { data } = await supabase
      .from("pacientes")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setPacientes(data);
  }, [supabase]);

  const loadPlanos = useCallback(async () => {
    const { data } = await supabase
      .from("protocolos")
      .select("nome")
      .order("nome");
    if (data) {
      const nomes = data.map((p) => p.nome);
      setPlanos(nomes);
    }
  }, [supabase]);

  useEffect(() => {
    loadPacientes();
    loadPlanos();
  }, [loadPacientes, loadPlanos]);

  function resetForm() {
    setNome("");
    setEmail("");
    setTelefone("");
    setPlano("");
    setDataConsulta(new Date().toISOString().split("T")[0]);
    setValor("");
    setObservacoes("");
    setEditId(null);
    setError("");
  }

  function openNew() {
    resetForm();
    setDataConsulta(new Date().toISOString().split("T")[0]);
    setModalOpen(true);
  }

  function openEdit(p: Paciente) {
    setEditId(p.id);
    setNome(p.nome);
    setEmail(p.email || "");
    setTelefone(p.telefone || "");
    setPlano(p.plano || "");
    setDataConsulta(p.data_consulta || "");
    setValor(p.valor ? String(p.valor) : "");
    setObservacoes(p.observacoes || "");
    setError("");
    setModalOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim()) {
      setError("Preencha o nome.");
      return;
    }
    setLoading(true);
    setError("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const payload = {
      profissional_id: user!.id,
      nome: nome.trim(),
      email: email.toLowerCase().trim() || null,
      telefone: telefone.trim() || null,
      plano: plano || null,
      data_consulta: dataConsulta || null,
      valor: valor ? parseFloat(valor.replace(/\./g, "").replace(",", ".")) : 0,
      observacoes: observacoes.trim() || null,
    };

    if (editId) {
      const { error: err } = await supabase
        .from("pacientes")
        .update(payload)
        .eq("id", editId);
      if (err) {
        setError(err.message);
        setLoading(false);
        return;
      }
    } else {
      const { data: newPaciente, error: err } = await supabase
        .from("pacientes")
        .insert(payload)
        .select()
        .single();
      if (err) {
        setError(err.message);
        setLoading(false);
        return;
      }

      // Auto-generate follow-ups based on protocol (match by plan name, case-insensitive)
      if (newPaciente && plano && dataConsulta) {
        const { data: protocolo } = await supabase
          .from("protocolos")
          .select("steps")
          .ilike("nome", plano)
          .single();

        if (protocolo?.steps && Array.isArray(protocolo.steps)) {
          const followups = protocolo.steps.map(
            (step: { dias: number; tipo: string }) => {
              const dataAlvo = new Date(dataConsulta);
              dataAlvo.setDate(dataAlvo.getDate() + step.dias);
              return {
                paciente_id: newPaciente.id,
                profissional_id: user!.id,
                dias: step.dias,
                tipo: step.tipo,
                data_alvo: dataAlvo.toISOString().split("T")[0],
                feito: false,
              };
            }
          );

          if (followups.length > 0) {
            await supabase.from("followups").insert(followups);
          }
        }

        // Auto-generate questionarios D+15, D+30, D+45... until plan ends
        const planDaysMap: Record<string, number> = {
          avulsa: 30, mensal: 30, trimestral: 90, semestral: 180, anual: 365, vip: 365,
        };
        const planKey = plano.toLowerCase();
        const totalDias = Object.entries(planDaysMap).find(([k]) => planKey.includes(k))?.[1] || 365;

        const quizInserts = [];
        for (let dia = 15; dia <= totalDias; dia += 15) {
          const d = new Date(dataConsulta);
          d.setDate(d.getDate() + dia);
          quizInserts.push({
            paciente_id: newPaciente.id,
            data_resposta: null,
            proxima_data: d.toISOString().split("T")[0],
            respostas: null,
          });
        }
        if (quizInserts.length > 0) {
          await supabase.from("questionarios").insert(quizInserts);
        }
      }

      // Auto-create recebimento if valor > 0
      const valorNumReceb = valor ? parseFloat(valor.replace(/\./g, "").replace(",", ".")) : 0;
      if (newPaciente && valorNumReceb > 0) {
        await supabase.from("recebimentos").insert({
          paciente_id: newPaciente.id,
          profissional_id: user!.id,
          valor: valorNumReceb,
          data: dataConsulta || new Date().toISOString().split("T")[0],
          plano: plano || null,
          forma: null,
          status: "pago",
        });
      }
    }

    setModalOpen(false);
    resetForm();
    setLoading(false);
    loadPacientes();
  }

  async function handleDelete(p: Paciente) {
    if (!confirm(`Remover ${p.nome}?`)) return;
    await supabase.from("pacientes").delete().eq("id", p.id);
    loadPacientes();
  }

  // Filter
  const filtered = pacientes.filter((p) => {
    const matchBusca = p.nome.toLowerCase().includes(busca.toLowerCase());
    const matchPlano =
      filtroPlano === "todos" || p.plano === filtroPlano;
    return matchBusca && matchPlano;
  });

  // Unique plans from pacientes for filter tabs
  const planosUnicos = [
    ...new Set(pacientes.map((p) => p.plano).filter(Boolean)),
  ] as string[];

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-text">Pacientes</h1>
          <p className="text-text3 text-xs mt-0.5">
            Todos os pacientes e acompanhamentos
          </p>
        </div>
        <button
          onClick={openNew}
          className="bg-accent hover:bg-[#172e8a] text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          + Novo Paciente
        </button>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <input
          type="text"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar paciente..."
          className="flex-1 px-3 py-2 bg-surface border border-border rounded-lg text-text text-sm focus:border-accent focus:outline-none transition-colors"
        />
      </div>

      {/* Plan filter tabs */}
      {planosUnicos.length > 0 && (
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          <button
            onClick={() => setFiltroPlano("todos")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              filtroPlano === "todos"
                ? "bg-accent text-white"
                : "bg-surface2 text-text2 hover:bg-border"
            }`}
          >
            Todos
          </button>
          {planosUnicos.map((p) => (
            <button
              key={p}
              onClick={() => setFiltroPlano(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap capitalize ${
                filtroPlano === p
                  ? "bg-accent text-white"
                  : "bg-surface2 text-text2 hover:bg-border"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      )}

      {/* Table */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-text3 uppercase tracking-wider">
                  Paciente
                </th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-text3 uppercase tracking-wider hidden sm:table-cell">
                  Plano
                </th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-text3 uppercase tracking-wider hidden md:table-cell">
                  Consulta
                </th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-text3 uppercase tracking-wider hidden md:table-cell">
                  Valor
                </th>
                <th className="text-right px-4 py-3 text-[11px] font-semibold text-text3 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-border last:border-0 hover:bg-surface2 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div>
                        <p className="text-sm font-semibold text-text">
                          {p.nome}
                        </p>
                        <p className="text-xs text-text3">
                          {p.email || "-"}{" "}
                          {p.telefone && `· ${p.telefone}`}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    {p.plano ? (
                      <span className="inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-accent/15 text-accent capitalize">
                        {p.plano}
                      </span>
                    ) : (
                      <span className="text-text3 text-sm">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="text-sm text-text2">
                      {fmtData(p.data_consulta)}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="text-sm text-accent2 font-semibold">
                      {p.valor
                        ? `R$ ${Number(p.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
                        : "-"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1.5">
                      {p.telefone && (
                        <a
                          href={whatsappLink(p.telefone)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-8 h-8 rounded-full bg-[#25d366] hover:bg-[#1ebe57] flex items-center justify-center transition-all hover:scale-110"
                          title="WhatsApp"
                        >
                          {WA_SVG}
                        </a>
                      )}
                      <button
                        onClick={() => openEdit(p)}
                        className="bg-surface2 hover:bg-border text-text text-xs px-2 py-1.5 rounded-lg border border-border transition-colors"
                        title="Editar"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDelete(p)}
                        className="bg-surface2 hover:bg-border text-danger text-xs px-2 py-1.5 rounded-lg border border-border transition-colors"
                        title="Deletar"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-text3 text-sm"
                  >
                    {pacientes.length === 0
                      ? "Nenhum paciente cadastrado."
                      : "Nenhum resultado encontrado."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editId ? "Editar Paciente" : "Novo Paciente"}
        footer={
          <>
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="bg-surface2 hover:bg-border text-text text-sm font-semibold px-4 py-2 rounded-lg border border-border transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              form="paciente-form"
              disabled={loading}
              className="bg-accent hover:bg-[#172e8a] text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? "Salvando..." : "Salvar"}
            </button>
          </>
        }
      >
        <form
          id="paciente-form"
          onSubmit={handleSave}
          className="flex flex-col gap-4"
        >
          <div>
            <label className="block text-xs font-semibold text-text2 uppercase tracking-wider mb-1.5">
              Nome *
            </label>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              required
              placeholder="Nome completo"
              className="w-full px-3 py-2.5 bg-bg border border-border rounded-lg text-text text-sm focus:border-accent focus:outline-none transition-colors"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-text2 uppercase tracking-wider mb-1.5">
                E-mail
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="paciente@email.com"
                className="w-full px-3 py-2.5 bg-bg border border-border rounded-lg text-text text-sm focus:border-accent focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-text2 uppercase tracking-wider mb-1.5">
                Telefone (WhatsApp)
              </label>
              <input
                type="text"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                placeholder="(48) 99999-9999"
                className="w-full px-3 py-2.5 bg-bg border border-border rounded-lg text-text text-sm focus:border-accent focus:outline-none transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-text2 uppercase tracking-wider mb-1.5">
                Plano
              </label>
              <select
                value={plano}
                onChange={(e) => setPlano(e.target.value)}
                className="w-full px-3 py-2.5 bg-bg border border-border rounded-lg text-text text-sm focus:border-accent focus:outline-none transition-colors"
              >
                <option value="">Selecione...</option>
                {planos.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-text2 uppercase tracking-wider mb-1.5">
                Data da Consulta
              </label>
              <input
                type="date"
                value={dataConsulta}
                onChange={(e) => setDataConsulta(e.target.value)}
                className="w-full px-3 py-2.5 bg-bg border border-border rounded-lg text-text text-sm focus:border-accent focus:outline-none transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-text2 uppercase tracking-wider mb-1.5">
              Valor Pago
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              placeholder="2500,20"
              className="w-full px-3 py-2.5 bg-bg border border-border rounded-lg text-text text-sm focus:border-accent focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-text2 uppercase tracking-wider mb-1.5">
              Observações
            </label>
            <input
              type="text"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Objetivo, notas..."
              className="w-full px-3 py-2.5 bg-bg border border-border rounded-lg text-text text-sm focus:border-accent focus:outline-none transition-colors"
            />
          </div>

          {error && (
            <p className="text-danger text-sm bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
        </form>
      </Modal>
    </div>
  );
}
