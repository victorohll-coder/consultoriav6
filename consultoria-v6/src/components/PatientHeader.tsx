"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface PatientHeaderProps {
  nome: string;
  email: string;
}

const navItems = [
  { href: "/minha-area", label: "Inicio", icon: "🏠", exact: true },
  { href: "/minha-area/materiais", label: "Materiais", icon: "📁" },
  { href: "/minha-area/medidas", label: "Medidas", icon: "📏" },
  { href: "/minha-area/questionario", label: "Questionario", icon: "📋" },
  { href: "/minha-area/anamnese", label: "Anamnese", icon: "📄" },
];

export default function PatientHeader({ nome, email }: PatientHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  const displayName = nome || email.split("@")[0];
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <>
      {/* Top header */}
      <header className="bg-surface border-b border-border px-4 md:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-accent to-accent2 flex items-center justify-center text-white text-sm font-bold">
            {initial}
          </div>
          <div>
            <p className="text-text text-sm font-semibold">Ola, {displayName}!</p>
            <p className="text-text3 text-[11px]">Area do Paciente</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="text-sm text-text3 hover:text-text2 transition-colors"
        >
          ↩ Sair
        </button>
      </header>

      {/* Desktop tab nav */}
      <nav className="hidden md:flex bg-surface border-b border-border px-6 gap-1">
        {navItems.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all ${
                active
                  ? "border-accent text-accent"
                  : "border-transparent text-text2 hover:text-text hover:border-border"
              }`}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-surface border-t border-border flex z-50">
        {navItems.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 flex-1 py-2.5 text-[10px] font-medium transition-all ${
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
