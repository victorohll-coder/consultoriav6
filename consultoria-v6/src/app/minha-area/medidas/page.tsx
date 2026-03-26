"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Medida } from "@/lib/types";

function fmtData(d: string) {
  return new Date(d).toLocaleDateString("pt-BR");
}

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

    ctx.strokeStyle = "#1e40af";
    ctx.lineWidth = 2;
    ctx.lineJoin = "round";
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
    ctx.fillStyle = "rgba(30, 64, 175, 0.08)";
    ctx.fill();

    // Dots
    values.forEach((v, i) => {
      const x = (i / (values.length - 1)) * w;
      const y = h - ((v - min) / range) * h;
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fillStyle = "#1e40af";
      ctx.fill();
    });
  }, [medidas, campo]);

  if (medidas.length < 2) {
    return <p className="text-text3 text-xs text-center py-4">Mínimo 2 medidas para gráfico.</p>;
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

  if (loading) return <div className="text-text2 text-sm">Carregando medidas...</div>;

  return (
    <div>
      <h1 className="text-xl font-bold text-text mb-4">Minhas Medidas</h1>

      {medidas.length === 0 ? (
        <div className="bg-surface border border-border rounded-xl p-8 text-center">
          <p className="text-3xl mb-2">📏</p>
          <p className="text-text2 text-sm">Nenhuma medida registrada ainda.</p>
          <p className="text-text3 text-xs mt-1">Seu nutricionista vai lançar suas medidas.</p>
        </div>
      ) : (
        <>
          {/* Campo selector */}
          <div className="flex flex-wrap gap-2 mb-4">
            {CAMPOS.map((c) => (
              <button
                key={c.key}
                onClick={() => setSelectedCampo(c.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                  selectedCampo === c.key
                    ? "bg-accent text-white border-accent"
                    : "bg-surface border-border text-text2 hover:border-accent/40"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          {/* Chart */}
          <div className="bg-surface border border-border rounded-xl p-5 mb-4">
            <h2 className="text-sm font-semibold text-text mb-3">
              Evolução: {CAMPOS.find((c) => c.key === selectedCampo)?.label}
            </h2>
            <MiniChart medidas={medidas} campo={selectedCampo} />
          </div>

          {/* Comparativo */}
          {primeira && ultima && (
            <div className="bg-surface border border-border rounded-xl p-5 mb-4">
              <h2 className="text-sm font-semibold text-text mb-3">Comparativo: Primeira x Última</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {CAMPOS.map((c) => {
                  const v1 = Number(primeira[c.key]) || 0;
                  const v2 = Number(ultima[c.key]) || 0;
                  if (v1 === 0 && v2 === 0) return null;
                  const diff = v2 - v1;
                  return (
                    <div key={c.key} className="bg-bg border border-border rounded-lg p-3">
                      <p className="text-[10px] text-text3 uppercase mb-1">{c.label}</p>
                      <p className="text-text text-sm font-bold">
                        {v1}{c.unit} → {v2}{c.unit}
                      </p>
                      <p className={`text-xs font-semibold ${
                        diff < 0 ? "text-accent2" : diff > 0 ? "text-danger" : "text-text3"
                      }`}>
                        {diff > 0 ? "+" : ""}{diff.toFixed(1)}{c.unit}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Histórico */}
          <div className="bg-surface border border-border rounded-xl p-5">
            <h2 className="text-sm font-semibold text-text mb-3">Histórico</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-2 text-text3 font-medium">Data</th>
                    {CAMPOS.map((c) => (
                      <th key={c.key} className="text-right py-2 px-2 text-text3 font-medium">{c.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...medidas].reverse().map((m) => (
                    <tr key={m.id} className="border-b border-border/50">
                      <td className="py-2 px-2 text-text2">{fmtData(m.data)}</td>
                      {CAMPOS.map((c) => (
                        <td key={c.key} className="text-right py-2 px-2 text-text">
                          {m[c.key] ? `${m[c.key]}${c.unit}` : "—"}
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
