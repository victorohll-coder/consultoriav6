"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Medida } from "@/lib/types";

function fmtData(d: string) {
  return new Date(d).toLocaleDateString("pt-BR");
}

/* SVG Icons */
const SvgRuler = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21.3 15.3a2.4 2.4 0 010 3.4l-2.6 2.6a2.4 2.4 0 01-3.4 0L2.7 8.7a2.4 2.4 0 010-3.4l2.6-2.6a2.4 2.4 0 013.4 0z"/>
    <path d="M14.5 12.5l2-2M11.5 9.5l2-2M8.5 6.5l2-2"/>
  </svg>
);
const SvgTrendDown = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23,18 13.5,8.5 8.5,13.5 1,6"/><polyline points="17,18 23,18 23,12"/>
  </svg>
);
const SvgTrendUp = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23,6 13.5,15.5 8.5,10.5 1,18"/><polyline points="17,6 23,6 23,12"/>
  </svg>
);

function MiniChart({ medidas, campo }: { medidas: Medida[]; campo: keyof Medida }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || medidas.length < 2) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const values = medidas.map((m) => Number(m[campo]) || 0).filter((v) => v > 0);
    if (values.length < 2) return;

    const min = Math.min(...values) * 0.95;
    const max = Math.max(...values) * 1.05;
    const range = max - min || 1;

    // Gradient fill
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, "rgba(15, 45, 82, 0.12)");
    grad.addColorStop(1, "rgba(15, 45, 82, 0.01)");

    ctx.strokeStyle = "#0f2d52";
    ctx.lineWidth = 2.5;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.beginPath();

    values.forEach((v, i) => {
      const x = (i / (values.length - 1)) * w;
      const y = h - ((v - min) / range) * h;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });

    ctx.stroke();

    // Fill area
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Dots with gold accent on last point
    values.forEach((v, i) => {
      const x = (i / (values.length - 1)) * w;
      const y = h - ((v - min) / range) * h;
      ctx.beginPath();
      ctx.arc(x, y, i === values.length - 1 ? 5 : 3, 0, Math.PI * 2);
      ctx.fillStyle = i === values.length - 1 ? "#c8a96e" : "#0f2d52";
      ctx.fill();
      if (i === values.length - 1) {
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    });
  }, [medidas, campo]);

  if (medidas.length < 2) {
    return <p className="text-[#94a3b8] text-xs text-center py-6">Mínimo 2 medidas para gráfico.</p>;
  }

  return <canvas ref={canvasRef} width={400} height={160} className="w-full h-40" />;
}

const CAMPOS: { key: keyof Medida; label: string; unit: string }[] = [
  { key: "peso", label: "Peso", unit: "kg" },
  { key: "cintura", label: "Cintura", unit: "cm" },
  { key: "abdominal", label: "Abdômen", unit: "cm" },
  { key: "quadril", label: "Quadril", unit: "cm" },
];

