"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

interface Post {
  id: string;
  paciente_id: string;
  tipo: string;
  conteudo: string;
  badge_emoji?: string;
  badge_label?: string;
  created_at: string;
  aprovado: boolean;
  autor_nome?: string;
}

interface Desafio {
  id: string;
  titulo: string;
  descricao: string;
  data_inicio: string;
  data_fim: string;
  ativo: boolean;
  created_at: string;
}

export default function ComunidadePainelPage() {
  const supabase = createClient();
  const [tab, setTab] = useState<"posts" | "desafios">("posts");

  // Posts state
  const [posts, setPosts] = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [filter, setFilter] = useState<"pendentes" | "aprovados" | "todos">("pendentes");

  // Desafios state
  const [desafios, setDesafios] = useState<Desafio[]>([]);
  const [loadingDesafios, setLoadingDesafios] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newDesafio, setNewDesafio] = useState({ titulo: "", descricao: "", data_inicio: "", data_fim: "" });
  const [saving, setSaving] = useState(false);

  /* ─── Load Posts ────────────────────────────────────── */
  const loadPosts = useCallback(async () => {
    setLoadingPosts(true);
    let query = supabase
      .from("comunidade_posts")
      .select("*")
      .order("created_at", { ascending: false });

    if (filter === "pendentes") query = query.eq("aprovado", false);
    else if (filter === "aprovados") query = query.eq("aprovado", true);

    const { data } = await query;
    if (!data) { setPosts([]); setLoadingPosts(false); return; }

    // Get names
    const ids = [...new Set(data.map((p: Post) => p.paciente_id))];
    const { data: profiles } = await supabase.from("profiles").select("id, email").in("id", ids);
    const emails = profiles?.map(p => p.email) || [];
    const { data: pacientes } = await supabase.from("pacientes").select("nome, email").in("email", emails);

    const idToName: Record<string, string> = {};
    profiles?.forEach((p: { id: string; email: string }) => {
      const pac = pacientes?.find((pp: { email: string }) => pp.email === p.email);
      idToName[p.id] = pac?.nome || p.email.split("@")[0];
    });

    setPosts(data.map((p: Post) => ({ ...p, autor_nome: idToName[p.paciente_id] || "Anônimo" })));
    setLoadingPosts(false);
  }, [supabase, filter]);

  useEffect(() => { loadPosts(); }, [loadPosts]);

  /* ─── Approve / Delete Post ─────────────────────────── */
  async function approvePost(id: string) {
    await supabase.from("comunidade_posts").update({ aprovado: true }).eq("id", id);
    loadPosts();
  }

  async function deletePost(id: string) {
    if (!confirm("Excluir este post?")) return;
    await supabase.from("comunidade_posts").delete().eq("id", id);
    loadPosts();
  }

  /* ─── Load Desafios ─────────────────────────────────── */
  const loadDesafios = useCallback(async () => {
    setLoadingDesafios(true);
    const { data } = await supabase
      .from("desafios_semana")
      .select("*")
      .order("created_at", { ascending: false });
    setDesafios(data || []);
    setLoadingDesafios(false);
  }, [supabase]);

  useEffect(() => { loadDesafios(); }, [loadDesafios]);

  /* ─── Create Desafio ────────────────────────────────── */
  async function handleCreateDesafio() {
    if (!newDesafio.titulo.trim() || !newDesafio.data_inicio || !newDesafio.data_fim) return;
    setSaving(true);
    await supabase.from("desafios_semana").insert({
      titulo: newDesafio.titulo.trim(),
      descricao: newDesafio.descricao.trim(),
      data_inicio: newDesafio.data_inicio,
      data_fim: newDesafio.data_fim,
      ativo: true,
    });
    setNewDesafio({ titulo: "", descricao: "", data_inicio: "", data_fim: "" });
    setShowForm(false);
    setSaving(false);
    loadDesafios();
  }

  async function toggleDesafio(id: string, ativo: boolean) {
    await supabase.from("desafios_semana").update({ ativo: !ativo }).eq("id", id);
    loadDesafios();
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text">Comunidade</h1>
        <p className="text-text2 text-sm mt-1">Gerencie posts e desafios dos pacientes</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setTab("posts")}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
            tab === "posts" ? "bg-accent text-white" : "bg-surface2 text-text2 hover:text-text"
          }`}
        >
          📝 Posts {filter === "pendentes" && posts.length > 0 && (
            <span className="ml-1 bg-white/20 px-1.5 py-0.5 rounded-full text-xs">{posts.length}</span>
          )}
        </button>
        <button
          onClick={() => setTab("desafios")}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
            tab === "desafios" ? "bg-accent text-white" : "bg-surface2 text-text2 hover:text-text"
          }`}
        >
          🎯 Desafios da Semana
        </button>
      </div>

      {/* ─── Posts Tab ────────────────────────────────── */}
      {tab === "posts" && (
        <>
          <div className="flex gap-2 mb-4">
            {(["pendentes", "aprovados", "todos"] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  filter === f ? "bg-accent text-white" : "bg-surface border border-surface2 text-text2"
                }`}
              >
                {f === "pendentes" ? "⏳ Pendentes" : f === "aprovados" ? "✅ Aprovados" : "Todos"}
              </button>
            ))}
          </div>

          {loadingPosts ? (
            <div className="flex flex-col gap-2">
              {[1,2,3].map(i => <div key={i} className="h-20 bg-surface2 rounded-xl animate-pulse" />)}
            </div>
          ) : posts.length === 0 ? (
            <div className="bg-surface border border-surface2 rounded-2xl p-10 text-center">
              <p className="text-text2 font-semibold">Nenhum post {filter === "pendentes" ? "pendente" : ""}</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {posts.map(post => (
                <div key={post.id} className={`bg-surface border rounded-xl p-4 ${post.aprovado ? "border-surface2" : "border-amber-200 bg-amber-50/30"}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <p className="text-sm font-bold text-text">{post.autor_nome}</p>
                      <p className="text-xs text-text3 mb-2">{new Date(post.created_at).toLocaleString("pt-BR")}</p>
                      <p className="text-sm text-text2 whitespace-pre-wrap">{post.conteudo}</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      {!post.aprovado && (
                        <button
                          onClick={() => approvePost(post.id)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-500 text-white text-xs font-bold hover:bg-emerald-600 transition-all"
                        >
                          ✅ Aprovar
                        </button>
                      )}
                      <button
                        onClick={() => deletePost(post.id)}
                        className="px-3 py-1.5 rounded-lg bg-red-500 text-white text-xs font-bold hover:bg-red-600 transition-all"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ─── Desafios Tab ─────────────────────────────── */}
      {tab === "desafios" && (
        <>
          <button
            onClick={() => setShowForm(!showForm)}
            className="mb-4 px-4 py-2.5 rounded-xl bg-accent text-white text-sm font-bold hover:opacity-90 transition-all"
          >
            + Novo Desafio
          </button>

          {showForm && (
            <div className="bg-surface border border-surface2 rounded-2xl p-5 mb-4">
              <h3 className="text-sm font-bold text-text mb-3">Criar Desafio</h3>
              <div className="flex flex-col gap-3">
                <input
                  value={newDesafio.titulo}
                  onChange={e => setNewDesafio({ ...newDesafio, titulo: e.target.value })}
                  placeholder="Título do desafio (ex: Beba 3L de água por 5 dias)"
                  className="border border-surface2 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                />
                <textarea
                  value={newDesafio.descricao}
                  onChange={e => setNewDesafio({ ...newDesafio, descricao: e.target.value })}
                  placeholder="Descrição e regras do desafio..."
                  className="border border-surface2 rounded-lg px-3 py-2 text-sm min-h-[80px] resize-none focus:outline-none focus:ring-2 focus:ring-accent/30"
                />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-text3 font-bold mb-1 block">Data início</label>
                    <input
                      type="date"
                      value={newDesafio.data_inicio}
                      onChange={e => setNewDesafio({ ...newDesafio, data_inicio: e.target.value })}
                      className="border border-surface2 rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-accent/30"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-text3 font-bold mb-1 block">Data fim</label>
                    <input
                      type="date"
                      value={newDesafio.data_fim}
                      onChange={e => setNewDesafio({ ...newDesafio, data_fim: e.target.value })}
                      className="border border-surface2 rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-accent/30"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleCreateDesafio}
                    disabled={saving}
                    className="px-4 py-2 rounded-lg bg-accent text-white text-sm font-bold disabled:opacity-50 hover:opacity-90 transition-all"
                  >
                    {saving ? "Salvando..." : "Criar Desafio"}
                  </button>
                  <button
                    onClick={() => setShowForm(false)}
                    className="px-4 py-2 rounded-lg bg-surface2 text-text2 text-sm font-bold hover:text-text transition-all"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          )}

          {loadingDesafios ? (
            <div className="flex flex-col gap-2">
              {[1,2].map(i => <div key={i} className="h-24 bg-surface2 rounded-xl animate-pulse" />)}
            </div>
          ) : desafios.length === 0 ? (
            <div className="bg-surface border border-surface2 rounded-2xl p-10 text-center">
              <p className="text-text2 font-semibold">Nenhum desafio criado</p>
              <p className="text-text3 text-sm mt-1">Crie desafios semanais para motivar seus pacientes!</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {desafios.map(d => (
                <div key={d.id} className={`bg-surface border rounded-xl p-4 ${d.ativo ? "border-emerald-200" : "border-surface2 opacity-60"}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">🎯</span>
                        <p className="text-sm font-bold text-text">{d.titulo}</p>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${d.ativo ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
                          {d.ativo ? "Ativo" : "Inativo"}
                        </span>
                      </div>
                      {d.descricao && <p className="text-xs text-text2 mb-1">{d.descricao}</p>}
                      <p className="text-[10px] text-text3">
                        {new Date(d.data_inicio).toLocaleDateString("pt-BR")} → {new Date(d.data_fim).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                    <button
                      onClick={() => toggleDesafio(d.id, d.ativo)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        d.ativo ? "bg-gray-200 text-gray-700 hover:bg-gray-300" : "bg-emerald-500 text-white hover:bg-emerald-600"
                      }`}
                    >
                      {d.ativo ? "Desativar" : "Ativar"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
