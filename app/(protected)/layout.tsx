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
    <div className="min-h-screen bg-stone-950 text-amber-50">
      <aside className="fixed inset-y-0 left-0 w-64 border-r border-amber-900/40 bg-stone-900 p-4">
        <h1 className="mb-6 text-lg font-semibold text-amber-300">Concilia Brasil</h1>
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
                      ? "bg-amber-500 text-stone-900"
                      : "text-amber-50/90 hover:bg-stone-800"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
        </nav>
      </aside>

      <div className="ml-64">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-amber-900/40 bg-stone-900 px-6 py-4">
          <div>
            <p className="text-sm font-medium text-amber-200">{companyName || `Empresa ${companyId}`}</p>
            <p className="text-xs text-amber-50/70">{role}</p>
          </div>

          <div className="flex items-center gap-4">
            <p className="text-sm text-amber-100">{userName || `Usuário ${userId}`}</p>
            <button
              onClick={async () => {
                await logout();
                router.replace("/");
              }}
              className="rounded-md border border-amber-700 bg-amber-500 px-3 py-1.5 text-sm font-medium text-stone-900 hover:bg-amber-400"
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
