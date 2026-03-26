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

export default function MateriaisPacientePage() {
  const supabase = createClient();
  const [grouped, setGrouped] = useState<GroupedMat[]>([]);
  const [expandedCat, setExpandedCat] = useState<string | null>(null);
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
      setGrouped(
        Object.entries(map).map(([categoria, items]) => ({ categoria, items }))
      );
      if (Object.keys(map).length > 0) {
        setExpandedCat(Object.keys(map)[0]);
      }
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => { loadData(); }, [loadData]);

  function getYouTubeId(url: string) {
    const match = url.match(/(?:youtu\.be\/|v=|\/embed\/)([a-zA-Z0-9_-]{11})/);
    return match ? match[1] : null;
  }

  if (loading) {
    return <div className="text-text2 text-sm">Carregando materiais...</div>;
  }

  if (grouped.length === 0) {
    return (
      <div className="bg-surface border border-border rounded-xl p-8 text-center">
        <p className="text-3xl mb-2">📁</p>
        <p className="text-text2 text-sm">Nenhum material liberado ainda.</p>
        <p className="text-text3 text-xs mt-1">Seu nutricionista vai liberar os materiais para você.</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-text mb-4">Materiais</h1>

      <div className="flex flex-col gap-3">
        {grouped.map((g) => (
          <div key={g.categoria} className="bg-surface border border-border rounded-xl overflow-hidden">
            {/* Category header */}
            <button
              onClick={() => setExpandedCat(expandedCat === g.categoria ? null : g.categoria)}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-surface2 transition-all"
            >
              <div className="flex items-center gap-3">
                <span className="text-lg">📂</span>
                <span className="text-text font-semibold text-sm">{g.categoria}</span>
                <span className="text-text3 text-xs">{g.items.length} {g.items.length === 1 ? "item" : "itens"}</span>
              </div>
              <span className="text-text3 text-sm">
                {expandedCat === g.categoria ? "▲" : "▼"}
              </span>
            </button>

            {/* Items */}
            {expandedCat === g.categoria && (
              <div className="border-t border-border">
                {g.items.map((mat) => (
                  <div key={mat.id} className="border-b border-border last:border-0 px-5 py-3">
                    <div className="flex items-center gap-3">
                      <span className="text-base">
                        {mat.tipo === "pdf" ? "📎" : mat.tipo === "video" ? "▶️" : mat.tipo === "arquivo" ? "📂" : "📝"}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-text text-sm font-medium truncate">{mat.titulo}</p>
                        <p className="text-text3 text-[10px] uppercase font-mono">{mat.tipo}</p>
                      </div>

                      {(mat.tipo === "pdf" || mat.tipo === "arquivo") && mat.conteudo && (
                        <a
                          href={mat.conteudo}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-accent text-xs font-medium hover:underline"
                        >
                          {mat.tipo === "arquivo" ? "Baixar ↓" : "Abrir PDF ↗"}
                        </a>
                      )}

                      {mat.tipo === "texto" && (
                        <button
                          onClick={() => setExpandedTexto(expandedTexto === mat.id ? null : mat.id)}
                          className="text-accent text-xs font-medium hover:underline"
                        >
                          {expandedTexto === mat.id ? "Fechar" : "Ler"}
                        </button>
                      )}
                    </div>

                    {/* YouTube embed */}
                    {mat.tipo === "video" && mat.conteudo && (
                      <div className="mt-3 rounded-lg overflow-hidden aspect-video">
                        <iframe
                          src={`https://www.youtube.com/embed/${getYouTubeId(mat.conteudo)}`}
                          className="w-full h-full"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      </div>
                    )}

                    {/* Texto content */}
                    {mat.tipo === "texto" && expandedTexto === mat.id && (
                      <div className="mt-3 bg-bg border border-border rounded-lg p-4 text-text2 text-sm whitespace-pre-wrap">
                        {mat.conteudo || "Sem conteúdo."}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
