"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import Modal from "@/components/Modal";
import type { Profile } from "@/lib/types";

export default function UsuariosPage() {
  const supabase = createClient();
  const [users, setUsers] = useState<Profile[]>([]);
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Form
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [role, setRole] = useState<"admin" | "profissional">("profissional");

  const loadUsers = useCallback(async () => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .in("role", ["admin", "profissional"])
      .order("created_at", { ascending: true });

    if (data) setUsers(data as Profile[]);
  }, [supabase]);

  useEffect(() => {
    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();
        if (profile) setCurrentProfile(profile as Profile);
      }
      loadUsers();
    }
    init();
  }, [supabase, loadUsers]);

  // Guard: only admin
  if (currentProfile && currentProfile.role !== "admin") {
    return (
      <div>
        <h1 className="text-xl font-bold text-text mb-6">Acesso negado</h1>
        <div className="bg-surface border border-border rounded-xl p-6 text-text2 text-sm">
          Apenas administradores podem acessar esta página.
        </div>
      </div>
    );
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      // Create user via Supabase auth signUp
      const { data, error: signUpErr } = await supabase.auth.signUp({
        email,
        password: senha,
        options: {
          data: { nome, role },
        },
      });

      if (signUpErr) {
        setError(signUpErr.message);
        setLoading(false);
        return;
      }

      if (data.user) {
        // Update profile name if trigger didn't catch it
        await supabase
          .from("profiles")
          .update({ nome, role })
          .eq("id", data.user.id);
      }

      setSuccess("Usuário criado com sucesso!");
      setNome("");
      setEmail("");
      setSenha("");
      setRole("profissional");
      loadUsers();

      setTimeout(() => {
        setModalOpen(false);
        setSuccess("");
      }, 1500);
    } catch {
      setError("Erro ao criar usuário.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-text">Usuários</h1>
        <button
          onClick={() => {
            setModalOpen(true);
            setError("");
            setSuccess("");
          }}
          className="bg-accent hover:bg-[#172e8a] text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          + Novo Usuário
        </button>
      </div>

      {/* Users table */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left px-4 py-3 text-[11px] font-semibold text-text3 uppercase tracking-wider">
                Nome
              </th>
              <th className="text-left px-4 py-3 text-[11px] font-semibold text-text3 uppercase tracking-wider">
                E-mail
              </th>
              <th className="text-left px-4 py-3 text-[11px] font-semibold text-text3 uppercase tracking-wider">
                Permissão
              </th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr
                key={u.id}
                className="border-b border-border last:border-0 hover:bg-surface2 transition-colors"
              >
                <td className="px-4 py-3 text-sm text-text">
                  {u.nome || "-"}
                </td>
                <td className="px-4 py-3 text-sm text-text2">{u.email}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-semibold font-mono ${
                      u.role === "admin"
                        ? "bg-accent/20 text-accent"
                        : "bg-accent2/20 text-accent2"
                    }`}
                  >
                    {u.role === "admin" ? "ADMIN" : "USUÁRIO"}
                  </span>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td
                  colSpan={3}
                  className="px-4 py-8 text-center text-text3 text-sm"
                >
                  Nenhum usuário encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Create modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Novo Usuário"
        footer={
          <>
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="bg-surface2 hover:bg-border text-text text-sm font-semibold px-4 py-2 rounded-lg border border-border transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              form="user-form"
              disabled={loading}
              className="bg-accent hover:bg-[#172e8a] text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? "Criando..." : "Criar"}
            </button>
          </>
        }
      >
        <form
          id="user-form"
          onSubmit={handleCreate}
          className="flex flex-col gap-4"
        >
          <div>
            <label className="block text-xs font-semibold text-text2 uppercase tracking-wider mb-1.5">
              Nome
            </label>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              required
              className="w-full px-3 py-2.5 bg-bg border border-border rounded-lg text-text text-sm focus:border-accent focus:outline-none transition-colors"
            />
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
              className="w-full px-3 py-2.5 bg-bg border border-border rounded-lg text-text text-sm focus:border-accent focus:outline-none transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-text2 uppercase tracking-wider mb-1.5">
              Senha
            </label>
            <input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
              minLength={6}
              className="w-full px-3 py-2.5 bg-bg border border-border rounded-lg text-text text-sm focus:border-accent focus:outline-none transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-text2 uppercase tracking-wider mb-1.5">
              Permissão
            </label>
            <select
              value={role}
              onChange={(e) =>
                setRole(e.target.value as "admin" | "profissional")
              }
              className="w-full px-3 py-2.5 bg-bg border border-border rounded-lg text-text text-sm focus:border-accent focus:outline-none transition-colors"
            >
              <option value="profissional">Usuário</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          {error && (
            <p className="text-danger text-sm bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
          {success && (
            <p className="text-accent2 text-sm bg-accent2/10 border border-accent2/20 rounded-lg px-3 py-2">
              {success}
            </p>
          )}
        </form>
      </Modal>
    </div>
  );
}
