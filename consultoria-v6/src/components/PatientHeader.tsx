"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface PatientHeaderProps {
  nome: string;
  email: string;
  nomePaciente?: string;
}

const navItems = [
  { href: "/minha-area", label: "Início", icon: "🏠", exact: true },
  { href: "/minha-area/materiais", label: "Materiais", icon: "📁" },
  { href: "/minha-area/medidas", label: "Medidas", icon: "📏" },
  { href: "/minha-area/questionario", label: "Questionário", icon: "📋" },
  { href: "/minha-area/anamnese", label: "Anamnese", icon: "📄" },
];

export default function PatientHeader({ nome, email, nomePaciente }: PatientHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  const displayName = nomePaciente || nome || email.split("@")[0];
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <>
      {/* Top header — navy */}
      <header className="px-4 md:px-8 py-4 flex items-center justify-between" style={{ background: "linear-gradient(135deg, #0f2d52 0%, #1e3a5f 100%)" }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold" style={{ background: "linear-gradient(135deg, #c8a96e 0%, #dbb87a 100%)" }}>
            {initial}
          </div>
          <div>
            <p className="text-white text-[15px] font-semibold">
              Olá, {displayName}
            </p>
            <p className="text-white/40 text-[11px]">Área do Paciente</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, #c8a96e 0%, #dbb87a 100%)" }}>
              <span className="text-white font-bold text-[10px]">V6</span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="text-[13px] text-white/50 hover:text-white/80 transition-colors"
          >
            Sair →
          </button>
        </div>
      </header>

      {/* Desktop tab nav */}
      <nav className="hidden md:flex bg-white border-b border-[#e0eaf5] px-8 gap-1">
        {navItems.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2 px-5 py-3.5 text-[13px] font-medium border-b-2 transition-all ${
                active
                  ? "border-[#2563eb] text-[#2563eb]"
                  : "border-transparent text-[#475569] hover:text-[#0f172a] hover:border-[#e0eaf5]"
              }`}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white shadow-[0_-2px_12px_rgba(0,0,0,0.08)] flex z-50 border-t border-[#e0eaf5]">
        {navItems.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 flex-1 py-2.5 text-[10px] font-medium transition-all ${
                active ? "text-[#2563eb]" : "text-[#9ca3af]"
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
