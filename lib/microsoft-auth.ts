import { NextAuthOptions } from "next-auth";
import AzureADProvider from "next-auth/providers/azure-ad";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaClient } from "@prisma/client";
import { authService } from "@/src/modules/auth/services/authService";
import { logger } from "@/lib/logger";

const prisma = new PrismaClient();

export const authOptions: NextAuthOptions = {
  providers: [
    // Provider 1: Microsoft (Azure AD)
    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID!,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
      tenantId: process.env.AZURE_AD_TENANT_ID!,
      authorization: {
        params: {
          scope: "openid profile email User.Read",
        },
      },
    }),

    // Provider 2: Email/Senha tradicional (mantém compatibilidade)
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          const result = await authService.login({
            email: credentials.email,
            password: credentials.password,
          });

          return {
            id: result.user.id,
            email: result.user.email,
            name: result.user.name,
            role: result.user.role,
          };
        } catch (error) {
          logger.authError("Login failed", error);
          return null;
        }
      },
    }),
  ],

  callbacks: {
    async signIn({ user, account, profile }) {
      // Se login via Microsoft
      if (account?.provider === "azure-ad") {
        const email = user.email || (profile as any)?.email;

        if (!email) {
          logger.authError("Microsoft auth: email not found in profile");
          return false;
        }

        try {
          // Verificar se usuário já existe no banco
          const existingUser = await prisma.user.findUnique({
            where: { email },
          });

          if (!existingUser) {
            // Criar usuário automaticamente
            const isAdmin = email === process.env.ADMIN_EMAIL;

            // Se é admin, criar company padrão
            let companyId: string | null = null;
            if (isAdmin) {
              const company = await prisma.company.create({
                data: {
                  name: "Concília Brasil Admin",
                  cnpj: "00000000000000",
                  status: "active",
                },
              });
              companyId = company.id;
            }

            await prisma.user.create({
              data: {
                email,
                name: user.name || email.split("@")[0],
                password: "", // Sem senha, auth via Microsoft
                role: isAdmin ? "ADMIN" : "USER",
                status: "active",
                companyId: companyId || undefined,
                microsoftId: account.providerAccountId,
              } as any, // Temporary fix até migração rodar
            });

            logger.authInfo("User created from Microsoft account", { email, isAdmin });
          } else if (!(existingUser as any).microsoftId) {
            // Usuário existe mas não tem microsoftId - vincular conta
            await prisma.user.update({
              where: { id: existingUser.id },
              data: { microsoftId: account.providerAccountId } as any, // Temporary fix
            });

            logger.authInfo("Microsoft account linked to existing user", { email });
          }

          return true;
        } catch (error) {
          logger.authError("Error in Microsoft signIn callback", error);
          return false;
        }
      }

      return true;
    },

    async jwt({ token, user, account }) {
      // Primeira vez logando
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.role = (user as any).role;
      }

      // Se login via Microsoft, buscar dados do banco
      if (account?.provider === "azure-ad" && token.email) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { email: token.email as string },
            select: { id: true, role: true, companyId: true },
          });

          if (dbUser) {
            token.id = dbUser.id;
            token.role = dbUser.role;
            token.companyId = dbUser.companyId;
          }
        } catch (error) {
          logger.authError("Error fetching user data in JWT callback", error);
        }

        token.accessToken = account.access_token;
        token.provider = "microsoft";
      }

      return token;
    },

    async session({ session, token }) {
      if (token && session.user) {
        (session.user as any).id = token.id as string;
        (session.user as any).email = token.email as string;
        (session.user as any).role = token.role as string;
        (session.user as any).companyId = token.companyId as string;
        (session.user as any).provider = token.provider as string;
      }

      return session;
    },
  },

  pages: {
    signIn: "/",
    error: "/?error=auth_failed",
  },

  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 1 dia
  },

  secret: process.env.NEXTAUTH_SECRET,
};
