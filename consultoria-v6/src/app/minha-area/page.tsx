"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

export default function MinhaAreaPage() {
  const supabase = createClient();
  const [pacienteId, setPacienteId] = useState<string | null>(null);
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

    setPacienteId(paciente.id);

    // Check questionario pendente
    const hoje = new Date().toISOString().split("T")[0];
    const { data: questPendente } = await supabase
      .from("questionarios")
      .select("id")
      .eq("paciente_id", paciente.id)
      .is("data_resposta", null)
      .lte("proxima_data", hoje)
      .limit(1);
    setQuestionarioPendente((questPendente?.length || 0) > 0);

    // Check anamnese
    const { data: anamnese } = await supabase
      .from("anamnese")
      .select("id")
      .eq("paciente_id", paciente.id)
      .limit(1);
    setAnamnesePreenchida((anamnese?.length || 0) > 0);

    // Count materiais liberados
    const { count } = await supabase
      .from("materiais_paciente")
      .select("*", { count: "exact", head: true })
      .eq("paciente_id", paciente.id);
    setTotalMateriais(count || 0);

    // Ultima medida
    const { data: medidas } = await supabase
      .from("medidas")
      .select("peso, data")
      .eq("paciente_id", paciente.id)
      .order("data", { ascending: false })
      .limit(1);
    if (medidas && medidas.length > 0) {
      setUltimaMedida(medidas[0]);
    }

    setLoading(false);
  }, [supabase]);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) {
    return <div className="text-text2 text-sm">Carregando...</div>;
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Banner questionario pendente */}
      {questionarioPendente && (
        <Link href="/minha-area/questionario">
          <div className="bg-gradient-to-r from-accent/20 to-accent2/20 border border-accent/30 rounded-xl p-5 cursor-pointer hover:border-accent/50 transition-all">
            <div className="flex items-center gap-3">
              <span className="text-2xl">📋</span>
              <div>
                <p className="text-text font-semibold text-sm">Questionario pendente!</p>
                <p className="text-text2 text-xs">Responda agora para seu nutricionista acompanhar sua evolucao.</p>
              </div>
              <span className="ml-auto text-accent text-sm font-medium">Responder →</span>
            </div>
          </div>
        </Link>
      )}

      {/* Banner anamnese */}
      {!anamnesePreenchida && (
        <Link href="/minha-area/anamnese">
          <div className="bg-gradient-to-r from-warn/20 to-danger/20 border border-warn/30 rounded-xl p-5 cursor-pointer hover:border-warn/50 transition-all">
            <div className="flex items-center gap-3">
              <span className="text-2xl">📄</span>
              <div>
                <p className="text-text font-semibold text-sm">Preencha sua anamnese!</p>
                <p className="text-text2 text-xs">Importante para o seu nutricionista te conhecer melhor.</p>
              </div>
              <span className="ml-auto text-warn text-sm font-medium">Preencher →</span>
            </div>
          </div>
        </Link>
      )}

      {/* Cards grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Link href="/minha-area/materiais">
          <div className="bg-surface border border-border rounded-xl p-4 hover:border-accent/40 transition-all cursor-pointer">
            <p className="text-2xl mb-2">📁</p>
            <p className="text-xl font-bold text-text">{totalMateriais}</p>
            <p className="text-[11px] text-text3">Materiais liberados</p>
          </div>
        </Link>

        <Link href="/minha-area/medidas">
          <div className="bg-surface border border-border rounded-xl p-4 hover:border-accent/40 transition-all cursor-pointer">
            <p className="text-2xl mb-2">📏</p>
            <p className="text-xl font-bold text-text">
              {ultimaMedida?.peso ? `${ultimaMedida.peso}kg` : "—"}
            </p>
            <p className="text-[11px] text-text3">Ultimo peso</p>
          </div>
        </Link>

        <Link href="/minha-area/questionario">
          <div className="bg-surface border border-border rounded-xl p-4 hover:border-accent/40 transition-all cursor-pointer">
            <p className="text-2xl mb-2">📋</p>
            <p className="text-xl font-bold text-text">
              {questionarioPendente ? (
                <span className="text-warn">Pendente</span>
              ) : (
                <span className="text-accent2">Em dia</span>
              )}
            </p>
            <p className="text-[11px] text-text3">Questionario</p>
          </div>
        </Link>

        <Link href="/minha-area/anamnese">
          <div className="bg-surface border border-border rounded-xl p-4 hover:border-accent/40 transition-all cursor-pointer">
            <p className="text-2xl mb-2">📄</p>
            <p className="text-xl font-bold text-text">
              {anamnesePreenchida ? (
                <span className="text-accent2">✓</span>
              ) : (
                <span className="text-warn">Pendente</span>
              )}
            </p>
            <p className="text-[11px] text-text3">Anamnese</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
