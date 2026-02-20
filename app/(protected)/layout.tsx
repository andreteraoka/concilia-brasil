"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { PropsWithChildren, useEffect } from "react";
import { useAuth } from "@/src/modules/auth/frontend";

type NavItem = {
  label: string;
  href: string;
  adminOnly?: boolean;
};

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Contas", href: "/accounts" },
  { label: "Transações", href: "/transactions" },
  { label: "Documentos", href: "/documents" },
  { label: "Usuários", href: "/admin/users", adminOnly: true },
  { label: "Diagnóstico", href: "/admin/diagnostics", adminOnly: true },
];

export default function ProtectedLayout({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const router = useRouter();
  const {
    loading,
    isAuthenticated,
    role,
    userName,
    userId,
    companyName,
    companyId,
    logout,
  } = useAuth();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace("/");
    }
  }, [loading, isAuthenticated, router]);

  if (loading) {
    return <div className="p-8">Carregando...</div>;
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <aside className="fixed inset-y-0 left-0 w-64 border-r bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <h1 className="mb-6 text-lg font-semibold">Concilia Brasil</h1>
        <nav className="flex flex-col gap-1">
          {navItems
            .filter((item) => (item.adminOnly ? role === "ADMIN" : true))
            .map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-md px-3 py-2 text-sm transition ${
                    active
                      ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                      : "hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
        </nav>
      </aside>

      <div className="ml-64">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-6 py-4 dark:border-zinc-800 dark:bg-zinc-900">
          <div>
            <p className="text-sm font-medium">{companyName || `Empresa ${companyId}`}</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">{role}</p>
          </div>

          <div className="flex items-center gap-4">
            <p className="text-sm">{userName || `Usuário ${userId}`}</p>
            <button
              onClick={async () => {
                await logout();
                router.replace("/");
              }}
              className="rounded-md border px-3 py-1.5 text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              Logout
            </button>
          </div>
        </header>

        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
