import { comparePassword, generateToken, hashPassword } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { authRepository } from "../repositories/authRepository";

export const authService = {
  async login(input: { email: string; password: string }) {
    if (!input.email || !input.password) {
      throw new Error("Campos obrigatórios faltando");
    }

    const user = await authRepository.findUserByEmail(input.email);
    if (!user) {
      logger.authError("Login failed: user not found", undefined, { email: input.email });
      throw new Error("Usuário não encontrado");
    }

    const valid = await comparePassword(input.password, user.password);
    if (!valid) {
      logger.authError("Login failed: invalid password", undefined, { userId: user.id });
      throw new Error("Senha inválida");
    }

    const token = generateToken({
      userId: user.id,
      role: user.role,
      companyId: user.companyId,
    });

    logger.authInfo("Login success", {
      userId: user.id,
      companyId: user.companyId,
      role: user.role,
    });

    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        companyId: user.companyId,
      },
    };
  },

  async register(input: {
    name: string;
    email: string;
    password: string;
    companyName: string;
    cnpj: string;
  }) {
    const { name, email, password, companyName, cnpj } = input;
    if (!name || !email || !password || !companyName || !cnpj) {
      throw new Error("Campos obrigatórios faltando");
    }

    const existingUser = await authRepository.findUserByEmail(email);
    if (existingUser) {
      throw new Error("Email já cadastrado");
    }

    const hashedPassword = await hashPassword(password);
    const { user } = await authRepository.createCompanyWithAdmin({
      name,
      email,
      password: hashedPassword,
      companyName,
      cnpj,
    });

    logger.authInfo("Register success", {
      userId: user.id,
      companyId: user.companyId,
      role: user.role,
    });

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        companyId: user.companyId,
      },
    };
  },
};
