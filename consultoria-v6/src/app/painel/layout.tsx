import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Sidebar from "@/components/Sidebar";
import type { Profile } from "@/lib/types";

export default async function PainelLayout({
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

  if (!profile || profile.role === "paciente") redirect("/login");

  return (
    <div className="min-h-screen">
      <Sidebar profile={profile as Profile} />
      <main className="md:ml-[220px] p-6 md:p-8 pb-24 md:pb-8 max-w-[1200px]">
        {children}
      </main>
    </div>
  );
}
