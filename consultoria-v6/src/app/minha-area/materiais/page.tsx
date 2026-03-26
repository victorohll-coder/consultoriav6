"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

interface MatItem {
  material_id: string;
  materiais: {
    id: string;
    titulo: string;
    tipo: "pdf" | "video" | "texto" | "arquivo";
    conteudo: string | null;
    categoria_id: string;
    categorias_material: {
      nome: string;
    };
  };
}

interface GroupedMat {
  categoria: string;
  items: MatItem["materiais"][];
}

const CAT_ICONS: Record<string, string> = {
  "alimentação": "🥗",
  "dieta": "🥗",
  "treino": "💪",
  "academia": "💪",
  "hábitos": "✨",
  "qualidade": "✨",
  "suplementação": "💊",
  "suplemento": "💊",
};

function getCatIcon(catName: string) {
  const lower = catName.toLowerCase();
  for (const [key, icon] of Object.entries(CAT_ICONS)) {
    if (lower.includes(key)) return icon;
  }
  return "📂";
}

const TYPE_STYLES: Record<string, { icon: string; color: string; bg: string; label: string }> = {
  pdf: { icon: "📄", color: "text-red-600", bg: "bg-red-50 border-red-200", label: "PDF" },
  video: { icon: "▶️", color: "text-blue-600", bg: "bg-blue-50 border-blue-200", label: "Vídeo" },
  texto: { icon: "📝", color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200", label: "Texto" },
  arquivo: { icon: "📎", color: "text-slate-600", bg: "bg-slate-50 border-slate-200", label: "Arquivo" },
};

export default function MateriaisPacientePage() {
  const supabase = createClient();
  const [grouped, setGrouped] = useState<GroupedMat[]>([]);
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [expandedTexto, setExpandedTexto] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", user.id)
      .single();
    if (!profile) return;

    const { data: paciente } = await supabase
      .from("pacientes")
      .select("id")
      .eq("email", profile.email)
      .single();
    if (!paciente) return;

    const { data } = await supabase
      .from("materiais_paciente")
      .select("material_id, materiais(id, titulo, tipo, conteudo, categoria_id, categorias_material(nome))")
      .eq("paciente_id", paciente.id);

    if (data) {
      const map: Record<string, MatItem["materiais"][]> = {};
      for (const row of data as unknown as MatItem[]) {
        const cat = row.materiais?.categorias_material?.nome || "Sem categoria";
        if (!map[cat]) map[cat] = [];
        map[cat].push(row.materiais);
      }
      const groups = Object.entries(map).map(([categoria, items]) => ({ categoria, items }));
      setGrouped(groups);
      if (groups.length > 0) setSelectedCat(groups[0].categoria);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => { loadData(); }, [loadData]);

  function getYouTubeId(url: string) {
    const match = url.match(/(?:youtu\.be\/|v=|\/embed\/)([a-zA-Z0-9_-]{11})/);
    return match ? match[1] : null;
  }

  function getYouTubeThumb(url: string) {
    const id = getYouTubeId(url);
    return id ? `https://img.youtube.com/vi/${id}/mqdefault.jpg` : null;
  }

  if (loading) {
    return <div className="text-text2 text-sm p-6">Carregando materiais...</div>;
  }

  if (grouped.length === 0) {
    return (
      <div className="bg-surface border border-border rounded-2xl p-10 text-center">
        <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">📁</span>
        </div>
        <p className="text-text font-semibold text-base">Nenhum material liberado</p>
        <p className="text-text3 text-sm mt-1">Seu nutricionista vai liberar os materiais para você.</p>
      </div>
    );
  }

  const selectedGroup = grouped.find((g) => g.categoria === selectedCat);

  return (
    <div>
      <h1 className="text-xl font-bold text-text mb-5">Materiais</h1>

      {/* Category cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        {grouped.map((g) => {
          const isActive = selectedCat === g.categoria;
          return (
            <button
              key={g.categoria}
              onClick={() => setSelectedCat(g.categoria)}
              className={`relative p-4 rounded-xl border-2 text-left transition-all ${
                isActive
                  ? "border-accent bg-accent/5 shadow-sm"
                  : "border-border bg-surface hover:border-accent/40 hover:shadow-sm"
              }`}
            >
              <span className="text-2xl block mb-2">{getCatIcon(g.categoria)}</span>
              <p className={`text-sm font-semibold truncate ${isActive ? "text-accent" : "text-text"}`}>
                {g.categoria}
              </p>
              <p className="text-xs text-text3 mt-0.5">
                {g.items.length} {g.items.length === 1 ? "material" : "materiais"}
              </p>
              {isActive && (
                <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-accent" />
              )}
            </button>
          );
        })}
      </div>

      {/* Material items */}
      {selectedGroup && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {selectedGroup.items.map((mat) => {
            const style = TYPE_STYLES[mat.tipo] || TYPE_STYLES.arquivo;
            const ytThumb = mat.tipo === "video" && mat.conteudo ? getYouTubeThumb(mat.conteudo) : null;

            return (
              <div
                key={mat.id}
                className={`border rounded-xl overflow-hidden transition-all hover:shadow-md ${style.bg}`}
              >
                {/* YouTube thumbnail */}
                {ytThumb && (
                  <div className="relative aspect-video bg-slate-200">
                    <img src={ytThumb} alt={mat.titulo} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                      <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                        <span className="text-red-600 text-xl ml-0.5">▶</span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="p-4">
                  <div className="flex items-start gap-3">
                    <span className="text-xl shrink-0 mt-0.5">{style.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-text leading-tight">{mat.titulo}</p>
                      <span className={`inline-block text-[10px] font-bold uppercase mt-1.5 px-2 py-0.5 rounded-full ${style.color} bg-white/60`}>
                        {style.label}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-3">
                    {mat.tipo === "video" && mat.conteudo && (
                      <div className="rounded-lg overflow-hidden aspect-video">
                        <iframe
                          src={`https://www.youtube.com/embed/${getYouTubeId(mat.conteudo)}`}
                          className="w-full h-full"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      </div>
                    )}

                    {(mat.tipo === "pdf" || mat.tipo === "arquivo") && mat.conteudo && (
                      <a
                        href={mat.conteudo}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-white border border-border text-sm font-semibold text-accent hover:bg-accent hover:text-white transition-all"
                      >
                        {mat.tipo === "arquivo" ? "⬇ Baixar arquivo" : "📄 Abrir PDF"}
                      </a>
                    )}

                    {mat.tipo === "texto" && (
                      <>
                        <button
                          onClick={() => setExpandedTexto(expandedTexto === mat.id ? null : mat.id)}
                          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-white border border-border text-sm font-semibold text-emerald-600 hover:bg-emerald-600 hover:text-white transition-all"
                        >
                          {expandedTexto === mat.id ? "✕ Fechar" : "📖 Ler conteúdo"}
                        </button>
                        {expandedTexto === mat.id && (
                          <div className="mt-3 bg-white border border-border rounded-lg p-4 text-text2 text-sm whitespace-pre-wrap leading-relaxed">
                            {mat.conteudo || "Sem conteúdo."}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
