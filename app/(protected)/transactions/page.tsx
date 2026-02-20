"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/src/lib/useAuth";

interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: "income" | "expense";
  account: { id: string; bankName: string; accountNumber: string };
  createdAt: string;
}

interface PaginationData {
  data: Transaction[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export default function TransactionsPage() {
  const { isAuthenticated } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    type: "",
  });

  const fetchTransactions = async (page = 1) => {
    try {
      setLoading(true);
      setError(null);
      const url = new URL("/api/protected/transactions", window.location.origin);
      url.searchParams.append("page", page.toString());
      url.searchParams.append("limit", "20");
      if (filters.startDate) {
        url.searchParams.append("startDate", filters.startDate);
      }
      if (filters.endDate) {
        url.searchParams.append("endDate", filters.endDate);
      }
      if (filters.type) {
        url.searchParams.append("type", filters.type);
      }

      const res = await fetch(url.toString());
      if (!res.ok) throw new Error("Falha ao carregar transações");
      const data: PaginationData = await res.json();
      setTransactions(data.data || []);
      setPagination(data.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchTransactions(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, filters]);

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja deletar esta transação?")) return;
    try {
      const res = await fetch(`/api/protected/transactions/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Erro ao deletar");
      fetchTransactions(pagination.page);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao deletar");
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("pt-BR");
  };

  if (!isAuthenticated) {
    return <div className="text-center py-8">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Transações</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
          Gestão de transações financeiras
        </p>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">Data Inicial</label>
          <input
            type="date"
            value={filters.startDate}
            onChange={(e) =>
              setFilters({ ...filters, startDate: e.target.value })
            }
            className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg dark:bg-zinc-800"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Data Final</label>
          <input
            type="date"
            value={filters.endDate}
            onChange={(e) =>
              setFilters({ ...filters, endDate: e.target.value })
            }
            className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg dark:bg-zinc-800"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Tipo</label>
          <select
            value={filters.type}
            onChange={(e) => setFilters({ ...filters, type: e.target.value })}
            className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg dark:bg-zinc-800"
          >
            <option value="">Todos</option>
            <option value="income">Renda</option>
            <option value="expense">Despesa</option>
          </select>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-100 rounded-lg">
          {error}
        </div>
      )}

      {/* Transactions Table */}
      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-zinc-600">Carregando...</div>
        ) : transactions.length === 0 ? (
          <div className="p-8 text-center text-zinc-600 dark:text-zinc-400">
            Nenhuma transação encontrada
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-zinc-50 dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold">
                  Data
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold">
                  Descrição
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold">
                  Conta
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold">
                  Tipo
                </th>
                <th className="px-6 py-3 text-right text-sm font-semibold">
                  Valor
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
              {transactions.map((transaction) => (
                <tr
                  key={transaction.id}
                  className="hover:bg-zinc-50 dark:hover:bg-zinc-800 transition"
                >
                  <td className="px-6 py-4 text-sm">
                    {formatDate(transaction.date)}
                  </td>
                  <td className="px-6 py-4 text-sm">{transaction.description}</td>
                  <td className="px-6 py-4 text-sm">
                    {transaction.account.bankName} -{" "}
                    {transaction.account.accountNumber}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        transaction.type === "income"
                          ? "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-100"
                          : "bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-100"
                      }`}
                    >
                      {transaction.type === "income" ? "Renda" : "Despesa"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-right font-mono">
                    {transaction.type === "income" ? "+" : "-"}
                    {formatCurrency(transaction.amount)}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <button
                      onClick={() => handleDelete(transaction.id)}
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

      {/* Pagination */}
      {transactions.length > 0 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-zinc-600 dark:text-zinc-400">
            Mostrando {(pagination.page - 1) * pagination.limit + 1} a{" "}
            {Math.min(pagination.page * pagination.limit, pagination.total)} de{" "}
            {pagination.total} transações
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => fetchTransactions(pagination.page - 1)}
              disabled={pagination.page === 1}
              className="px-4 py-2 bg-zinc-200 dark:bg-zinc-700 rounded hover:bg-zinc-300 dark:hover:bg-zinc-600 disabled:opacity-50 transition"
            >
              Anterior
            </button>
            <div className="flex items-center gap-2">
              {Array.from({ length: pagination.pages }, (_, i) => i + 1)
                .filter(
                  (p) =>
                    p === 1 ||
                    p === pagination.pages ||
                    Math.abs(p - pagination.page) <= 1
                )
                .map((p, i, arr) => (
                  <div key={p}>
                    {i > 0 && arr[i - 1] !== p - 1 && (
                      <span className="px-2">...</span>
                    )}
                    <button
                      onClick={() => fetchTransactions(p)}
                      className={`px-3 py-2 rounded ${
                        p === pagination.page
                          ? "bg-blue-600 text-white"
                          : "bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600"
                      }`}
                    >
                      {p}
                    </button>
                  </div>
                ))}
            </div>
            <button
              onClick={() => fetchTransactions(pagination.page + 1)}
              disabled={pagination.page === pagination.pages}
              className="px-4 py-2 bg-zinc-200 dark:bg-zinc-700 rounded hover:bg-zinc-300 dark:hover:bg-zinc-600 disabled:opacity-50 transition"
            >
              Próximo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
