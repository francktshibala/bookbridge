import type { User } from '@supabase/supabase-js';
import {
  detectPasswordResetIntent,
  PASSWORD_RESET_LOOKBACK_MS,
} from '@/lib/auth/password-reset-intent';

const createUser = (overrides: Partial<User> = {}): User => ({
  id: 'user-1',
  app_metadata: {},
  user_metadata: {},
  aud: 'authenticated',
  created_at: new Date().toISOString(),
  ...overrides,
});

describe('detectPasswordResetIntent', () => {
  it('flags Supabase recovery type callbacks', () => {
    const result = detectPasswordResetIntent({ queryType: 'recovery' });
    expect(result.isPasswordReset).toBe(true);
    expect(result.details.normalizedType).toBe('recovery');
  });

  it('does not treat signup confirmations as password reset', () => {
    const result = detectPasswordResetIntent({ queryType: 'signup' });
    expect(result.isPasswordReset).toBe(false);
  });

  it('relies on recent recovery timestamp when type is missing', () => {
    const user = createUser({
      recovery_sent_at: new Date().toISOString(),
    });
    const result = detectPasswordResetIntent({ user });
    expect(result.isPasswordReset).toBe(true);
    expect(result.details.recoveryRecent).toBe(true);
  });

  it('ignores stale recovery timestamps outside the lookback window', () => {
    const oldRecovery = new Date(
      Date.now() - PASSWORD_RESET_LOOKBACK_MS - 1000
    ).toISOString();
    const user = createUser({
      recovery_sent_at: oldRecovery,
    });
    const result = detectPasswordResetIntent({ user });
    expect(result.isPasswordReset).toBe(false);
    expect(result.details.recoveryRecent).toBe(false);
  });

  it('prefers confirmation events when they are newer than recovery', () => {
    const confirmationTime = new Date().toISOString();
    const earlierRecovery = new Date(Date.now() - 5_000).toISOString();
    const user = createUser({
      recovery_sent_at: earlierRecovery,
      confirmation_sent_at: confirmationTime,
    });
    const result = detectPasswordResetIntent({
      queryType: 'signup',
      user,
    });
    expect(result.isPasswordReset).toBe(false);
    expect(result.details.recoveryAfterConfirmation).toBe(false);
  });
});

