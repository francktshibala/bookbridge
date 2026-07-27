import { servicePrisma } from '@/lib/prisma-service';

export interface RosterEntry {
  enrollmentId: string;
  studentId: string;
  name: string | null;
  email: string;
  joinedAt: Date;
  booksRead: number;
  lastActivity: Date | null;
}

/**
 * Two queries total regardless of roster size (distinct-book count via raw
 * SQL since Prisma's groupBy can't express COUNT(DISTINCT ...), last-activity
 * via groupBy) - not one query per student. See TEACHER_DASHBOARD_IMPLEMENTATION_PLAN.md
 * "Scalability" section.
 */
export async function getClassRoster(classId: string): Promise<RosterEntry[]> {
  const enrollments = await servicePrisma.enrollment.findMany({
    where: { classId, status: 'ACTIVE' },
    include: { student: { select: { id: true, name: true, email: true } } },
    orderBy: { joinedAt: 'asc' },
  });

  if (enrollments.length === 0) return [];

  const studentIds = enrollments.map((enrollment) => enrollment.studentId);

  const [distinctBookCounts, lastActivity] = await Promise.all([
    servicePrisma.$queryRaw<{ user_id: string; distinct_books: bigint }[]>`
      SELECT user_id, COUNT(DISTINCT book_id) AS distinct_books
      FROM reading_sessions
      WHERE user_id = ANY(${studentIds})
      GROUP BY user_id
    `,
    servicePrisma.readingSession.groupBy({
      by: ['userId'],
      where: { userId: { in: studentIds } },
      _max: { sessionStart: true },
    }),
  ]);

  const booksReadByStudent = new Map(
    distinctBookCounts.map((row) => [row.user_id, Number(row.distinct_books)])
  );
  const lastActivityByStudent = new Map(
    lastActivity.map((row) => [row.userId, row._max.sessionStart])
  );

  return enrollments.map((enrollment) => ({
    enrollmentId: enrollment.id,
    studentId: enrollment.studentId,
    name: enrollment.student.name,
    email: enrollment.student.email,
    joinedAt: enrollment.joinedAt,
    booksRead: booksReadByStudent.get(enrollment.studentId) ?? 0,
    lastActivity: lastActivityByStudent.get(enrollment.studentId) ?? null,
  }));
}
