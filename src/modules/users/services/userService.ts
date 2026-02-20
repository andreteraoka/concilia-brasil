import { userRepository } from "../repositories/userRepository";

export const userService = {
  list(companyId: string) {
    return userRepository.listByCompany(companyId);
  },

  getById(id: string, companyId: string) {
    return userRepository.getById(id, companyId);
  },

  async create(input: {
    name: string;
    email: string;
    password: string;
    role: string;
    companyId: string;
  }) {
    if (!input.name || !input.email || !input.password || !input.role) {
      throw new Error("Campos obrigatórios faltando");
    }

    if (!["ADMIN", "USER"].includes(input.role)) {
      throw new Error("Role inválido. Deve ser 'ADMIN' ou 'USER'");
    }

    if (input.password.length < 6) {
      throw new Error("Senha deve ter pelo menos 6 caracteres");
    }

    return userRepository.create(input);
  },

  async update(
    id: string,
    companyId: string,
    input: {
      name?: string;
      role?: string;
      status?: string;
    }
  ) {
    if (Object.keys(input).length === 0) {
      throw new Error("Nenhum campo para atualizar");
    }

    if (input.role && !["ADMIN", "USER"].includes(input.role)) {
      throw new Error("Role inválido. Deve ser 'ADMIN' ou 'USER'");
    }

    if (input.status && !["active", "inactive"].includes(input.status)) {
      throw new Error("Status inválido. Deve ser 'active' ou 'inactive'");
    }

    return userRepository.update(id, companyId, input);
  },
};
