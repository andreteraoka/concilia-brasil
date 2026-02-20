import { transactionRepository } from "../repositories/transactionRepository";

export const transactionService = {
  list(
    companyId: string,
    options?: {
      startDate?: Date;
      endDate?: Date;
      type?: string;
      page?: number;
      limit?: number;
    }
  ) {
    return transactionRepository.listByCompany(companyId, options);
  },

  getById(id: string, companyId: string) {
    return transactionRepository.getById(id, companyId);
  },

  create(input: {
    date: Date;
    description: string;
    amount: number;
    type: string;
    documentId?: string;
    accountId: string;
    companyId: string;
  }) {
    if (!input.accountId || !input.description || !Number.isFinite(input.amount)) {
      throw new Error("Campos obrigatórios faltando");
    }

    if (!["income", "expense"].includes(input.type)) {
      throw new Error("Tipo deve ser 'income' ou 'expense'");
    }

    return transactionRepository.create(input);
  },

  delete(id: string, companyId: string) {
    return transactionRepository.delete(id, companyId);
  },
};
