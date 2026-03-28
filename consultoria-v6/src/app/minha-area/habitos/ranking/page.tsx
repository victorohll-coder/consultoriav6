"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

const HABITOS = [
  { slug: "plano_alimentar",  label: "Plano alimentar",   emoji: "🍽️" },
  { slug: "treino",           label: "Treino",             emoji: "🏋️" },
  { slug: "cardio",           label: "Cardio",             emoji: "🏃" },
  { slug: "frutas_verduras",  label: "Frutas e verduras",  emoji: "🥗" },
  { slug: "horas_sono",       label: "Sono reparador",     emoji: "😴" },
  { slug: "agua",             label: "Quantidade de água", emoji: "💧" },
  { slug: "alcool",           label: "Sem álcool",         emoji: "🚫" },
  { slug: "suplementacao",    label: "Suplementação",      emoji: "💊" },
  { slug: "intestino",        label: "Intestino",          emoji: "🟢" },
  { slug: "refeicao_livre",   label: "Sem ref. livre",     emoji: "🍔" },
];

function pad(n: number) { return String(n).padStart(2, "0"); }
function diasNoMes(ano: number, mes: number) { return new Date(ano, mes, 0).getDate(); }

const MESES = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
];

type RankEntry = { nome: string; feitos: number; total: number; pct: number; isMe: boolean };

const medals = ["🥇", "🥈", "🥉"];

export default function RankingPage() {
  const supabase = createClient();
  const hoje = new Date();

  const [myId, setMyId] = useState<string | null>(null);
  const [selectedHabito, setSelectedHabito] = useState<string | null>(null);
  const [ranking, setRanking] = useState<RankEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const ano = hoje.getFullYear();
  const mesNum = hoje.getMonth() + 1;
  const totalDias = diasNoMes(ano, mesNum);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setMyId(user.id);
    });
  }, [supabase]);

  useEffect(() => {
    async function load() {
      if (!myId) return;
      setLoading(true);

      const mesStr = pad(mesNum);
      const ultimoDia = pad(totalDias);

      // Build query
      let query = supabase
        .from("habitos_registros")
        .select("paciente_id, habito, status")
        .gte("dia", `${ano}-${mesStr}-01`)
        .lte("dia", `${ano}-${mesStr}-${ultimoDia}`)
        .eq("status", 1);

      if (selectedHabito) {
        query = query.eq("habito", selectedHabito);
      }

      const { data: allRegs } = await query;
      if (!allRegs || allRegs.length === 0) {
        setRanking([]);
        setLoading(false);
        return;
      }

      const byPaciente: Record<string, number> = {};
      allRegs.forEach((r: { paciente_id: string }) => {
        byPaciente[r.paciente_id] = (byPaciente[r.paciente_id] || 0) + 1;
      });

      const total = selectedHabito ? totalDias : HABITOS.length * totalDias;
      const ids = Object.keys(byPaciente);

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, email")
        .in("id", ids);

      const emails = profiles?.map(p => p.email) || [];
      const { data: pacientesData } = await supabase
        .from("pacientes")
        .select("nome, email")
        .in("email", emails);

      const emailToName: Record<string, string> = {};
      pacientesData?.forEach((p: { nome: string; email: string }) => {
        emailToName[p.email] = p.nome;
      });

      const ranked: RankEntry[] = ids.map(id => {
        const feitos = byPaciente[id];
        const pct = (feitos / total) * 100;
        const profile = profiles?.find(p => p.id === id);
        const nome = profile ? (emailToName[profile.email] || profile.email.split("@")[0]) : "Anônimo";
        const nomeArr = nome.split(" ");
        const nomeDisplay = nomeArr.length > 1 ? `${nomeArr[0]} ${nomeArr[1][0]}.` : nomeArr[0];
        return { nome: nomeDisplay, feitos, total, pct, isMe: id === myId };
      }).sort((a, b) => b.pct - a.pct);

      setRanking(ranked);
      setLoading(false);
    }
    load();
  }, [myId, selectedHabito, supabase, ano, mesNum, totalDias]);

  return (
    <div className="animate-fade-in-up">
      <div className="flex items-center gap-3 mb-4">
        <Link href="/minha-area/habitos" className="w-9 h-9 rounded-xl bg-white border border-[#e0eaf5] flex items-center justify-center text-[#475569] hover:bg-[#f1f5f9] transition-all shadow-sm active:scale-95">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15,18 9,12 15,6"/>
          </svg>
        </Link>
        <div>
          <h1 style={{ fontFamily: "var(--font-display)" }} className="text-xl font-bold text-[#0f172a]">
            🏆 Ranking — {MESES[mesNum - 1]}
          </h1>
          <p className="text-[#475569] text-sm mt-0.5">Veja quem está mandando bem</p>
        </div>
      </div>

      {/* Filtro por hábito */}
      <div className="flex flex-wrap gap-2 mb-5">
        <button
          onClick={() => setSelectedHabito(null)}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border active:scale-95 ${
            !selectedHabito ? "bg-[#0f2d52] text-white border-[#0f2d52]" : "bg-white border-[#e0eaf5] text-[#475569]"
          }`}
        >
          Geral
        </button>
        {HABITOS.map(h => (
          <button
            key={h.slug}
            onClick={() => setSelectedHabito(h.slug)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border active:scale-95 ${
              selectedHabito === h.slug ? "bg-[#0f2d52] text-white border-[#0f2d52]" : "bg-white border-[#e0eaf5] text-[#475569]"
            }`}
          >
            {h.emoji} {h.label}
          </button>
        ))}
      </div>

      {/* Ranking list */}
      {loading ? (
        <div className="flex flex-col gap-2">
          {[1,2,3,4,5].map(i => <div key={i} className="h-14 shimmer rounded-xl" />)}
        </div>
      ) : ranking.length === 0 ? (
        <div className="bg-white border border-[#e0eaf5] rounded-2xl p-10 text-center">
          <p className="text-2xl mb-2">🏆</p>
          <p className="text-[#0f172a] font-semibold">Nenhum registro ainda</p>
          <p className="text-[#94a3b8] text-sm mt-1">Marque seus hábitos para aparecer no ranking!</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {ranking.map((r, i) => (
            <div
              key={i}
              className={`flex items-center justify-between px-4 py-3 rounded-2xl transition-all ${
                r.isMe
                  ? "bg-gradient-to-r from-[#0f2d52]/5 to-[#c8a96e]/10 border-2 border-[#c8a96e]/30 shadow-md"
                  : "bg-white border border-[#e0eaf5] shadow-sm"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl min-w-[32px] text-center font-bold">
                  {i < 3 ? medals[i] : <span className="text-[#94a3b8] text-base">{i + 1}º</span>}
                </span>
                <div>
                  <p className={`text-sm font-bold ${r.isMe ? "text-[#0f2d52]" : "text-[#475569]"}`}>
                    {r.nome} {r.isMe && <span className="text-[#c8a96e]">(você)</span>}
                  </p>
                  <p className="text-[10px] text-[#94a3b8]">{r.feitos} hábitos cumpridos</p>
                </div>
              </div>
              <div className="text-right">
                <p className={`text-lg font-black ${
                  r.pct >= 70 ? "text-[#1D9E75]" : r.pct >= 40 ? "text-[#D4AC0D]" : "text-[#E24B4A]"
                }`}>
                  {r.pct.toFixed(0)}%
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
