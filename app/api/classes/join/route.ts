import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/require-role';
import { servicePrisma } from '@/lib/prisma-service';

export const runtime = 'nodejs';

// POST /api/classes/join - student enters a class code, enrolls immediately
export async function POST(request: NextRequest) {
  const auth = await requireRole('STUDENT');
  if ('error' in auth) return auth.error;

  const { code } = await request.json();
  if (!code || typeof code !== 'string' || !code.trim()) {
    return NextResponse.json({ error: 'A class code is required' }, { status: 400 });
  }

  const klass = await servicePrisma.class.findUnique({
    where: { code: code.trim().toUpperCase() },
  });

  if (!klass) {
    return NextResponse.json({ error: 'Invalid class code' }, { status: 404 });
  }

  // Upsert so a student re-entering a code after being archived reactivates
  // their enrollment instead of colliding with the unique constraint.
  const enrollment = await servicePrisma.enrollment.upsert({
    where: { classId_studentId: { classId: klass.id, studentId: auth.userId } },
    update: { status: 'ACTIVE' },
    create: { classId: klass.id, studentId: auth.userId },
  });

  return NextResponse.json(
    { enrollment, class: { id: klass.id, name: klass.name } },
    { status: 201 }
  );
}
