import { NextResponse } from 'next/server';
import { startJobQueue } from '@/src/lib/queue/documentJobQueue';

// Esta rota inicializa a job queue quando acessada
// Deve ser chamada na inicialização da aplicação

export async function GET() {
  try {
    await startJobQueue();
    return NextResponse.json({ success: true, message: 'Job queue started' });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
