import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/require-role';
import { servicePrisma } from '@/lib/prisma-service';
import { authorizeTeacherClass } from '@/lib/classes/authorize-teacher-class';

export const runtime = 'nodejs';

// DELETE /api/classes/[classId]/roster/[studentId] - archive an enrollment
// (soft remove, not a hard delete - see EnrollmentStatus in schema.prisma)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ classId: string; studentId: string }> }
) {
  const auth = await requireRole('TEACHER');
  if ('error' in auth) return auth.error;

  const { classId, studentId } = await params;
  const klass = await servicePrisma.class.findUnique({
    where: { id: classId },
    select: { teacherId: true },
  });

  const authz = authorizeTeacherClass({ requestingUserId: auth.userId, klass });
  if (!authz.authorized) {
    return NextResponse.json({ error: 'Class not found' }, { status: 404 });
  }

  const result = await servicePrisma.enrollment.updateMany({
    where: { classId, studentId, status: 'ACTIVE' },
    data: { status: 'ARCHIVED' },
  });

  if (result.count === 0) {
    return NextResponse.json({ error: 'Enrollment not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
