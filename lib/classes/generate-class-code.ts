// Excludes 0/O, 1/I/L - a code a teacher reads aloud or a student
// hand-copies from a whiteboard must not depend on font disambiguation.
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export interface GenerateClassCodeOptions {
  length?: number;
  randomFn?: () => number;
}

export interface GenerateUniqueClassCodeOptions extends GenerateClassCodeOptions {
  maxAttempts?: number;
}

export function generateClassCodeCandidate(options: GenerateClassCodeOptions = {}): string {
  const length = options.length ?? 6;
  const randomFn = options.randomFn ?? Math.random;
  let code = '';
  for (let i = 0; i < length; i++) {
    code += CODE_ALPHABET[Math.floor(randomFn() * CODE_ALPHABET.length)];
  }
  return code;
}

/**
 * `isCodeTaken` is injected so this stays testable without mocking a
 * database - callers pass a real uniqueness check (e.g. a Prisma lookup)
 * in production.
 */
export async function generateUniqueClassCode(
  isCodeTaken: (code: string) => Promise<boolean>,
  options: GenerateUniqueClassCodeOptions = {}
): Promise<string> {
  const maxAttempts = options.maxAttempts ?? 5;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const candidate = generateClassCodeCandidate(options);
    if (!(await isCodeTaken(candidate))) {
      return candidate;
    }
  }
  throw new Error(`Could not generate a unique class code after ${maxAttempts} attempts`);
}
