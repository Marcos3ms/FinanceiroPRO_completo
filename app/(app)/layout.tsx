import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Sidebar from "@/components/layout/Sidebar";
import CompanyHeader from "@/components/layout/CompanyHeader";
import { ModalsProvider } from "@/components/modals/ModalsProvider";
import ModalsRoot from "@/components/modals/ModalsRoot";
import { getCategoryNames } from "@/features/categories/queries";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [{ data: profile }, { data: accountsRaw }, categories] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("full_name, username, company_name, cnpj")
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("accounts")
        .select("id, nome, banco, agencia, conta")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true }),
      getCategoryNames(supabase, user.id),
    ]);

  const accounts = accountsRaw ?? [];
  const email = user.email ?? "";

  return (
    <ModalsProvider
      accounts={accounts}
      profile={profile}
      email={email}
      categories={categories}
    >
      <div className="flex min-h-screen">
        <Sidebar profile={profile} email={email} />
        <main className="min-h-screen min-w-0 flex-1 md:ml-sidebar print:ml-0">
          <CompanyHeader
            companyName={profile?.company_name ?? null}
            cnpj={profile?.cnpj ?? null}
            mode="print"
          />
          {children}
        </main>
      </div>
      <ModalsRoot />
    </ModalsProvider>
  );
}
