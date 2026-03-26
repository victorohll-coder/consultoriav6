import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PatientHeader from "@/components/PatientHeader";

export default async function MinhaAreaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "paciente") redirect("/login");

  // Buscar nome cadastrado na tabela pacientes
  const { data: paciente } = await supabase
    .from("pacientes")
    .select("id, nome")
    .eq("email", profile.email)
    .single();

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc]">
      <PatientHeader
        nome={profile.nome || ""}
        email={profile.email}
        nomePaciente={paciente?.nome || ""}
      />
      <main className="flex-1 max-w-[900px] mx-auto w-full px-4 md:px-8 py-6 pb-24 md:pb-8">
        {!paciente ? (
          <div className="bg-white border border-[#e0eaf5] rounded-2xl p-10 text-center shadow-sm">
            <div className="w-16 h-16 rounded-2xl bg-[#eff6ff] flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">🔗</span>
            </div>
            <p className="text-[#0f172a] text-base font-semibold mb-1">
              Conta ainda não vinculada
            </p>
            <p className="text-[#475569] text-sm">
              Seu e-mail ({profile.email}) ainda não foi cadastrado pelo profissional.
            </p>
            <p className="text-[#9ca3af] text-xs mt-3">
              Entre em contato com seu nutricionista para liberar o acesso.
            </p>
          </div>
        ) : (
          children
        )}
      </main>
    </div>
  );
}
