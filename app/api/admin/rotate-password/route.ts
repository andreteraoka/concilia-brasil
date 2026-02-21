import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hash } from 'bcryptjs';
import { logger } from '@/lib/logger';

/**
 * Rotaciona a senha do usuário admin
 * Endpoint sem autenticação para uso via Kudu/scripts
 * GET: Retorna a senha atual do admin (último criado)
 * POST: Gera uma nova senha aleatória e atualiza o admin
 */

function generateRandomPassword(length: number = 16): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

export async function POST(req: NextRequest) {
  try {
    // Encontrar admin (ADMIN role, mais recente)
    const admin = await prisma.user.findFirst({
      where: {
        role: 'ADMIN',
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!admin) {
      logger.error('Admin user not found');
      return NextResponse.json(
        { error: 'Admin user not found' },
        { status: 404 }
      );
    }

    // Gerar nova senha
    const newPassword = generateRandomPassword(16);
    const hashedPassword = await hash(newPassword, 10);

    // Atualizar admin com nova senha
    await prisma.user.update({
      where: { id: admin.id },
      data: {
        password: hashedPassword,
      },
    });

    logger.info(`Admin password rotated for: ${admin.email}`);

    return NextResponse.json(
      {
        success: true,
        message: 'Admin password rotated successfully',
        adminEmail: admin.email,
        newPassword: newPassword,
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error('Error rotating admin password:', error);
    return NextResponse.json(
      { error: 'Failed to rotate password' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    // Apenas para debug - retorna email do admin (sem senha)
    const admin = await prisma.user.findFirst({
      where: {
        role: 'ADMIN',
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    if (!admin) {
      return NextResponse.json(
        { error: 'Admin user not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        admin: admin,
        message: 'POST /api/admin/rotate-password para rotacionar senha',
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error('Error fetching admin:', error);
    return NextResponse.json(
      { error: 'Failed to fetch admin' },
      { status: 500 }
    );
  }
}
