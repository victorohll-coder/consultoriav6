"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

export default function MinhaAreaPage() {
  const supabase = createClient();
  const [questionarioPendente, setQuestionarioPendente] = useState(false);
  const [anamnesePreenchida, setAnamnesePreenchida] = useState(false);
  const [totalMateriais, setTotalMateriais] = useState(0);
  const [ultimaMedida, setUltimaMedida] = useState<{ peso: number | null; data: string } | null>(null);
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

    const hoje = new Date().toISOString().split("T")[0];
    const { data: questPendente } = await supabase
      .from("questionarios")
      .select("id")
      .eq("paciente_id", paciente.id)
      .is("data_resposta", null)
      .lte("proxima_data", hoje)
      .limit(1);
    setQuestionarioPendente((questPendente?.length || 0) > 0);

    const { data: anamnese } = await supabase
      .from("anamnese")
      .select("id")
      .eq("paciente_id", paciente.id)
      .limit(1);
    setAnamnesePreenchida((anamnese?.length || 0) > 0);

    const { count } = await supabase
      .from("materiais_paciente")
      .select("*", { count: "exact", head: true })
      .eq("paciente_id", paciente.id);
    setTotalMateriais(count || 0);

    const { data: medidas } = await supabase
      .from("medidas")
      .select("peso, data")
      .eq("paciente_id", paciente.id)
      .order("data", { ascending: false })
      .limit(1);
    if (medidas && medidas.length > 0) setUltimaMedida(medidas[0]);

    setLoading(false);
  }, [supabase]);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) {
    return <div className="text-[#475569] text-sm p-6">Carregando...</div>;
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Questionário pendente */}
      {questionarioPendente && (
        <Link href="/minha-area/questionario" className="animate-fade-in-up">
          <div className="relative overflow-hidden rounded-2xl p-5 cursor-pointer transition-all hover:shadow-md border border-[#2563eb]/20" style={{ background: "linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)" }}>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#2563eb] flex items-center justify-center shrink-0 shadow-sm">
                <span className="text-white text-xl">📋</span>
              </div>
              <div className="flex-1">
                <p className="text-[#0f172a] font-semibold text-[15px]">Questionário pendente</p>
                <p className="text-[#475569] text-[13px] mt-0.5">Responda para seu nutricionista acompanhar sua evolução</p>
              </div>
              <span className="text-[#2563eb] text-sm font-semibold shrink-0">Responder →</span>
            </div>
          </div>
        </Link>
      )}

      {/* Anamnese pendente */}
      {!anamnesePreenchida && (
        <Link href="/minha-area/anamnese" className="animate-fade-in-up-d1">
          <div className="relative overflow-hidden rounded-2xl p-5 cursor-pointer transition-all hover:shadow-md border" style={{ background: "linear-gradient(135deg, #fef9ee 0%, #fef3c7 100%)", borderColor: "#c8a96e40" }}>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-sm" style={{ background: "linear-gradient(135deg, #c8a96e 0%, #dbb87a 100%)" }}>
                <span className="text-white text-xl">📄</span>
              </div>
              <div className="flex-1">
                <p className="text-[#0f172a] font-semibold text-[15px]">Preencha sua anamnese</p>
                <p className="text-[#475569] text-[13px] mt-0.5">Importante para montar o melhor plano para você</p>
              </div>
              <span className="text-sm font-semibold shrink-0" style={{ color: "#c8a96e" }}>Preencher →</span>
            </div>
          </div>
        </Link>
      )}

      {/* Cards grid */}
      <div className="grid grid-cols-2 gap-3 animate-fade-in-up-d2">
        <Link href="/minha-area/materiais">
          <div className="bg-white border border-[#e0eaf5] rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-[#2563eb]/30 transition-all cursor-pointer group">
            <div className="w-10 h-10 rounded-xl bg-[#eff6ff] flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <span className="text-lg">📁</span>
            </div>
            <p className="text-2xl font-bold text-[#0f172a]">{totalMateriais}</p>
            <p className="text-[12px] text-[#475569] mt-0.5">Materiais liberados</p>
          </div>
        </Link>

        <Link href="/minha-area/medidas">
          <div className="bg-white border border-[#e0eaf5] rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-[#2563eb]/30 transition-all cursor-pointer group">
            <div className="w-10 h-10 rounded-xl bg-[#ecfdf5] flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <span className="text-lg">⚖️</span>
            </div>
            <p className="text-2xl font-bold text-[#0f172a]">
              {ultimaMedida?.peso ? `${ultimaMedida.peso}kg` : "—"}
            </p>
            <p className="text-[12px] text-[#475569] mt-0.5">Último peso registrado</p>
          </div>
        </Link>

        <Link href="/minha-area/questionario">
          <div className="bg-white border border-[#e0eaf5] rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-[#2563eb]/30 transition-all cursor-pointer group">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 group-hover:scale-105 transition-transform ${questionarioPendente ? "bg-[#fef3c7]" : "bg-[#ecfdf5]"}`}>
              <span className="text-lg">📋</span>
            </div>
            <p className="text-2xl font-bold">
              {questionarioPendente ? (
                <span className="text-[#d97706]">Pendente</span>
              ) : (
                <span className="text-[#059669]">Em dia ✓</span>
              )}
            </p>
            <p className="text-[12px] text-[#475569] mt-0.5">Questionário quinzenal</p>
          </div>
        </Link>

        <Link href="/minha-area/anamnese">
          <div className="bg-white border border-[#e0eaf5] rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-[#2563eb]/30 transition-all cursor-pointer group">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 group-hover:scale-105 transition-transform ${anamnesePreenchida ? "bg-[#ecfdf5]" : "bg-[#fef3c7]"}`}>
              <span className="text-lg">📄</span>
            </div>
            <p className="text-2xl font-bold">
              {anamnesePreenchida ? (
                <span className="text-[#059669]">Feita ✓</span>
              ) : (
                <span className="text-[#d97706]">Pendente</span>
              )}
            </p>
            <p className="text-[12px] text-[#475569] mt-0.5">Anamnese inicial</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
