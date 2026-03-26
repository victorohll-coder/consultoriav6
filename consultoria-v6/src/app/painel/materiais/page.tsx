"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import Modal from "@/components/Modal";
import type { CategoriaMaterial, Material, Paciente } from "@/lib/types";

export default function MateriaisPage() {
  const supabase = createClient();
  const [categorias, setCategorias] = useState<CategoriaMaterial[]>([]);
  const [materiais, setMateriais] = useState<Material[]>([]);
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [selectedCat, setSelectedCat] = useState<string | null>(null);

  // Category modal
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [editCatId, setEditCatId] = useState<string | null>(null);
  const [catNome, setCatNome] = useState("");

  // Material modal
  const [matModalOpen, setMatModalOpen] = useState(false);
  const [editMatId, setEditMatId] = useState<string | null>(null);
  const [matTitulo, setMatTitulo] = useState("");
  const [matTipo, setMatTipo] = useState<"pdf" | "video" | "texto">("texto");
  const [matConteudo, setMatConteudo] = useState("");

  // Liberacao modal
  const [libModalOpen, setLibModalOpen] = useState(false);
  const [libMaterialId, setLibMaterialId] = useState<string | null>(null);
  const [libPacientes, setLibPacientes] = useState<Set<string>>(new Set());

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    const [{ data: cats }, { data: mats }, { data: pacs }] = await Promise.all([
      supabase.from("categorias_material").select("*").order("ordem"),
      supabase.from("materiais").select("*").order("ordem"),
      supabase.from("pacientes").select("*").order("nome"),
    ]);
    if (cats) setCategorias(cats);
    if (mats) setMateriais(mats);
    if (pacs) setPacientes(pacs);
  }, [supabase]);

  useEffect(() => { loadData(); }, [loadData]);

  // Categories
  function openNewCat() {
    setCatNome(""); setEditCatId(null); setError("");
    setCatModalOpen(true);
  }

  function openEditCat(c: CategoriaMaterial) {
    setCatNome(c.nome); setEditCatId(c.id); setError("");
    setCatModalOpen(true);
  }

  async function handleSaveCat(e: React.FormEvent) {
    e.preventDefault();
    if (!catNome.trim()) { setError("Preencha o nome."); return; }
    setLoading(true); setError("");
    const { data: { user } } = await supabase.auth.getUser();

    if (editCatId) {
      await supabase.from("categorias_material").update({ nome: catNome.trim() }).eq("id", editCatId);
    } else {
      await supabase.from("categorias_material").insert({
        profissional_id: user!.id, nome: catNome.trim(), ordem: categorias.length,
      });
    }
    setCatModalOpen(false); setLoading(false); loadData();
  }

  async function handleDeleteCat(id: string, nome: string) {
    if (!confirm(`Excluir categoria "${nome}" e todos seus materiais?`)) return;
    await supabase.from("categorias_material").delete().eq("id", id);
    if (selectedCat === id) setSelectedCat(null);
    loadData();
  }

  // Materials
  function openNewMat() {
    if (!selectedCat) { alert("Selecione uma categoria primeiro."); return; }
    setMatTitulo(""); setMatTipo("texto"); setMatConteudo("");
    setEditMatId(null); setError("");
    setMatModalOpen(true);
  }

  function openEditMat(m: Material) {
    setMatTitulo(m.titulo); setMatTipo(m.tipo); setMatConteudo(m.conteudo || "");
    setEditMatId(m.id); setError("");
    setMatModalOpen(true);
  }

  async function handleSaveMat(e: React.FormEvent) {
    e.preventDefault();
    if (!matTitulo.trim()) { setError("Preencha o titulo."); return; }
    setLoading(true); setError("");
    const { data: { user } } = await supabase.auth.getUser();
    const catMats = materiais.filter((m) => m.categoria_id === selectedCat);

    if (editMatId) {
      await supabase.from("materiais").update({
        titulo: matTitulo.trim(), tipo: matTipo, conteudo: matConteudo.trim() || null,
      }).eq("id", editMatId);
    } else {
      await supabase.from("materiais").insert({
        profissional_id: user!.id, categoria_id: selectedCat!,
        titulo: matTitulo.trim(), tipo: matTipo,
        conteudo: matConteudo.trim() || null, ordem: catMats.length,
      });
    }
    setMatModalOpen(false); setLoading(false); loadData();
  }

  async function handleDeleteMat(id: string) {
    if (!confirm("Excluir este material?")) return;
    await supabase.from("materiais").delete().eq("id", id);
    loadData();
  }

  // Liberacao
  async function openLibModal(materialId: string) {
    setLibMaterialId(materialId);
    const { data } = await supabase
      .from("materiais_paciente")
      .select("paciente_id")
      .eq("material_id", materialId);
    setLibPacientes(new Set((data || []).map((d) => d.paciente_id)));
    setLibModalOpen(true);
  }

  function toggleLibPaciente(pacId: string) {
    setLibPacientes((prev) => {
      const next = new Set(prev);
      if (next.has(pacId)) next.delete(pacId);
      else next.add(pacId);
      return next;
    });
  }

  async function handleSaveLib() {
    if (!libMaterialId) return;
    setLoading(true);
    // Delete all existing, then insert selected
    await supabase.from("materiais_paciente").delete().eq("material_id", libMaterialId);
    if (libPacientes.size > 0) {
      const rows = [...libPacientes].map((pid) => ({
        paciente_id: pid, material_id: libMaterialId,
      }));
      await supabase.from("materiais_paciente").insert(rows);
    }
    setLibModalOpen(false); setLoading(false);
  }

  const catMateriais = materiais.filter((m) => m.categoria_id === selectedCat);
  const selectedCatObj = categorias.find((c) => c.id === selectedCat);

  const TIPO_ICONS: Record<string, string> = { pdf: "📄", video: "🎥", texto: "📝" };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-text">Materiais</h1>
        <button onClick={openNewCat} className="bg-accent hover:bg-[#2563eb] text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
          + Nova Categoria
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
        {/* Categories sidebar */}
        <div className="bg-surface border border-border rounded-xl p-4">
          <h2 className="text-xs font-semibold text-text2 uppercase tracking-wider mb-3">Categorias</h2>
          {categorias.length === 0 ? (
            <p className="text-text3 text-xs">Nenhuma categoria criada.</p>
          ) : (
            <div className="flex flex-col gap-1">
              {categorias.map((c) => (
                <div
                  key={c.id}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-all ${
                    selectedCat === c.id
                      ? "bg-accent text-white"
                      : "hover:bg-surface2 text-text2"
                  }`}
                  onClick={() => setSelectedCat(c.id)}
                >
                  <span className="text-sm font-medium truncate">{c.nome}</span>
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={(e) => { e.stopPropagation(); openEditCat(c); }}
                      className="text-[10px] hover:opacity-70"
                    >✏️</button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteCat(c.id, c.nome); }}
                      className="text-[10px] hover:opacity-70"
                    >🗑️</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Materials list */}
        <div className="bg-surface border border-border rounded-xl p-5">
          {!selectedCat ? (
            <div className="text-center py-8 text-text3 text-sm">
              Selecione uma categoria para ver os materiais.
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-text">{selectedCatObj?.nome}</h2>
                <button onClick={openNewMat} className="text-accent hover:text-accent/80 text-xs font-semibold transition-colors">
                  + Adicionar Material
                </button>
              </div>

              {catMateriais.length === 0 ? (
                <p className="text-text3 text-sm">Nenhum material nesta categoria.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {catMateriais.map((m) => (
                    <div key={m.id} className="flex items-center gap-3 bg-bg border border-border rounded-lg px-4 py-3 hover:border-accent/30 transition-colors">
                      <span className="text-lg">{TIPO_ICONS[m.tipo] || "📄"}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-text truncate">{m.titulo}</p>
                        <p className="text-[11px] text-text3 capitalize">{m.tipo}
                          {m.conteudo && m.tipo === "video" && " · YouTube"}
                          {m.conteudo && m.tipo === "pdf" && " · Link externo"}
                        </p>
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        <button
                          onClick={() => openLibModal(m.id)}
                          className="bg-accent2/20 hover:bg-accent2/30 text-accent2 text-[11px] font-semibold px-2 py-1 rounded transition-colors"
                          title="Liberar para pacientes"
                        >
                          👥 Liberar
                        </button>
                        <button onClick={() => openEditMat(m)} className="bg-surface2 hover:bg-border text-text text-[10px] px-1.5 py-1 rounded border border-border transition-colors">✏️</button>
                        <button onClick={() => handleDeleteMat(m.id)} className="bg-surface2 hover:bg-border text-danger text-[10px] px-1.5 py-1 rounded border border-border transition-colors">🗑️</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Category Modal */}
      <Modal open={catModalOpen} onClose={() => setCatModalOpen(false)} title={editCatId ? "Editar Categoria" : "Nova Categoria"} footer={
        <>
          <button type="button" onClick={() => setCatModalOpen(false)} className="bg-surface2 hover:bg-border text-text text-sm font-semibold px-4 py-2 rounded-lg border border-border transition-colors">Cancelar</button>
          <button type="submit" form="cat-form" disabled={loading} className="bg-accent hover:bg-[#2563eb] text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors disabled:opacity-50">{loading ? "Salvando..." : "Salvar"}</button>
        </>
      }>
        <form id="cat-form" onSubmit={handleSaveCat} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-semibold text-text2 uppercase tracking-wider mb-1.5">Nome da Categoria *</label>
            <input type="text" value={catNome} onChange={(e) => setCatNome(e.target.value)} required placeholder="Ex: Dieta, Treino, Habitos..." className="w-full px-3 py-2.5 bg-bg border border-border rounded-lg text-text text-sm focus:border-accent focus:outline-none transition-colors" />
          </div>
          {error && <p className="text-danger text-sm bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">{error}</p>}
        </form>
      </Modal>

      {/* Material Modal */}
      <Modal open={matModalOpen} onClose={() => setMatModalOpen(false)} title={editMatId ? "Editar Material" : "Novo Material"} footer={
        <>
          <button type="button" onClick={() => setMatModalOpen(false)} className="bg-surface2 hover:bg-border text-text text-sm font-semibold px-4 py-2 rounded-lg border border-border transition-colors">Cancelar</button>
          <button type="submit" form="mat-form" disabled={loading} className="bg-accent hover:bg-[#2563eb] text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors disabled:opacity-50">{loading ? "Salvando..." : "Salvar"}</button>
        </>
      }>
        <form id="mat-form" onSubmit={handleSaveMat} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-semibold text-text2 uppercase tracking-wider mb-1.5">Titulo *</label>
            <input type="text" value={matTitulo} onChange={(e) => setMatTitulo(e.target.value)} required placeholder="Nome do material" className="w-full px-3 py-2.5 bg-bg border border-border rounded-lg text-text text-sm focus:border-accent focus:outline-none transition-colors" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-text2 uppercase tracking-wider mb-1.5">Tipo</label>
            <select value={matTipo} onChange={(e) => setMatTipo(e.target.value as "pdf" | "video" | "texto")} className="w-full px-3 py-2.5 bg-bg border border-border rounded-lg text-text text-sm focus:border-accent focus:outline-none transition-colors">
              <option value="texto">Texto</option>
              <option value="pdf">PDF (link)</option>
              <option value="video">Video (YouTube)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-text2 uppercase tracking-wider mb-1.5">
              {matTipo === "texto" ? "Conteudo" : matTipo === "pdf" ? "Link do PDF" : "Link do YouTube"}
            </label>
            {matTipo === "texto" ? (
              <textarea
                value={matConteudo}
                onChange={(e) => setMatConteudo(e.target.value)}
                rows={5}
                placeholder="Conteudo do material..."
                className="w-full px-3 py-2.5 bg-bg border border-border rounded-lg text-text text-sm focus:border-accent focus:outline-none transition-colors resize-y"
              />
            ) : (
              <input type="url" value={matConteudo} onChange={(e) => setMatConteudo(e.target.value)} placeholder={matTipo === "pdf" ? "https://exemplo.com/arquivo.pdf" : "https://youtube.com/watch?v=..."} className="w-full px-3 py-2.5 bg-bg border border-border rounded-lg text-text text-sm focus:border-accent focus:outline-none transition-colors" />
            )}
          </div>
          {error && <p className="text-danger text-sm bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">{error}</p>}
        </form>
      </Modal>

      {/* Liberacao Modal */}
      <Modal open={libModalOpen} onClose={() => setLibModalOpen(false)} title="Liberar Material para Pacientes" footer={
        <>
          <button type="button" onClick={() => setLibModalOpen(false)} className="bg-surface2 hover:bg-border text-text text-sm font-semibold px-4 py-2 rounded-lg border border-border transition-colors">Cancelar</button>
          <button onClick={handleSaveLib} disabled={loading} className="bg-accent hover:bg-[#2563eb] text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors disabled:opacity-50">{loading ? "Salvando..." : "Salvar"}</button>
        </>
      }>
        {pacientes.length === 0 ? (
          <p className="text-text3 text-sm">Nenhum paciente cadastrado.</p>
        ) : (
          <div className="flex flex-col gap-1.5 max-h-[400px] overflow-y-auto">
            {pacientes.map((p) => (
              <label
                key={p.id}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
                  libPacientes.has(p.id) ? "bg-accent/10 border border-accent/30" : "bg-bg border border-border hover:border-text3"
                }`}
              >
                <input
                  type="checkbox"
                  checked={libPacientes.has(p.id)}
                  onChange={() => toggleLibPaciente(p.id)}
                  className="w-4 h-4 accent-accent"
                />
                <div>
                  <p className="text-sm text-text font-medium">{p.nome}</p>
                  {p.email && <p className="text-[11px] text-text3">{p.email}</p>}
                </div>
              </label>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}
