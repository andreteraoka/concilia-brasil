"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { useAuth } from "@/src/modules/auth/frontend";
import { signIn } from "next-auth/react";

export default function Home() {
  const router = useRouter();
  const { loading, role, isAuthenticated } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const statusLabel = useMemo(() => {
    if (loading) return "Carregando autenticação...";
    if (!isAuthenticated) return "Não autenticado";
    return `Autenticado com role: ${role}`;
  }, [loading, isAuthenticated, role]);

  async function onLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      const payload = (await response.json()) as {
        success?: boolean;
        data?: { token?: string };
        error?: string;
      };

      if (!response.ok || !payload.success || !payload.data?.token) {
        setError(payload.error || "Não foi possível fazer login");
        return;
      }

      localStorage.setItem("token", payload.data.token);
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Erro de conexão ao autenticar");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-stone-950 px-6 py-10 font-sans text-amber-50">
      <main className="mx-auto w-full max-w-6xl rounded-2xl border border-amber-900/60 bg-stone-900 p-8 shadow-2xl">
        <section className="mb-8 flex flex-col gap-3 border-b border-amber-900/50 pb-6">
          <h1 className="text-3xl font-semibold text-amber-300">Concilia Brasil</h1>
          <p className="text-sm text-amber-100/80">
            Plataforma financeira com autenticação RBAC e processamento inteligente de documentos.
          </p>
        </section>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <article className="rounded-xl border border-amber-800/60 bg-stone-950/70 p-5">
            <h2 className="text-lg font-medium text-amber-200">Entrar</h2>
            <p className="mt-1 text-sm text-amber-50/70">Use seu usuário administrador ou usuário da empresa.</p>

            <form className="mt-5 space-y-3" onSubmit={onLogin}>
              <label className="block text-sm">
                <span className="mb-1 block text-amber-100/80">Email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  className="w-full rounded-md border border-amber-900 bg-stone-900 px-3 py-2 text-amber-50 outline-none ring-0 placeholder:text-amber-100/40 focus:border-amber-600"
                  placeholder="admin@empresa.com"
                />
              </label>

              <label className="block text-sm">
                <span className="mb-1 block text-amber-100/80">Senha</span>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  className="w-full rounded-md border border-amber-900 bg-stone-900 px-3 py-2 text-amber-50 outline-none ring-0 placeholder:text-amber-100/40 focus:border-amber-600"
                  placeholder="********"
                />
              </label>

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-md border border-amber-600 bg-amber-500 px-4 py-2 text-sm font-medium text-stone-900 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Entrando..." : "Entrar"}
              </button>

              <div className="relative my-3">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-amber-900/50"></div>
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-stone-950/70 px-2 text-amber-100/60">OU</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => signIn("azure-ad", { callbackUrl: "/dashboard" })}
                className="flex w-full items-center justify-center gap-3 rounded-md border border-amber-800/60 bg-white px-4 py-2 text-sm font-medium text-stone-900 transition hover:bg-amber-50"
              >
                <svg className="h-5 w-5" viewBox="0 0 21 21" fill="none">
                  <rect x="1" y="1" width="9" height="9" fill="#f25022"/>
                  <rect x="11" y="1" width="9" height="9" fill="#7fba00"/>
                  <rect x="1" y="11" width="9" height="9" fill="#00a4ef"/>
                  <rect x="11" y="11" width="9" height="9" fill="#ffb900"/>
                </svg>
                Entrar com Microsoft
              </button>
            </form>

            {error && <p className="mt-3 text-sm text-red-300">{error}</p>}
          </article>

          <article className="rounded-xl border border-amber-800/60 bg-stone-950/70 p-5">
            <h2 className="text-lg font-medium text-amber-200">Acesso rápido</h2>
            <p className="mt-1 text-sm text-amber-50/70">Links principais e status atual da autenticação.</p>

            <div className="mt-4 flex flex-wrap gap-2">
              <Link href="/" className="rounded-md border border-amber-800 px-3 py-2 text-sm hover:bg-stone-800">
                Home
              </Link>
              <Link href="/dashboard" className="rounded-md border border-amber-800 px-3 py-2 text-sm hover:bg-stone-800">
                Dashboard
              </Link>
              {role === "ADMIN" && (
                <Link href="/admin/diagnostics" className="rounded-md border border-amber-800 px-3 py-2 text-sm hover:bg-stone-800">
                  Diagnóstico
                </Link>
              )}
            </div>

            <div className="mt-5 rounded-md border border-amber-900 bg-stone-900 p-3 text-sm text-amber-100/85">
              {statusLabel}
            </div>

            <p className="mt-4 text-xs text-amber-100/70">
              Regras: ADMIN gerencia usuários/diagnóstico/configurações. USER cria contas, transações e uploads.
            </p>
          </article>
        </section>
      </main>
    </div>
  );
}
