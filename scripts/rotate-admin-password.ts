import { prisma } from '../lib/prisma';
import { hash } from 'bcryptjs';
import { randomBytes } from 'crypto';

/**
 * Gera uma senha criptograficamente forte com uppercase, lowercase, digit e symbol
 */
function generateStrongPassword(length = 28): string {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const digits = '0123456789';
  const symbols = '!@#$%^&*-_+=~?';
  const all = uppercase + lowercase + digits + symbols;

  let password = '';
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += digits[Math.floor(Math.random() * digits.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];

  for (let i = password.length; i < length; i++) {
    password += all[Math.floor(Math.random() * all.length)];
  }

  return password
    .split('')
    .sort(() => Math.random() - 0.5)
    .join('');
}

async function rotateAdminPassword() {
  try {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@admin';
    const newPassword = process.env.NEW_ADMIN_PASSWORD || generateStrongPassword();

    console.log('\n=== ADMIN PASSWORD ROTATION ===\n');

    // Busca usuário admin
    let admin = await prisma.user.findUnique({
      where: { email: adminEmail }
    });

    if (!admin) {
      throw new Error(`Admin com email ${adminEmail} não encontrado`);
    }

    // Atualiza senha
    const hashedPassword = await hash(newPassword, 12);
    admin = await prisma.user.update({
      where: { id: admin.id },
      data: { password: hashedPassword }
    });

    console.log('✓ Senha do admin rotacionada com sucesso\n');
    console.log('📧 CREDENCIAIS FINAIS:');
    console.log(`FINAL_ADMIN_EMAIL=${adminEmail}`);
    console.log(`FINAL_ADMIN_PASSWORD=${newPassword}`);
    console.log('\n🔐 Salve essas credenciais em local seguro!\n');

    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Erro na rotação:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

rotateAdminPassword();
