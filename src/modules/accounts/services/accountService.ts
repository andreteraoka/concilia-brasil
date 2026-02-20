import { accountRepository } from "../repositories/accountRepository";

export const accountService = {
  list(companyId: string, bankFilter?: string) {
    return accountRepository.listByCompany(companyId, bankFilter);
  },

  getById(id: string, companyId: string) {
    return accountRepository.getById(id, companyId);
  },

  create(input: {
    bankName: string;
    agency?: string;
    accountNumber: string;
    type: string;
    companyId: string;
  }) {
    if (!input.bankName || !input.accountNumber || !input.type) {
      throw new Error("Campos obrigatórios faltando");
    }

    return accountRepository.create(input);
  },

  update(
    id: string,
    companyId: string,
    input: {
      bankName?: string;
      agency?: string;
      accountNumber?: string;
      type?: string;
    }
  ) {
    if (Object.keys(input).length === 0) {
      throw new Error("Nenhum campo para atualizar");
    }

    return accountRepository.update(id, companyId, input);
  },

  delete(id: string, companyId: string) {
    return accountRepository.delete(id, companyId);
  },
};
