'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AccessibleWrapper } from '@/components/AccessibleWrapper';
import { useAccessibility } from '@/contexts/AccessibilityContext';
import { supabase } from '@/lib/supabase/client';

export default function SignupPage() {
  const router = useRouter();
  const { announceToScreenReader } = useAccessibility();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(false);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const name = formData.get('name') as string;

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name,
          },
        },
      });

      if (error) {
        throw error;
      }

      setSuccess(true);
      announceToScreenReader('Account created successfully! Please check your email to verify your account.');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Signup failed';
      setError(errorMessage);
      announceToScreenReader(`Signup failed: ${errorMessage}`, 'assertive');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <AccessibleWrapper
            as="div"
            role="alert"
            aria-live="polite"
            className="rounded-md bg-green-50 p-4"
          >
            <div className="text-center">
              <h1 className="text-2xl font-bold text-green-800 mb-4">
                Account Created Successfully!
              </h1>
              <p className="text-sm text-green-700 mb-4">
                Please check your email and click the verification link to activate your account.
              </p>
              <a
                href="/auth/login"
                className="inline-block bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                Go to Login
              </a>
            </div>
          </AccessibleWrapper>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <AccessibleWrapper as="header" className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">
            Create your BookBridge account
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Join our accessible AI-powered book companion
          </p>
        </AccessibleWrapper>

        <AccessibleWrapper as="section" ariaLabelledBy="signup-form-heading">
          <h2 id="signup-form-heading" className="sr-only">
            Signup Form
          </h2>

          <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Full Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                required
                disabled={isLoading}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
                placeholder="Enter your full name"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                disabled={isLoading}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
                placeholder="Enter your email"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={6}
                disabled={isLoading}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
                placeholder="Create a password (min 6 characters)"
                aria-describedby="password-help"
              />
              <div id="password-help" className="text-xs text-gray-500 mt-1">
                Password must be at least 6 characters long
              </div>
            </div>

            {error && (
              <AccessibleWrapper
                as="div"
                role="alert"
                aria-live="assertive"
                className="rounded-md bg-red-50 p-4"
              >
                <div className="text-sm text-red-700">{error}</div>
              </AccessibleWrapper>
            )}

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Creating account...' : 'Create account'}
              </button>
            </div>

            <div className="text-center">
              <p className="text-sm text-gray-600">
                Already have an account?{' '}
                <a
                  href="/auth/login"
                  className="font-medium text-blue-600 hover:text-blue-500 focus:outline-none focus:underline"
                >
                  Sign in
                </a>
              </p>
            </div>
          </form>
        </AccessibleWrapper>
      </div>
    </div>
  );
}