export default function MedidasPacientePage() {
  const supabase = createClient();
  const [medidas, setMedidas] = useState<Medida[]>([]);
  const [selectedCampo, setSelectedCampo] = useState<keyof Medida>("peso");
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
      .from("medidas")
      .select("*")
      .eq("paciente_id", paciente.id)
      .order("data", { ascending: true });

    if (data) setMedidas(data as Medida[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { loadData(); }, [loadData]);

  const primeira = medidas.length > 0 ? medidas[0] : null;
  const ultima = medidas.length > 1 ? medidas[medidas.length - 1] : null;

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="h-8 w-48 shimmer rounded-lg" />
        <div className="flex gap-2">{[1,2,3,4].map(i => <div key={i} className="h-9 w-20 shimmer rounded-xl" />)}</div>
        <div className="h-52 shimmer rounded-2xl" />
      </div>
    );
  }

  return (
    <div>
      <h1 style={{fontFamily:"var(--font-display)"}} className="text-xl font-bold text-[#0f172a] mb-4 animate-fade-in-up">Minhas Medidas</h1>

      {medidas.length === 0 ? (
        <div className="bg-white border border-[#e0eaf5] rounded-2xl p-10 text-center shadow-sm animate-fade-in-up">
          <div className="w-16 h-16 rounded-2xl bg-[#eff6ff] flex items-center justify-center mx-auto mb-4 text-[#94a3b8]">
            <SvgRuler />
          </div>
          <p className="text-[#0f172a] font-semibold text-base">Nenhuma medida registrada ainda</p>
          <p className="text-[#94a3b8] text-sm mt-1">Seu nutricionista vai lançar suas medidas.</p>
        </div>
      ) : (
        <>
          {/* Campo selector */}
          <div className="flex flex-wrap gap-2 mb-4 animate-fade-in-up-d1">
            {CAMPOS.map((c) => (
              <button
                key={c.key}
                onClick={() => setSelectedCampo(c.key)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 border active-press ${
                  selectedCampo === c.key
                    ? "bg-[#0f2d52] text-white border-[#0f2d52] shadow-sm"
                    : "bg-white border-[#e0eaf5] text-[#475569] hover:border-[#c8a96e]/40"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          {/* Chart */}
          <div className="bg-white border border-[#e0eaf5] rounded-2xl p-5 mb-4 shadow-sm animate-fade-in-up-d2">
            <h2 className="text-xs font-bold text-[#0f2d52] mb-3 uppercase tracking-wider">
              Evolução: {CAMPOS.find((c) => c.key === selectedCampo)?.label}
            </h2>
            <MiniChart medidas={medidas} campo={selectedCampo} />
          </div>

          {/* Comparativo */}
          {primeira && ultima && (
            <div className="bg-white border border-[#e0eaf5] rounded-2xl p-5 mb-4 shadow-sm animate-fade-in-up-d3">
              <h2 className="text-xs font-bold text-[#0f2d52] mb-3 uppercase tracking-wider">Primeira x Ultima</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {CAMPOS.map((c) => {
                  const v1 = Number(primeira[c.key]) || 0;
                  const v2 = Number(ultima[c.key]) || 0;
                  if (v1 === 0 && v2 === 0) return null;
                  const diff = v2 - v1;
                  return (
                    <div key={c.key} className="bg-[#f8fafc] border border-[#e0eaf5] rounded-xl p-3">
                      <p className="text-[9px] text-[#94a3b8] uppercase font-bold tracking-wider mb-1">{c.label}</p>
                      <p className="text-[#0f172a] text-sm font-bold">
                        {v1}{c.unit} <span className="text-[#94a3b8] font-normal mx-0.5">&rarr;</span> {v2}{c.unit}
                      </p>
                      <div className={`flex items-center gap-1 text-xs font-bold mt-0.5 ${
                        diff < 0 ? "text-emerald-600" : diff > 0 ? "text-rose-500" : "text-[#94a3b8]"
                      }`}>
                        {diff < 0 ? <SvgTrendDown /> : diff > 0 ? <SvgTrendUp /> : null}
                        {diff > 0 ? "+" : ""}{diff.toFixed(1)}{c.unit}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Historico */}
          <div className="bg-white border border-[#e0eaf5] rounded-2xl p-5 shadow-sm animate-fade-in-up-d4">
            <h2 className="text-xs font-bold text-[#0f2d52] mb-3 uppercase tracking-wider">Histórico</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[#e0eaf5]">
                    <th className="text-left py-2.5 px-2 text-[#94a3b8] font-bold text-[10px] uppercase tracking-wider">Data</th>
                    {CAMPOS.map((c) => (
                      <th key={c.key} className="text-right py-2.5 px-2 text-[#94a3b8] font-bold text-[10px] uppercase tracking-wider">{c.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...medidas].reverse().map((m, i) => (
                    <tr key={m.id} className={`border-b border-[#e0eaf5]/40 ${i === 0 ? "bg-[#fefbf3]" : ""}`}>
                      <td className="py-2.5 px-2 text-[#475569] font-medium">
                        {fmtData(m.data)}
                        {i === 0 && <span className="ml-1.5 text-[8px] font-bold text-[#c8a96e] uppercase">Mais recente</span>}
                      </td>
                      {CAMPOS.map((c) => (
                        <td key={c.key} className="text-right py-2.5 px-2 text-[#0f172a] font-semibold">
                          {m[c.key] ? `${m[c.key]}${c.unit}` : "\u2014"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
