import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/require-role';
import { servicePrisma } from '@/lib/prisma-service';
import { authorizeTeacherClass } from '@/lib/classes/authorize-teacher-class';
import { getClassRoster } from '@/lib/classes/get-class-roster';

export const runtime = 'nodejs';

// GET /api/classes/[classId]/roster - roster for one class, teacher-owned only
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ classId: string }> }
) {
  const auth = await requireRole('TEACHER');
  if ('error' in auth) return auth.error;

  const { classId } = await params;
  const klass = await servicePrisma.class.findUnique({
    where: { id: classId },
    select: { teacherId: true },
  });

  const authz = authorizeTeacherClass({ requestingUserId: auth.userId, klass });
  if (!authz.authorized) {
    return NextResponse.json({ error: 'Class not found' }, { status: 404 });
  }

  const roster = await getClassRoster(classId);
  return NextResponse.json({ roster });
}
