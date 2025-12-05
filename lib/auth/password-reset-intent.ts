import type { User } from '@supabase/supabase-js';

export const PASSWORD_RESET_LOOKBACK_MS = 1000 * 60 * 60; // 60 minutes matches Supabase email OTP window
const PASSWORD_RESET_KEYWORDS = ['password', 'reset', 'recovery'];

export type PasswordResetDetectionArgs = {
  queryType?: string | null;
  errorDescription?: string | null;
  user?: User | null;
};

export type PasswordResetDetectionDetails = {
  normalizedType: string | null;
  errorHint: boolean;
  recoveryRecent: boolean;
  recoveryAfterConfirmation: boolean;
  recoverySentAt: string | null;
  confirmationSentAt: string | null;
  detectionWindowMs: number;
};

export type PasswordResetDetectionResult = {
  isPasswordReset: boolean;
  details: PasswordResetDetectionDetails;
};

const toTimestamp = (value?: string | null) => {
  if (!value) {
    return null;
  }

  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? null : timestamp;
};

export const detectPasswordResetIntent = ({
  queryType,
  errorDescription,
  user,
}: PasswordResetDetectionArgs): PasswordResetDetectionResult => {
  const normalizedType = queryType?.toLowerCase() ?? null;
  const supabaseRecoveryHint = normalizedType === 'recovery';
  const customTypeHint = normalizedType === 'password_reset';

  const errorText = errorDescription?.toLowerCase() ?? '';
  const errorHint = errorText
    ? PASSWORD_RESET_KEYWORDS.some((keyword) => errorText.includes(keyword))
    : false;

  const recoverySentTs = toTimestamp(user?.recovery_sent_at);
  const confirmationSentTs = toTimestamp(
    user?.confirmation_sent_at ?? user?.email_confirmed_at ?? user?.confirmed_at
  );

  const now = Date.now();
  const recoveryRecent =
    typeof recoverySentTs === 'number' &&
    now - recoverySentTs >= 0 &&
    now - recoverySentTs <= PASSWORD_RESET_LOOKBACK_MS;

  const recoveryAfterConfirmation =
    typeof recoverySentTs === 'number' &&
    (!confirmationSentTs || recoverySentTs >= confirmationSentTs);

  const userHint = recoveryRecent && recoveryAfterConfirmation;

  const isPasswordReset =
    supabaseRecoveryHint || customTypeHint || userHint || errorHint;

  return {
    isPasswordReset,
    details: {
      normalizedType,
      errorHint,
      recoveryRecent,
      recoveryAfterConfirmation,
      recoverySentAt: user?.recovery_sent_at ?? null,
      confirmationSentAt:
        user?.confirmation_sent_at ??
        user?.email_confirmed_at ??
        user?.confirmed_at ??
        null,
      detectionWindowMs: PASSWORD_RESET_LOOKBACK_MS,
    },
  };
};

