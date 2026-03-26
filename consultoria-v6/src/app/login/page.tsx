"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

type UserType = "profissional" | "paciente";

export default function LoginPage() {
  const [userType, setUserType] = useState<UserType | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isFirstAccess, setIsFirstAccess] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");

  const router = useRouter();

  const supabaseReady =
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_URL.startsWith("http");

  async function handleLogin(e: React.FormEvent) {
    const supabase = createClient();
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isFirstAccess && userType === "paciente") {
        if (password !== confirmPassword) {
          setError("As senhas não coincidem.");
          setLoading(false);
          return;
        }
        if (password.length < 6) {
          setError("A senha deve ter pelo menos 6 caracteres.");
          setLoading(false);
          return;
        }

        const { error: signUpErr } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { role: "paciente", nome: "" },
          },
        });

        if (signUpErr) {
          if (signUpErr.message.includes("already registered")) {
            setError("Este e-mail já possui conta. Tente fazer login.");
            setIsFirstAccess(false);
          } else {
            setError(signUpErr.message);
          }
          setLoading(false);
          return;
        }

        router.push("/minha-area");
        return;
      }

      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInErr) {
        if (
          userType === "paciente" &&
          signInErr.message.includes("Invalid login")
        ) {
          setIsFirstAccess(true);
          setError("Primeiro acesso? Crie sua senha abaixo.");
          setLoading(false);
          return;
        }
        setError("E-mail ou senha incorretos.");
        setLoading(false);
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError("Erro ao obter usuário.");
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      const role = profile?.role || "paciente";

      if (
        userType === "profissional" &&
        role !== "admin" &&
        role !== "profissional"
      ) {
        await supabase.auth.signOut();
        setError("Esta conta não é de profissional.");
        setLoading(false);
        return;
      }

      if (userType === "paciente" && role !== "paciente") {
        await supabase.auth.signOut();
        setError("Esta conta não é de paciente. Use o login profissional.");
        setLoading(false);
        return;
      }

      router.push(role === "paciente" ? "/minha-area" : "/painel/alertas");
    } catch {
      setError("Erro inesperado. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel — navy with brand identity */}
      <div className="hidden lg:flex lg:w-[520px] relative overflow-hidden" style={{ background: "linear-gradient(160deg, #0f2d52 0%, #1e3a5f 60%, #2a4a6f 100%)" }}>
        {/* Decorative elements */}
        <div className="absolute inset-0">
          <div className="absolute top-16 right-12 w-72 h-72 rounded-full border border-white/5" />
          <div className="absolute bottom-24 left-8 w-48 h-48 rounded-full border border-white/5" />
          <div className="absolute top-1/3 left-1/4 w-24 h-24 rounded-full bg-white/[0.03]" />
          <div className="absolute bottom-1/3 right-1/4 w-16 h-1 bg-[#c8a96e]/30 rounded-full" />
        </div>

        <div className="relative z-10 flex flex-col justify-center px-14">
          {/* Brand */}
          <div className="mb-10">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #c8a96e 0%, #dbb87a 100%)" }}>
                <span className="text-white font-bold text-lg">V</span>
              </div>
              <div>
                <h2 className="text-white text-xl font-bold tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
                  Consultoria V6
                </h2>
                <p className="text-white/40 text-[11px] uppercase tracking-[0.15em]">Gestão Nutricional</p>
              </div>
            </div>
          </div>

          {/* Tagline */}
          <h1 className="text-white/90 text-[28px] leading-tight font-medium mb-4" style={{ fontFamily: "var(--font-display)" }}>
            Sua jornada de<br />
            <span style={{ color: "#c8a96e" }}>transformação</span><br />
            começa aqui.
          </h1>
          <p className="text-white/50 text-sm leading-relaxed max-w-[320px]">
            Acompanhamento nutricional personalizado com protocolos baseados em evidências.
          </p>

          {/* Features */}
          <div className="mt-10 flex flex-col gap-4">
            {[
              { icon: "📊", text: "Evolução de medidas e composição corporal" },
              { icon: "📋", text: "Questionários de acompanhamento quinzenal" },
              { icon: "📁", text: "Materiais exclusivos do seu protocolo" },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-lg">{item.icon}</span>
                <span className="text-white/60 text-[13px]">{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-8 bg-[#f8fafc]">
        <div className="w-full max-w-[420px]">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #c8a96e 0%, #dbb87a 100%)" }}>
                <span className="text-white font-bold text-base">V</span>
              </div>
              <h1 className="text-[22px] font-bold text-[#0f172a]" style={{ fontFamily: "var(--font-display)" }}>
                Consultoria V6
              </h1>
            </div>
            <p className="text-[#475569] text-sm">Gestão Nutricional</p>
          </div>

          {/* Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-[#e0eaf5] p-8 lg:p-10">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-[#0f172a]" style={{ fontFamily: "var(--font-display)" }}>
                Bem-vindo
              </h2>
              <p className="text-[#475569] text-sm mt-1">
                {!userType ? "Como deseja acessar?" : userType === "profissional" ? "Acesso profissional" : isFirstAccess ? "Crie sua senha de acesso" : "Acesso do paciente"}
              </p>
            </div>

            {!supabaseReady && (
              <p className="text-[#d97706] text-sm bg-[#d97706]/10 border border-[#d97706]/20 rounded-xl px-4 py-3 mb-4">
                Configure as variáveis NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY
              </p>
            )}

            {/* Type selector */}
            {!userType && (
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => setUserType("profissional")}
                  className="group flex items-center gap-4 bg-white hover:bg-[#f0f6ff] border-2 border-[#e0eaf5] hover:border-[#2563eb] rounded-xl py-4 px-5 transition-all"
                >
                  <div className="w-11 h-11 rounded-xl bg-[#0f2d52] flex items-center justify-center shrink-0">
                    <span className="text-white text-lg">🩺</span>
                  </div>
                  <div className="text-left">
                    <p className="text-[15px] font-semibold text-[#0f172a]">Sou Profissional</p>
                    <p className="text-[12px] text-[#475569]">Acesso ao painel de gestão</p>
                  </div>
                </button>
                <button
                  onClick={() => setUserType("paciente")}
                  className="group flex items-center gap-4 bg-white hover:bg-[#f0f6ff] border-2 border-[#e0eaf5] hover:border-[#2563eb] rounded-xl py-4 px-5 transition-all"
                >
                  <div className="w-11 h-11 rounded-xl bg-[#2563eb] flex items-center justify-center shrink-0">
                    <span className="text-white text-lg">👤</span>
                  </div>
                  <div className="text-left">
                    <p className="text-[15px] font-semibold text-[#0f172a]">Sou Paciente</p>
                    <p className="text-[12px] text-[#475569]">Minha área de acompanhamento</p>
                  </div>
                </button>
              </div>
            )}

            {/* Login form */}
            {userType && (
              <form onSubmit={handleLogin} className="flex flex-col gap-4">
                {/* Toggle */}
                <div className="flex gap-2 p-1 bg-[#f1f5f9] rounded-xl mb-1">
                  <button
                    type="button"
                    onClick={() => { setUserType("profissional"); setError(""); setIsFirstAccess(false); }}
                    className={`flex-1 py-2.5 rounded-lg text-[13px] font-semibold transition-all ${
                      userType === "profissional"
                        ? "bg-white text-[#0f172a] shadow-sm"
                        : "text-[#475569] hover:text-[#0f172a]"
                    }`}
                  >
                    Profissional
                  </button>
                  <button
                    type="button"
                    onClick={() => { setUserType("paciente"); setError(""); setIsFirstAccess(false); }}
                    className={`flex-1 py-2.5 rounded-lg text-[13px] font-semibold transition-all ${
                      userType === "paciente"
                        ? "bg-white text-[#0f172a] shadow-sm"
                        : "text-[#475569] hover:text-[#0f172a]"
                    }`}
                  >
                    Paciente
                  </button>
                </div>

                <div>
                  <label className="block text-[13px] font-semibold text-[#0f172a] mb-1.5">E-mail</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full px-4 py-3 bg-white border border-[#e0eaf5] rounded-xl text-[#0f172a] text-sm focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/10 focus:outline-none transition-all placeholder:text-[#9ca3af]"
                    placeholder="seu@email.com"
                  />
                </div>

                <div>
                  <label className="block text-[13px] font-semibold text-[#0f172a] mb-1.5">
                    {isFirstAccess ? "Crie sua senha" : "Senha"}
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full px-4 py-3 bg-white border border-[#e0eaf5] rounded-xl text-[#0f172a] text-sm focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/10 focus:outline-none transition-all placeholder:text-[#9ca3af]"
                    placeholder="••••••••"
                  />
                </div>

                {isFirstAccess && (
                  <div>
                    <label className="block text-[13px] font-semibold text-[#0f172a] mb-1.5">Confirme a senha</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      minLength={6}
                      className="w-full px-4 py-3 bg-white border border-[#e0eaf5] rounded-xl text-[#0f172a] text-sm focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/10 focus:outline-none transition-all placeholder:text-[#9ca3af]"
                      placeholder="••••••••"
                    />
                  </div>
                )}

                {error && (
                  <div className={`text-sm rounded-xl px-4 py-3 ${
                    error.includes("Primeiro acesso")
                      ? "text-[#2563eb] bg-[#2563eb]/5 border border-[#2563eb]/20"
                      : "text-[#dc2626] bg-[#dc2626]/5 border border-[#dc2626]/20"
                  }`}>
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full text-white font-semibold py-3.5 rounded-xl text-[15px] transition-all disabled:opacity-50 shadow-sm hover:shadow-md"
                  style={{ background: "linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)" }}
                >
                  {loading ? "Entrando..." : isFirstAccess ? "Criar conta" : "Entrar"}
                </button>

                <button
                  type="button"
                  onClick={() => { setUserType(null); setError(""); setEmail(""); setPassword(""); setConfirmPassword(""); setIsFirstAccess(false); }}
                  className="text-[#475569] hover:text-[#0f172a] text-sm transition-colors text-center"
                >
                  ← Voltar
                </button>
              </form>
            )}
          </div>

          {/* Footer */}
          <p className="text-center text-[11px] text-[#9ca3af] mt-6">
            Consultoria V6 · Victor Ohl · Gestão Nutricional
          </p>
        </div>
      </div>
    </div>
  );
}
