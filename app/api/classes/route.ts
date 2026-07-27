import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/require-role';
import { servicePrisma } from '@/lib/prisma-service';
import { generateUniqueClassCode } from '@/lib/classes/generate-class-code';

export const runtime = 'nodejs';

// POST /api/classes - create a class owned by the authenticated teacher
export async function POST(request: NextRequest) {
  const auth = await requireRole('TEACHER');
  if ('error' in auth) return auth.error;

  const { name } = await request.json();
  if (!name || typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ error: 'A class name is required' }, { status: 400 });
  }

  const code = await generateUniqueClassCode(async (candidate) => {
    const existing = await servicePrisma.class.findUnique({ where: { code: candidate } });
    return existing !== null;
  });

  const klass = await servicePrisma.class.create({
    data: { name: name.trim(), code, teacherId: auth.userId },
  });

  return NextResponse.json({ class: klass }, { status: 201 });
}

// GET /api/classes - list the authenticated teacher's own classes
export async function GET() {
  const auth = await requireRole('TEACHER');
  if ('error' in auth) return auth.error;

  const classes = await servicePrisma.class.findMany({
    where: { teacherId: auth.userId },
    include: { _count: { select: { enrollments: { where: { status: 'ACTIVE' } } } } },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ classes });
}
