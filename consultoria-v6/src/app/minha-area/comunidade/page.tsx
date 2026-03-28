"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

/* ─── Types ──────────────────────────────────────────── */
interface Post {
  id: string;
  paciente_id: string;
  tipo: "texto" | "conquista";
  conteudo: string;
  badge_emoji?: string;
  badge_label?: string;
  created_at: string;
  aprovado: boolean;
  autor_nome?: string;
  autor_iniciais?: string;
  reacoes?: Record<string, string[]>; // emoji -> [user_ids]
}

const REACOES_DISPONIVEIS = ["👏", "🔥", "💪", "❤️", "🎉"];

/* ─── SVGs ───────────────────────────────────────────── */
const SvgSend = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22,2 15,22 11,13 2,9"/>
  </svg>
);

export default function ComunidadePage() {
  const supabase = createClient();

  const [userId, setUserId] = useState<string | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPost, setNewPost] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [desafios, setDesafios] = useState<{ id: string; titulo: string; descricao: string; data_inicio: string; data_fim: string }[]>([]);

  /* Auth */
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
    });
  }, [supabase]);

  /* Load posts */
  const loadPosts = useCallback(async () => {
    setLoading(true);

    const { data: postsData } = await supabase
      .from("comunidade_posts")
      .select("*")
      .eq("aprovado", true)
      .order("created_at", { ascending: false })
      .limit(50);

    if (!postsData || postsData.length === 0) {
      setPosts([]);
      setLoading(false);
      return;
    }

    // Get author names
    const pacienteIds = [...new Set(postsData.map((p: Post) => p.paciente_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, email")
      .in("id", pacienteIds);

    const emails = profiles?.map(p => p.email) || [];
    const { data: pacientesData } = await supabase
      .from("pacientes")
      .select("nome, email")
      .in("email", emails);

    const idToName: Record<string, { nome: string; iniciais: string }> = {};
    profiles?.forEach((p: { id: string; email: string }) => {
      const pac = pacientesData?.find((pp: { email: string }) => pp.email === p.email);
      const nome = pac?.nome || p.email.split("@")[0];
      const nomeArr = nome.split(" ");
      const display = nomeArr.length > 1 ? `${nomeArr[0]} ${nomeArr[1][0]}.` : nomeArr[0];
      const iniciais = nomeArr.map((w: string) => w[0]).slice(0, 2).join("").toUpperCase();
      idToName[p.id] = { nome: display, iniciais };
    });

    // Get reactions for each post
    const postIds = postsData.map((p: Post) => p.id);
    const { data: reacoesData } = await supabase
      .from("comunidade_reacoes")
      .select("post_id, emoji, user_id")
      .in("post_id", postIds);

    const reacoesByPost: Record<string, Record<string, string[]>> = {};
    reacoesData?.forEach((r: { post_id: string; emoji: string; user_id: string }) => {
      if (!reacoesByPost[r.post_id]) reacoesByPost[r.post_id] = {};
      if (!reacoesByPost[r.post_id][r.emoji]) reacoesByPost[r.post_id][r.emoji] = [];
      reacoesByPost[r.post_id][r.emoji].push(r.user_id);
    });

    const enriched: Post[] = postsData.map((p: Post) => ({
      ...p,
      autor_nome: idToName[p.paciente_id]?.nome || "Anônimo",
      autor_iniciais: idToName[p.paciente_id]?.iniciais || "?",
      reacoes: reacoesByPost[p.id] || {},
    }));

    setPosts(enriched);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { loadPosts(); }, [loadPosts]);

  /* Load active challenges */
  useEffect(() => {
    const hoje = new Date().toISOString().split("T")[0];
    supabase
      .from("desafios_semana")
      .select("id, titulo, descricao, data_inicio, data_fim")
      .eq("ativo", true)
      .lte("data_inicio", hoje)
      .gte("data_fim", hoje)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setDesafios(data || []);
      });
  }, [supabase]);

  /* Submit post */
  async function handleSubmit() {
    if (!userId || !newPost.trim()) return;
    setSubmitting(true);

    const { error } = await supabase.from("comunidade_posts").insert({
      paciente_id: userId,
      tipo: "texto",
      conteudo: newPost.trim(),
      aprovado: false, // Victor precisa aprovar
    });

    setSubmitting(false);

    if (error) {
      setToast("Erro ao publicar. Tente novamente.");
    } else {
      setToast("Post enviado! Aguardando aprovação do profissional.");
      setNewPost("");
    }
    setTimeout(() => setToast(null), 4000);
  }

  /* Toggle reaction */
  async function toggleReaction(postId: string, emoji: string) {
    if (!userId) return;

    const post = posts.find(p => p.id === postId);
    const userReacted = post?.reacoes?.[emoji]?.includes(userId);

    if (userReacted) {
      await supabase
        .from("comunidade_reacoes")
        .delete()
        .eq("post_id", postId)
        .eq("user_id", userId)
        .eq("emoji", emoji);
    } else {
      await supabase.from("comunidade_reacoes").insert({
        post_id: postId,
        user_id: userId,
        emoji,
      });
    }

    // Optimistic update
    setPosts(prev => prev.map(p => {
      if (p.id !== postId) return p;
      const reacoes = { ...p.reacoes };
      if (userReacted) {
        reacoes[emoji] = (reacoes[emoji] || []).filter(id => id !== userId);
        if (reacoes[emoji].length === 0) delete reacoes[emoji];
      } else {
        reacoes[emoji] = [...(reacoes[emoji] || []), userId];
      }
      return { ...p, reacoes };
    }));
  }

  function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}min`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    const days = Math.floor(hrs / 24);
    return `${days}d`;
  }

  return (
    <div className="animate-fade-in-up">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-[#0f2d52] text-white text-sm font-semibold px-5 py-3 rounded-2xl shadow-lg animate-fade-in-scale max-w-[90vw] text-center">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="mb-5">
        <h1 style={{ fontFamily: "var(--font-display)" }} className="text-xl font-bold text-[#0f172a]">
          Comunidade
        </h1>
        <p className="text-[#475569] text-sm mt-0.5">Compartilhe, motive e celebre com outros pacientes</p>
      </div>

      {/* Active challenges */}
      {desafios.length > 0 && (
        <div className="mb-5">
          {desafios.map(d => (
            <div key={d.id} className="bg-gradient-to-r from-[#0f2d52] to-[#1e4976] rounded-2xl p-5 text-white shadow-lg mb-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center text-xl shrink-0">
                  🎯
                </div>
                <div className="flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#c8a96e] mb-1">Desafio da Semana</p>
                  <p className="text-base font-bold mb-1">{d.titulo}</p>
                  {d.descricao && <p className="text-sm text-white/70 leading-relaxed">{d.descricao}</p>}
                  <p className="text-[10px] text-white/40 mt-2">
                    {new Date(d.data_inicio).toLocaleDateString("pt-BR")} → {new Date(d.data_fim).toLocaleDateString("pt-BR")}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New post */}
      <div className="bg-white border border-[#e0eaf5] rounded-2xl p-4 mb-5 shadow-sm">
        <textarea
          value={newPost}
          onChange={e => setNewPost(e.target.value)}
          placeholder="Compartilhe algo com o grupo... 💪"
          className="w-full resize-none border-none outline-none text-sm text-[#0f172a] placeholder:text-[#94a3b8] min-h-[80px]"
          maxLength={500}
        />
        <div className="flex items-center justify-between mt-2">
          <span className="text-[10px] text-[#94a3b8]">{newPost.length}/500 • Aprovação do profissional necessária</span>
          <button
            onClick={handleSubmit}
            disabled={!newPost.trim() || submitting}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-white transition-all shadow-sm disabled:opacity-40 active:scale-95"
            style={{ background: "linear-gradient(135deg, #0f2d52 0%, #163a5f 100%)" }}
          >
            <SvgSend />
            {submitting ? "Enviando..." : "Publicar"}
          </button>
        </div>
      </div>

      {/* Posts feed */}
      {loading ? (
        <div className="flex flex-col gap-3">
          {[1,2,3].map(i => <div key={i} className="h-32 shimmer rounded-2xl" />)}
        </div>
      ) : posts.length === 0 ? (
        <div className="bg-white border border-[#e0eaf5] rounded-2xl p-10 text-center">
          <p className="text-3xl mb-2">🤝</p>
          <p className="text-[#0f172a] font-semibold">Ainda sem publicações</p>
          <p className="text-[#94a3b8] text-sm mt-1">Seja o primeiro a compartilhar algo!</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {posts.map((post, idx) => (
            <div
              key={post.id}
              className={`bg-white border rounded-2xl p-4 shadow-sm animate-fade-in-up ${
                post.tipo === "conquista" ? "border-[#c8a96e]/30 bg-gradient-to-r from-white to-[#fef9ef]" : "border-[#e0eaf5]"
              }`}
              style={{ animationDelay: `${idx * 0.05}s` }}
            >
              {/* Author header */}
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold" style={{
                  background: post.tipo === "conquista"
                    ? "linear-gradient(135deg, #c8a96e, #dbb87a)"
                    : "linear-gradient(135deg, #0f2d52, #163a5f)",
                  color: post.tipo === "conquista" ? "#0f2d52" : "white",
                }}>
                  {post.tipo === "conquista" ? post.badge_emoji : post.autor_iniciais}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-[#0f172a]">{post.autor_nome}</p>
                  <p className="text-[10px] text-[#94a3b8]">{timeAgo(post.created_at)}</p>
                </div>
                {post.tipo === "conquista" && (
                  <span className="text-[10px] font-bold text-[#c8a96e] bg-[#fef9ef] border border-[#c8a96e]/20 px-2 py-0.5 rounded-lg uppercase tracking-wider">
                    Conquista
                  </span>
                )}
              </div>

              {/* Content */}
              <p className="text-sm text-[#0f172a] whitespace-pre-wrap mb-3 leading-relaxed">
                {post.conteudo}
              </p>

              {/* Reactions */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {/* Existing reactions */}
                {Object.entries(post.reacoes || {}).map(([emoji, users]) => {
                  const iReacted = users.includes(userId || "");
                  return (
                    <button
                      key={emoji}
                      onClick={() => toggleReaction(post.id, emoji)}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold transition-all active:scale-95 ${
                        iReacted
                          ? "bg-[#0f2d52]/10 border border-[#0f2d52]/20 text-[#0f2d52]"
                          : "bg-[#f8fafc] border border-[#e0eaf5] text-[#475569] hover:bg-[#f1f5f9]"
                      }`}
                    >
                      <span>{emoji}</span>
                      <span>{users.length}</span>
                    </button>
                  );
                })}

                {/* Add reaction buttons */}
                {REACOES_DISPONIVEIS.filter(e => !post.reacoes?.[e]).map(emoji => (
                  <button
                    key={emoji}
                    onClick={() => toggleReaction(post.id, emoji)}
                    className="px-2 py-1 rounded-xl text-sm bg-[#f8fafc] border border-[#e0eaf5] text-[#94a3b8] hover:bg-[#f1f5f9] transition-all active:scale-95 opacity-50 hover:opacity-100"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
