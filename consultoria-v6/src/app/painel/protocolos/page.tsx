"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import Modal from "@/components/Modal";
import type { Protocolo, ProtocoloStep } from "@/lib/types";

export default function ProtocolosPage() {
  const supabase = createClient();
  const [protocolos, setProtocolos] = useState<Protocolo[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Form
  const [nome, setNome] = useState("");
  const [steps, setSteps] = useState<ProtocoloStep[]>([
    { dias: 7, tipo: "mensagem" },
  ]);

  const loadProtocolos = useCallback(async () => {
    const { data } = await supabase
      .from("protocolos")
      .select("*")
      .order("created_at", { ascending: true });
    if (data) setProtocolos(data as Protocolo[]);
  }, [supabase]);

  useEffect(() => {
    loadProtocolos();
  }, [loadProtocolos]);

  function resetForm() {
    setNome("");
    setSteps([{ dias: 7, tipo: "mensagem" }]);
    setEditId(null);
    setError("");
  }

  function openNew() {
    resetForm();
    setModalOpen(true);
  }

  function openEdit(p: Protocolo) {
    setEditId(p.id);
    setNome(p.nome);
    setSteps(p.steps && p.steps.length > 0 ? p.steps : [{ dias: 7, tipo: "mensagem" }]);
    setError("");
    setModalOpen(true);
  }

  function addStep() {
    const lastDias = steps.length > 0 ? steps[steps.length - 1].dias : 0;
    setSteps([...steps, { dias: lastDias + 15, tipo: "mensagem" }]);
  }

  function removeStep(idx: number) {
    setSteps(steps.filter((_, i) => i !== idx));
  }

  function updateStep(idx: number, field: keyof ProtocoloStep, value: string | number) {
    const updated = [...steps];
    if (field === "dias") {
      updated[idx] = { ...updated[idx], dias: Number(value) };
    } else {
      updated[idx] = { ...updated[idx], tipo: value as string };
    }
    setSteps(updated);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim()) {
      setError("Preencha o nome do protocolo.");
      return;
    }
    if (steps.length === 0) {
      setError("Adicione pelo menos um ponto de contato.");
      return;
    }
    setLoading(true);
    setError("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const sortedSteps = [...steps].sort((a, b) => a.dias - b.dias);

    const payload = {
      profissional_id: user!.id,
      nome: nome.trim(),
      steps: sortedSteps,
    };

    if (editId) {
      const { error: err } = await supabase
        .from("protocolos")
        .update(payload)
        .eq("id", editId);
      if (err) {
        setError(err.message);
        setLoading(false);
        return;
      }
    } else {
      const { error: err } = await supabase.from("protocolos").insert(payload);
      if (err) {
        setError(err.message);
        setLoading(false);
        return;
      }
    }

    setModalOpen(false);
    resetForm();
    setLoading(false);
    loadProtocolos();
  }

  async function handleDelete(p: Protocolo) {
    if (!confirm(`Remover protocolo "${p.nome}"?`)) return;
    await supabase.from("protocolos").delete().eq("id", p.id);
    loadProtocolos();
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-text">Protocolos</h1>
          <p className="text-text3 text-xs mt-0.5">
            Protocolos de follow-up por plano
          </p>
        </div>
        <button
          onClick={openNew}
          className="bg-accent hover:bg-[#2563eb] text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          + Novo Protocolo
        </button>
      </div>

      {/* Protocols list */}
      <div className="flex flex-col gap-4">
        {protocolos.map((p) => (
          <div
            key={p.id}
            className="bg-surface border border-border rounded-xl p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold text-text capitalize">
                {p.nome}
              </h3>
              <div className="flex gap-1.5">
                <button
                  onClick={() => openEdit(p)}
                  className="bg-surface2 hover:bg-border text-text text-xs px-2.5 py-1.5 rounded-lg border border-border transition-colors"
                >
                  ✏️ Editar
                </button>
                <button
                  onClick={() => handleDelete(p)}
                  className="bg-surface2 hover:bg-border text-danger text-xs px-2.5 py-1.5 rounded-lg border border-border transition-colors"
                >
                  🗑️
                </button>
              </div>
            </div>

            {/* Steps timeline */}
            <div className="flex flex-wrap gap-2">
              {p.steps &&
                p.steps.map((step, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 bg-surface2 border border-border rounded-lg px-3 py-2"
                  >
                    <span className="w-7 h-7 rounded-full bg-accent/20 text-accent flex items-center justify-center text-[11px] font-bold font-mono">
                      {step.dias}
                    </span>
                    <div>
                      <p className="text-xs font-semibold text-text">
                        D+{step.dias}
                      </p>
                      <p className="text-[10px] text-text3 capitalize">
                        {step.tipo}
                      </p>
                    </div>
                  </div>
                ))}
              {(!p.steps || p.steps.length === 0) && (
                <p className="text-text3 text-xs">
                  Nenhum ponto de contato definido.
                </p>
              )}
            </div>
          </div>
        ))}

        {protocolos.length === 0 && (
          <div className="bg-surface border border-border rounded-xl p-8 text-center">
            <p className="text-text3 text-sm">Nenhum protocolo criado.</p>
            <p className="text-text3 text-xs mt-1">
              Crie protocolos para gerar follow-ups automáticos ao cadastrar
              pacientes.
            </p>
          </div>
        )}
      </div>

      {/* Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editId ? "Editar Protocolo" : "Novo Protocolo"}
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
              form="protocolo-form"
              disabled={loading}
              className="bg-accent hover:bg-[#2563eb] text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? "Salvando..." : "Salvar"}
            </button>
          </>
        }
      >
        <form
          id="protocolo-form"
          onSubmit={handleSave}
          className="flex flex-col gap-4"
        >
          <div>
            <label className="block text-xs font-semibold text-text2 uppercase tracking-wider mb-1.5">
              Nome do Protocolo *
            </label>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              required
              placeholder="Ex: avulsa, trimestral, semestral..."
              className="w-full px-3 py-2.5 bg-bg border border-border rounded-lg text-text text-sm focus:border-accent focus:outline-none transition-colors"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-text2 uppercase tracking-wider">
                Pontos de Contato
              </label>
              <button
                type="button"
                onClick={addStep}
                className="text-accent hover:text-accent/80 text-xs font-semibold transition-colors"
              >
                + Adicionar
              </button>
            </div>

            <div className="flex flex-col gap-2">
              {steps.map((step, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 bg-bg border border-border rounded-lg p-2.5"
                >
                  <div className="flex-1 flex items-center gap-2">
                    <span className="text-xs text-text3 whitespace-nowrap">
                      D+
                    </span>
                    <input
                      type="number"
                      min="1"
                      value={step.dias}
                      onChange={(e) =>
                        updateStep(i, "dias", e.target.value)
                      }
                      className="w-16 px-2 py-1.5 bg-surface border border-border rounded text-text text-sm text-center focus:border-accent focus:outline-none"
                    />
                    <select
                      value={step.tipo}
                      onChange={(e) =>
                        updateStep(i, "tipo", e.target.value)
                      }
                      className="flex-1 px-2 py-1.5 bg-surface border border-border rounded text-text text-sm focus:border-accent focus:outline-none"
                    >
                      <option value="mensagem">Mensagem</option>
                      <option value="nova consulta">Nova Consulta</option>
                      <option value="retorno">Retorno</option>
                      <option value="check-in">Check-in</option>
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeStep(i)}
                    className="text-danger hover:text-danger/70 text-sm transition-colors px-1"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
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
