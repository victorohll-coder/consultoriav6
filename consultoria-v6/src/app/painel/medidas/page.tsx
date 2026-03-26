"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import Modal from "@/components/Modal";
import type { Medida, Paciente } from "@/lib/types";

function fmtData(d: string) {
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

const CAMPOS: { key: keyof Medida; label: string; unit: string }[] = [
  { key: "peso", label: "Peso", unit: "kg" },
  { key: "gordura", label: "% Gordura", unit: "%" },
  { key: "abdominal", label: "Abdominal", unit: "cm" },
  { key: "cintura", label: "Cintura", unit: "cm" },
  { key: "quadril", label: "Quadril", unit: "cm" },
  { key: "braco", label: "Braco", unit: "cm" },
  { key: "coxa", label: "Coxa", unit: "cm" },
];

export default function MedidasPage() {
  const supabase = createClient();
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [selectedPaciente, setSelectedPaciente] = useState<string>("");
  const [medidas, setMedidas] = useState<Medida[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Form
  const [data, setData] = useState("");
  const [peso, setPeso] = useState("");
  const [gordura, setGordura] = useState("");
  const [abdominal, setAbdominal] = useState("");
  const [cintura, setCintura] = useState("");
  const [quadril, setQuadril] = useState("");
  const [braco, setBraco] = useState("");
  const [coxa, setCoxa] = useState("");

  const loadPacientes = useCallback(async () => {
    const { data } = await supabase.from("pacientes").select("*").order("nome");
    if (data) setPacientes(data);
  }, [supabase]);

  const loadMedidas = useCallback(async () => {
    if (!selectedPaciente) { setMedidas([]); return; }
    const { data } = await supabase
      .from("medidas")
      .select("*")
      .eq("paciente_id", selectedPaciente)
      .order("data", { ascending: true });
    if (data) setMedidas(data);
  }, [supabase, selectedPaciente]);

  useEffect(() => { loadPacientes(); }, [loadPacientes]);
  useEffect(() => { loadMedidas(); }, [loadMedidas]);

  function resetForm() {
    setData(new Date().toISOString().split("T")[0]);
    setPeso(""); setGordura(""); setAbdominal(""); setCintura("");
    setQuadril(""); setBraco(""); setCoxa("");
    setEditId(null); setError("");
  }

  function openNew() {
    if (!selectedPaciente) { alert("Selecione um paciente primeiro."); return; }
    resetForm();
    setModalOpen(true);
  }

  function openEdit(m: Medida) {
    setEditId(m.id);
    setData(m.data);
    setPeso(m.peso != null ? String(m.peso) : "");
    setGordura(m.gordura != null ? String(m.gordura) : "");
    setAbdominal(m.abdominal != null ? String(m.abdominal) : "");
    setCintura(m.cintura != null ? String(m.cintura) : "");
    setQuadril(m.quadril != null ? String(m.quadril) : "");
    setBraco(m.braco != null ? String(m.braco) : "");
    setCoxa(m.coxa != null ? String(m.coxa) : "");
    setError("");
    setModalOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!data) { setError("Preencha a data."); return; }
    setLoading(true); setError("");

    const payload = {
      paciente_id: selectedPaciente,
      data,
      peso: peso ? parseFloat(peso) : null,
      gordura: gordura ? parseFloat(gordura) : null,
      abdominal: abdominal ? parseFloat(abdominal) : null,
      cintura: cintura ? parseFloat(cintura) : null,
      quadril: quadril ? parseFloat(quadril) : null,
      braco: braco ? parseFloat(braco) : null,
      coxa: coxa ? parseFloat(coxa) : null,
    };

    if (editId) {
      const { error: err } = await supabase.from("medidas").update(payload).eq("id", editId);
      if (err) { setError(err.message); setLoading(false); return; }
    } else {
      const { error: err } = await supabase.from("medidas").insert(payload);
      if (err) { setError(err.message); setLoading(false); return; }
    }

    setModalOpen(false); resetForm(); setLoading(false);
    loadMedidas();
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir esta medida?")) return;
    await supabase.from("medidas").delete().eq("id", id);
    loadMedidas();
  }

  // Chart data: peso over time
  const pesoData = useMemo(() => medidas.filter((m) => m.peso != null), [medidas]);
  const pesoMin = useMemo(() => Math.min(...pesoData.map((m) => Number(m.peso))) - 2, [pesoData]);
  const pesoMax = useMemo(() => Math.max(...pesoData.map((m) => Number(m.peso))) + 2, [pesoData]);
  const pesoRange = pesoMax - pesoMin || 1;

  // Comparativo primeira vs ultima
  const primeira = medidas.length > 0 ? medidas[0] : null;
  const ultima = medidas.length > 1 ? medidas[medidas.length - 1] : null;

  const pacienteNome = pacientes.find((p) => p.id === selectedPaciente)?.nome || "";

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-xl font-bold text-text">Medidas</h1>
        <button onClick={openNew} className="bg-accent hover:bg-[#2563eb] text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
          + Nova Medida
        </button>
      </div>

      {/* Patient selector */}
      <div className="mb-6">
        <select
          value={selectedPaciente}
          onChange={(e) => setSelectedPaciente(e.target.value)}
          className="w-full sm:w-80 px-3 py-2.5 bg-surface border border-border rounded-lg text-text text-sm focus:border-accent focus:outline-none transition-colors"
        >
          <option value="">Selecione um paciente...</option>
          {pacientes.map((p) => (
            <option key={p.id} value={p.id}>{p.nome}</option>
          ))}
        </select>
      </div>

      {!selectedPaciente ? (
        <div className="bg-surface border border-border rounded-xl p-8 text-center text-text3 text-sm">
          Selecione um paciente para ver e lancar medidas.
        </div>
      ) : (
        <>
          {/* Weight chart */}
          {pesoData.length >= 2 && (
            <div className="bg-surface border border-border rounded-xl p-5 mb-6">
              <h2 className="text-sm font-bold text-text mb-4">Evolucao do Peso — {pacienteNome}</h2>
              <div className="flex items-end gap-1 h-40">
                {pesoData.map((m, i) => {
                  const val = Number(m.peso);
                  const pct = ((val - pesoMin) / pesoRange) * 100;
                  return (
                    <div key={m.id} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-[10px] font-mono text-accent font-semibold">{val}</span>
                      <div className="w-full flex items-end" style={{ height: "120px" }}>
                        <div
                          className="w-full bg-accent/30 rounded-t transition-all duration-500 hover:bg-accent/50"
                          style={{ height: `${Math.max(pct, 5)}%` }}
                        />
                      </div>
                      <span className="text-[9px] text-text3">{fmtData(m.data).slice(0, 5)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Comparativo */}
          {primeira && ultima && (
            <div className="bg-surface border border-border rounded-xl p-5 mb-6">
              <h2 className="text-sm font-bold text-text mb-4">Comparativo: Primeira vs Ultima</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {CAMPOS.map((c) => {
                  const v1 = Number(primeira[c.key]) || 0;
                  const v2 = Number(ultima[c.key]) || 0;
                  const diff = v2 - v1;
                  if (!v1 && !v2) return null;
                  return (
                    <div key={c.key} className="bg-bg border border-border rounded-lg p-3 text-center">
                      <p className="text-[10px] text-text3 uppercase font-semibold mb-1">{c.label}</p>
                      <p className="font-mono text-sm text-text">
                        {v1}{c.unit} → {v2}{c.unit}
                      </p>
                      <p className={`text-xs font-semibold mt-0.5 ${diff < 0 ? "text-accent2" : diff > 0 ? "text-danger" : "text-text3"}`}>
                        {diff > 0 ? "▲" : diff < 0 ? "▼" : "="} {Math.abs(diff).toFixed(1)}{c.unit}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Medidas table */}
          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <h2 className="text-sm font-bold text-text">Historico de Medidas</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-3 py-2.5 text-[10px] font-semibold text-text3 uppercase">Data</th>
                    {CAMPOS.map((c) => (
                      <th key={c.key} className="text-center px-3 py-2.5 text-[10px] font-semibold text-text3 uppercase">{c.label}</th>
                    ))}
                    <th className="text-right px-3 py-2.5 text-[10px] font-semibold text-text3 uppercase">Acoes</th>
                  </tr>
                </thead>
                <tbody>
                  {medidas.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-3 py-6 text-center text-text3 text-sm">Nenhuma medida lancada.</td>
                    </tr>
                  ) : (
                    [...medidas].reverse().map((m) => (
                      <tr key={m.id} className="border-b border-border last:border-0 hover:bg-surface2 transition-colors">
                        <td className="px-3 py-2.5 text-xs font-mono text-text2">{fmtData(m.data)}</td>
                        {CAMPOS.map((c) => (
                          <td key={c.key} className="px-3 py-2.5 text-center text-xs font-mono text-text">
                            {m[c.key] != null ? `${m[c.key]}` : "-"}
                          </td>
                        ))}
                        <td className="px-3 py-2.5 text-right">
                          <div className="flex justify-end gap-1">
                            <button onClick={() => openEdit(m)} className="bg-surface2 hover:bg-border text-text text-[10px] px-1.5 py-1 rounded border border-border transition-colors">✏️</button>
                            <button onClick={() => handleDelete(m.id)} className="bg-surface2 hover:bg-border text-danger text-[10px] px-1.5 py-1 rounded border border-border transition-colors">🗑️</button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editId ? "Editar Medida" : "Nova Medida"} footer={
        <>
          <button type="button" onClick={() => setModalOpen(false)} className="bg-surface2 hover:bg-border text-text text-sm font-semibold px-4 py-2 rounded-lg border border-border transition-colors">Cancelar</button>
          <button type="submit" form="medida-form" disabled={loading} className="bg-accent hover:bg-[#2563eb] text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors disabled:opacity-50">{loading ? "Salvando..." : "Salvar"}</button>
        </>
      }>
        <form id="medida-form" onSubmit={handleSave} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-semibold text-text2 uppercase tracking-wider mb-1.5">Data *</label>
            <input type="date" value={data} onChange={(e) => setData(e.target.value)} required className="w-full px-3 py-2.5 bg-bg border border-border rounded-lg text-text text-sm focus:border-accent focus:outline-none transition-colors" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-text2 uppercase tracking-wider mb-1.5">Peso (kg)</label>
              <input type="number" step="0.1" value={peso} onChange={(e) => setPeso(e.target.value)} placeholder="75.5" className="w-full px-3 py-2.5 bg-bg border border-border rounded-lg text-text text-sm focus:border-accent focus:outline-none transition-colors" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-text2 uppercase tracking-wider mb-1.5">% Gordura</label>
              <input type="number" step="0.1" value={gordura} onChange={(e) => setGordura(e.target.value)} placeholder="22.0" className="w-full px-3 py-2.5 bg-bg border border-border rounded-lg text-text text-sm focus:border-accent focus:outline-none transition-colors" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-text2 uppercase tracking-wider mb-1.5">Abdominal (cm)</label>
              <input type="number" step="0.1" value={abdominal} onChange={(e) => setAbdominal(e.target.value)} className="w-full px-3 py-2.5 bg-bg border border-border rounded-lg text-text text-sm focus:border-accent focus:outline-none transition-colors" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-text2 uppercase tracking-wider mb-1.5">Cintura (cm)</label>
              <input type="number" step="0.1" value={cintura} onChange={(e) => setCintura(e.target.value)} className="w-full px-3 py-2.5 bg-bg border border-border rounded-lg text-text text-sm focus:border-accent focus:outline-none transition-colors" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-text2 uppercase tracking-wider mb-1.5">Quadril (cm)</label>
              <input type="number" step="0.1" value={quadril} onChange={(e) => setQuadril(e.target.value)} className="w-full px-3 py-2.5 bg-bg border border-border rounded-lg text-text text-sm focus:border-accent focus:outline-none transition-colors" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-text2 uppercase tracking-wider mb-1.5">Braco (cm)</label>
              <input type="number" step="0.1" value={braco} onChange={(e) => setBraco(e.target.value)} className="w-full px-3 py-2.5 bg-bg border border-border rounded-lg text-text text-sm focus:border-accent focus:outline-none transition-colors" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-text2 uppercase tracking-wider mb-1.5">Coxa (cm)</label>
              <input type="number" step="0.1" value={coxa} onChange={(e) => setCoxa(e.target.value)} className="w-full px-3 py-2.5 bg-bg border border-border rounded-lg text-text text-sm focus:border-accent focus:outline-none transition-colors" />
            </div>
          </div>
          {error && <p className="text-danger text-sm bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">{error}</p>}
        </form>
      </Modal>
    </div>
  );
}
