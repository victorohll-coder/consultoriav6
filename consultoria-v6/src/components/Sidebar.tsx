"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";

const navItems = [
  { href: "/painel/alertas", label: "Alertas", icon: "\uD83D\uDD14" },
  { href: "/painel/pacientes", label: "Pacientes", icon: "\uD83D\uDC64" },
  { href: "/painel/financeiro", label: "Financeiro", icon: "\uD83D\uDCB0" },
  { href: "/painel/protocolos", label: "Protocolos", icon: "\uD83D\uDCCB" },
  { href: "/painel/materiais", label: "Materiais", icon: "\uD83D\uDCC1" },
  { href: "/painel/questionarios", label: "Questionários", icon: "\uD83D\uDCCA" },
  { href: "/painel/medidas", label: "Medidas", icon: "\uD83D\uDCCF" },
  { href: "/painel/anamnese", label: "Anamnese", icon: "\uD83D\uDCC4" },
  { href: "/painel/usuarios", label: "Usuários", icon: "\uD83D\uDC65", adminOnly: true },
];

interface SidebarProps {
  profile: Profile;
}

export default function Sidebar({ profile }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const isAdmin = profile.role === "admin";
  const isUser = profile.role === "profissional";

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 h-screen w-[220px] bg-surface shadow-[2px_0_8px_rgba(0,0,0,0.04)] flex-col py-6 px-4 z-50">
        {/* Logo */}
        <div className="mb-6">
          <h1 className="text-lg font-bold text-text">
            Consultoria <span className="text-accent">V6</span>
          </h1>
          <p className="text-[11px] text-text3 mt-0.5">Gestão Nutricional</p>
        </div>

        {/* Nav */}
        <nav className="flex flex-col gap-1 flex-1">
          {navItems.map((item) => {
            if (item.adminOnly && !isAdmin) return null;
            // Hide financeiro and usuarios for non-admin profissional
            if (item.href === "/painel/financeiro" && isUser) return null;

            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  active
                    ? "bg-accent text-white"
                    : "text-text2 hover:bg-surface2 hover:text-text"
                }`}
              >
                <span className="text-base">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-surface2 pt-4 mt-4">
          <p className="text-xs text-text2 truncate">{profile.email}</p>
          <p className="text-[10px] font-semibold text-text3 uppercase mt-1">
            {profile.role === "admin" ? "ADMIN" : "USUÁRIO"}
          </p>
          <button
            onClick={handleLogout}
            className="mt-3 text-sm text-text3 hover:text-text2 transition-colors"
          >
            &#8617; Sair
          </button>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-surface shadow-[0_-2px_8px_rgba(0,0,0,0.06)] flex overflow-x-auto z-50">
        {navItems.map((item) => {
          if (item.adminOnly && !isAdmin) return null;
          if (item.href === "/painel/financeiro" && isUser) return null;

          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 flex-1 min-w-[64px] py-2.5 text-[10px] font-medium transition-all ${
                active ? "text-accent" : "text-text3"
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
