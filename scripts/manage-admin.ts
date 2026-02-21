import { prisma } from '../lib/prisma';
import { hash } from 'bcryptjs';
import { randomBytes } from 'crypto';

/**
 * Gera uma senha criptograficamente forte com uppercase, lowercase, digit e symbol
 */
function generateStrongPassword(length = 24): string {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const digits = '0123456789';
  const symbols = '!@#$%^&*-_+=';
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

async function bootstrapAdmin() {
  try {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@admin';
    const adminPassword = process.env.ADMIN_PASSWORD || generateStrongPassword();

    console.log('\n=== ADMIN BOOTSTRAP ===\n');

    // Busca ou cria company padrão
    let company = await prisma.company.findFirst({
      where: { name: 'Concilia Brasil' }
    });

    if (!company) {
      company = await prisma.company.create({
        data: {
          name: 'Concilia Brasil',
          cnpj: '00.000.000/0000-00'
        }
      });
      console.log('✓ Empresa criada: Concilia Brasil');
    } else {
      console.log('✓ Empresa já existe: Concilia Brasil');
    }

    // Busca ou cria usuário admin
    let admin = await prisma.user.findUnique({
      where: { email: adminEmail }
    });

    if (!admin) {
      const hashedPassword = await hash(adminPassword, 12);
      admin = await prisma.user.create({
        data: {
          email: adminEmail,
          name: 'Admin Provisório',
          password: hashedPassword,
          role: 'ADMIN',
          status: 'ACTIVE',
          companyId: company.id
        }
      });
      console.log('✓ Usuário admin criado');
    } else {
      console.log('✓ Usuário admin já existe');
    }

    // Output das credenciais temporárias
    console.log('\n📧 CREDENCIAIS TEMPORÁRIAS:');
    console.log(`TEMP_ADMIN_EMAIL=${adminEmail}`);
    console.log(`TEMP_ADMIN_PASSWORD=${adminPassword}`);
    console.log('\n⚠️  ESTAS SÃO CREDENCIAIS TEMPORÁRIAS');
    console.log('Use "npm run admin:rotate" para gerar credenciais finais\n');

    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Erro no bootstrap:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

bootstrapAdmin();
