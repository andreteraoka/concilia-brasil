"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/src/modules/auth/frontend/useAuth";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface DashboardSummary {
  totalBalance: number;
  totalIncome: number;
  totalExpense: number;
  revenue30days: number;
  expenses30days: number;
  processedDocuments: number;
  net30days: number;
}

interface MonthlyData {
  month: string;
  income: number;
  expense: number;
}

interface CashFlowData {
  month: string;
  balance: number;
}

export default function DashboardPage() {
  const { isAuthenticated } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [cashFlowData, setCashFlowData] = useState<CashFlowData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [monthsRange, setMonthsRange] = useState(12);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [summaryRes, monthlyRes, cashFlowRes] = await Promise.all([
        fetch("/api/protected/financial/summary"),
        fetch(`/api/protected/financial/monthly?months=${monthsRange}`),
        fetch(`/api/protected/financial/cashflow?months=${monthsRange}`),
      ]);

      if (!summaryRes.ok || !monthlyRes.ok || !cashFlowRes.ok) {
        throw new Error("Falha ao carregar dados");
      }

      const summaryData = await summaryRes.json();
      const monthlyData = await monthlyRes.json();
      const cashFlowData = await cashFlowRes.json();

      setSummary(summaryData.data);
      setMonthlyData(monthlyData.data || []);
      setCashFlowData(cashFlowData.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, monthsRange]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  if (!isAuthenticated) {
    return <div className="text-center py-8">Carregando...</div>;
  }

  if (loading) {
    return <div className="text-center py-8">Carregando dashboard...</div>;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
          Visão geral financeira da sua empresa
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-100 rounded-lg">
          {error}
        </div>
      )}

      {/* Period Selector */}
      <div className="flex gap-2">
        <label className="text-sm font-medium">Período:</label>
        <select
          value={monthsRange}
          onChange={(e) => setMonthsRange(parseInt(e.target.value))}
          className="px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg dark:bg-zinc-800 text-sm"
        >
          <option value={3}>Últimos 3 meses</option>
          <option value={6}>Últimos 6 meses</option>
          <option value={12}>Últimos 12 meses</option>
          <option value={24}>Últimos 24 meses</option>
        </select>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Balance Card */}
          <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Saldo Total
                </p>
                <p
                  className={`text-2xl font-bold mt-2 ${
                    summary.totalBalance >= 0
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {formatCurrency(summary.totalBalance)}
                </p>
              </div>
              <div className="text-3xl">💰</div>
            </div>
            <div className="mt-4 text-xs text-zinc-500">
              <p>Receita: {formatCurrency(summary.totalIncome)}</p>
              <p>Despesa: {formatCurrency(summary.totalExpense)}</p>
            </div>
          </div>

          {/* Revenue 30 Days Card */}
          <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Receita (30 dias)
                </p>
                <p className="text-2xl font-bold text-green-600 mt-2">
                  {formatCurrency(summary.revenue30days)}
                </p>
              </div>
              <div className="text-3xl">📈</div>
            </div>
          </div>

          {/* Expenses 30 Days Card */}
          <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Despesa (30 dias)
                </p>
                <p className="text-2xl font-bold text-red-600 mt-2">
                  {formatCurrency(summary.expenses30days)}
                </p>
              </div>
              <div className="text-3xl">📉</div>
            </div>
          </div>

          {/* Documents Processed Card */}
          <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Documentos Processados
                </p>
                <p className="text-2xl font-bold text-blue-600 mt-2">
                  {summary.processedDocuments}
                </p>
              </div>
              <div className="text-3xl">📄</div>
            </div>
          </div>
        </div>
      )}

      {/* Net 30 Days Highlight */}
      {summary && (
        <div className="rounded-lg border-2 border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-6">
          <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">
            Resultado Líquido (últimos 30 dias)
          </p>
          <p
            className={`text-3xl font-bold mt-2 ${
              summary.net30days >= 0
                ? "text-green-600"
                : "text-red-600"
            }`}
          >
            {formatCurrency(summary.net30days)}
          </p>
        </div>
      )}

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Revenue vs Expense Chart */}
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-6">
          <h2 className="text-lg font-semibold mb-4">Receita vs Despesa por Mês</h2>
          {monthlyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 12 }}
                  stroke="#a1a1aa"
                />
                <YAxis tick={{ fontSize: 12 }} stroke="#a1a1aa" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#27272a",
                    border: "1px solid #52525b",
                    borderRadius: "8px",
                  }}
                  formatter={(value?: number) => value ? formatCurrency(value) : ''}
                />
                <Legend />
                <Bar dataKey="income" fill="#10b981" name="Receita" />
                <Bar dataKey="expense" fill="#ef4444" name="Despesa" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-zinc-500">
              Sem dados disponíveis
            </div>
          )}
        </div>

        {/* Cumulative Cash Flow Chart */}
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-6">
          <h2 className="text-lg font-semibold mb-4">Fluxo de Caixa Acumulado</h2>
          {cashFlowData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={cashFlowData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 12 }}
                  stroke="#a1a1aa"
                />
                <YAxis tick={{ fontSize: 12 }} stroke="#a1a1aa" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#27272a",
                    border: "1px solid #52525b",
                    borderRadius: "8px",
                  }}
                  formatter={(value?: number) => value ? formatCurrency(value) : ''}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="balance"
                  stroke="#3b82f6"
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                  name="Saldo Acumulado"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-zinc-500">
              Sem dados disponíveis
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-6">
        <h2 className="text-lg font-semibold mb-4">Ações Rápidas</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <a
            href="/accounts"
            className="p-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-center text-sm"
          >
            Gerenciar Contas
          </a>
          <a
            href="/transactions"
            className="p-3 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-center text-sm"
          >
            Ver Transações
          </a>
          <a
            href="/documents"
            className="p-3 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition text-center text-sm"
          >
            Uploads
          </a>
        </div>
      </div>
    </div>
  );
}
