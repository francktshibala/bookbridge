import { generateClassCodeCandidate, generateUniqueClassCode } from '@/lib/classes/generate-class-code';

describe('generateClassCodeCandidate', () => {
  it('generates a code of the default length', () => {
    const code = generateClassCodeCandidate();
    expect(code).toHaveLength(6);
  });

  it('respects a custom length', () => {
    const code = generateClassCodeCandidate({ length: 8 });
    expect(code).toHaveLength(8);
  });

  it('never includes visually ambiguous characters (0/O, 1/I/L)', () => {
    // Teachers read these aloud or write them on a whiteboard - a code a
    // student can't reliably transcribe defeats the point of the flow.
    for (let i = 0; i < 200; i++) {
      const code = generateClassCodeCandidate();
      expect(code).not.toMatch(/[01IOL]/);
    }
  });

  it('is deterministic given an injected random source', () => {
    const alwaysZero = () => 0;
    const code = generateClassCodeCandidate({ randomFn: alwaysZero });
    expect(code).toBe(code[0].repeat(6));
  });
});

describe('generateUniqueClassCode', () => {
  it('returns the first candidate when it is not taken', async () => {
    const isCodeTaken = jest.fn().mockResolvedValue(false);
    const code = await generateUniqueClassCode(isCodeTaken);
    expect(code).toHaveLength(6);
    expect(isCodeTaken).toHaveBeenCalledTimes(1);
  });

  it('retries when a candidate collides, and returns the next free one', async () => {
    const isCodeTaken = jest.fn()
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);
    const code = await generateUniqueClassCode(isCodeTaken);
    expect(code).toHaveLength(6);
    expect(isCodeTaken).toHaveBeenCalledTimes(3);
  });

  it('throws after exhausting maxAttempts rather than looping forever', async () => {
    const isCodeTaken = jest.fn().mockResolvedValue(true);
    await expect(
      generateUniqueClassCode(isCodeTaken, { maxAttempts: 3 })
    ).rejects.toThrow(/unique class code/i);
    expect(isCodeTaken).toHaveBeenCalledTimes(3);
  });
});
