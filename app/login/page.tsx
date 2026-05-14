import LoginForm from "@/features/auth/LoginForm";

export const metadata = { title: "Entrar - FinanceiroPro" };

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-lg border border-border bg-bg-card p-8 shadow-modal">
        <div className="mb-6 text-center">
          <span className="text-xl font-bold tracking-tight text-brand-green">
            FinanceiroPro
          </span>
          <h1 className="mt-3 text-xl font-bold">Entrar na sua conta</h1>
          <p className="mt-1 text-sm text-fg-secondary">
            Acesse seu controle financeiro.
          </p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
