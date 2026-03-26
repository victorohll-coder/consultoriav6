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
    <div className="min-h-screen flex flex-col">
      <PatientHeader
        nome={profile.nome || ""}
        email={profile.email}
        nomePaciente={paciente?.nome || ""}
      />
      <main className="flex-1 max-w-[900px] mx-auto w-full px-4 md:px-6 py-6 pb-24 md:pb-8">
        {!paciente ? (
          <div className="bg-surface border border-border rounded-xl p-8 text-center">
            <p className="text-4xl mb-3">🔗</p>
            <p className="text-text text-base font-semibold mb-1">
              Conta ainda não vinculada
            </p>
            <p className="text-text2 text-sm">
              Seu e-mail ({profile.email}) ainda não foi cadastrado pelo profissional.
            </p>
            <p className="text-text3 text-xs mt-2">
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
