import SignupForm from "@/features/auth/SignupForm";

export const metadata = { title: "Criar conta - FinanceiroPro" };

export default function SignupPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg rounded-lg border border-border bg-bg-card p-8 shadow-modal">
        <div className="mb-6 text-center">
          <span className="text-xl font-bold tracking-tight text-brand-green">
            FinanceiroPro
          </span>
          <h1 className="mt-3 text-xl font-bold">Criar nova conta</h1>
          <p className="mt-1 text-sm text-fg-secondary">
            Comece a organizar suas finanças em minutos.
          </p>
        </div>
        <SignupForm />
      </div>
    </main>
  );
}
