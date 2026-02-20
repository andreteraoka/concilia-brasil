import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";
const BCRYPT_ROUNDS = 12; // Recommendation: 12 rounds for production

// Validates that a password meets minimum security requirements
export function validatePasswordStrength(password: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push("Senha deve ter no mínimo 8 caracteres");
  }

  if (!/[A-Z]/.test(password)) {
    errors.push("Senha deve conter pelo menos uma letra maiúscula");
  }

  if (!/[a-z]/.test(password)) {
    errors.push("Senha deve conter pelo menos uma letra minúscula");
  }

  if (!/[0-9]/.test(password)) {
    errors.push("Senha deve conter pelo menos um número");
  }

  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push("Senha deve conter pelo menos um caractere especial (!@#$%^&*...)");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// Hash a password using bcrypt with 12 rounds (production-grade security)
export async function hashPassword(password: string) {
  // In production, use BCRYPT_ROUNDS (12)
  // In development, 10 rounds is acceptable for faster testing
  const rounds = process.env.NODE_ENV === "production" ? BCRYPT_ROUNDS : 10;
  return bcrypt.hash(password, rounds);
}

// Compare a plain password with a hashed password
export async function comparePassword(
  password: string,
  hash: string
) {
  return bcrypt.compare(password, hash);
}

export function generateToken(payload: Record<string, unknown>) {
  if (!JWT_SECRET || JWT_SECRET === "dev-secret") {
    if (process.env.NODE_ENV === "production") {
      throw new Error("JWT_SECRET must be set in production environment");
    }
  }

  return jwt.sign(payload, JWT_SECRET, { 
    expiresIn: process.env.NODE_ENV === "production" ? "1d" : "7d",
    algorithm: "HS256",
  });
}

export function verifyToken(token: string) {
  return jwt.verify(token, JWT_SECRET);
}
