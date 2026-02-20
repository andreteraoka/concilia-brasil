import { z } from "zod";

// Auth Schemas
export const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
});

export const registerSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
  companyName: z.string().min(2, "Nome da empresa deve ter pelo menos 2 caracteres"),
});

// Account Schemas
export const createAccountSchema = z.object({
  bankName: z.string().min(1, "Nome do banco é obrigatório"),
  agency: z.string().optional(),
  accountNumber: z.string().min(1, "Número da conta é obrigatório"),
  type: z.enum(["Corrente", "Poupança", "Investimento"], {
    errorMap: () => ({ message: "Tipo de conta inválido" }),
  }),
});

export const updateAccountSchema = createAccountSchema.partial();

// Transaction Schemas
export const createTransactionSchema = z.object({
  date: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: "Data inválida",
  }),
  description: z.string().min(1, "Descrição é obrigatória"),
  type: z.enum(["income", "expense"], {
    errorMap: () => ({ message: "Tipo deve ser 'income' ou 'expense'" }),
  }),
  amount: z.number().positive("Valor deve ser positivo"),
  accountId: z.string().uuid("ID da conta inválido"),
  categoryId: z.string().uuid("ID da categoria inválido").optional(),
});

export const listTransactionsSchema = z.object({
  startDate: z.string().optional().refine((date) => !date || !isNaN(Date.parse(date)), {
    message: "Data inicial inválida",
  }),
  endDate: z.string().optional().refine((date) => !date || !isNaN(Date.parse(date)), {
    message: "Data final inválida",
  }),
  type: z.enum(["income", "expense"]).optional(),
  page: z.string().transform(Number).optional(),
  limit: z.string().transform(Number).optional(),
});

// User Schemas
export const createUserSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
  role: z.enum(["ADMIN", "USER"], {
    errorMap: () => ({ message: "Role deve ser 'ADMIN' ou 'USER'" }),
  }).optional(),
});

export const updateUserSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres").optional(),
  role: z.enum(["ADMIN", "USER"], {
    errorMap: () => ({ message: "Role deve ser 'ADMIN' ou 'USER'" }),
  }).optional(),
  status: z.enum(["active", "inactive"], {
    errorMap: () => ({ message: "Status deve ser 'active' ou 'inactive'" }),
  }).optional(),
});

// Company Schemas
export const updateCompanySchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres").optional(),
  email: z.string().email("Email inválido").optional(),
  phone: z.string().optional(),
  website: z.string().url("URL inválida").optional(),
  description: z.string().optional(),
});

// Document Schemas
export const createDocumentSchema = z.object({
  fileName: z.string().min(1, "Nome do arquivo é obrigatório"),
  fileType: z.string().min(1, "Tipo de arquivo é obrigatório"),
  fileSize: z.number().positive("Tamanho do arquivo deve ser positivo"),
  uploadedAt: z.string().optional(),
});

export const processDocumentSchema = z.object({
  documentId: z.string().uuid("ID do documento inválido"),
  processType: z.enum(["extract", "analyze"], {
    errorMap: () => ({ message: "Tipo de processamento inválido" }),
  }).optional(),
});

// Pagination Schema
export const paginationSchema = z.object({
  page: z.number().int().positive().optional().default(1),
  limit: z.number().int().positive().max(100).optional().default(10),
});

// Export types
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type CreateAccountInput = z.infer<typeof createAccountSchema>;
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;
export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
export type ListTransactionsInput = z.infer<typeof listTransactionsSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type UpdateCompanyInput = z.infer<typeof updateCompanySchema>;
export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;
export type ProcessDocumentInput = z.infer<typeof processDocumentSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
