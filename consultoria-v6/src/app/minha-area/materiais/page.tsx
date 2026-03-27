"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

interface MatDirect {
  id: string;
  titulo: string;
  tipo: "pdf" | "video" | "texto" | "arquivo";
  conteudo: string | null;
  categoria_id: string;
  categorias_material: {
    nome: string;
  };
}

interface GroupedMat {
  categoria: string;
  items: MatDirect[];
}

/* SVG Icons */
const SvgPdf = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/>
    <path d="M10 12h1c1 0 2 .5 2 1.5s-1 1.5-2 1.5h-1v3"/><path d="M16 12v6"/>
  </svg>
);
const SvgVideo = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="5,3 19,12 5,21"/>
  </svg>
);
const SvgText = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/>
    <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
  </svg>
);
const SvgFile = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/>
    <line x1="12" y1="18" x2="12" y2="12"/><polyline points="9,15 12,12 15,15"/>
  </svg>
);
const SvgFolder = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>
  </svg>
);
const SvgDownload = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7,10 12,15 17,10"/><line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
);
const SvgExternalLink = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15,3 21,3 21,9"/><line x1="10" y1="14" x2="21" y2="3"/>
  </svg>
);
const SvgBook = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/>
  </svg>
);
const SvgX = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

const CAT_ICONS: Record<string, JSX.Element> = {};
function getCatIcon() { return <SvgFolder />; }

const TYPE_STYLES: Record<string, { icon: JSX.Element; color: string; bg: string; border: string; label: string }> = {
  pdf: { icon: <SvgPdf />, color: "text-rose-600", bg: "bg-rose-50", border: "border-rose-200/60", label: "PDF" },
  video: { icon: <SvgVideo />, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200/60", label: "Video" },
  texto: { icon: <SvgText />, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200/60", label: "Texto" },
  arquivo: { icon: <SvgFile />, color: "text-slate-600", bg: "bg-slate-50", border: "border-slate-200/60", label: "Arquivo" },
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
    if (!user) { setLoading(false); return; }

    const { data } = await supabase
      .from("materiais")
      .select("id, titulo, tipo, conteudo, categoria_id, categorias_material(nome)")
      .order("ordem");

    if (data) {
      const map: Record<string, MatDirect[]> = {};
      for (const row of data as unknown as MatDirect[]) {
        const cat = row.categorias_material?.nome || "Sem categoria";
        if (!map[cat]) map[cat] = [];
        map[cat].push(row);
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
    return (
      <div className="flex flex-col gap-4">
        <div className="h-8 w-48 shimmer rounded-lg" />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[1,2,3].map(i => <div key={i} className="h-24 shimmer rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[1,2].map(i => <div key={i} className="h-40 shimmer rounded-2xl" />)}
        </div>
      </div>
    );
  }

  if (grouped.length === 0) {
    return (
      <div className="bg-white border border-[#e0eaf5] rounded-2xl p-10 text-center shadow-sm animate-fade-in-up">
        <div className="w-16 h-16 rounded-2xl bg-[#eff6ff] flex items-center justify-center mx-auto mb-4 text-[#94a3b8]">
          <SvgFolder />
        </div>
        <p className="text-[#0f172a] font-semibold text-base">Nenhum material disponivel</p>
        <p className="text-[#94a3b8] text-sm mt-1">Seu nutricionista vai liberar os materiais para voce.</p>
      </div>
    );
  }

  const selectedGroup = grouped.find((g) => g.categoria === selectedCat);

  return (
    <div>
      <h1 className="text-xl font-bold text-[#0f172a] mb-5 animate-fade-in-up" style={{ fontFamily: "var(--font-display)" }}>Seus Materiais</h1>

      {/* Category cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6 animate-fade-in-up-d1">
        {grouped.map((g) => {
          const isActive = selectedCat === g.categoria;
          return (
            <button
              key={g.categoria}
              onClick={() => setSelectedCat(g.categoria)}
              className={`relative p-4 rounded-2xl border-2 text-left transition-all duration-200 hover-lift active-press ${
                isActive
                  ? "border-[#0f2d52] bg-[#0f2d52] shadow-md"
                  : "border-[#e0eaf5] bg-white hover:border-[#c8a96e]/40"
              }`}
            >
              <span className={`block mb-2 ${isActive ? "text-[#c8a96e]" : "text-[#94a3b8]"}`}>{getCatIcon()}</span>
              <p className={`text-sm font-bold truncate ${isActive ? "text-white" : "text-[#0f172a]"}`}>
                {g.categoria}
              </p>
              <p className={`text-xs mt-0.5 ${isActive ? "text-white/50" : "text-[#94a3b8]"}`}>
                {g.items.length} {g.items.length === 1 ? "material" : "materiais"}
              </p>
            </button>
          );
        })}
      </div>

      {/* Material items */}
      {selectedGroup && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 animate-fade-in-up-d2">
          {selectedGroup.items.map((mat, idx) => {
            const style = TYPE_STYLES[mat.tipo] || TYPE_STYLES.arquivo;
            const ytThumb = mat.tipo === "video" && mat.conteudo ? getYouTubeThumb(mat.conteudo) : null;

            return (
              <div
                key={mat.id}
                className={`bg-white border ${style.border} rounded-2xl overflow-hidden hover-lift`}
                style={{ animationDelay: `${idx * 0.05}s` }}
              >
                {/* YouTube thumbnail */}
                {ytThumb && (
                  <div className="relative aspect-video bg-slate-100">
                    <img src={ytThumb} alt={mat.titulo} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                      <div className="w-12 h-12 rounded-full bg-white/95 flex items-center justify-center shadow-lg text-red-600">
                        <SvgVideo />
                      </div>
                    </div>
                  </div>
                )}

                <div className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`w-9 h-9 rounded-lg ${style.bg} flex items-center justify-center shrink-0 ${style.color}`}>
                      {style.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#0f172a] leading-tight">{mat.titulo}</p>
                      <span className={`inline-block text-[9px] font-bold uppercase mt-1.5 px-2 py-0.5 rounded-full tracking-wider ${style.color} ${style.bg}`}>
                        {style.label}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-3">
                    {mat.tipo === "video" && mat.conteudo && (
                      <div className="rounded-xl overflow-hidden aspect-video border border-[#e0eaf5]">
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
                        className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-white border border-[#e0eaf5] text-sm font-semibold text-[#0f2d52] hover:bg-[#0f2d52] hover:text-white hover:border-[#0f2d52] transition-all duration-200 active-press"
                      >
                        <SvgDownload />
                        {mat.tipo === "arquivo" ? "Baixar arquivo" : "Abrir PDF"}
                        <SvgExternalLink />
                      </a>
                    )}

                    {mat.tipo === "texto" && (
                      <>
                        <button
                          onClick={() => setExpandedTexto(expandedTexto === mat.id ? null : mat.id)}
                          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-white border border-emerald-200 text-sm font-semibold text-emerald-700 hover:bg-emerald-600 hover:text-white hover:border-emerald-600 transition-all duration-200 active-press"
                        >
                          {expandedTexto === mat.id ? <><SvgX /> Fechar</> : <><SvgBook /> Ler conteudo</>}
                        </button>
                        {expandedTexto === mat.id && (
                          <div className="mt-3 bg-[#f8fafc] border border-[#e0eaf5] rounded-xl p-4 text-[#475569] text-sm whitespace-pre-wrap leading-relaxed animate-fade-in-up">
                            {mat.conteudo || "Sem conteudo."}
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
