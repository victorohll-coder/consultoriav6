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
          setError("As senhas nao coincidem.");
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
            setError("Este e-mail ja possui conta. Tente fazer login.");
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

      // Check role matches
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError("Erro ao obter usuario.");
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
        setError("Esta conta nao e de profissional.");
        setLoading(false);
        return;
      }

      if (userType === "paciente" && role !== "paciente") {
        await supabase.auth.signOut();
        setError("Esta conta nao e de paciente. Use o login profissional.");
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
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="bg-surface border border-border rounded-2xl p-10 w-full max-w-[400px]">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-[28px] font-bold text-text">
            Consultoria <span className="text-accent">V6</span>
          </h1>
          <p className="text-text2 text-sm mt-1">Sistema de Gestao Nutricional</p>
        </div>

        {/* Supabase not configured warning */}
        {!supabaseReady && (
          <p className="text-warn text-sm bg-warn/10 border border-warn/20 rounded-lg px-3 py-2 mb-4">
            Configure as variaveis NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY no .env.local
          </p>
        )}

        {/* Type selector */}
        {!userType && (
          <div className="flex flex-col gap-3">
            <button
              onClick={() => setUserType("profissional")}
              className="flex items-center justify-center gap-3 bg-surface2 hover:bg-accent text-text hover:text-white border border-border rounded-xl py-4 px-4 transition-all text-[15px] font-semibold"
            >
              <span className="text-xl">&#x1FA7A;</span>
              Sou Profissional
            </button>
            <button
              onClick={() => setUserType("paciente")}
              className="flex items-center justify-center gap-3 bg-surface2 hover:bg-accent text-text hover:text-white border border-border rounded-xl py-4 px-4 transition-all text-[15px] font-semibold"
            >
              <span className="text-xl">&#x1F464;</span>
              Sou Paciente
            </button>
          </div>
        )}

        {/* Login form */}
        {userType && (
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            {/* Toggle buttons */}
            <div className="flex gap-3 mb-2">
              <button
                type="button"
                onClick={() => {
                  setUserType("profissional");
                  setError("");
                  setIsFirstAccess(false);
                }}
                className={`flex-1 py-3 px-3 rounded-xl text-sm font-semibold transition-all border ${
                  userType === "profissional"
                    ? "bg-accent text-white border-accent"
                    : "bg-surface2 text-text2 border-border hover:bg-border"
                }`}
              >
                &#x1FA7A; Profissional
              </button>
              <button
                type="button"
                onClick={() => {
                  setUserType("paciente");
                  setError("");
                  setIsFirstAccess(false);
                }}
                className={`flex-1 py-3 px-3 rounded-xl text-sm font-semibold transition-all border ${
                  userType === "paciente"
                    ? "bg-accent text-white border-accent"
                    : "bg-surface2 text-text2 border-border hover:bg-border"
                }`}
              >
                &#x1F464; Paciente
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-text2 uppercase tracking-wider mb-1.5">
                E-mail
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 bg-bg border border-border rounded-lg text-text text-sm focus:border-accent focus:outline-none transition-colors"
                placeholder="seu@email.com"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-text2 uppercase tracking-wider mb-1.5">
                {isFirstAccess ? "Crie sua senha" : "Senha"}
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-3.5 py-2.5 bg-bg border border-border rounded-lg text-text text-sm focus:border-accent focus:outline-none transition-colors"
                placeholder="••••••••"
              />
            </div>

            {isFirstAccess && (
              <div>
                <label className="block text-xs font-semibold text-text2 uppercase tracking-wider mb-1.5">
                  Confirme a senha
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full px-3.5 py-2.5 bg-bg border border-border rounded-lg text-text text-sm focus:border-accent focus:outline-none transition-colors"
                  placeholder="••••••••"
                />
              </div>
            )}

            {error && (
              <p className="text-danger text-sm bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-accent hover:bg-[#2563eb] text-white font-semibold py-3 rounded-xl text-[15px] transition-colors disabled:opacity-50"
            >
              {loading
                ? "Entrando..."
                : isFirstAccess
                  ? "Criar conta"
                  : "Entrar"}
            </button>

            <button
              type="button"
              onClick={() => {
                setUserType(null);
                setError("");
                setEmail("");
                setPassword("");
                setConfirmPassword("");
                setIsFirstAccess(false);
              }}
              className="text-text3 hover:text-text2 text-sm transition-colors"
            >
              &#8617; Voltar
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
