"use client";

import Link from "next/link";
import { useAuth } from "@/src/modules/auth/frontend";

export default function Home() {
  const { loading, role, isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-zinc-50 px-6 py-10 font-sans dark:bg-black">
      <main className="mx-auto w-full max-w-4xl rounded-xl bg-white p-8 dark:bg-zinc-950">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
          Concilia Brasil
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
          RBAC ativo com papéis ADMIN e USER.
        </p>

        <section className="mt-8">
          <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-200">Navegação</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link href="/" className="rounded-md border px-3 py-2 text-sm">
              Home
            </Link>

            {!loading && isAuthenticated && role === "ADMIN" && (
              <>
                <Link href="/diagnostics" className="rounded-md border px-3 py-2 text-sm">
                  Diagnóstico
                </Link>
              </>
            )}

            {!loading && isAuthenticated && (role === "USER" || role === "ADMIN") && (
              <>
                <Link href="/api/protected/accounts" className="rounded-md border px-3 py-2 text-sm">
                  Contas
                </Link>
                <Link href="/api/protected/transactions" className="rounded-md border px-3 py-2 text-sm">
                  Transações
                </Link>
                <Link href="/api/protected/documents" className="rounded-md border px-3 py-2 text-sm">
                  Documentos
                </Link>
              </>
            )}
          </div>
        </section>

        <section className="mt-8 rounded-md border p-4">
          <p className="text-sm text-zinc-700 dark:text-zinc-300">
            {loading && "Carregando autenticação..."}
            {!loading && !isAuthenticated && "Não autenticado"}
            {!loading && isAuthenticated && `Autenticado com role: ${role}`}
          </p>
        </section>
        <p className="mt-6 text-xs text-zinc-500">
          Regras: ADMIN gerencia usuários/diagnóstico/configurações. USER cria contas, transações e uploads.
        </p>
      </main>
    </div>
  );
}
