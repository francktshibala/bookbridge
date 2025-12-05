/**
 * Centralized Authentication Error Mapping Utility
 * Converts raw Supabase/Resend errors into user-friendly messages with recovery actions
 * 
 * Architecture Pattern: Service Layer (Pure Function)
 * Styling Pattern: Neo-Classic (error messages use Source Serif Pro font)
 */

export interface AuthError {
  userMessage: string;
  recoveryAction?: 'resend_email' | 'reset_password' | 'contact_support' | 'try_again';
  errorType: string;
}

/**
 * Maps raw authentication errors to user-friendly messages with recovery actions
 */
export function mapAuthError(error: Error | string): AuthError {
  const errorMessage = typeof error === 'string' ? error : error.message;
  const lowerMessage = errorMessage.toLowerCase();
  
  // Signup errors
  if (lowerMessage.includes('already registered') || lowerMessage.includes('user already exists') || lowerMessage.includes('already registered')) {
    return {
      userMessage: "This email is already registered. Try logging in instead.",
      recoveryAction: undefined,
      errorType: 'email_exists',
    };
  }
  
  if ((lowerMessage.includes('password') && lowerMessage.includes('6')) || lowerMessage.includes('password should be at least')) {
    return {
      userMessage: "Password must be at least 6 characters long.",
      recoveryAction: 'try_again',
      errorType: 'weak_password',
    };
  }
  
  if (lowerMessage.includes('invalid email') || 
      lowerMessage.includes('email format') ||
      lowerMessage.includes('invalid email address') ||
      lowerMessage.includes('email is invalid') ||
      lowerMessage.includes('must be a valid email')) {
    return {
      userMessage: "Please enter a valid email address.",
      recoveryAction: 'try_again',
      errorType: 'invalid_email',
    };
  }
  
  if (lowerMessage.includes('network') || lowerMessage.includes('fetch') || lowerMessage.includes('connection')) {
    return {
      userMessage: "Connection failed. Please check your internet and try again.",
      recoveryAction: 'try_again',
      errorType: 'network_error',
    };
  }
  
  // Email errors
  if (lowerMessage.includes('email not sent') || lowerMessage.includes('couldn\'t send')) {
    return {
      userMessage: "We couldn't send the email. Click 'Resend' to try again.",
      recoveryAction: 'resend_email',
      errorType: 'email_not_sent',
    };
  }
  
  if (lowerMessage.includes('expired link') || lowerMessage.includes('link has expired') || lowerMessage.includes('otp_expired')) {
    return {
      userMessage: "This verification link has expired. Request a new one below.",
      recoveryAction: 'resend_email',
      errorType: 'expired_link',
    };
  }
  
  if (lowerMessage.includes('invalid link') || lowerMessage.includes('link is invalid')) {
    return {
      userMessage: "This link is invalid. Request a new verification email.",
      recoveryAction: 'resend_email',
      errorType: 'invalid_link',
    };
  }
  
  // Login errors
  if (lowerMessage.includes('invalid login') || lowerMessage.includes('invalid credentials') || lowerMessage.includes('invalid email or password')) {
    return {
      userMessage: "Email or password is incorrect. Check your credentials or reset your password.",
      recoveryAction: 'reset_password',
      errorType: 'invalid_credentials',
    };
  }
  
  if (lowerMessage.includes('email not confirmed') || lowerMessage.includes('not verified') || lowerMessage.includes('email_not_confirmed')) {
    return {
      userMessage: "Please verify your email first. Check your inbox or request a new confirmation email.",
      recoveryAction: 'resend_email',
      errorType: 'email_not_verified',
    };
  }
  
  if (lowerMessage.includes('too many requests') || lowerMessage.includes('rate limit')) {
    return {
      userMessage: "Too many login attempts. Please wait a few minutes and try again.",
      recoveryAction: 'try_again',
      errorType: 'rate_limit',
    };
  }
  
  // Password reset errors
  if (lowerMessage.includes('email not found') || lowerMessage.includes('user not found')) {
    return {
      userMessage: "No account found with this email. Check your email or sign up.",
      recoveryAction: undefined,
      errorType: 'email_not_found',
    };
  }
  
  // Default fallback
  return {
    userMessage: "Something went wrong. Please try again.",
    recoveryAction: 'try_again',
    errorType: 'unknown',
  };
}

