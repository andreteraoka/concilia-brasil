#!/usr/bin/env tsx

/**
 * Document Processing Job Queue Worker
 * 
 * Executa em background para processar a fila de documentos
 * 
 * Uso: tsx scripts/document-queue-worker.ts
 */

import { startJobQueue, stopJobQueue } from '@/src/lib/queue/documentJobQueue';
import { prisma } from '@/lib/prisma';

async function main() {
  try {
    console.log('🚀 Starting Document Processing Job Queue Worker...');
    
    // Validar conexão com banco
    await prisma.$connect();
    console.log('✅ Database connected');

    // Iniciar job queue
    await startJobQueue();
    console.log('✅ Job Queue started successfully');

    // Handle graceful shutdown
    process.on('SIGTERM', async () => {
      console.log('\n⏹️ Received SIGTERM, shutting down gracefully...');
      await stopJobQueue();
      await prisma.$disconnect();
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      console.log('\n⏹️ Received SIGINT, shutting down gracefully...');
      await stopJobQueue();
      await prisma.$disconnect();
      process.exit(0);
    });

    // Keep process alive
    console.log('⏳ Listening for documents... Press Ctrl+C to exit');
  } catch (error) {
    console.error('❌ Failed to start Job Queue:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

main();
