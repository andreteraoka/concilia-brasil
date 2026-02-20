"use client";

import { useAuth } from "@/src/modules/auth/frontend";

export default function AdminDiagnosticsPage() {
  const { loading, role } = useAuth();

  if (loading) {
    return <div className="p-2">Carregando...</div>;
  }

  if (role !== "ADMIN") {
    return <div className="p-2">Acesso negado (403).</div>;
  }

  return (
    <div className="rounded-lg border bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <h1 className="text-xl font-semibold">Diagnóstico</h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
        Página de diagnóstico restrita a ADMIN.
      </p>
    </div>
  );
}
