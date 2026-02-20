import { prisma } from "@/src/lib/prisma";

export const financialService = {
  /**
   * Calculate total balance across all accounts
   */
  async getTotalBalance(companyId: string) {
    const result = await prisma.transaction.groupBy({
      by: ["type"],
      where: {
        companyId,
        deletedAt: null,
      },
      _sum: {
        amount: true,
      },
    });

    let income = 0;
    let expense = 0;

    result.forEach((row) => {
      if (row.type === "income") {
        income = row._sum.amount || 0;
      } else if (row.type === "expense") {
        expense = row._sum.amount || 0;
      }
    });

    return {
      income,
      expense,
      balance: income - expense,
    };
  },

  /**
   * Get revenue (income) for last N days
   */
  async getRevenueLastDays(companyId: string, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const result = await prisma.transaction.aggregate({
      where: {
        companyId,
        type: "income",
        date: { gte: startDate },
        deletedAt: null,
      },
      _sum: {
        amount: true,
      },
    });

    return result._sum.amount || 0;
  },

  /**
   * Get expenses (expense) for last N days
   */
  async getExpensesLastDays(companyId: string, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const result = await prisma.transaction.aggregate({
      where: {
        companyId,
        type: "expense",
        date: { gte: startDate },
        deletedAt: null,
      },
      _sum: {
        amount: true,
      },
    });

    return result._sum.amount || 0;
  },

  /**
   * Get count of processed documents
   */
  async getProcessedDocuments(companyId: string) {
    const count = await prisma.document.count({
      where: {
        companyId,
        status: "uploaded",
      },
    });

    return count;
  },

  /**
   * Get monthly revenue vs expense for a given period
   */
  async getMonthlyRevenueVsExpense(
    companyId: string,
    months: number = 12
  ) {
    const data: {
      [key: string]: { income: number; expense: number; month: string };
    } = {};

    // Generate months array
    for (let i = months - 1; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const key = date.toISOString().slice(0, 7); // YYYY-MM
      data[key] = { income: 0, expense: 0, month: key };
    }

    // Get transactions for the period
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);
    startDate.setDate(1);

    const transactions = await prisma.transaction.findMany({
      where: {
        companyId,
        date: { gte: startDate },
        deletedAt: null,
      },
      select: {
        date: true,
        amount: true,
        type: true,
      },
    });

    // Aggregate by month and type
    transactions.forEach((tx) => {
      const key = tx.date.toISOString().slice(0, 7);
      if (data[key]) {
        if (tx.type === "income") {
          data[key].income += tx.amount;
        } else {
          data[key].expense += tx.amount;
        }
      }
    });

    return Object.values(data);
  },

  /**
   * Get cumulative cash flow over a period
   */
  async getCumulativeCashFlow(companyId: string, months: number = 12) {
    const data: {
      [key: string]: { month: string; balance: number };
    } = {};

    // Generate months array
    for (let i = months - 1; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const key = date.toISOString().slice(0, 7); // YYYY-MM
      data[key] = { month: key, balance: 0 };
    }

    // Get transactions for the period
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);
    startDate.setDate(1);

    const transactions = await prisma.transaction.findMany({
      where: {
        companyId,
        date: { gte: startDate },
        deletedAt: null,
      },
      select: {
        date: true,
        amount: true,
        type: true,
      },
      orderBy: {
        date: "asc",
      },
    });

    // Calculate cumulative balance
    let cumulativeBalance = 0;
    transactions.forEach((tx) => {
      const key = tx.date.toISOString().slice(0, 7);
      const delta = tx.type === "income" ? tx.amount : -tx.amount;
      cumulativeBalance += delta;
      if (data[key]) {
        data[key].balance = cumulativeBalance;
      }
    });

    return Object.values(data);
  },

  /**
   * Get financial summary for dashboard
   */
  async getDashboardSummary(companyId: string) {
    const [balance, revenue30days, expenses30days, documents] =
      await Promise.all([
        this.getTotalBalance(companyId),
        this.getRevenueLastDays(companyId, 30),
        this.getExpensesLastDays(companyId, 30),
        this.getProcessedDocuments(companyId),
      ]);

    return {
      totalBalance: balance.balance,
      totalIncome: balance.income,
      totalExpense: balance.expense,
      revenue30days,
      expenses30days,
      processedDocuments: documents,
      net30days: revenue30days - expenses30days,
    };
  },

  /**
   * Get detailed financial for a custom period
   */
  async getFinancialByPeriod(
    companyId: string,
    startDate: Date,
    endDate: Date
  ) {
    const transactions = await prisma.transaction.findMany({
      where: {
        companyId,
        date: {
          gte: startDate,
          lte: endDate,
        },
        deletedAt: null,
      },
      select: {
        amount: true,
        type: true,
      },
    });

    let income = 0;
    let expense = 0;

    transactions.forEach((tx) => {
      if (tx.type === "income") {
        income += tx.amount;
      } else {
        expense += tx.amount;
      }
    });

    return {
      income,
      expense,
      balance: income - expense,
      transactionCount: transactions.length,
    };
  },
};
