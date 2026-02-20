"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/src/lib/useAuth";

interface Account {
  id: string;
  bankName: string;
  agency?: string;
  accountNumber: string;
  type: string;
  _count: { transactions: number };
  createdAt: string;
}

interface FormData {
  bankName: string;
  agency: string;
  accountNumber: string;
  type: string;
}

const BANK_TYPES = [
  "Bradesco",
  "Itaú",
  "Caixa",
  "Banco do Brasil",
  "Santander",
  "HSBC",
  "Nubank",
  "Inter",
  "Outro",
];

const ACCOUNT_TYPES = ["Corrente", "Poupança", "Aplicação"];

export default function AccountsPage() {
  const { isAuthenticated } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [bankFilter, setBankFilter] = useState("");
  const [formData, setFormData] = useState<FormData>({
    bankName: "",
    agency: "",
    accountNumber: "",
    type: "",
  });

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      setError(null);
      const url = new URL("/api/protected/accounts", window.location.origin);
      if (bankFilter) {
        url.searchParams.append("bank", bankFilter);
      }
      const res = await fetch(url.toString());
      if (!res.ok) throw new Error("Falha ao carregar contas");
      const data = await res.json();
      setAccounts(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchAccounts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, bankFilter]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const method = editingId ? "PUT" : "POST";
      const url = editingId
        ? `/api/protected/accounts/${editingId}`
        : "/api/protected/accounts";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Erro ao salvar");
      }

      setShowForm(false);
      setEditingId(null);
      setFormData({ bankName: "", agency: "", accountNumber: "", type: "" });
      fetchAccounts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar");
    }
  };

  const handleEdit = (account: Account) => {
    setFormData({
      bankName: account.bankName,
      agency: account.agency || "",
      accountNumber: account.accountNumber,
      type: account.type,
    });
    setEditingId(account.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja deletar esta conta?")) return;
    try {
      const res = await fetch(`/api/protected/accounts/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Erro ao deletar");
      fetchAccounts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao deletar");
    }
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({ bankName: "", agency: "", accountNumber: "", type: "" });
  };

  if (!isAuthenticated) {
    return <div className="text-center py-8">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Contas</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
            Gestão de contas bancárias
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          + Nova Conta
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="flex-1">
          <label className="block text-sm font-medium mb-2">
            Filtrar por Banco
          </label>
          <select
            value={bankFilter}
            onChange={(e) => setBankFilter(e.target.value)}
            className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg dark:bg-zinc-800"
          >
            <option value="">Todos os bancos</option>
            {BANK_TYPES.map((bank) => (
              <option key={bank} value={bank}>
                {bank}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-100 rounded-lg">
          {error}
        </div>
      )}

      {/* Accounts Table */}
      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-zinc-600">Carregando...</div>
        ) : accounts.length === 0 ? (
          <div className="p-8 text-center text-zinc-600 dark:text-zinc-400">
            Nenhuma conta encontrada
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-zinc-50 dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold">
                  Banco
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold">
                  Agência
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold">
                  Número da Conta
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold">
                  Tipo
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold">
                  Transações
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
              {accounts.map((account) => (
                <tr
                  key={account.id}
                  className="hover:bg-zinc-50 dark:hover:bg-zinc-800 transition"
                >
                  <td className="px-6 py-4 text-sm">{account.bankName}</td>
                  <td className="px-6 py-4 text-sm">{account.agency || "-"}</td>
                  <td className="px-6 py-4 text-sm font-mono">
                    {account.accountNumber}
                  </td>
                  <td className="px-6 py-4 text-sm">{account.type}</td>
                  <td className="px-6 py-4 text-sm">
                    {account._count.transactions}
                  </td>
                  <td className="px-6 py-4 text-sm flex gap-2">
                    <button
                      onClick={() => handleEdit(account)}
                      className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-100 rounded hover:bg-blue-200 dark:hover:bg-blue-800 transition"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(account.id)}
                      className="px-3 py-1 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-100 rounded hover:bg-red-200 dark:hover:bg-red-800 transition"
                    >
                      Deletar
                    </button>
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
            <h2 className="text-2xl font-bold mb-4">
              {editingId ? "Editar Conta" : "Nova Conta"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Banco*</label>
                <select
                  value={formData.bankName}
                  onChange={(e) =>
                    setFormData({ ...formData, bankName: e.target.value })
                  }
                  required
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg dark:bg-zinc-800"
                >
                  <option value="">Selecionar banco</option>
                  {BANK_TYPES.map((bank) => (
                    <option key={bank} value={bank}>
                      {bank}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Agência
                </label>
                <input
                  type="text"
                  value={formData.agency}
                  onChange={(e) =>
                    setFormData({ ...formData, agency: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg dark:bg-zinc-800"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Número da Conta*
                </label>
                <input
                  type="text"
                  value={formData.accountNumber}
                  onChange={(e) =>
                    setFormData({ ...formData, accountNumber: e.target.value })
                  }
                  required
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg dark:bg-zinc-800"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Tipo*</label>
                <select
                  value={formData.type}
                  onChange={(e) =>
                    setFormData({ ...formData, type: e.target.value })
                  }
                  required
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg dark:bg-zinc-800"
                >
                  <option value="">Selecionar tipo</option>
                  {ACCOUNT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  {editingId ? "Atualizar" : "Criar"}
                </button>
                <button
                  type="button"
                  onClick={closeForm}
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
