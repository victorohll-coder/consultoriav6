"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface PatientHeaderProps {
  nome: string;
  email: string;
  nomePaciente?: string;
}

/* SVG Icons — clean, modern, no emojis */
const icons = {
  habits: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/>
      <path d="M16 2v4M8 2v4M3 10h18"/>
      <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01"/>
    </svg>
  ),
  home: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"/>
      <path d="M9 21V12h6v9"/>
    </svg>
  ),
  folder: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>
    </svg>
  ),
  ruler: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21.3 15.3a2.4 2.4 0 010 3.4l-2.6 2.6a2.4 2.4 0 01-3.4 0L2.7 8.7a2.4 2.4 0 010-3.4l2.6-2.6a2.4 2.4 0 013.4 0z"/>
      <path d="M14.5 12.5l2-2M11.5 9.5l2-2M8.5 6.5l2-2"/>
    </svg>
  ),
  clipboard: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="8" y="2" width="8" height="4" rx="1"/>
      <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/>
      <path d="M12 11h4M12 16h4M8 11h.01M8 16h.01"/>
    </svg>
  ),
  fileText: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
      <polyline points="14,2 14,8 20,8"/>
      <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/>
    </svg>
  ),
  community: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
    </svg>
  ),
  logout: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16,17 21,12 16,7"/><line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  ),
};

const navItems = [
  { href: "/minha-area", label: "Início", icon: icons.home, exact: true },
  { href: "/minha-area/habitos", label: "Hábitos", icon: icons.habits },
  { href: "/minha-area/comunidade", label: "Comunidade", icon: icons.community },
  { href: "/minha-area/materiais", label: "Materiais", icon: icons.folder },
  { href: "/minha-area/medidas", label: "Medidas", icon: icons.ruler },
  { href: "/minha-area/questionario", label: "Questionário", icon: icons.clipboard },
  { href: "/minha-area/anamnese", label: "Anamnese", icon: icons.fileText },
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
  const initials = displayName.split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase();

  return (
    <>
      {/* Top header — deep navy with subtle gradient */}
      <header className="px-4 md:px-8 py-4 flex items-center justify-between relative overflow-hidden" style={{ background: "linear-gradient(135deg, #0a1e3d 0%, #0f2d52 40%, #163a5f 100%)" }}>
        {/* Decorative subtle glow */}
        <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full opacity-[0.04]" style={{ background: "radial-gradient(circle, #c8a96e 0%, transparent 70%)" }} />

        <div className="flex items-center gap-3 relative z-10">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold tracking-wide shadow-lg" style={{ background: "linear-gradient(135deg, #c8a96e 0%, #dbb87a 50%, #e8c98a 100%)", color: "#0f2d52" }}>
            {initials}
          </div>
          <div>
            <p className="text-white text-[15px] font-semibold tracking-tight">
              {displayName}
            </p>
            <p className="text-white/30 text-[10px] uppercase tracking-[0.2em] font-medium">Área do Paciente</p>
          </div>
        </div>
        <div className="flex items-center gap-4 relative z-10">
          <div className="hidden sm:flex items-center gap-1.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center shadow-sm" style={{ background: "linear-gradient(135deg, #c8a96e 0%, #dbb87a 100%)" }}>
              <span className="font-bold text-[9px] tracking-wider" style={{ color: "#0f2d52" }}>V6</span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-[12px] text-white/40 hover:text-white/70 transition-colors duration-200"
          >
            {icons.logout}
            <span className="hidden sm:inline">Sair</span>
          </button>
        </div>
      </header>

      {/* Desktop tab nav — pill style, centered */}
      <nav className="hidden md:flex items-center justify-center gap-1 bg-white/95 backdrop-blur-sm border-b border-[#e0eaf5]/80 px-8 py-2.5 sticky top-0 z-40 shadow-sm">
        {navItems.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-medium transition-all duration-200 ${
                active
                  ? "text-white shadow-md"
                  : "text-[#94a3b8] hover:text-[#0f2d52] hover:bg-[#f1f5f9]"
              }`}
              style={active ? { background: "linear-gradient(135deg, #0f2d52 0%, #163a5f 100%)" } : {}}
            >
              <span className={`transition-colors duration-200 ${active ? "text-[#c8a96e]" : ""}`}>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Mobile bottom nav — frosted glass effect */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl shadow-[0_-1px_20px_rgba(0,0,0,0.06)] flex z-50 border-t border-[#e0eaf5]/60 px-1 safe-bottom">
        {navItems.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 flex-1 py-2.5 text-[9px] font-semibold tracking-wide transition-all duration-200 active-press ${
                active ? "text-[#0f2d52]" : "text-[#b0bcc8]"
              }`}
            >
              <span className={`mb-0.5 transition-all duration-200 ${active ? "text-[#c8a96e] scale-110" : ""}`}>{item.icon}</span>
              {item.label}
              {active && <span className="w-1 h-1 rounded-full bg-[#c8a96e] mt-0.5" />}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
