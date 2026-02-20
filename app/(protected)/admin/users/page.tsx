"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/src/modules/auth/frontend";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  createdAt: string;
}

interface FormData {
  name: string;
  email: string;
  password: string;
  role: string;
}

export default function AdminUsersPage() {
  const { loading, role, isAuthenticated } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [userLoading, setUserLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    name: "",
    email: "",
    password: "",
    role: "USER",
  });

  const fetchUsers = async () => {
    try {
      setUserLoading(true);
      setError(null);
      const res = await fetch("/api/protected/users");
      if (!res.ok) throw new Error("Falha ao carregar usuários");
      const data = await res.json();
      setUsers(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar");
    } finally {
      setUserLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && role === "ADMIN") {
      fetchUsers();
    }
  }, [isAuthenticated, role]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!formData.name || !formData.email || !formData.password) {
        setError("Preencha todos os campos");
        return;
      }
      if (formData.password.length < 6) {
        setError("Senha deve ter pelo menos 6 caracteres");
        return;
      }

      const res = await fetch("/api/protected/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Erro ao criar usuário");
      }

      setShowForm(false);
      setFormData({ name: "", email: "", password: "", role: "USER" });
      setError(null);
      fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar");
    }
  };

  const handleStatusChange = async (userId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/protected/users/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) throw new Error("Erro ao atualizar status");
      fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao atualizar");
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      const res = await fetch(`/api/protected/users/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });

      if (!res.ok) throw new Error("Erro ao atualizar role");
      fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao atualizar");
    }
  };

  if (loading) {
    return <div className="p-2">Carregando...</div>;
  }

  if (role !== "ADMIN") {
    return <div className="p-2">Acesso negado (403).</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Usuários</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
            Gestão de usuários da empresa (apenas ADMIN)
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          + Novo Usuário
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-100 rounded-lg">
          {error}
        </div>
      )}

      {/* Users Table */}
      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        {userLoading ? (
          <div className="p-8 text-center text-zinc-600">Carregando...</div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-zinc-600 dark:text-zinc-400">
            Nenhum usuário encontrado
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-zinc-50 dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold">
                  Nome
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold">
                  Criado em
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
              {users.map((user) => (
                <tr
                  key={user.id}
                  className="hover:bg-zinc-50 dark:hover:bg-zinc-800 transition"
                >
                  <td className="px-6 py-4 text-sm font-medium">{user.name}</td>
                  <td className="px-6 py-4 text-sm">{user.email}</td>
                  <td className="px-6 py-4 text-sm">
                    <select
                      value={user.role}
                      onChange={(e) => handleRoleChange(user.id, e.target.value)}
                      className="px-2 py-1 border border-zinc-300 dark:border-zinc-600 rounded dark:bg-zinc-800 text-sm"
                    >
                      <option value="USER">USER</option>
                      <option value="ADMIN">ADMIN</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <select
                      value={user.status}
                      onChange={(e) =>
                        handleStatusChange(user.id, e.target.value)
                      }
                      className={`px-2 py-1 border border-zinc-300 dark:border-zinc-600 rounded dark:bg-zinc-800 text-sm ${
                        user.status === "active"
                          ? "text-green-700 dark:text-green-400"
                          : "text-red-700 dark:text-red-400"
                      }`}
                    >
                      <option value="active">Ativo</option>
                      <option value="inactive">Desativo</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {new Date(user.createdAt).toLocaleDateString("pt-BR")}
                  </td>
                  <td className="px-6 py-4 text-sm flex gap-2">
                    <span className="text-xs text-zinc-600 dark:text-zinc-400">
                      ID: {user.id.slice(0, 8)}...
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal Form */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-zinc-900 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4">Novo Usuário</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Nome*</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg dark:bg-zinc-800"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Email*</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  required
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg dark:bg-zinc-800"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Senha*</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  required
                  placeholder="Mínimo 6 caracteres"
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg dark:bg-zinc-800"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Role*</label>
                <select
                  value={formData.role}
                  onChange={(e) =>
                    setFormData({ ...formData, role: e.target.value })
                  }
                  required
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg dark:bg-zinc-800"
                >
                  <option value="USER">USER</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  Criar Usuário
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setFormData({
                      name: "",
                      email: "",
                      password: "",
                      role: "USER",
                    });
                    setError(null);
                  }}
                  className="flex-1 px-4 py-2 bg-zinc-300 dark:bg-zinc-700 text-zinc-800 dark:text-white rounded-lg hover:bg-zinc-400 dark:hover:bg-zinc-600 transition"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
